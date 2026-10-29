import Link from "next/link";
import { PushCard } from "@/components/PushCard";
import { getTranslations } from "next-intl/server";
import { CvUpload } from "@/components/CvUpload";
import { PhotoUpload } from "@/components/PhotoUpload";
import { photoUrl } from "@/lib/photo";
import { SignOut } from "@/components/SignOut";
import { AccountData } from "@/components/AccountData";
import { CandidateNav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { requireOnboardedCandidate, studioVideos } from "@/server/candidate-data";
import { CandidateHeader } from "../CandidateHeader";
import { PreviewCard } from "./PreviewCard";

export default async function ProfilePreview() {
  const { profile } = await requireOnboardedCandidate();
  const t = await getTranslations("candidate");
  const tc = await getTranslations("cvFile");
  const [videos, skills, cv] = await Promise.all([
    studioVideos(profile.id),
    prisma.candidateSkill.findMany({ where: { candidateId: profile.id }, include: { skill: true } }),
    prisma.cvFile.findUnique({ where: { candidateId: profile.id }, select: { fileName: true, size: true } }),
  ]);
  const watchable = videos.filter((v) => v.hls || v.isDemo);
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} />
      <main className="main">
        {/* Phones: one column. Computers: the employer preview on the left, photo, CV and settings on the right. */}
        <div className="cprofile">
          <section className="card cp-photo"><PhotoUpload initialUrl={photoUrl(profile)} name={profile.fullName} /></section>
          <div className="cp-main stack">
            <div><h1 className="h2">{t("employerView")}</h1><p className="p">{t("employerViewSub")}</p></div>
            <PreviewCard
              name={profile.fullName}
              photo={photoUrl(profile)}
              headline={profile.headline}
              city={profile.location.split(",")[0]}
              skills={skills.map((s) => s.skill.name)}
              textOnly={profile.profileType === "TEXT_ONLY"}
              about={profile.about}
              videos={watchable.map((v) => ({ id: v.id, lang: v.lang, primary: v.primary, hls: v.hls, poster: v.poster, landscape: v.landscape }))}
            />
            <p className="note">{t("privateNote")}</p>
          </div>
          <div className="cp-side stack">
            <section className="card"><h2 className="h3">🔒 {tc("title")}</h2><CvUpload candidateId={profile.id} initial={cv} /></section>
            <div className="row">
              <Link className="btn g" href="/candidate/edit">{t("editProfile")}</Link>
              <Link className="btn g" href="/candidate/share">{t("shareProfile")}</Link>
            </div>
            <Link className="btn o w" href="/candidate/profile/print">📄 {t("downloadPdf")}</Link>
            <Link className="btn o w" href="/candidate/share#hide-title">🙈 {t("hideFrom")}</Link>
            <PushCard variant="settings" who="candidate" />
            <AccountData who="candidate" />
            <SignOut />
          </div>
        </div>
      </main>
      <CandidateNav />
    </div>
  );
}
