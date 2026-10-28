"use client";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** First admin login: turn on two-step sign-in with an authenticator app. */
export function Setup2fa() {
  const t = useTranslations("setup2fa");
  const [stage, setStage] = useState<"password" | "scan" | "done">("password");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [codes, setCodes] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setBusy(true); setErr(null);
    const r = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (r.error || !r.data || !("totpURI" in r.data)) return setErr(t("wrongPassword"));
    const uri = r.data.totpURI;
    setSecret(new URL(uri).searchParams.get("secret") ?? "");
    setQr(await QRCode.toDataURL(uri, { margin: 1, width: 220 }));
    setCodes(r.data.backupCodes ?? []);
    setStage("scan");
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setBusy(true); setErr(null);
    const r = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (r.error) return setErr(t("wrongCode"));
    setStage("done");
  }

  return (
    <div className="stack">
      <h1 className="h2">{t("title")}</h1>
      <p className="p">{t("why")}</p>
      {stage === "password" ? (
        <form onSubmit={start} noValidate>
          <label className="lbl" htmlFor="password">{t("password")}</label>
          <input className="i" id="password" name="password" type="password" autoComplete="current-password" />
          {err ? <p className="err" role="alert">{err}</p> : null}
          <button className="btn w" style={{ marginTop: 14 }} type="submit" disabled={busy}>{t("continue")}</button>
        </form>
      ) : null}
      {stage === "scan" ? (
        <form onSubmit={verify} noValidate className="stack">
          <ol className="steps">
            <li><span className="n">1</span><div><b>{t("step1")}</b><span>{t("step1Sub")}</span></div></li>
            <li><span className="n">2</span><div><b>{t("step2")}</b></div></li>
          </ol>
          {qr ? <img src={qr} alt={t("qrAlt")} width={220} height={220} style={{ background: "#fff", padding: 8, borderRadius: 12, alignSelf: "center" }} /> : null}
          <p className="note" style={{ textAlign: "center" }}>{t("manual")} <code dir="ltr" style={{ userSelect: "all" }}>{secret}</code></p>
          <label className="lbl" htmlFor="code">{t("code")}</label>
          <input className="i" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" />
          {err ? <p className="err" role="alert">{err}</p> : null}
          <button className="btn w" type="submit" disabled={busy}>{t("verify")}</button>
        </form>
      ) : null}
      {stage === "done" ? (
        <div className="stack">
          <div className="card"><h2 className="h3">{t("backupTitle")}</h2><p className="p">{t("backupBody")}</p>
            <div className="wrap" style={{ marginTop: 10, fontFamily: "ui-monospace, monospace" }} dir="ltr">{codes.map((c) => <span key={c} className="sk">{c}</span>)}</div>
          </div>
          <a className="btn w" href="/admin">{t("toAdmin")}</a>
        </div>
      ) : null}
    </div>
  );
}
