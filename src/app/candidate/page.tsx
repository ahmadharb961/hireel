import Link from "next/link";
import { PushCard } from "@/components/PushCard";
import { getTranslations } from "next-intl/server";
import { CandidateNav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { completion, pendingRequestCount, requireOnboardedCandidate, studioVideos } from "@/server/candidate-data";
import { PUBLIC_VIEW_THRESHOLD } from "@/server/rules/views";
import { CandidateHeader } from "./CandidateHeader";

export default async function CandidateHome() {
  const { profile } = await requireOnboardedCandidate();
  const t = await getTranslations("candidate");
  const tl = await getTranslations("languages");
  const ts = await getTranslations("videoStatus");
  const [videos, skills, profileViews, saves, requests, pending] = await Promise.all([
    studioVideos(profile.id),
    prisma.candidateSkill.count({ where: { candidateId: profile.id } }),
    prisma.profileView.count({ where: { candidateId: profile.id } }),
    prisma.savedCandidate.count({ where: { candidateId: profile.id } }),
    prisma.introRequest.count({ where: { candidateId: profile.id } }),
    pendingRequestCount(profile.id),
  ]);
  const { pct, next } = completion(profile, skills, videos.some((v) => v.status === "live"));
  const firstName = profile.fullName.split(" ")[0];
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} />
      <main className="main">
        <div className="stack">
          <div>
            <h1 className="h2">{t("welcome", { name: firstName })}</h1>
            <p className="p">{t("welcomeSub")}</p>
          </div>
          {profile.status === "PUBLISHED" ? <PushCard variant="prompt" who="candidate" /> : null}
          <div className="card">
            <h2 className="h3">{t("complete", { pct })}</h2>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <p className="p">{next ? t(`next.${next}`) : t("next.done")}</p>
          </div>
          {pending ? (
            <Link className="list-row" href="/candidate/requests">
              <div className="thumb" style={{ height: 54 }}>{pending}</div>
              <div className="t"><b>{t("newRequests", { n: pending })}</b><span>{t("newRequestsSub")}</span></div>
            </Link>
          ) : null}
          <div className="grid3">
            <div className="stat"><b>{profileViews}</b><span>{t("stats.profileViews")}</span></div>
            <div className="stat"><b>{saves}</b><span>{t("stats.saves")}</span></div>
            <div className="stat"><b>{requests}</b><span>{t("stats.requests")}</span></div>
          </div>
          <div className="card">
            <h2 className="h3">{t("videoViews")}</h2>
            {profile.profileType === "TEXT_ONLY" ? <p className="p">{t("textOnlyViews")}</p> : null}
            {videos.length === 0 && profile.profileType !== "TEXT_ONLY" ? <p className="p">{t("noVideoViews")}</p> : null}
            {videos.map((v) => (
              <div key={v.id} className="sw" style={{ padding: "8px 0", borderBottom: "1px solid var(--bd)" }}>
                <div>
                  <p className="p"><b style={{ color: "var(--tx)" }}>{tl(v.lang)}</b>{v.primary ? ` · ${t("primary")}` : ""}</p>
                  <span className={`tag ${v.status === "live" ? "" : v.status === "rejected" || v.status === "failed" ? "bad" : "warn"}`}>{ts(v.status)}</span>
                </div>
                <p className="p" style={{ textAlign: "end" }}>
                  {v.status === "live" ? (
                    <>
                      <b style={{ color: "var(--tx)", fontVariantNumeric: "tabular-nums" }}>{v.views}</b> {t("views")}
                      {v.views < PUBLIC_VIEW_THRESHOLD ? <><br /><span className="note">{t("publicFrom", { n: PUBLIC_VIEW_THRESHOLD })}</span></> : null}
                    </>
                  ) : <span className="note">{t("countingStarts")}</span>}
                </p>
              </div>
            ))}
            <p className="note" style={{ marginTop: 8 }}>{t("viewRule")}</p>
          </div>
          {profile.status !== "PUBLISHED" ? (
            <div className="card" style={{ background: "var(--warnbg)", borderColor: "transparent" }}>
              <h2 className="h3" style={{ color: "var(--warn)" }}>{t("unpublishedTitle")}</h2>
              <p className="p">{t("unpublishedBody")}</p>
            </div>
          ) : profile.searchPaused ? (
            <div className="card" style={{ background: "var(--warnbg)", borderColor: "transparent" }}>
              <h2 className="h3" style={{ color: "var(--warn)" }}>{t("pausedTitle")}</h2>
              <p className="p">{t("pausedBody")}</p>
            </div>
          ) : null}
        </div>
      </main>
      <CandidateNav />
    </div>
  );
}
