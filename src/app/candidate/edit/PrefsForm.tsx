"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { EMPLOYMENT_TYPES, MAX_DESIRED_ROLES, SALARY_CURRENCIES, WORK_MODES } from "@/lib/constants";
import { FEED_PLACES } from "@/lib/feed-filters";
import { savePreferences } from "../safe-actions";

export type Prefs = { desiredRoles: string[]; jobTypes: string[]; workModes: string[]; relocateTo: string[]; salaryMin: number | null; salaryCurrency: string };

/** What the candidate is looking for. Companies see everything except the salary. */
export function PrefsForm({ initial }: { initial: Prefs }) {
  const t = useTranslations("prefs");
  const tm = useTranslations("employment");
  const tc = useTranslations("signup.countries");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState(initial.salaryMin ? String(initial.salaryMin) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (k: "jobTypes" | "workModes" | "relocateTo", x: string) => setV({ ...v, [k]: v[k].includes(x) ? v[k].filter((y) => y !== x) : [...v[k], x] });
  const addRole = () => {
    const r = role.trim();
    if (!r || v.desiredRoles.length >= MAX_DESIRED_ROLES || v.desiredRoles.some((x) => x.toLowerCase() === r.toLowerCase())) return setRole("");
    setV({ ...v, desiredRoles: [...v.desiredRoles, r.slice(0, 60)] });
    setRole("");
  };

  async function save() {
    setBusy(true); setErr(null);
    const digits = salary.replace(/[^\d]/g, "");
    const r = await savePreferences({ ...v, desiredRoles: role.trim() && v.desiredRoles.length < MAX_DESIRED_ROLES ? [...v.desiredRoles, role.trim()] : v.desiredRoles, salaryMin: digits ? Number(digits) : null });
    setBusy(false);
    if (!r.ok) return setErr(te(r.error as "generic"));
    setRole("");
    toast(t("saved"));
    router.refresh();
  }

  return (
    <section className="card" id="prefs" aria-labelledby="prefs-title">
      <h2 className="h3" id="prefs-title">{t("title")}</h2>
      <p className="p">{t("sub")}</p>

      <label className="lbl" htmlFor="pref-role">{t("roles", { n: MAX_DESIRED_ROLES })}</label>
      <div className="wrap" style={{ marginBottom: 6 }}>
        {v.desiredRoles.map((r) => (
          <button key={r} type="button" className="chip on" onClick={() => setV({ ...v, desiredRoles: v.desiredRoles.filter((x) => x !== r) })} aria-label={t("removeRole", { role: r })}>{r} ✕</button>
        ))}
      </div>
      {v.desiredRoles.length < MAX_DESIRED_ROLES ? (
        <div className="row">
          <input className="i" id="pref-role" value={role} maxLength={60} onChange={(e) => setRole(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }} placeholder={t("rolesPh")} />
          <button type="button" className="btn sm g" style={{ flex: "none" }} onClick={addRole} disabled={!role.trim()}>{t("add")}</button>
        </div>
      ) : null}

      <h3 className="lbl">{t("jobTypes")}</h3>
      <div className="wrap">{EMPLOYMENT_TYPES.map((k) => <button key={k} type="button" className={`chip${v.jobTypes.includes(k) ? " on" : ""}`} aria-pressed={v.jobTypes.includes(k)} onClick={() => toggle("jobTypes", k)}>{tm(k)}</button>)}</div>

      <h3 className="lbl">{t("workModes")}</h3>
      <div className="wrap">{WORK_MODES.map((k) => <button key={k} type="button" className={`chip${v.workModes.includes(k) ? " on" : ""}`} aria-pressed={v.workModes.includes(k)} onClick={() => toggle("workModes", k)}>{t(`mode.${k}`)}</button>)}</div>

      <h3 className="lbl">{t("relocate")}</h3>
      <div className="wrap">{Object.keys(FEED_PLACES).map((k) => <button key={k} type="button" className={`chip${v.relocateTo.includes(k) ? " on" : ""}`} aria-pressed={v.relocateTo.includes(k)} onClick={() => toggle("relocateTo", k)}>{tc(k as "Lebanon")}</button>)}</div>

      <label className="lbl" htmlFor="pref-salary">🔒 {t("salary")}</label>
      <div className="row">
        <input className="i" id="pref-salary" inputMode="numeric" dir="ltr" value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^\d,. ]/g, ""))} placeholder="2,000" />
        <select className="i" style={{ flex: "none", width: 110 }} value={v.salaryCurrency} onChange={(e) => setV({ ...v, salaryCurrency: e.target.value })} aria-label={t("currency")}>
          {SALARY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p className="note">{t("salaryNote")}</p>

      {err ? <p className="err" role="alert">{err}</p> : null}
      <button type="button" className="btn w" style={{ marginTop: 14 }} disabled={busy} onClick={save}>{busy ? "…" : t("save")}</button>
    </section>
  );
}
