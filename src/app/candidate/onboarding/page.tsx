import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCandidate } from "@/server/session";
import { Header } from "@/components/Header";
import { Wizard } from "./Wizard";

export default async function OnboardingPage() {
  const { profile } = await requireCandidate();
  if (profile.onboardingStep >= 5) redirect("/candidate");
  const skills = await prisma.candidateSkill.findMany({ where: { candidateId: profile.id }, include: { skill: true } });
  return (
    <div className="scr">
      <Header home="/candidate/onboarding" />
      <main className="main">
        <Wizard
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
