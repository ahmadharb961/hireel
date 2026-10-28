import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CandidateNav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { requireOnboardedCandidate, studioVideos } from "@/server/candidate-data";
import { CandidateHeader } from "../CandidateHeader";
import { PreviewCard } from "./PreviewCard";

export default async function ProfilePreview() {
  const { profile } = await requireOnboardedCandidate();
  const t = await getTranslations("candidate");
  const [videos, skills] = await Promise.all([
    studioVideos(profile.id),
    prisma.candidateSkill.findMany({ where: { candidateId: profile.id }, include: { skill: true } }),
  ]);
  const watchable = videos.filter((v) => v.hls || v.isDemo);
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} />
      <main className="main">
        <div className="stack">
          <div><h1 className="h2">{t("employerView")}</h1><p className="p">{t("employerViewSub")}</p></div>
          <PreviewCard
            name={profile.fullName}
            headline={profile.headline}
            city={profile.location.split(",")[0]}
            skills={skills.map((s) => s.skill.name)}
            textOnly={profile.profileType === "TEXT_ONLY"}
            about={profile.about}
            videos={watchable.map((v) => ({ id: v.id, lang: v.lang, primary: v.primary, hls: v.hls, poster: v.poster, landscape: v.landscape }))}
          />
          <p className="note">{t("privateNote")}</p>
          <Link className="btn g w" href="/candidate/edit">{t("editProfile")}</Link>
        </div>
      </main>
      <CandidateNav />
    </div>
  );
}
