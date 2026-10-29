import { PhotoUpload } from "@/components/PhotoUpload";
import { categoryOptionsWith } from "@/server/categories";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { CandidateHeader } from "../CandidateHeader";
import { EditForm } from "./EditForm";
import { PrefsForm } from "./PrefsForm";

export default async function EditPage() {
  const { profile } = await requireOnboardedCandidate();
  const [skills, cv] = await Promise.all([
    prisma.candidateSkill.findMany({ where: { candidateId: profile.id }, include: { skill: true } }),
    prisma.cvFile.findUnique({ where: { candidateId: profile.id }, select: { fileName: true, size: true } }),
  ]);
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} back="/candidate/profile" />
      <main className="main">
        <section className="card" style={{ marginBottom: 16 }}><PhotoUpload initialUrl={photoUrl(profile)} name={profile.fullName} /></section>
        <div style={{ marginBottom: 16 }}>
          <PrefsForm initial={{ desiredRoles: profile.desiredRoles, jobTypes: profile.jobTypes, workModes: profile.workModes, relocateTo: profile.relocateTo, salaryMin: profile.salaryMin, salaryCurrency: profile.salaryCurrency }} />
        </div>
        <EditForm
          categories={await categoryOptionsWith(profile.industry)}
          candidateId={profile.id}
          cv={cv}
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
