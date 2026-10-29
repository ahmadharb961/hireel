import { getLocale, getTranslations } from "next-intl/server";
import { categoryNamer } from "@/server/categories";
import { logoUrl } from "@/lib/logo";
import Link from "next/link";
import { PushCard } from "@/components/PushCard";
import { Header } from "@/components/Header";
import { LangSwitch } from "@/components/LangSwitch";
import { EmployerNav } from "@/components/Nav";
import { SignOut } from "@/components/SignOut";
import { quotaFor, savedCount } from "@/server/employer-data";
import { requireEmployer } from "@/server/session";

export default async function AccountPage() {
  const emp = await requireEmployer();
  const { company, member } = emp;
  const locale = await getLocale();
  const t = await getTranslations("account");
  const tc = await getTranslations("companyEdit");
  const catName = await categoryNamer();
  const q = await quotaFor(emp, locale);
  const saved = await savedCount(member.id);
  const plan = company.plan;
  const meter = (label: string, used: number, max: number) => (
    <div style={{ marginTop: 12 }}>
      <div className="sw"><p className="p" style={{ color: "var(--tx)" }}>{label}</p><p className="p" style={{ fontVariantNumeric: "tabular-nums" }}><b style={{ color: "var(--tx)" }}>{used}</b> / {max}</p></div>
      <div className="meter"><i style={{ width: `${max ? Math.min(100, (used / max) * 100) : 100}%` }} /></div>
    </div>
  );
  return (
    <div className="scr">
      <Header home="/feed" lang={false} />
      <main className="main"><div className="stack">
        <div className="card">
          <div className="sw">
            <div className="pv-name">{logoUrl(company) ? <img className="clogo" src={logoUrl(company)!} alt="" /> : <span className="clogo ini">{company.name.slice(0, 1)}</span>}<div><h1 className="h3">{company.name}</h1><p className="p">{[catName(company.industry), company.country, company.size].filter(Boolean).join(" · ")}</p></div></div>
            {company.status === "VERIFIED" ? <span className="tag">✓ {t("verified")}</span> : company.status === "SUSPENDED" ? <span className="tag bad">{t("suspended")}</span> : <span className="tag mute">{t("notVerified")}</span>}
          </div>
          <Link className="btn sm o" style={{ marginTop: 10 }} href="/employer/company">{tc("editButton")}</Link>
          <p className="note" style={{ marginTop: 8 }}>{company.status === "VERIFIED" ? t("verifiedNote") : company.status === "SUSPENDED" ? t("suspendedNote") : t("notVerifiedNote")}</p>
        </div>
        <div className="card" style={{ background: "var(--soft)", borderColor: "transparent" }}>
          <div className="sw"><h2 className="h3">{t("freeTitle")}</h2><span className="tag">$0</span></div>
          <p className="p" style={{ marginTop: 4 }}>{t("freeBody")}</p>
        </div>
        <div className="card">
          <h2 className="h3">{t("fairTitle")}</h2>
          {meter(t("introThisMonth"), q.used.intro, plan.monthlyIntroRequests)}
          {meter(t("cvThisMonth"), q.used.cv, plan.monthlyCvRequests)}
          {meter(t("savedLimit"), saved, plan.maxSaved)}
          <p className="note" style={{ marginTop: 10 }}>{t("fairNote")}</p>
        </div>
        <PushCard variant="settings" who="employer" />
        <LangSwitch variant="button" />
        <SignOut />
        <p className="note">{t("teamSoon")}</p>
      </div></main>
      <EmployerNav savedCount={saved} />
    </div>
  );
}
