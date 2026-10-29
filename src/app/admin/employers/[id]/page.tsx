import Link from "next/link";
import { categoryNamer } from "@/server/categories";
import { bannerUrl, logoUrl } from "@/lib/logo";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { periodStart } from "@/server/rules/plans";
import { requireAdmin } from "@/server/session";
import { AdminFrame } from "../../AdminFrame";
import { CompanyControls } from "../CompanyControls";
import { FeaturedControls } from "../../featured/FeaturedControls";
import { FEATURED_MAX } from "@/lib/categories";

/** Everything about one company: details, team, usage, every request sent, reports and history. */
export default async function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("admin");
  const ta = await getTranslations("adminC");
  const catName = await categoryNamer();
  const tr = await getTranslations("inbox.status");
  const locale = await getLocale();
  const fmt = await getFormatter();
  const date = (d: Date | null | undefined) => (d ? fmt.dateTime(d, { dateStyle: "medium", timeStyle: "short" }) : "—");

  const c = await prisma.company.findUnique({
    where: { id },
    include: {
      plan: true,
      members: { include: { user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, suspendedAt: true } }, _count: { select: { saved: true } } } },
      requests: { include: { candidate: { select: { id: true, fullName: true, headline: true } }, sender: { include: { user: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 },
      _count: { select: { requests: true, blocks: true, profileViews: true } },
    },
  });
  if (!c) notFound();

  const [plans, usage, reports, log, featuredCount] = await Promise.all([
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.usageLedger.groupBy({ by: ["kind"], where: { companyId: c.id, periodStart: periodStart(new Date()) }, _count: true }),
    prisma.report.findMany({ where: { targetType: "COMPANY", targetId: c.id }, orderBy: { createdAt: "desc" }, include: { reporter: { select: { email: true } } } }),
    prisma.auditLog.findMany({ where: { targetId: { in: [c.id, ...c.members.map((m) => m.user.id)] } }, orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { email: true } } } }),
    prisma.company.count({ where: { featuredRank: { not: null } } }),
  ]);
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "admin.view_company", targetType: "Company", targetId: c.id } });
  const used = (k: string) => usage.find((u) => u.kind === k)?._count ?? 0;
  const saved = c.members.reduce((a, m) => a + m._count.saved, 0);
  const accepted = c.requests.filter((r) => r.status === "ACCEPTED").length;
  const fact = (k: string, v: React.ReactNode) => <div><dt>{k}</dt><dd>{v || "—"}</dd></div>;

  return (
    <AdminFrame tab="employers">
      <Link href="/admin/employers" className="aback">← {ta("backCompanies")}</Link>
      {bannerUrl(c) ? <div className="chead-banner" style={{ backgroundImage: `url(${bannerUrl(c)})`, borderRadius: 20 }} /> : null}
      <div className="card ahead">
        <span className="arow-av lg">{logoUrl(c) ? <img src={logoUrl(c)!} alt="" style={{ objectFit: "contain", background: "#fff" }} /> : c.name.slice(0, 1)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="h2">{c.name} {c.isDemo ? <span className="demo-flag">Demo</span> : null}</h1>
          <p className="p">{[catName(c.industry), c.country, c.size].filter(Boolean).join(" · ")}</p>
          <div className="wrap" style={{ marginTop: 8 }}>
            <span className={`tag ${c.status === "VERIFIED" ? "" : c.status === "SUSPENDED" ? "bad" : "mute"}`}>{t(`companyStatus.${c.status}`)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="h3">{ta("actions")}</h2>
        <CompanyControls id={c.id} status={c.status} planId={c.planId} plans={plans.map((p) => ({ id: p.id, name: locale === "ar" ? p.nameAr : p.nameEn }))} />
        <h3 className="lbl">{ta("topEmployers")}</h3>
        <div className="sw">
          <p className="note" style={{ margin: 0 }}>{c.featuredRank ? ta("featuredAt", { n: c.featuredRank }) : ta("notFeatured", { n: featuredCount, max: FEATURED_MAX })}</p>
          <FeaturedControls id={c.id} featured={Boolean(c.featuredRank)} full={featuredCount >= FEATURED_MAX} />
        </div>
      </div>

      <div className="asplit">
        <section className="card">
          <h2 className="h3">{ta("companyInfo")}</h2>
          <dl className="afacts">
            {fact(ta("phone"), c.phone ? <a href={`tel:${c.phone.replace(/[^+0-9]/g, "")}`} dir="ltr">{c.phone}</a> : null)}
            {fact(ta("website"), c.website ? <a href={c.website} target="_blank" rel="noreferrer noopener">{c.website}</a> : null)}
            {[["LinkedIn", c.linkedinUrl], ["Instagram", c.instagramUrl], ["Facebook", c.facebookUrl]].map(([k, u]) => <div key={k}><dt>{k}</dt><dd>{u ? <a href={u} target="_blank" rel="noreferrer noopener nofollow">{u.replace(/^https:\/\/(www\.)?/, "")}</a> : "—"}</dd></div>)}
            {fact(ta("signedUp"), date(c.createdAt))}
            {fact(ta("updated"), date(c.updatedAt))}
            {fact(ta("limitsGroup"), locale === "ar" ? c.plan.nameAr : c.plan.nameEn)}
          </dl>
          <h3 className="lbl">{ta("description")}</h3>
          <p className="p apre">{c.description || "—"}</p>
        </section>

        <section className="card">
          <h2 className="h3">{ta("usage")}</h2>
          <dl className="afacts">
            {fact(ta("introMonth"), `${used("INTRO_REQUEST")} / ${c.plan.monthlyIntroRequests}`)}
            {fact(ta("cvMonth"), `${used("CV_CONTACT_REQUEST")} / ${c.plan.monthlyCvRequests}`)}
            {fact(ta("savedTotal"), `${saved} / ${c.plan.maxSaved}`)}
            {fact(ta("requestsTotal"), ta("requestsLine", { n: c._count.requests, accepted }))}
            {fact(ta("profilesOpened"), String(c._count.profileViews))}
            {fact(ta("blockedBy"), String(c._count.blocks))}
          </dl>
        </section>
      </div>

      <section className="card">
        <h2 className="h3">{ta("team")} · {c.members.length}</h2>
        <div className="atable">
          {c.members.map((m) => (
            <div key={m.id} className="atr">
              <span><b>{m.user.name}</b>{m.position ? <span className="note"> · {m.position}</span> : null}<br /><a href={`mailto:${m.user.email}`}>{m.user.email}</a></span>
              <span>{m.user.emailVerified ? <span className="tag">✓ {ta("emailOk")}</span> : <span className="tag warn">{ta("unverified")}</span>}{m.user.suspendedAt ? <span className="tag bad"> {ta("suspended")}</span> : null}</span>
              <span className="note">{date(m.user.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h3">{ta("requestsOut")} · {c._count.requests}</h2>
        {c.requests.length === 0 ? <p className="note">—</p> : (
          <div className="atable">
            {c.requests.map((r) => (
              <details key={r.id} className="atr-d">
                <summary className="atr">
                  <span><Link href={`/admin/candidates/${r.candidate.id}`}>{r.candidate.fullName}</Link><br /><span className="note">{r.roleTitle} · {ta("by", { name: r.sender.user.name })}</span></span>
                  <span><span className={`tag ${r.status === "ACCEPTED" ? "" : r.status === "DECLINED" ? "bad" : "mute"}`}>{tr(r.status)}</span>{r.wantsCv ? <span className="note"> · {ta("wantsCv")}</span> : null}</span>
                  <span className="note">{date(r.createdAt)}</span>
                </summary>
                <div className="atr-more">
                  <p className="p apre">{r.message}</p>
                  <p className="note">{[r.employment, r.workLocation, r.payRange].filter(Boolean).join(" · ")}</p>
                  {r.respondedAt ? <p className="note">{ta("answered")}: {date(r.respondedAt)}</p> : null}
                </div>
              </details>
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
