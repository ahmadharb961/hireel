import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { requireAdmin } from "@/server/session";
import { signedPlayback } from "@/server/videos";
import { AdminFrame } from "../../AdminFrame";
import { AdminVideo } from "../../AdminVideo";
import { CandidateControls } from "./CandidateControls";

/** Everything about one candidate, including private details. Each visit is written to the audit log. */
export default async function CandidateDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const ta = await getTranslations("adminC");
  const ti = await getTranslations("industries");
  const tv = await getTranslations("availability");
  const tl = await getTranslations("languages");
  const tr = await getTranslations("inbox.status");
  const fmt = await getFormatter();
  const date = (d: Date | null | undefined) => (d ? fmt.dateTime(d, { dateStyle: "medium", timeStyle: "short" }) : "—");

  const c = await prisma.candidateProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, emailVerified: true, createdAt: true, locale: true, suspendedAt: true } },
      skills: { include: { skill: true } },
      videos: { orderBy: [{ archivedAt: "asc" }, { isPrimary: "desc" }, { createdAt: "desc" }] },
      shareLink: true,
      cvFile: { select: { fileName: true, size: true, createdAt: true } },
      requests: { include: { company: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 50 },
      _count: { select: { saves: true, blocks: true, profileViews: true } },
    },
  });
  if (!c) notFound();

  const [reports, log] = await Promise.all([
    prisma.report.findMany({ where: { targetType: "CANDIDATE", targetId: c.id }, orderBy: { createdAt: "desc" }, include: { reporter: { select: { email: true } } } }),
    prisma.auditLog.findMany({ where: { targetType: { in: ["CandidateProfile", "CANDIDATE", "Video", "User"] }, targetId: { in: [c.id, c.user.id, ...c.videos.map((v) => v.id)] } }, orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { email: true } } } }),
  ]);
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "admin.view_candidate", targetType: "CandidateProfile", targetId: c.id } });

  const videos = await Promise.all(c.videos.map(async (v) => ({ v, play: v.processing === "READY" ? await signedPlayback(v) : null })));
  const fact = (k: string, v: React.ReactNode) => <div><dt>{k}</dt><dd>{v || "—"}</dd></div>;

  return (
    <AdminFrame tab="candidates">
      <Link href="/admin/candidates" className="aback">← {ta("back")}</Link>
      <div className="card ahead">
        <span className="arow-av lg">{photoUrl(c) ?? videos[0]?.play?.poster ? <img src={(photoUrl(c) ?? videos[0]?.play?.poster)!} alt="" /> : c.fullName.slice(0, 1)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="h2">{c.fullName || "—"} {c.isDemo ? <span className="demo-flag">Demo</span> : null}</h1>
          <p className="p">{c.headline || "—"}</p>
          <div className="wrap" style={{ marginTop: 8 }}>
            <span className={`tag ${c.status === "PUBLISHED" ? "" : "mute"}`}>{ta(`status.${c.status}`)}</span>
            <span className="tag mute">{c.visibility === "EVERYONE" ? ta("visEveryone") : ta("visEmployers")}</span>
            {c.searchPaused ? <span className="tag warn">{ta("paused")}</span> : null}
            {c.user.suspendedAt ? <span className="tag bad">{ta("suspended")}</span> : null}
            {c.profileType === "TEXT_ONLY" ? <span className="tag mute">{ta("textOnly")}</span> : null}
          </div>
        </div>
      </div>

      <CandidateControls id={c.id} suspended={Boolean(c.user.suspendedAt)} published={c.status === "PUBLISHED"} hasPhoto={Boolean(c.photoUpdatedAt)} />

      <div className="asplit">
        <section className="card">
          <h2 className="h3">{ta("account")}</h2>
          <dl className="afacts">
            {fact(ta("loginEmail"), <>{c.user.email} {c.user.emailVerified ? <span className="tag">✓</span> : <span className="tag warn">{ta("unverified")}</span>}</>)}
            {fact(ta("signedUp"), date(c.user.createdAt))}
            {fact(ta("updated"), date(c.updatedAt))}
            {fact(ta("language"), c.user.locale === "ar" ? "العربية" : "English")}
            {fact(ta("publishConsent"), date(c.publishConsentAt))}
            {fact(ta("onboarding"), `${c.onboardingStep} / 6`)}
          </dl>
        </section>

        <section className="card aprivate">
          <h2 className="h3">🔒 {ta("contact")}</h2>
          <p className="note">{ta("privateNote")}</p>
          <dl className="afacts">
            {fact(ta("phone"), c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : null)}
            {fact(ta("contactEmail"), c.contactEmail ? <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a> : null)}
          </dl>
        </section>
      </div>

      <section className="card">
        <h2 className="h3">{ta("profile")}</h2>
        <dl className="afacts">
          {fact(ta("currentTitle"), c.currentTitle)}
          {fact(ta("industry"), c.industry ? (ti.has(c.industry) ? ti(c.industry) : c.industry) : null)}
          {fact(ta("years"), String(c.yearsExperience))}
          {fact(ta("availability"), tv.has(c.availability) ? tv(c.availability) : c.availability)}
          {fact(ta("location"), c.location)}
          {fact(ta("stats"), ta("statsLine", { saves: c._count.saves, views: c._count.profileViews, blocks: c._count.blocks }))}
        </dl>
        <h3 className="lbl">{ta("skills")}</h3>
        <div className="wrap">{c.skills.length ? c.skills.map((s) => <span key={s.skillId} className="sk">{s.skill.name}</span>) : <span className="note">—</span>}</div>
        <h3 className="lbl">{ta("about")}</h3>
        <p className="p apre">{c.about || "—"}</p>
      </section>

      <section className="card aprivate">
        <h2 className="h3">🔒 {ta("cv")}</h2>
        <p className="note">{ta("cvNote")}</p>
        <h3 className="lbl">{ta("cvFile")}</h3>
        {c.cvFile ? (
          <p className="p"><a className="btn sm" href={`/api/cv/${c.id}`}>⬇ {c.cvFile.fileName}</a> <span className="note">{Math.max(1, Math.round(c.cvFile.size / 1024))} KB · {date(c.cvFile.createdAt)}</span></p>
        ) : <p className="note">{ta("noCvFile")}</p>}
        <h3 className="lbl">{ta("workHistory")}</h3>
        <p className="p apre">{c.workHistory || "—"}</p>
        <h3 className="lbl">{ta("education")}</h3>
        <p className="p apre">{c.education || "—"}</p>
      </section>

      <section className="card">
        <h2 className="h3">{ta("videos")} · {c.videos.length}</h2>
        {c.videos.length === 0 ? <p className="note">{ta("noVideos")}</p> : (
          <div className="avids">
            {videos.map(({ v, play }) => (
              <div key={v.id} className={`avid${v.archivedAt ? " old" : ""}`}>
                <AdminVideo hls={play?.hls ?? null} poster={play?.poster ?? null} landscape={Boolean(v.width && v.height && v.width > v.height)} />
                <div className="avid-info">
                  <b>{tl(v.language)}{v.isPrimary ? " ★" : ""}{v.durationSec ? ` · ${Math.floor(v.durationSec / 60)}:${String(v.durationSec % 60).padStart(2, "0")}` : ""}</b>
                  <div className="wrap">
                    <span className={`tag ${v.moderation === "APPROVED" ? "" : v.moderation === "REJECTED" ? "bad" : "warn"}`}>{ta(`mod.${v.moderation}`)}</span>
                    {v.processing !== "READY" ? <span className="tag mute">{ta(`proc.${v.processing}`)}</span> : null}
                    {v.archivedAt ? <span className="tag mute">{ta("archived")}</span> : null}
                  </div>
                  <span className="note">{ta("uploaded")}: {date(v.createdAt)}</span>
                  <span className="note">{ta("consentAt")}: {date(v.consentAt)}</span>
                  <span className="note">{ta("viewsN", { n: v.viewCount })}</span>
                  {v.rejectionReason ? <span className="note">{ta("reason")}: {v.rejectionReason.replace("::", " — ")}</span> : null}
                  {v.moderation === "PENDING" && v.processing === "READY" && !v.archivedAt ? <Link className="btn sm" href="/admin/videos">{ta("review")}</Link> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="h3">{ta("shareLink")}</h2>
        <p className="p">{c.shareLink?.enabled ? <a href={`/p/${c.shareLink.token}`} target="_blank" rel="noreferrer">/p/{c.shareLink.token}</a> : ta("shareOff")}</p>
      </section>

      <section className="card">
        <h2 className="h3">{ta("requestsIn")} · {c.requests.length}</h2>
        {c.requests.length === 0 ? <p className="note">—</p> : (
          <div className="atable">
            {c.requests.map((r) => (
              <div key={r.id} className="atr">
                <span><Link href={`/admin/employers/${r.company.id}`}>{r.company.name}</Link><br /><span className="note">{r.roleTitle}{r.wantsCv ? ` · ${ta("wantsCv")}` : ""}</span></span>
                <span><span className={`tag ${r.status === "ACCEPTED" ? "" : r.status === "DECLINED" ? "bad" : "mute"}`}>{tr(r.status)}</span>{r.status === "ACCEPTED" ? <span className="note"> {ta("shared", { what: [r.shareEmail && ta("email"), r.sharePhone && ta("phone"), r.shareCv && ta("cv")].filter(Boolean).join(", ") || "—" })}</span> : null}</span>
                <span className="note">{date(r.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="h3">{ta("reportsAbout")} · {reports.length}</h2>
        {reports.length === 0 ? <p className="note">—</p> : reports.map((r) => (
          <p key={r.id} className="p"><span className={`tag ${r.status === "OPEN" ? "warn" : "mute"}`}>{r.status}</span> {r.reason}{r.details ? ` — ${r.details}` : ""} <span className="note">· {r.reporter.email} · {date(r.createdAt)}</span></p>
        ))}
      </section>

      <section className="card">
        <h2 className="h3">{ta("history")}</h2>
        {log.length === 0 ? <p className="note">—</p> : log.map((l) => <p key={l.id} className="note">{date(l.createdAt)} · {l.actor.email} · {l.action}{l.reason ? ` — ${l.reason}` : ""}</p>)}
      </section>
      <p className="note">{ta("viewLogged")}</p>
    </AdminFrame>
  );
}
