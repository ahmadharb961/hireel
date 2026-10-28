import { getLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { LangSwitch } from "@/components/LangSwitch";
import { EmployerNav } from "@/components/Nav";
import { SignOut } from "@/components/SignOut";
import { prisma } from "@/lib/db";
import { quotaFor, savedCount } from "@/server/employer-data";
import { requireEmployer } from "@/server/session";

export default async function AccountPage() {
  const emp = await requireEmployer();
  const { company, member } = emp;
  const locale = await getLocale();
  const t = await getTranslations("account");
  const ti = await getTranslations("industries");
  const q = await quotaFor(emp, locale);
  const saved = await savedCount(member.id);
  const premium = await prisma.plan.findUnique({ where: { key: "premium" } });
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
            <div><h1 className="h3">{company.name}</h1><p className="p">{[ti.has(company.industry) ? ti(company.industry) : company.industry, company.country, company.size].filter(Boolean).join(" · ")}</p></div>
            {company.status === "VERIFIED" ? <span className="tag">✓ {t("verified")}</span> : company.status === "SUSPENDED" ? <span className="tag bad">{t("suspended")}</span> : <span className="tag mute">{t("notVerified")}</span>}
          </div>
          <p className="note" style={{ marginTop: 8 }}>{company.status === "VERIFIED" ? t("verifiedNote") : company.status === "SUSPENDED" ? t("suspendedNote") : t("notVerifiedNote")}</p>
        </div>
        <div className="card">
          <div className="sw"><h2 className="h3">{t("plan", { name: locale === "ar" ? plan.nameAr : plan.nameEn })}</h2><span className="tag">{locale === "ar" ? plan.priceLabelAr : plan.priceLabelEn}</span></div>
          {meter(t("introThisMonth"), q.used.intro, plan.monthlyIntroRequests)}
          {meter(t("cvThisMonth"), q.used.cv, plan.monthlyCvRequests)}
          {meter(t("savedLimit"), saved, plan.maxSaved)}
          <p className="note" style={{ marginTop: 10 }}>{t("resets")}</p>
          {plan.key === "free" && premium ? (
            <div className="card" style={{ marginTop: 12, background: "var(--soft)", borderColor: "transparent" }}>
              <h3 className="h3">{t("premiumTitle", { name: locale === "ar" ? premium.nameAr : premium.nameEn })}</h3>
              <p className="p">{t("premiumBody", { intro: premium.monthlyIntroRequests, cv: premium.monthlyCvRequests, saved: premium.maxSaved })}</p>
              <p className="note" style={{ marginTop: 6 }}>{t("premiumHow")}</p>
            </div>
          ) : null}
        </div>
        <LangSwitch variant="button" />
        <SignOut />
        <p className="note">{t("teamSoon")}</p>
      </div></main>
      <EmployerNav savedCount={saved} />
    </div>
  );
}
