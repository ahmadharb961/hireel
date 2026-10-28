"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { resendVerification, signUpAction, type SignUpState } from "@/app/actions/auth";
import { COMPANY_SIZES, COUNTRIES, INDUSTRIES } from "@/lib/constants";

export function SignUpForm({ initialRole }: { initialRole: "candidate" | "employer" }) {
  const t = useTranslations("signup");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const ti = useTranslations("industries");
  const [role, setRole] = useState(initialRole);
  const [state, setState] = useState<SignUpState>({});
  const [pending, start] = useTransition();
  // Submit without a form action so the fields keep what the person typed if something needs fixing.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => setState(await signUpAction(state, fd)));
  };
  const [resent, setResent] = useState(false);

  if (state.done) {
    return (
      <div className="stack">
        <div className="card" style={{ textAlign: "center", padding: "28px 18px" }}>
          <h1 className="h2">{t("checkTitle")}</h1>
          <p className="p" style={{ marginTop: 8 }}>{t.rich("checkBody", { email: state.email ?? "", b: (c) => <b style={{ color: "var(--tx)" }}>{c}</b> })}</p>
          <p className="note" style={{ marginTop: 10 }}>{t("checkSpam")}</p>
        </div>
        <button type="button" className="btn g w" disabled={resent} onClick={async () => { await resendVerification(state.email ?? ""); setResent(true); }}>
          {resent ? t("resent") : t("resend")}
        </button>
        <Link className="btn o w" href="/login">{tc("login")}</Link>
      </div>
    );
  }

  const cand = role === "candidate";
  const err = state.error ? (state.field ? te(state.error, { field: state.field }) : te(state.error)) : null;
  return (
    <div>
      <h1 className="h2">{t("title")}</h1>
      <p className="p">{t("subtitle")}</p>
      <div className="seg" style={{ marginTop: 14 }} role="radiogroup" aria-label={t("roleLabel")}>
        <button type="button" role="radio" aria-checked={cand} className={cand ? "on" : ""} onClick={() => setRole("candidate")}>
          <span>{t("candidateTitle")}</span><small>{t("candidateSub")}</small>
        </button>
        <button type="button" role="radio" aria-checked={!cand} className={!cand ? "on" : ""} onClick={() => setRole("employer")}>
          <span>{t("employerTitle")}</span><small>{t("employerSub")}</small>
        </button>
      </div>
      <form onSubmit={onSubmit} noValidate key={role}>
        <input type="hidden" name="role" value={role} />
        {cand ? (
          <>
            <div className="row">
              <div><label className="lbl" htmlFor="firstName">{t("firstName")}</label><input className="i" id="firstName" name="firstName" autoComplete="given-name" required /></div>
              <div><label className="lbl" htmlFor="lastName">{t("lastName")}</label><input className="i" id="lastName" name="lastName" autoComplete="family-name" required /></div>
            </div>
            <label className="lbl" htmlFor="email">{t("email")}</label>
            <input className="i" id="email" name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" required />
          </>
        ) : (
          <>
            <label className="lbl" htmlFor="companyName">{t("companyName")}</label>
            <input className="i" id="companyName" name="companyName" autoComplete="organization" required />
            <label className="lbl" htmlFor="email">{t("businessEmail")}</label>
            <input className="i" id="email" name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" required />
            <div className="row">
              <div><label className="lbl" htmlFor="contactName">{t("yourName")}</label><input className="i" id="contactName" name="contactName" autoComplete="name" required /></div>
              <div><label className="lbl" htmlFor="position">{t("position")}</label><input className="i" id="position" name="position" autoComplete="organization-title" /></div>
            </div>
            <label className="lbl" htmlFor="industry">{t("industry")}</label>
            <select className="i" id="industry" name="industry" defaultValue="">
              <option value="" disabled>{tc("choose")}</option>
              {INDUSTRIES.map((k) => <option key={k} value={k}>{ti(k)}</option>)}
            </select>
            <div className="row">
              <div><label className="lbl" htmlFor="website">{t("website")}</label><input className="i" id="website" name="website" type="url" placeholder="https://" dir="ltr" /></div>
              <div><label className="lbl" htmlFor="size">{t("size")}</label>
                <select className="i" id="size" name="size" defaultValue="11-50">{COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              </div>
            </div>
          </>
        )}
        <label className="lbl" htmlFor="password">{t("password")}</label>
        <input className="i" id="password" name="password" type="password" autoComplete="new-password" placeholder={t("passwordHint")} minLength={8} required />
        <label className="lbl" htmlFor="country">{t("country")}</label>
        <select className="i" id="country" name="country" defaultValue="Lebanon">
          {COUNTRIES.map((c) => <option key={c} value={c}>{t(`countries.${c.replace(/ /g, "_")}`)}</option>)}
        </select>
        <label className="chk"><input type="checkbox" name="agree" /><span>{t.rich("agree", { terms: (c) => <Link href="/terms" target="_blank">{c}</Link>, privacy: (c) => <Link href="/privacy" target="_blank">{c}</Link> })}</span></label>
        {err ? <p className="err" role="alert">{err}</p> : null}
        <button className="btn w" style={{ marginTop: 16 }} type="submit" disabled={pending}>{pending ? tc("pleaseWait") : t("submit")}</button>
      </form>
      <p className="p" style={{ marginTop: 14 }}>{t("haveAccount")} <Link className="btn sm o" href="/login">{tc("login")}</Link></p>
    </div>
  );
}
