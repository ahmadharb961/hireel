"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotForm() {
  const t = useTranslations("forgot");
  const tc = useTranslations("common");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError(t("invalid"));
    setPending(true); setError(null);
    const res = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (res.error?.status === 429) return setError(t("tooMany"));
    setSent(true); // Same message whether or not the account exists.
  }

  return (
    <div>
      <h1 className="h2">{t("title")}</h1>
      <p className="p">{t("body")}</p>
      <form onSubmit={onSubmit} noValidate>
        <label className="lbl" htmlFor="email">{t("email")}</label>
        <input className="i" id="email" name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" />
        {error ? <p className="err" role="alert">{error}</p> : null}
        {sent ? <p className="ok" role="status">{t("sent")}</p> : null}
        <button className="btn w" style={{ marginTop: 14 }} type="submit" disabled={pending}>{pending ? tc("pleaseWait") : t("submit")}</button>
      </form>
    </div>
  );
}
