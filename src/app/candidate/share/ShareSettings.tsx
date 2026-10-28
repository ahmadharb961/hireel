"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toggle } from "@/components/Toggle";
import { useToast } from "@/components/Toast";
import { setPaused, setPublished, setShareLink, setVisibility } from "../actions";

export function ShareSettings({ shareOn, shareUrl, visibility, published, paused }: { shareOn: boolean; shareUrl: string; visibility: "EVERYONE" | "EMPLOYERS_ONLY"; published: boolean; paused: boolean }) {
  const t = useTranslations("share");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(p: Promise<{ ok: boolean; error?: string }>, msg?: string) {
    setErr(null);
    const r = await p;
    if (!r.ok) setErr(te(r.error ?? "generic")); else { if (msg) toast(msg); router.refresh(); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(shareUrl); } catch { /* fall back to selecting the field */ (document.getElementById("share-url") as HTMLInputElement | null)?.select(); }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="stack">
      <h1 className="h2">{t("title")}</h1>
      <div className="card">
        <div className="sw">
          <div><h2 className="h3">{t("linkTitle")}</h2><p className="p">{t("linkBody")}</p></div>
          <Toggle on={shareOn} label={t("linkTitle")} onChange={(on) => run(setShareLink(on ? "on" : "off"), on ? t("linkOn") : t("linkOff"))} />
        </div>
        {shareOn ? (
          <>
            <div className="row" style={{ marginTop: 10 }}>
              <input id="share-url" className="i" readOnly value={shareUrl} dir="ltr" aria-label={t("linkTitle")} style={{ flex: 3, fontSize: 13 }} />
              <button type="button" className="btn" style={{ flex: 1 }} onClick={copy}>{copied ? t("copied") : t("copy")}</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" className="btn g" onClick={() => run(setShareLink("regenerate"), t("regenerated"))}>{t("regenerate")}</button>
              <Link className="btn o" href={shareUrl.replace(/^https?:\/\/[^/]+/, "")} target="_blank">{t("open")}</Link>
            </div>
            <p className="note" style={{ marginTop: 8 }}>{t("regenerateNote")}</p>
          </>
        ) : null}
      </div>
      <div className="card">
        <h2 className="h3">{t("whoTitle")}</h2>
        <label className="chk"><input type="radio" name="vis" checked={visibility === "EVERYONE"} onChange={() => run(setVisibility("EVERYONE"), t("visEveryoneDone"))} /><span><b>{t("visEveryone")}</b><br /><span className="note">{t("visEveryoneSub")}</span></span></label>
        <label className="chk"><input type="radio" name="vis" checked={visibility === "EMPLOYERS_ONLY"} onChange={() => run(setVisibility("EMPLOYERS_ONLY"), t("visEmployersDone"))} /><span><b>{t("visEmployers")}</b><br /><span className="note">{t("visEmployersSub")}</span></span></label>
      </div>
      <div className="card">
        <div className="sw"><p className="p">{t("published")}</p><Toggle on={published} label={t("published")} onChange={(on) => run(setPublished(on), on ? t("publishedOn") : t("publishedOff"))} /></div>
        <div className="sw" style={{ marginTop: 12 }}><p className="p">{t("pause")}</p><Toggle on={paused} label={t("pause")} onChange={(on) => run(setPaused(on), on ? t("pauseOn") : t("pauseOff"))} /></div>
      </div>
      {err ? <p className="err" role="alert">{err}</p> : null}
    </div>
  );
}
