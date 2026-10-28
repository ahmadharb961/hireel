"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResetForm({ token, invalid }: { token: string; invalid: boolean }) {
  const t = useTranslations("reset");
  const tc = useTranslations("common");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(invalid ? t("invalidLink") : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password") ?? "");
    if (pw.length < 8) return setError(t("short"));
    if (pw !== String(f.get("confirm") ?? "")) return setError(t("mismatch"));
    setPending(true); setError(null);
    const res = await authClient.resetPassword({ newPassword: pw, token });
    setPending(false);
    if (res.error) return setError(t("invalidLink"));
    setDone(true);
  }

  if (done) {
    return (
      <div className="stack">
        <h1 className="h2">{t("doneTitle")}</h1>
        <p className="p">{t("doneBody")}</p>
        <Link className="btn w" href="/login">{tc("login")}</Link>
      </div>
    );
  }
  return (
    <div>
      <h1 className="h2">{t("title")}</h1>
      <form onSubmit={onSubmit} noValidate>
        <label className="lbl" htmlFor="password">{t("new")}</label>
        <input className="i" id="password" name="password" type="password" autoComplete="new-password" disabled={invalid} />
        <label className="lbl" htmlFor="confirm">{t("confirm")}</label>
        <input className="i" id="confirm" name="confirm" type="password" autoComplete="new-password" disabled={invalid} />
        {error ? <p className="err" role="alert">{error}</p> : null}
        <button className="btn w" style={{ marginTop: 14 }} type="submit" disabled={pending || invalid}>{pending ? tc("pleaseWait") : t("submit")}</button>
      </form>
      {invalid ? <Link className="btn o w" style={{ marginTop: 12 }} href="/forgot-password">{t("again")}</Link> : null}
    </div>
  );
}
