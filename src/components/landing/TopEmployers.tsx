"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { LIcon } from "./icons";

export type TopEmployer = { id: string; name: string; category: string; logo: string | null; banner: string | null; verified: boolean; isDemo: boolean };

/** A company card: cover picture, logo overlapping it, name with the verified tick, and category. */
export function EmployerCard({ c }: { c: TopEmployer }) {
  const t = useTranslations("landing.topEmployers");
  return (
    <Link href={`/companies/${c.id}`} className="tecard">
      <span className="tecard-cover" style={c.banner ? { backgroundImage: `url(${c.banner})` } : undefined} />
      <span className="tecard-logo">{c.logo ? <img src={c.logo} alt="" loading="lazy" /> : c.name.slice(0, 1)}</span>
      <span className="tecard-body">
        <b><span className="tecard-nm">{c.name}</span>{c.verified ? <span className="tecard-ok" role="img" aria-label={t("verified")}><LIcon name="check" size={11} /></span> : null}</b>
        <span className="tecard-cat">{c.category || "—"}</span>
      </span>
      {c.isDemo ? <span className="tcard-demo">Demo</span> : null}
    </Link>
  );
}

/** "Top employers" on the homepage: one row, swiped on phones, with arrows on computers. */
export function TopEmployers({ companies }: { companies: TopEmployer[] }) {
  const t = useTranslations("landing.topEmployers");
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  // Works left-to-right and right-to-left (Arabic reports scroll positions as negative numbers).
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const from = Math.abs(el.scrollLeft);
    setEdge({ start: from < 4, end: from + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  const scroll = (step: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".tecard");
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: step * dir * ((card?.offsetWidth ?? 280) + 20), behavior: "smooth" });
  };

  return (
    <section className="tesec" id="top-employers" aria-labelledby="te-title">
      <div className="tesec-head">
        <div className="tesec-copy">
          <span className="pillx">{t("pill")}</span>
          <h2 id="te-title" className="tesec-title">{t("title1")}<br /><span className="g1">{t("title2")}</span> <span className="g2">{t("title3")}</span></h2>
          <p className="tesec-sub">{t("sub")}</p>
        </div>
        <div className="tesec-side">
          <p className="tesec-hand" aria-hidden="true"><span>{t("hand1")}</span><span>{t("hand2")}</span><span>{t("hand3")}</span></p>
          <svg className="tesec-arrow" viewBox="0 0 80 60" aria-hidden="true"><path d="M70 4C72 30 50 52 14 50" /><path d="M14 50l9-9M14 50l11 6" /></svg>
          <Link className="btn tesec-all" href="/companies">{t("seeAll")} <LIcon name="arrow" size={18} className="flipx" /></Link>
        </div>
      </div>
      <div className="tesec-row">
        <div className="tesec-track" ref={ref} onScroll={measure}>
          {companies.map((c) => <EmployerCard key={c.id} c={c} />)}
        </div>
        {!edge.start ? <button type="button" className="tesec-nav prev" aria-label={t("prev")} onClick={() => scroll(-1)}><LIcon name="chevron" size={22} /></button> : null}
        {!edge.end ? <button type="button" className="tesec-nav" aria-label={t("next")} onClick={() => scroll(1)}><LIcon name="chevron" size={22} /></button> : null}
      </div>
      <Link className="btn o tesec-all m" href="/companies">{t("seeAll")} <LIcon name="arrow" size={18} className="flipx" /></Link>
    </section>
  );
}
