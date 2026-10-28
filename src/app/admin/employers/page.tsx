import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/server/session";
import { AdminFrame } from "../AdminFrame";
import { CompanyControls } from "./CompanyControls";

export default async function EmployersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const t = await getTranslations("admin");
  const fmt = await getFormatter();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const status = (["UNVERIFIED", "VERIFIED", "SUSPENDED"] as const).find((s) => s === sp.status) ?? null;
  const ta = await getTranslations("adminC");
  const [companies, plans] = await Promise.all([
    prisma.company.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { members: { some: { user: { email: { contains: q, mode: "insensitive" } } } } }] } : {}),
      },
      include: { plan: true, members: { include: { user: { select: { email: true, name: true } } } }, _count: { select: { requests: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <AdminFrame tab="employers">
      <h1 className="h2">{t("employersTitle")}</h1>
      <form action="/admin/employers" method="get" role="search">{status ? <input type="hidden" name="status" value={status} /> : null}<input className="i" name="q" type="search" defaultValue={q} placeholder={t("searchCompanies")} aria-label={t("searchCompanies")} /></form>
      <div className="wrap">
        <Link className={`chip${!status ? " on" : ""}`} href={`/admin/employers${q ? `?q=${encodeURIComponent(q)}` : ""}`}>{ta("all")}</Link>
        {(["UNVERIFIED", "VERIFIED", "SUSPENDED"] as const).map((s) => <Link key={s} className={`chip${status === s ? " on" : ""}`} href={`/admin/employers?${new URLSearchParams({ ...(q ? { q } : {}), status: s })}`}>{t(`companyStatus.${s}`)}</Link>)}
      </div>
      {companies.length === 0 ? <div className="empty">{t("noCompanies")}</div> : companies.map((c) => (
        <div key={c.id} className="card">
          <div className="sw">
            <div>
              <h2 className="h3"><Link href={`/admin/employers/${c.id}`}>{c.name}</Link> {c.isDemo ? <span className="demo-flag">Demo</span> : null}</h2>
              <p className="p">{c.members.map((m) => `${m.user.name} · ${m.user.email}`).join(", ")}</p>
              <p className="note">{c.website || "—"} · {t("joined", { date: fmt.dateTime(c.createdAt, { dateStyle: "medium" }) })} · {t("requestsSent", { n: c._count.requests })}</p>
            </div>
            <span className={`tag ${c.status === "VERIFIED" ? "" : c.status === "SUSPENDED" ? "bad" : "mute"}`}>{t(`companyStatus.${c.status}`)}</span>
          </div>
          <Link className="btn sm o" style={{ marginTop: 10 }} href={`/admin/employers/${c.id}`}>{ta("openCompany")}</Link>
          <CompanyControls id={c.id} status={c.status} planId={c.planId} plans={plans.map((p) => ({ id: p.id, name: p.nameEn }))} />
        </div>
      ))}
    </AdminFrame>
  );
}
