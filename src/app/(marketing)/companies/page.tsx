import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmployerCard } from "@/components/landing/TopEmployers";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteNav } from "@/components/landing/SiteNav";
import { prisma } from "@/lib/db";
import { bannerUrl, logoUrl } from "@/lib/logo";
import { categoryNamer } from "@/server/categories";
import { getViewer, homeFor } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("companiesList");
  return { title: t("metaTitle"), description: t("sub"), alternates: { canonical: "/companies" } };
}

/** Every company the Hireel team verified or chose for the homepage. Top employers come first, in their order. */
export default async function CompaniesPage() {
  const [t, catName, viewer] = await Promise.all([getTranslations("companiesList"), categoryNamer(), getViewer()]);
  const rows = await prisma.company.findMany({
    where: { status: { not: "SUSPENDED" }, OR: [{ status: "VERIFIED" }, { featuredRank: { not: null } }] },
    orderBy: [{ featuredRank: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    take: 200,
    select: { id: true, name: true, industry: true, status: true, logoUpdatedAt: true, bannerUpdatedAt: true, isDemo: true },
  });
  return (
    <div className="site2">
      <SiteNav account={viewer ? homeFor(viewer.role) : null} />
      <main className="wrapx" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <span className="pillx">{t("pill")}</span>
        <h1 className="lsec-title" style={{ marginTop: 12, fontSize: 34 }}>{t("title")}</h1>
        <p className="lsec-sub">{t("sub")}</p>
        {rows.length === 0 ? <div className="empty" style={{ marginTop: 18 }}>{t("empty")}</div> : (
          <div className="egrid">
            {rows.map((c) => <EmployerCard key={c.id} back="/companies" c={{ id: c.id, name: c.name, category: catName(c.industry), logo: logoUrl(c), banner: bannerUrl(c), verified: c.status === "VERIFIED", isDemo: c.isDemo }} />)}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
