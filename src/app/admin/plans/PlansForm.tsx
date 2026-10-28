"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { savePlans } from "../safe-actions";

type P = { id: string; key: string; nameEn: string; nameAr: string; priceLabelEn: string; priceLabelAr: string; monthlyIntroRequests: number; monthlyCvRequests: number; maxSaved: number; companies: number };

export function PlansForm({ plans }: { plans: P[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(plans);
  const [err, setErr] = useState<string | null>(null);
  const set = (i: number, k: keyof P) => (e: React.ChangeEvent<HTMLInputElement>) => setV(v.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)));
  const text = (i: number, k: keyof P, label: string, dir?: "rtl") => (
    <><label className="lbl" htmlFor={`${v[i].key}-${k}`}>{label}</label><input className="i" id={`${v[i].key}-${k}`} dir={dir} value={String(v[i][k])} onChange={set(i, k)} /></>
  );
  const num = (i: number, k: keyof P, label: string) => (
    <div className="sw" style={{ padding: "8px 0", borderBottom: "1px solid var(--bd)" }}>
      <label htmlFor={`${v[i].key}-${k}`} style={{ fontSize: 14 }}>{label}</label>
      <input className="num" id={`${v[i].key}-${k}`} type="number" min={0} inputMode="numeric" value={String(v[i][k])} onChange={set(i, k)} />
    </div>
  );
  return (
    <>
      {v.map((p, i) => (
        <div key={p.id} className="card">
          <p className="note">{t("planCompanies", { n: p.companies })}</p>
          <div className="row">{<div>{text(i, "nameEn", t("nameEn"))}</div>}<div>{text(i, "nameAr", t("nameAr"), "rtl")}</div></div>
          <div className="row"><div>{text(i, "priceLabelEn", t("priceEn"))}</div><div>{text(i, "priceLabelAr", t("priceAr"), "rtl")}</div></div>
          <div style={{ marginTop: 8 }}>
            {num(i, "monthlyIntroRequests", t("introPerMonth"))}
            {num(i, "monthlyCvRequests", t("cvPerMonth"))}
            {num(i, "maxSaved", t("maxSaved"))}
          </div>
        </div>
      ))}
      {err ? <p className="err" role="alert">{err}</p> : null}
      <button type="button" className="btn w" onClick={async () => {
        setErr(null);
        const r = await savePlans(v.map(({ companies: _c, key: _k, ...p }) => p));
        if (!r.ok) return setErr(t("plansInvalid"));
        toast(t("plansSaved"));
        router.refresh();
      }}>{t("savePlans")}</button>
      <p className="note">{t("plansNote")}</p>
    </>
  );
}
