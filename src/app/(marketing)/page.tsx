import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db";
import { INDUSTRIES } from "@/lib/constants";
import { initialsOf } from "@/server/profile-data";
import { getViewer, homeFor } from "@/server/session";

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));
  const t = await getTranslations("home");
  const ti = await getTranslations("industries");
  const tf = await getTranslations("feed");
  const locale = await getLocale();
  const [plans, featured] = await Promise.all([
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.candidateProfile.findMany({
      where: { status: "PUBLISHED", visibility: "EVERYONE", searchPaused: false, user: { suspendedAt: null }, videos: { some: { archivedAt: null, moderation: "APPROVED", processing: "READY" } } },
      select: { id: true, fullName: true, headline: true, isDemo: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);
  const steps = (k: "cand" | "emp") => (
    <ol className="steps">
      {[1, 2, 3].map((n) => (
        <li key={n}><span className="n">{n}</span><div><b>{t(`${k}${n}`)}</b><span>{t(`${k}${n}Sub`)}</span></div></li>
      ))}
    </ol>
  );
  return (
    <div className="shell site">
      <div className="scr">
        <Header right={<Link className="btn sm o" href="/login">{t("login")}</Link>} />
        <main className="main">
          {/* Banner: the promise on one side, the product on the other. */}
          <section className="hero-band">
            <div className="wrapx hero-grid">
              <div className="hero-copy">
                <p className="hero-eyebrow">{t("eyebrow")}</p>
                <h1 className="h1">{t("headline")}</h1>
                <p className="lead">{t("lead")}</p>
                <div className="stack ctas">
                  <Link className="btn w m" href="/signup?role=candidate">{t("ctaCandidate")}</Link>
                  <Link className="btn w s" href="/feed">{t("ctaEmployer")}</Link>
                </div>
                <p className="hero-note">{t("heroNote")}</p>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="phone">
                  <div className="phone-screen">
                    <svg className="silhouette" viewBox="0 0 200 260"><circle cx="100" cy="92" r="46" /><path d="M20 260c0-62 36-98 80-98s80 36 80 98z" /></svg>
                    <div className="phone-top"><span className="pill">{t("mockLang")}</span><span className="pill">🔇</span></div>
                    <div className="phone-info">
                      <span className="avail">{t("mockAvail")}</span>
                      <b className="phone-name">{t("mockName")}</b>
                      <span className="phone-role">{t("mockRole")}</span>
                      <div className="skills"><span>{t("mockSkill1")}</span><span>{t("mockSkill2")}</span><span>{t("mockSkill3")}</span></div>
                      <div className="phone-actions"><span>{tf("save")}</span><span>{tf("profile")}</span><span className="pri">{tf("requestIntro")}</span></div>
                    </div>
                  </div>
                </div>
                <span className="float f1">🔒 {t("float1")}</span>
                <span className="float f2">🎬 {t("float2")}</span>
                <span className="float f3">✓ {t("float3")}</span>
              </div>
            </div>
          </section>

          <div className="wrapx">
            <ul className="promises">
              {(["why1", "why2", "why3"] as const).map((k, i) => (
                <li key={k}><span className="pi" aria-hidden="true">{["⚡", "⚖️", "🔒"][i]}</span><div><b>{t(k)}</b><span>{t(`${k}Sub`)}</span></div></li>
              ))}
            </ul>

            <div className="how">
              <section className="card how-card"><p className="eyebrow">{t("forCandidates")}</p><h2 className="h2" style={{ margin: "6px 0 14px" }}>{t("candTitle")}</h2>{steps("cand")}
                <Link className="btn w" style={{ marginTop: 18 }} href="/signup?role=candidate">{t("ctaCandidate")}</Link></section>
              <section className="card how-card"><p className="eyebrow">{t("forEmployers")}</p><h2 className="h2" style={{ margin: "6px 0 14px" }}>{t("empTitle")}</h2>{steps("emp")}
                <Link className="btn w g" style={{ marginTop: 18 }} href="/feed">{t("ctaEmployer")}</Link></section>
            </div>

            {featured.length ? (
              <section className="sec">
                <p className="eyebrow">{t("featured")}</p>
                <div className="reels" style={{ marginTop: 12 }}>
                  {featured.map((c) => (
                    <Link key={c.id} className="reel" href="/feed" style={{ textDecoration: "none" }}>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 700, opacity: 0.25 }} aria-hidden="true">{initialsOf(c.fullName)}</div>
                      <b>{c.fullName}</b><span>{c.headline}</span>
                    </Link>
                  ))}
                </div>
                {featured.some((c) => c.isDemo) ? <p className="note">{t("demoNote")}</p> : null}
              </section>
            ) : null}

            <section className="sec"><p className="eyebrow">{t("industriesEyebrow")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("industriesTitle")}</h2>
              <div className="wrap">{INDUSTRIES.filter((k) => k !== "other").map((k) => <Link key={k} className="sk" href={`/feed?industry=${k}`} style={{ textDecoration: "none" }}>{ti(k)}</Link>)}</div>
            </section>

            <section className="sec"><p className="eyebrow">{t("plansEyebrow")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("plansTitle")}</h2>
              <div className="stack plans-grid">
                {plans.map((p) => (
                  <div key={p.id} className={`card price${p.key !== "free" ? " hi" : ""}`}>
                    <h3 className="h3">{locale === "ar" ? p.nameAr : p.nameEn}</h3>
                    <div className="amt">{locale === "ar" ? p.priceLabelAr : p.priceLabelEn}</div>
                    <ul>
                      <li>{t("planBrowse")}</li>
                      <li>{t("planIntro", { n: p.monthlyIntroRequests })}</li>
                      <li>{t("planCv", { n: p.monthlyCvRequests })}</li>
                      <li>{t("planSaved", { n: p.maxSaved })}</li>
                    </ul>
                  </div>
                ))}
              </div>
              <p className="note" style={{ marginTop: 12 }}>{t("plansNote")}</p>
            </section>

            <section className="sec faq"><p className="eyebrow">{t("faqEyebrow")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("faqTitle")}</h2>
              {[1, 2, 3, 4, 5].map((n) => <details key={n}><summary>{t(`faq${n}`)}</summary><p className="p">{t(`faq${n}A`)}</p></details>)}
            </section>

            <section className="cta">
              <div>
                <h2 className="h2">{t("finalTitle")}</h2>
                <p className="p" style={{ marginTop: 6 }}>{t("finalBody")}</p>
              </div>
              <div className="stack ctas" style={{ marginTop: 14 }}>
                <Link className="btn w m" href="/signup?role=candidate">{t("ctaCandidate")}</Link>
                <Link className="btn w s" href="/signup?role=employer">{t("hiring")}</Link>
              </div>
            </section>
            <footer style={{ marginTop: 28, padding: "20px 0 24px", borderTop: "1px solid var(--bd)" }}>
              <span className="logo">Hireel</span>
              <div className="wrap" style={{ marginTop: 10, gap: 14 }}>
                <Link className="note" href="/privacy">{t("privacy")}</Link>
                <Link className="note" href="/terms">{t("terms")}</Link>
                <Link className="note" href="/privacy#contact">{t("contact")}</Link>
              </div>
              <p className="note" style={{ marginTop: 10 }}>© {new Date().getFullYear()} Hireel</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
