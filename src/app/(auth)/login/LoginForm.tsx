"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resendVerification } from "@/app/actions/auth";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ next }: { next?: string | null }) {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const te = useTranslations("errors");
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const welcome = next ? `/welcome?next=${encodeURIComponent(next)}` : "/welcome";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    setError(null); setUnverified(null);
    if (!email || !password) return setError(t("missing"));
    setPending(true);
    const res = await authClient.signIn.email({ email, password, callbackURL: welcome }).catch(() => null);
    setPending(false);
    if (!res) return setError(te("network"));
    if (res.error) {
      const code = String(res.error.code ?? res.error.message ?? "");
      if (/EMAIL_NOT_VERIFIED/i.test(code)) return setUnverified(email);
      if (/SUSPENDED/i.test(code) || res.error.status === 403) return setError(t("suspended"));
      if (res.error.status === 429) return setError(t("tooMany"));
      return setError(t("wrong"));
    }
    if ((res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) return router.push("/login/two-factor");
    router.push(welcome);
    router.refresh();
  }

  return (
    <div>
      <h1 className="h2">{t("title")}</h1>
      <p className="p">{t("subtitle")}</p>
      <form onSubmit={onSubmit} noValidate>
        <label className="lbl" htmlFor="email">{t("email")}</label>
        <input className="i" id="email" name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" />
        <label className="lbl" htmlFor="password">{t("password")}</label>
        <input className="i" id="password" name="password" type="password" autoComplete="current-password" />
        <p style={{ marginTop: 10 }}><Link className="btn sm o" href="/forgot-password">{t("forgot")}</Link></p>
        {error ? <p className="err" role="alert">{error}</p> : null}
        {unverified ? (
          <div className="card" style={{ marginTop: 12, background: "var(--warnbg)", borderColor: "transparent" }}>
            <p className="p" style={{ color: "var(--tx)" }}>{t("unverified")}</p>
            <button type="button" className="btn sm g" style={{ marginTop: 10 }} disabled={resent} onClick={async () => { await resendVerification(unverified); setResent(true); }}>
              {resent ? t("resent") : t("resend")}
            </button>
          </div>
        ) : null}
        <button className="btn w" style={{ marginTop: 14 }} type="submit" disabled={pending}>{pending ? tc("pleaseWait") : t("submit")}</button>
      </form>
      <p className="p" style={{ marginTop: 14 }}>{t("new")} <Link className="btn sm o" href="/signup">{t("create")}</Link></p>
    </div>
  );
}
