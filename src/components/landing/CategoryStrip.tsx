"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryOption } from "@/lib/categories";
import { LIcon } from "./icons";

/** Scrollable row of industry tiles; each opens the feed filtered to that industry. */
export function CategoryStrip({ categories }: { categories: CategoryOption[] }) {
  const t = useTranslations("landing.cats");
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  // RTL pages report scrollLeft as 0 → negative, so measure distance from the start either way.
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
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: step * dir * el.clientWidth * 0.7, behavior: "smooth" });
  };
  return (
    <section className="cats" aria-label={t("label")}>
      <div className="cats-track" ref={ref} onScroll={measure}>
        <Link href="/feed" className="cat on"><LIcon name="all" size={26} /><span>{t("all")}</span></Link>
        {categories.filter((c) => c.key !== "other").map((c) => (
          <Link key={c.key} href={`/feed?industry=${c.key}`} className="cat"><LIcon name={c.key} size={26} /><span>{c.name}</span></Link>
        ))}
      </div>
      {!edge.start ? <button type="button" className="cats-nav prev" aria-label={t("back")} onClick={() => scroll(-1)}><LIcon name="chevron" size={20} /></button> : null}
      {!edge.end ? <button type="button" className="cats-nav" aria-label={t("more")} onClick={() => scroll(1)}><LIcon name="chevron" size={20} /></button> : null}
    </section>
  );
}
