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
  const locale = await getLocale();
  const [plans, featured] = await Promise.all([
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.candidateProfile.findMany({
      where: { status: "PUBLISHED", visibility: "EVERYONE", searchPaused: false, user: { suspendedAt: null }, videos: { some: { archivedAt: null, moderation: "APPROVED", processing: "READY" } } },
      select: { id: true, fullName: true, headline: true, isDemo: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
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
    <div className="shell">
      <div className="scr">
        <Header right={<Link className="btn sm o" href="/login">{t("login")}</Link>} />
        <main className="main">
          <section style={{ paddingTop: 8 }}>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="h1" style={{ marginTop: 8 }}>{t("headline")}</h1>
            <p className="p" style={{ fontSize: 16, marginTop: 10 }}>{t("lead")}</p>
            <div className="stack" style={{ marginTop: 18 }}>
              <Link className="btn w" href="/signup?role=candidate">{t("ctaCandidate")}</Link>
              <Link className="btn w m" href="/feed">{t("ctaEmployer")}</Link>
            </div>
            {featured.length ? (
              <>
                <div className="reels" style={{ marginTop: 20 }} aria-label={t("featured")}>
                  {featured.map((c) => (
                    <Link key={c.id} className="reel" href="/feed" style={{ textDecoration: "none" }}>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 700, opacity: 0.25 }} aria-hidden="true">{initialsOf(c.fullName)}</div>
                      <b>{c.fullName}</b><span>{c.headline}</span>
                    </Link>
                  ))}
                </div>
                {featured.some((c) => c.isDemo) ? <p className="note">{t("demoNote")}</p> : null}
              </>
            ) : null}
          </section>
          <section className="sec"><p className="eyebrow">{t("forCandidates")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("candTitle")}</h2>{steps("cand")}</section>
          <section className="sec"><p className="eyebrow">{t("forEmployers")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("empTitle")}</h2>{steps("emp")}</section>
          <section className="sec"><p className="eyebrow">{t("industriesEyebrow")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("industriesTitle")}</h2>
            <div className="wrap">{INDUSTRIES.filter((k) => k !== "other").map((k) => <Link key={k} className="sk" href={`/feed?industry=${k}`} style={{ textDecoration: "none" }}>{ti(k)}</Link>)}</div>
          </section>
          <section className="sec"><p className="eyebrow">{t("whyEyebrow")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("whyTitle")}</h2>
            <div className="stack">
              {(["why1", "why2", "why3"] as const).map((k) => <div key={k} className="card"><h3 className="h3">{t(k)}</h3><p className="p">{t(`${k}Sub`)}</p></div>)}
            </div>
          </section>
          <section className="sec"><p className="eyebrow">{t("plansEyebrow")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("plansTitle")}</h2>
            <div className="stack">
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
              <p className="note">{t("plansNote")}</p>
            </div>
          </section>
          <section className="sec"><p className="eyebrow">{t("faqEyebrow")}</p><h2 className="h2" style={{ margin: "6px 0 12px" }}>{t("faqTitle")}</h2>
            {[1, 2, 3, 4, 5].map((n) => <details key={n}><summary>{t(`faq${n}`)}</summary><p className="p">{t(`faq${n}A`)}</p></details>)}
          </section>
          <section className="cta">
            <h2 className="h2">{t("finalTitle")}</h2>
            <p className="p" style={{ marginTop: 6 }}>{t("finalBody")}</p>
            <div className="stack" style={{ marginTop: 14 }}>
              <Link className="btn w m" href="/signup?role=candidate">{t("ctaCandidate")}</Link>
              <Link className="btn w s" href="/signup?role=employer">{t("hiring")}</Link>
            </div>
          </section>
          <footer style={{ marginTop: 28, padding: "20px 0 8px", borderTop: "1px solid var(--bd)" }}>
            <span className="logo">Hireel</span>
            <div className="wrap" style={{ marginTop: 10, gap: 14 }}>
              <Link className="note" href="/privacy">{t("privacy")}</Link>
              <Link className="note" href="/terms">{t("terms")}</Link>
              <Link className="note" href="/privacy#contact">{t("contact")}</Link>
            </div>
            <p className="note" style={{ marginTop: 10 }}>© {new Date().getFullYear()} Hireel</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
