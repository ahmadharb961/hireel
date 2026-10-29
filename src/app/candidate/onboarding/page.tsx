import { redirect } from "next/navigation";
import { categoryOptionsWith } from "@/server/categories";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { requireCandidate } from "@/server/session";
import { getTranslations } from "next-intl/server";
import { AccountMenu } from "@/components/AccountMenu";
import { Header } from "@/components/Header";
import { Wizard } from "./Wizard";

export default async function OnboardingPage() {
  const { profile, viewer } = await requireCandidate();
  if (profile.onboardingStep >= 5) redirect("/candidate");
  const skills = await prisma.candidateSkill.findMany({ where: { candidateId: profile.id }, include: { skill: true } });
  return (
    <div className="scr">
      <Header home="/candidate/onboarding" right={<AccountMenu name={viewer.name} email={viewer.email} links={[{ href: "/", label: (await getTranslations("nav"))("homepage") }]} />} />
      <main className="main">
        <Wizard
          categories={await categoryOptionsWith(profile.industry)}
          photo={photoUrl(profile)}
          initialStep={Math.min(Math.max(profile.onboardingStep, 1), 4)}
          initial={{
            fullName: profile.fullName, headline: profile.headline, location: profile.location, phone: profile.phone,
            currentTitle: profile.currentTitle, industry: profile.industry, yearsExperience: String(profile.yearsExperience || ""),
            availability: profile.availability, skills: skills.map((s) => s.skill.name), about: profile.about,
            profileType: profile.profileType, visibility: profile.visibility,
          }}
        />
      </main>
    </div>
  );
}
