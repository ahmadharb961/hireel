"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIcon } from "@/components/landing/icons";
import { useToast } from "@/components/Toast";
import { COMPANY_SIZES, COUNTRIES, INDUSTRIES } from "@/lib/constants";
import { updateCompanyProfile } from "../safe-actions";

type V = { description: string; website: string; industry: string; size: string; country: string; linkedinUrl: string; instagramUrl: string; facebookUrl: string };

export function CompanyForm({ name, initial }: { name: string; initial: V }) {
  const t = useTranslations("companyEdit");
  const ts = useTranslations("signup");
  const ti = useTranslations("industries");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof V) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function save() {
    setBusy(true); setErr(null);
    const r = await updateCompanyProfile({ ...v, website: v.website.trim() && !/^https?:\/\//i.test(v.website.trim()) ? `https://${v.website.trim()}` : v.website.trim() });
    setBusy(false);
    if (!r.ok) {
      const f = "field" in r ? r.field : undefined;
      if (r.error === "social_url" && f) return setErr(t("socialInvalid", { site: t(f.replace("Url", "") as "linkedin") }));
      return setErr(f ? te(r.error, { field: f }) : te(r.error));
    }
    toast(t("saved"));
    router.refresh();
  }

  return (
    <div>
      <label className="lbl">{t("name")}</label>
      <input className="i" value={name} disabled />
      <p className="note">{t("nameNote")}</p>
      <label className="lbl" htmlFor="description">{t("description")}</label>
      <textarea className="i" id="description" value={v.description} onChange={set("description")} maxLength={1200} placeholder={t("descriptionHint")} style={{ minHeight: 120 }} />
      <p className="note">{t("descriptionNote", { n: 1200 - v.description.length })}</p>
      <label className="lbl" htmlFor="website">{t("website")}</label>
      <input className="i" id="website" type="url" dir="ltr" inputMode="url" value={v.website} onChange={set("website")} placeholder="https://" />
      <label className="lbl" htmlFor="industry">{ts("industry")}</label>
      <select className="i" id="industry" value={v.industry} onChange={set("industry")}>{INDUSTRIES.map((k) => <option key={k} value={k}>{ti(k)}</option>)}</select>
      <label className="lbl" htmlFor="size">{ts("size")}</label>
      <select className="i" id="size" value={v.size} onChange={set("size")}>{COMPANY_SIZES.map((k) => <option key={k} value={k}>{k}</option>)}</select>
      <label className="lbl" htmlFor="country">{ts("country")}</label>
      <select className="i" id="country" value={v.country} onChange={set("country")}>
        {COUNTRIES.map((c) => <option key={c} value={c}>{ts(`countries.${c.replace(/ /g, "_")}` as "countries.Lebanon")}</option>)}
        {!COUNTRIES.includes(v.country as (typeof COUNTRIES)[number]) ? <option value={v.country}>{v.country}</option> : null}
      </select>
      <h3 className="h3" style={{ marginTop: 20 }}>{t("socialTitle")}</h3>
      <p className="note">{t("socialNote")}</p>
      {(["linkedin", "instagram", "facebook"] as const).map((k) => (
        <div key={k}>
          <label className="lbl" htmlFor={k}>{t(k)}</label>
          <div className="iwrap"><LIcon name={k} size={20} /><input className="i" id={k} dir="ltr" inputMode="url" autoCapitalize="none" value={v[`${k}Url`]} onChange={set(`${k}Url`)} placeholder={t(`${k}Ph`)} /></div>
        </div>
      ))}
      {err ? <p className="err" role="alert">{err}</p> : null}
      <button type="button" className="btn w" style={{ marginTop: 18 }} disabled={busy} onClick={save}>{busy ? "…" : t("save")}</button>
    </div>
  );
}
