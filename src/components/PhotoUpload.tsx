"use client";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";

/** Round profile photo with add / change / remove. The server crops it square and removes location data. */
export function PhotoUpload({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const t = useTranslations("photo");
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
      const d = await fetch("/api/photo", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ ok: false, error: "network" }));
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
      const r = await fetch("/api/photo", { method: "DELETE" }).catch(() => null);
      if (r?.ok) { setUrl(null); toast(t("removed")); } else setErr(te("network"));
    } finally {
      setBusy(false);
    }
  }
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="phup">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { send(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" className="phup-av" onClick={() => input.current?.click()} disabled={busy} aria-label={url ? t("change") : t("add")}>
        {url ? <img src={url} alt="" /> : <span>{initials || "+"}</span>}
        <i aria-hidden="true">{busy ? "…" : "📷"}</i>
      </button>
      <div className="phup-tx">
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
