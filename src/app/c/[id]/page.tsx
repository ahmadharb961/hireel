import Link from "next/link";
import { categoryNamer } from "@/server/categories";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { EmployerNav } from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import { ProfileActions } from "@/components/employer/ProfileActions";
import { ProfileVideo } from "@/components/employer/ProfileVideo";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { quotaFor, savedCount } from "@/server/employer-data";
import { initialsOf, liveVideos, recordProfileView } from "@/server/profile-data";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { sharedContact } from "@/server/requests";
import { employerOrNull } from "@/server/session";

export const metadata = { robots: { index: false, follow: false } };

/** Full candidate profile. Employers only; contact details and CV only after the candidate accepts. */
export default async function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("profilePage");
  const ta = await getTranslations("availability");
  const catName = await categoryNamer();
  const emp = await employerOrNull();
  if (!emp) {
    return (
      <div className="shell"><div className="scr">
        <Header back="/feed" home="/feed" />
        <main className="main"><div className="card" style={{ textAlign: "center", padding: "28px 18px" }}>
          <h1 className="h2">{t("gateTitle")}</h1><p className="p" style={{ marginTop: 8 }}>{t("gateBody")}</p>
          <Link className="btn w" style={{ marginTop: 16 }} href="/signup?role=employer">{t("signup")}</Link>
        </div></main>
      </div></div>
    );
  }
  if (!(await rateLimit(`profile:${emp.viewer.id}`, 120, 3600)) || !(await rateLimit(`profile:ip:${await clientIp()}`, 200, 3600))) {
    return <div className="shell"><div className="scr"><Header back="/feed" home="/feed" /><main className="main"><p className="empty">{t("slowDown")}</p></main></div></div>;
  }
  const c = await prisma.candidateProfile.findFirst({
    where: { id, status: "PUBLISHED", user: { suspendedAt: null }, blocks: { none: { companyId: emp.company.id } } },
    include: { skills: { include: { skill: true } } },
  });
  if (!c) notFound();
  await recordProfileView(c.id, emp.company.id);
  const [videos, contact, saved, req, nSaved] = await Promise.all([
    liveVideos(c.id),
    sharedContact(emp.company.id, c.id),
    prisma.savedCandidate.findUnique({ where: { memberId_candidateId: { memberId: emp.member.id, candidateId: c.id } } }),
    prisma.introRequest.findFirst({ where: { companyId: emp.company.id, candidateId: c.id, status: { in: ["PENDING", "ACCEPTED"] } } }),
    savedCount(emp.member.id),
  ]);
  const quota = await quotaFor(emp, await getLocale());
  const tcv = await getTranslations("cvFile");
  const first = c.fullName.split(" ")[0];
  return (
    <div className="shell"><ToastProvider><div className="scr">
      <Header back="/feed" home="/feed" />
      <main className="main"><div className={`stack${c.profileType === "VIDEO" ? " split" : ""}`}>
        {c.profileType === "VIDEO" ? <div className="split-media"><ProfileVideo videos={videos} initials={initialsOf(c.fullName)} countViews demoLabel={c.isDemo ? t("demo") : undefined} /></div> : null}
        <div className="stack">
        <div>
          <span className="tag">{ta(c.availability)}</span>
          {c.isDemo ? <span className="demo-flag" style={{ marginInlineStart: 6 }}>{t("demo")}</span> : null}
          <h1 className="h2 pv-name" style={{ marginTop: 8 }}>{photoUrl(c) ? <img className="pv-av" src={photoUrl(c)!} alt="" /> : null}{c.fullName}</h1>
          <p className="p">{c.headline} · {t("years", { n: c.yearsExperience })} · {c.location}</p>
          <div className="wrap" style={{ marginTop: 10 }}>{c.skills.map((s) => <span key={s.skillId} className="sk">{s.skill.name}</span>)}</div>
        </div>
        {c.about ? <div className="card"><h2 className="h3">{t("about")}</h2><p className="p" style={{ whiteSpace: "pre-wrap" }}>{c.about}</p></div> : null}
        <div className="card">
          <div className="kv"><span>{t("current")}</span><b>{c.currentTitle}</b></div>
          <div className="kv"><span>{t("industry")}</span><b>{catName(c.industry)}</b></div>
        </div>
        <div className="card">
          <h2 className="h3">{t("cvTitle")}</h2>
          {contact ? (
            <>
              {contact.email ? <div className="kv"><span>{t("email")}</span><b dir="ltr">{contact.email}</b></div> : null}
              {contact.phone ? <div className="kv"><span>{t("phone")}</span><b dir="ltr">{contact.phone}</b></div> : null}
              {contact.workHistory ? <><h3 className="h3" style={{ marginTop: 10 }}>{t("workHistory")}</h3><p className="p" style={{ whiteSpace: "pre-wrap" }}>{contact.workHistory}</p></> : null}
              {contact.education ? <><h3 className="h3" style={{ marginTop: 10 }}>{t("education")}</h3><p className="p" style={{ whiteSpace: "pre-wrap" }}>{contact.education}</p></> : null}
              {contact.cvFileName ? <a className="btn sm" style={{ marginTop: 10 }} href={`/api/cv/${c.id}`}>⬇ {tcv("downloadCv")}</a> : null}
              {!contact.email && !contact.phone && !contact.workHistory && !contact.cvFileName ? <p className="p">{t("sharedNothing")}</p> : null}
            </>
          ) : <p className="p">🔒 {t("locked", { name: first })}</p>}
        </div>
        <p className="note">{t("visibleNote", { name: first })}</p>
        <ProfileActions candidate={{ id: c.id, name: c.fullName }} saved={Boolean(saved)} requested={Boolean(req)} quota={{ introLeft: quota.introLeft, cvLeft: quota.cvLeft, planName: quota.planName, isPremium: quota.isPremium }} />
        </div>
      </div></main>
      <EmployerNav savedCount={nSaved} />
    </div></ToastProvider></div>
  );
}
