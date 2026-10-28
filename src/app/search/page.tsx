import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Prisma } from "@/generated/prisma/client";
import { Header } from "@/components/Header";
import { EmployerNav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { AVAILABILITY, INDUSTRIES, VIDEO_LANGUAGES } from "@/lib/constants";
import { savedCount } from "@/server/employer-data";
import { initialsOf } from "@/server/profile-data";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { employerOrNull } from "@/server/session";

export const metadata = { robots: { index: false, follow: false } };

type SP = { q?: string; industry?: string; availability?: string; lang?: string; minYears?: string };

/** Search by job-related details only. Never by age, gender, religion, ethnicity or appearance. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const t = await getTranslations("search");
  const ti = await getTranslations("industries");
  const ta = await getTranslations("availability");
  const tl = await getTranslations("languages");
  const emp = await employerOrNull();
  const q = (sp.q ?? "").trim().slice(0, 80);
  const industry = INDUSTRIES.find((x) => x === sp.industry);
  const availability = AVAILABILITY.find((x) => x === sp.availability);
  const lang = VIDEO_LANGUAGES.find((x) => x === sp.lang);
  const minYears = Math.max(0, Math.min(50, Number(sp.minYears) || 0));

  const allowed = await rateLimit(emp ? `search:u:${emp.viewer.id}` : `search:ip:${await clientIp()}`, emp ? 120 : 30, 600);
  const where: Prisma.CandidateProfileWhereInput = {
    status: "PUBLISHED",
    publishConsentAt: { not: null },
    searchPaused: false,
    user: { suspendedAt: null },
    ...(emp ? { blocks: { none: { companyId: emp.company.id } } } : { visibility: "EVERYONE" }),
    ...(industry ? { industry } : {}),
    ...(availability ? { availability } : {}),
    ...(minYears ? { yearsExperience: { gte: minYears } } : {}),
    ...(lang ? { videos: { some: { language: lang, archivedAt: null, moderation: "APPROVED", processing: "READY" } } } : {}),
    ...(q ? { OR: [
      { fullName: { contains: q, mode: "insensitive" } },
      { headline: { contains: q, mode: "insensitive" } },
      { currentTitle: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { skills: { some: { skill: { name: { contains: q, mode: "insensitive" } } } } },
    ] } : {}),
  };
  const results = allowed
    ? await prisma.candidateProfile.findMany({ where, include: { skills: { include: { skill: true } } }, orderBy: { updatedAt: "desc" }, take: 30 })
    : [];
  const n = emp ? await savedCount(emp.member.id) : 0;
  return (
    <div className="shell"><div className="scr">
      <Header home="/feed" />
      <main className="main"><div className="stack">
        <form className="stack" action="/search" method="get" role="search">
          <label className="lbl" htmlFor="q" style={{ margin: 0 }}>{t("label")}</label>
          <input className="i" id="q" name="q" type="search" defaultValue={q} placeholder={t("placeholder")} autoComplete="off" />
          <div className="row">
            <select className="i" name="industry" defaultValue={industry ?? ""} aria-label={t("industry")}>
              <option value="">{t("anyIndustry")}</option>
              {INDUSTRIES.map((k) => <option key={k} value={k}>{ti(k)}</option>)}
            </select>
            <select className="i" name="availability" defaultValue={availability ?? ""} aria-label={t("availability")}>
              <option value="">{t("anyAvailability")}</option>
              {AVAILABILITY.map((k) => <option key={k} value={k}>{ta(k)}</option>)}
            </select>
          </div>
          <div className="row">
            <select className="i" name="lang" defaultValue={lang ?? ""} aria-label={t("videoLanguage")}>
              <option value="">{t("anyLanguage")}</option>
              {VIDEO_LANGUAGES.map((k) => <option key={k} value={k}>{tl(k)}</option>)}
            </select>
            <select className="i" name="minYears" defaultValue={String(minYears || "")} aria-label={t("minYears")}>
              <option value="">{t("anyYears")}</option>
              {[1, 3, 5, 8, 10].map((y) => <option key={y} value={y}>{t("yearsPlus", { n: y })}</option>)}
            </select>
          </div>
          <div className="row">
            <button className="btn" type="submit">{t("submit")}</button>
            <Link className="btn g" href="/search">{t("clear")}</Link>
          </div>
        </form>
        {!allowed ? <p className="empty">{t("slowDown")}</p> : <p className="note">{t("count", { n: results.length })}</p>}
        <div className="stack cards2" style={{ gap: 8 }}>
          {results.map((c) => (
            <Link key={c.id} className="list-row" href={`/c/${c.id}`}>
              <div className="thumb">{initialsOf(c.fullName)}</div>
              <div className="t">
                <b>{c.fullName} {c.isDemo ? <span className="demo-flag">{t("demo")}</span> : null}</b>
                <span>{c.headline} · {t("years", { n: c.yearsExperience })}</span>
                <span>{c.location} · {c.skills.map((s) => s.skill.name).join(", ")}</span>
              </div>
            </Link>
          ))}
          {allowed && results.length === 0 ? <div className="empty">{t("none")}</div> : null}
        </div>
        <p className="note">{t("fair")}</p>
      </div></main>
      <EmployerNav visitor={!emp} savedCount={n} />
    </div></div>
  );
}
