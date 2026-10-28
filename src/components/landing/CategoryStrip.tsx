"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { INDUSTRIES } from "@/lib/constants";
import { LIcon } from "./icons";

/** Scrollable row of industry tiles; each opens the feed filtered to that industry. */
export function CategoryStrip() {
  const t = useTranslations("landing.cats");
  const ti = useTranslations("industries");
  const ref = useRef<HTMLDivElement>(null);
  const scroll = () => {
    const el = ref.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };
  return (
    <section className="cats" aria-label={t("label")}>
      <div className="cats-track" ref={ref}>
        <Link href="/feed" className="cat on"><LIcon name="all" size={26} /><span>{t("all")}</span></Link>
        {INDUSTRIES.filter((k) => k !== "other").map((k) => (
          <Link key={k} href={`/feed?industry=${k}`} className="cat"><LIcon name={k} size={26} /><span>{ti(k)}</span></Link>
        ))}
      </div>
      <button type="button" className="cats-next" aria-label={t("more")} onClick={scroll}><LIcon name="chevron" size={20} /></button>
    </section>
  );
}
