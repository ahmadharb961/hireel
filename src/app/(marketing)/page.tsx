import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CategoryStrip } from "@/components/landing/CategoryStrip";
import { EmployerSearch } from "@/components/landing/EmployerSearch";
import { LIcon } from "@/components/landing/icons";
import { SiteNav } from "@/components/landing/SiteNav";
import { Logo } from "@/components/Logo";
import { prisma } from "@/lib/db";
import { featuredCandidates } from "@/server/landing-data";
import { initialsOf } from "@/server/profile-data";
import { getViewer, homeFor } from "@/server/session";

export const metadata = { alternates: { canonical: "/" } };

function fmtDur(s: number | null) {
  return s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null;
}

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));
  const t = await getTranslations("landing");
  const th = await getTranslations("home");
  const locale = await getLocale();
  const [plans, featured] = await Promise.all([prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }), featuredCandidates(6)]);

  return (
    <div className="site2">
      <SiteNav />
      <main>
        {/* ---------- Hero ---------- */}
        <section className="h2-hero">
          <div className="h2-blob" aria-hidden="true" />
          <div className="wrapx h2-grid">
            <div className="h2-copy">
              <span className="pillx">{t("hero.pill")}</span>
              <h1 className="h2-title">{t("hero.title1")} <br className="br-desk" />{t("hero.title2")} <br className="br-desk" /><span>{t("hero.title3")}</span></h1>
              <p className="h2-lead">{t("hero.lead")}</p>
              <div className="h2-ctas">
                <Link className="btn h2-cta" href="/signup?role=candidate">{t("hero.ctaCandidate")} <LIcon name="arrow" size={18} className="flipx" /></Link>
                <Link className="btn o h2-cta2" href="/feed">{t("hero.ctaEmployer")} <LIcon name="arrow" size={18} className="flipx" /></Link>
              </div>
              <p className="h2-note"><span className="h2-dot" aria-hidden="true" /> {t("hero.note")}</p>
            </div>
            <div className="h2-art" aria-hidden="true">
              <figure className="pcard pc1"><img src="/photos/p2.jpg" alt="" /><figcaption><b>{t("hero.c2Role")}</b><span>{t("hero.c2Meta")}</span></figcaption><span className="pcard-play"><LIcon name="play" fill size={14} /></span></figure>
              <figure className="pcard pc2"><img src="/photos/p1.jpg" alt="" /><figcaption><b>{t("hero.c1Role")}</b><span>{t("hero.c1Meta")}</span></figcaption><span className="pcard-play"><LIcon name="play" fill size={16} /></span></figure>
              <figure className="pcard pc3"><img src="/photos/p3.jpg" alt="" /><figcaption><b>{t("hero.c3Role")}</b><span>{t("hero.c3Meta")}</span></figcaption><span className="pcard-play"><LIcon name="play" fill size={14} /></span></figure>
              <p className="hand"><span>{t("hero.hand1")}</span><span>{t("hero.hand2")}</span><span>{t("hero.hand3")}</span></p>
              <svg className="hand-arrow" viewBox="0 0 60 40"><path d="M56 6C40 4 22 10 8 30" /><path d="M8 30l1-11M8 30l10-3" /></svg>
            </div>
          </div>
        </section>

        <div className="wrapx">
          <CategoryStrip />

          {/* ---------- Featured talent (real candidates only) ---------- */}
          <section className="lsec" id="for-employers">
            <div className="lsec-head">
              <div><h2 className="lsec-title">{t("featured.title")}</h2><p className="lsec-sub">{t("featured.sub")}</p></div>
              <Link className="lsec-link" href="/feed">{t("featured.viewAll")} <LIcon name="arrow" size={16} className="flipx" /></Link>
            </div>
            {featured.length ? (
              <div className="ftalent">
                {featured.map((c) => (
                  <Link key={c.id} href="/feed" className="tcard" aria-label={t("featured.watch", { name: c.name })}>
                    <div className="tcard-media">
                      {c.poster ? <img src={c.poster} alt="" loading="lazy" /> : <span className="tcard-ini">{initialsOf(c.name)}</span>}
                      <span className="tcard-play"><LIcon name="play" fill size={18} /></span>
                      {fmtDur(c.duration) ? <span className="tcard-dur">{fmtDur(c.duration)}</span> : null}
                      <span className="tcard-save"><LIcon name="bookmark" size={16} /></span>
                      {c.isDemo ? <span className="tcard-demo">{t("featured.demo")}</span> : null}
                    </div>
                    <div className="tcard-body">
                      <b>{c.name}</b>
                      <span>{c.headline}</span>
                      <span className="muted">{t("featured.years", { n: c.years })}{c.city ? ` · ${c.city}` : ""}</span>
                      <div className="tcard-skills">
                        {c.skills.slice(0, 2).map((s) => <em key={s}>{s}</em>)}
                        {c.skills.length > 2 ? <em>{t("featured.more", { n: c.skills.length - 2 })}</em> : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="tempty">
                <div className="tempty-photos" aria-hidden="true"><img src="/photos/p1.jpg" alt="" /><img src="/photos/p2.jpg" alt="" /><img src="/photos/p3.jpg" alt="" /></div>
                <div><h3>{t("featured.emptyTitle")}</h3><p>{t("featured.emptyBody")}</p></div>
                <Link className="btn" href="/signup?role=candidate">{t("featured.emptyCta")}</Link>
              </div>
            )}
          </section>

          {/* ---------- How it works ---------- */}
          <section className="lsec" id="how">
            <div className="lsec-head">
              <div><h2 className="lsec-title">{t("how.title")}</h2><p className="lsec-sub">{t("how.sub")}</p></div>
              <Link className="lsec-link" href="/#faq">{t("how.learnMore")} <LIcon name="arrow" size={16} className="flipx" /></Link>
            </div>
            <ol className="hsteps" id="for-candidates">
              {([["video", "s1"], ["discover", "s2"], ["connect", "s3"]] as const).map(([icon, k], i) => (
                <li key={k} className="hstep">
                  <div className="hstep-top"><span className="hstep-n">{i + 1}</span><span className="hstep-ic"><LIcon name={icon} size={30} /></span></div>
                  <h3>{t(`how.${k}t`)}</h3>
                  <p>{t(`how.${k}b`)}</p>
                  {k === "s1" ? <Link className="btn sm m hstep-cta" href="/signup?role=candidate">{t("how.s1cta")} <LIcon name="arrow" size={16} className="flipx" /></Link> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ---------- Employer banner with a working search ---------- */}
        <div className="wrapx">
          <section className="eband">
            <div className="eband-copy">
              <span className="pillx dark">{t("emp.pill")}</span>
              <h2>{t("emp.title")}</h2>
              <p>{t("emp.body")}</p>
              <div className="eband-ctas">
                <Link className="btn eband-go" href="/signup?role=employer">{t("emp.getStarted")} <LIcon name="arrow" size={16} className="flipx" /></Link>
                <Link className="eband-link" href="/#plans">{t("emp.seePricing")} <LIcon name="arrow" size={16} className="flipx" /></Link>
              </div>
            </div>
            <div className="eband-art">
              <div className="eband-photos" aria-hidden="true">
                <img src="/photos/p2.jpg" alt="" /><img src="/photos/p1.jpg" alt="" /><img src="/photos/p3.jpg" alt="" />
              </div>
              <EmployerSearch />
            </div>
          </section>
        </div>

        <div className="wrapx">
          {/* ---------- Plans ---------- */}
          <section className="lsec" id="plans">
            <div className="lsec-head center">
              <div><span className="pillx">{t("plans.pill")}</span><h2 className="lsec-title" style={{ marginTop: 10 }}>{t("plans.title")}</h2><p className="lsec-sub">{t("plans.sub")}</p></div>
            </div>
            <div className="plans2">
              {plans.map((p) => {
                const premium = p.key !== "free";
                return (
                  <div key={p.id} className={`plan2${premium ? " hi" : ""}`}>
                    {premium ? <span className="plan2-badge">{t("plans.recommended")}</span> : null}
                    <h3>{locale === "ar" ? p.nameAr : p.nameEn}</h3>
                    <div className="plan2-price">{locale === "ar" ? p.priceLabelAr : p.priceLabelEn}</div>
                    <ul>
                      {[t("plans.browse"), t("plans.intro", { n: p.monthlyIntroRequests }), t("plans.cv", { n: p.monthlyCvRequests }), t("plans.saved", { n: p.maxSaved }), t("plans.filters")].map((f) => (
                        <li key={f}><span className="plan2-ck"><LIcon name="check" size={14} /></span>{f}</li>
                      ))}
                    </ul>
                    <Link className={`btn w${premium ? " m" : ""}`} href="/signup?role=employer">{premium ? t("plans.ctaPremium") : t("plans.ctaFree")}</Link>
                  </div>
                );
              })}
            </div>
            <p className="note" style={{ textAlign: "center", marginTop: 14 }}>{t("plans.note")}</p>
          </section>

          {/* ---------- FAQ ---------- */}
          <section className="lsec faq2" id="faq">
            <h2 className="lsec-title" style={{ textAlign: "center" }}>{t("faq.title")}</h2>
            <div className="faq2-list">
              {[1, 2, 3, 4, 5].map((n) => (
                <details key={n}><summary>{th(`faq${n}`)}<span className="faq2-ic" aria-hidden="true">+</span></summary><p>{th(`faq${n}A`)}</p></details>
              ))}
            </div>
          </section>

          {/* ---------- Final call to action ---------- */}
          <section className="fcta">
            <div><h2>{t("final.title")}</h2><p>{t("final.body")}</p></div>
            <div className="fcta-btns">
              <Link className="btn m" href="/signup?role=candidate">{t("final.ctaC")}</Link>
              <Link className="btn s" href="/signup?role=employer">{t("final.ctaE")}</Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="sitefoot">
        <div className="wrapx sitefoot-in">
          <div><Logo height={28} /><p>{t("footer.tagline")}</p></div>
          <nav aria-label={t("footer.product")}><b>{t("footer.product")}</b><Link href="/feed">{t("nav.browse")}</Link><Link href="/signup?role=candidate">{t("nav.forCandidates")}</Link><Link href="/signup?role=employer">{t("nav.forEmployers")}</Link><Link href="/#plans">{t("plans.pill")}</Link></nav>
          <nav aria-label={t("footer.legal")}><b>{t("footer.legal")}</b><Link href="/privacy">{t("footer.privacy")}</Link><Link href="/terms">{t("footer.terms")}</Link><Link href="/privacy#contact">{t("footer.contact")}</Link></nav>
        </div>
        <p className="wrapx sitefoot-copy">© {new Date().getFullYear()} Hireel</p>
      </footer>
    </div>
  );
}
