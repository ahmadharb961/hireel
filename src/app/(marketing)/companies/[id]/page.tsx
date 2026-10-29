import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { LIcon } from "@/components/landing/icons";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteNav } from "@/components/landing/SiteNav";
import { prisma } from "@/lib/db";
import { bannerUrl, logoUrl } from "@/lib/logo";
import { siteLink } from "@/lib/social";
import { categoryNamer } from "@/server/categories";
import { getViewer, homeFor } from "@/server/session";

const load = cache((id: string) => prisma.company.findFirst({ where: { id, status: { not: "SUSPENDED" } } }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await load((await params).id);
  if (!c) return {};
  const t = await getTranslations("companyPage");
  return {
    title: t("metaTitle", { name: c.name }),
    description: c.description.slice(0, 160) || t("metaDescription", { name: c.name }),
    // Only companies the Hireel team checked or chose appear in search engines.
    robots: c.status === "VERIFIED" || c.featuredRank ? undefined : { index: false, follow: false },
    openGraph: logoUrl(c) ? { images: [logoUrl(c)!] } : undefined,
  };
}

/** A company's public page, opened from "Top employers" on the homepage. */
export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await load(id);
  if (!c) notFound();
  const [t, fmt, catName, viewer] = await Promise.all([getTranslations("companyPage"), getFormatter(), categoryNamer(), getViewer()]);
  const site = siteLink(c.website);
  const verified = c.status === "VERIFIED";
  const socials = ([["linkedin", c.linkedinUrl, "LinkedIn"], ["instagram", c.instagramUrl, "Instagram"], ["facebook", c.facebookUrl, "Facebook"]] as const).filter(([, u]) => u);

  return (
    <div className="site2">
      <SiteNav account={viewer ? homeFor(viewer.role) : null} />
      <main className="wrapx cpage">
        <Link className="cpage-back" href="/companies"><LIcon name="arrow" size={16} className="cpage-backic" /> {t("back")}</Link>
        <article className="cpage-card">
          <div className="cpage-banner" style={bannerUrl(c) ? { backgroundImage: `url(${bannerUrl(c)})` } : undefined} />
          <div className="cpage-body">
            <span className="cpage-logo">{logoUrl(c) ? <img src={logoUrl(c)!} alt="" /> : c.name.slice(0, 1)}</span>
            <h1 className="cpage-name">{c.name} {verified ? <span className="tag">✓ {t("verified")}</span> : null} {c.isDemo ? <span className="demo-flag">Demo</span> : null}</h1>
            <p className="cpage-meta">{[catName(c.industry), c.country].filter(Boolean).join(" · ")}</p>

            <div className="cpage-grid">
              <section>
                <h2>{t("about")}</h2>
                {c.description ? <p className="cpage-desc" dir="auto">{c.description}</p> : <p className="note">{t("noDescription")}</p>}
              </section>
              <aside className="cpage-facts">
                <div className="kv"><span>{t("website")}</span><b>{site ? <a href={site.href} target="_blank" rel="noopener noreferrer nofollow">{site.label} ↗</a> : "—"}</b></div>
                {c.phone ? (
                  <div className="kv"><span>{t("phone")}</span><b dir="ltr">{viewer ? <a href={`tel:${c.phone.replace(/[^+0-9]/g, "")}`}>{c.phone}</a> : <Link href="/login">{t("phoneSignIn")}</Link>}</b></div>
                ) : null}
                <div className="kv"><span>{t("industry")}</span><b>{catName(c.industry) || "—"}</b></div>
                <div className="kv"><span>{t("size")}</span><b>{c.size ? t("employees", { size: c.size }) : "—"}</b></div>
                <div className="kv"><span>{t("country")}</span><b>{c.country || "—"}</b></div>
                <div className="kv"><span>{t("since")}</span><b>{fmt.dateTime(c.createdAt, { month: "long", year: "numeric" })}</b></div>
                {socials.length ? (
                  <div className="csocial">
                    {socials.map(([k, u, label]) => <a key={k} href={u} target="_blank" rel="noopener noreferrer nofollow"><LIcon name={k} size={18} /><span>{label}</span></a>)}
                  </div>
                ) : null}
                <p className="note" style={{ marginTop: 10 }}>{verified ? t("verifiedExplain") : t("notVerifiedExplain")}</p>
              </aside>
            </div>

            {!viewer ? (
              <div className="cpage-cta">
                <p>{t("ctaText", { name: c.name })}</p>
                <Link className="btn" href="/signup?role=candidate">{t("ctaButton")}</Link>
              </div>
            ) : null}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
