import { prisma } from "@/lib/db";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { CandidateHeader } from "../CandidateHeader";
import { EditForm } from "./EditForm";

export default async function EditPage() {
  const { profile } = await requireOnboardedCandidate();
  const skills = await prisma.candidateSkill.findMany({ where: { candidateId: profile.id }, include: { skill: true } });
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} back="/candidate/profile" />
      <main className="main">
        <EditForm
          initial={{
            fullName: profile.fullName, headline: profile.headline, location: profile.location, phone: profile.phone,
            currentTitle: profile.currentTitle, industry: profile.industry, yearsExperience: String(profile.yearsExperience),
            availability: profile.availability, skills: skills.map((s) => s.skill.name),
            about: profile.about, workHistory: profile.workHistory, education: profile.education, contactEmail: profile.contactEmail,
          }}
        />
      </main>
    </div>
  );
}
