"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function TwoFactorForm() {
  const t = useTranslations("twoFactor");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [backup, setBackup] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    if (!backup && !/^\d{6}$/.test(code)) return setError(t("sixDigits"));
    setPending(true); setError(null);
    const res = backup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
    setPending(false);
    if (res.error) return setError(t("wrong"));
    router.push("/welcome");
    router.refresh();
  }

  return (
    <div>
      <h1 className="h2">{t("title")}</h1>
      <p className="p">{backup ? t("backupBody") : t("body")}</p>
      <form onSubmit={onSubmit} noValidate>
        <label className="lbl" htmlFor="code">{backup ? t("backupLabel") : t("codeLabel")}</label>
        <input className="i" id="code" name="code" inputMode={backup ? "text" : "numeric"} autoComplete="one-time-code" maxLength={backup ? 20 : 6} dir="ltr" autoFocus />
        {error ? <p className="err" role="alert">{error}</p> : null}
        <button className="btn w" style={{ marginTop: 14 }} type="submit" disabled={pending}>{pending ? tc("pleaseWait") : t("verify")}</button>
      </form>
      <button type="button" className="btn sm o" style={{ marginTop: 12 }} onClick={() => { setBackup(!backup); setError(null); }}>
        {backup ? t("useApp") : t("useBackup")}
      </button>
    </div>
  );
}
