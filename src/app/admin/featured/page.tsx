import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { FEATURED_MAX } from "@/lib/categories";
import { logoUrl } from "@/lib/logo";
import { categoryNamer } from "@/server/categories";
import { requireAdmin } from "@/server/session";
import { AdminFrame } from "../AdminFrame";
import { FeaturedControls } from "./FeaturedControls";
import { TopSwitch } from "./TopSwitch";
import { topEmployersVisible } from "@/server/admin-content";

/** Choose which companies appear under "Top employers" on the homepage, and in what order. */
export default async function FeaturedAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const t = await getTranslations("adminFeat");
  const catName = await categoryNamer();
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const select = { id: true, name: true, industry: true, status: true, logoUpdatedAt: true, featuredRank: true } as const;
  const [featured, others] = await Promise.all([
    prisma.company.findMany({ where: { featuredRank: { not: null } }, orderBy: { featuredRank: "asc" }, select }),
    prisma.company.findMany({
      where: { featuredRank: null, status: { not: "SUSPENDED" }, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) },
      // Verified companies first: they're the safest to promote.
      orderBy: [{ status: "desc" }, { createdAt: "desc" }],
      take: 30,
      select,
    }),
  ]);
  const full = featured.length >= FEATURED_MAX;
  const row = (c: (typeof featured)[number], i?: number) => (
    <div key={c.id} className="frow">
      {i !== undefined ? <span className="frow-n">{i + 1}</span> : null}
      <span className="clogo-wrap">{logoUrl(c) ? <img className="clogo" src={logoUrl(c)!} alt="" /> : <span className="clogo ini">{c.name.slice(0, 1)}</span>}</span>
      <span className="frow-txt">
        <b><Link href={`/admin/employers/${c.id}`} style={{ color: "inherit" }}>{c.name}</Link></b>
        <span>{[catName(c.industry), c.status === "VERIFIED" ? `✓ ${t("verified")}` : t(c.status === "SUSPENDED" ? "suspended" : "notVerified")].filter(Boolean).join(" · ")}</span>
      </span>
      <FeaturedControls id={c.id} featured={i !== undefined} first={i === 0} last={i === featured.length - 1} full={full} />
    </div>
  );

  return (
    <AdminFrame tab="featured">
      <div><h1 className="h2">{t("title")}</h1><p className="p">{t("sub", { max: FEATURED_MAX })}</p></div>
      <section className="card"><TopSwitch initial={await topEmployersVisible()} /></section>
      <section className="card">
        <div className="sw"><h2 className="h3">{t("onHomepage", { n: featured.length, max: FEATURED_MAX })}</h2><Link className="btn sm g" href="/#top-employers" target="_blank">{t("preview")}</Link></div>
        {featured.length === 0 ? <p className="note">{t("none")}</p> : <div className="stack" style={{ gap: 8, marginTop: 10 }}>{featured.map((c, i) => row(c, i))}</div>}
        {featured.some((c) => c.status === "SUSPENDED") ? <p className="note" style={{ marginTop: 8 }}>{t("suspendedHidden")}</p> : null}
      </section>
      <section className="card">
        <h2 className="h3">{t("addTitle")}</h2>
        {full ? <p className="note">{t("fullNote", { max: FEATURED_MAX })}</p> : null}
        <form className="row" action="/admin/featured" method="get" role="search" style={{ marginTop: 8 }}>
          <input className="i" name="q" type="search" defaultValue={q} placeholder={t("search")} aria-label={t("search")} />
          <button className="btn sm" type="submit">{t("find")}</button>
        </form>
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          {others.length === 0 ? <p className="note">{t("noMatch")}</p> : others.map((c) => row(c))}
        </div>
      </section>
    </AdminFrame>
  );
}
