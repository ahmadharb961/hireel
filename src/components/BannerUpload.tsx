"use client";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";

/** Wide company cover image (3:1) with add / change / remove. */
export function BannerUpload({ initialUrl, logoUrl, name }: { initialUrl: string | null; logoUrl: string | null; name: string }) {
  const t = useTranslations("banner");
  const te = useTranslations("errors");
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(file?: File) {
    if (!file) return;
    setErr(null);
    if (file.size > 12 * 1024 * 1024) return setErr(te("photo_too_big"));
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const d = await fetch("/api/company-banner", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ ok: false, error: "network" }));
      if (!d.ok) return setErr(te(d.error ?? "generic"));
      setUrl(d.url);
      toast(t("saved"));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      const r = await fetch("/api/company-banner", { method: "DELETE" }).catch(() => null);
      if (r?.ok) { setUrl(null); toast(t("removed")); } else setErr(te("network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bnup">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { send(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" className="chead-banner bnup-box" onClick={() => input.current?.click()} disabled={busy} aria-label={url ? t("change") : t("add")} style={url ? { backgroundImage: `url(${url})` } : undefined}>
        {!url ? <span className="bnup-empty">🖼 {t("add")}</span> : null}
        {busy ? <span className="bnup-busy">…</span> : null}
      </button>
      <span className="chead-logo" aria-hidden="true">{logoUrl ? <img src={logoUrl} alt="" /> : name.slice(0, 1)}</span>
      <div className="bnup-tx">
        <b>{t("title")}</b>
        <span className="note">{t("help")}</span>
        <div className="row" style={{ marginTop: 6 }}>
          <button type="button" className="btn sm" disabled={busy} onClick={() => input.current?.click()}>{url ? t("change") : t("add")}</button>
          {url ? <button type="button" className="btn sm g" disabled={busy} onClick={remove}>{t("remove")}</button> : null}
        </div>
        {err ? <p className="err" role="alert">{err}</p> : null}
      </div>
    </div>
  );
}
