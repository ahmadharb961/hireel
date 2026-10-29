import { CandidateNav } from "@/components/Nav";
import { streamConfigured } from "@/lib/env";
import { requireOnboardedCandidate, studioVideos } from "@/server/candidate-data";
import { CandidateHeader } from "../CandidateHeader";
import { Studio } from "./Studio";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";

export default async function VideoPage() {
  const { profile } = await requireOnboardedCandidate();
  const [videos, skills, t] = await Promise.all([
    studioVideos(profile.id),
    prisma.candidateSkill.findMany({ where: { candidateId: profile.id }, include: { skill: true }, take: 3 }),
    getTranslations("recorder"),
  ]);
  // The coach's three talking points, filled in from the profile.
  const first = profile.fullName.split(" ")[0] || profile.fullName;
  const points = [
    t("point1", { name: first, headline: profile.headline || profile.currentTitle || "—" }),
    skills.length ? t("point2", { skills: skills.map((s) => s.skill.name).join(", ") }) : t("point2plain"),
    profile.desiredRoles.length ? t("point3", { roles: profile.desiredRoles.slice(0, 2).join(" / ") }) : t("point3plain"),
  ];
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} />
      <main className="main">
        <Studio videos={videos} uploadsEnabled={streamConfigured()} textOnly={profile.profileType === "TEXT_ONLY"} aboutOk={profile.about.trim().length >= 40} points={points} />
      </main>
      <CandidateNav />
    </div>
  );
}
