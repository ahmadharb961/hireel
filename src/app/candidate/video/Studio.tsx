"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as tus from "tus-js-client";
import { Recorder, recorderSupported } from "./Recorder";
import { Player } from "@/components/Player";
import { Toggle } from "@/components/Toggle";
import { useToast } from "@/components/Toast";
import { MAX_UPLOAD_BYTES, VIDEO_LANGUAGES, type VideoLang } from "@/lib/constants";
import type { StudioVideo } from "@/server/candidate-data";
import { parseReason } from "@/lib/reason";
import { changeVideoLanguage, makePrimary, removeVideo, setTextOnly, startVideo } from "../safe-actions";

type Upload = { slot: number; pct: number; phase: "uploading" | "processing" | "error"; error?: string; videoId?: string };

function readDuration(file: File): Promise<{ duration: number; landscape: boolean } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => { resolve({ duration: v.duration, landscape: v.videoWidth > v.videoHeight }); URL.revokeObjectURL(url); };
    v.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    v.src = url;
  });
}

export function Studio({ videos, uploadsEnabled, textOnly, aboutOk, points }: { videos: StudioVideo[]; uploadsEnabled: boolean; textOnly: boolean; aboutOk: boolean; points: string[] }) {
  const t = useTranslations("studio");
  const tl = useTranslations("languages");
  const ts = useTranslations("videoStatus");
  const te = useTranslations("errors");
  const tr = useTranslations("rejection");
  const reasonText = (raw: string | null) => { const r = parseReason(raw); return [r.key ? tr(r.key) : "", r.note].filter(Boolean).join(" "); };
  const toast = useToast();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [newLang, setNewLang] = useState<VideoLang>(() => VIDEO_LANGUAGES.find((l) => !videos.some((v) => v.lang === l)) ?? "EN");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [recording, setRecording] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const recordRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  const slot = videos[active] ?? null;
  const hasPending = videos.some((v) => v.status === "uploading" || v.status === "processing" || v.replacement?.status === "uploading" || v.replacement?.status === "processing");

  // While anything is processing, check back every few seconds.
  useEffect(() => {
    if (!hasPending && upload?.phase !== "processing") return;
    const id = setInterval(async () => {
      const ids = [upload?.videoId, ...videos.flatMap((v) => [v.status === "processing" || v.status === "uploading" ? v.id : null, v.replacement && (v.replacement.status === "processing" || v.replacement.status === "uploading") ? v.replacement.id : null])].filter(Boolean) as string[];
      for (const vid of ids) {
        const r = await fetch(`/api/videos/${vid}/status`).then((x) => x.json()).catch(() => null);
        if (r && r.status !== "uploading" && r.status !== "processing") {
          setUpload(null);
          router.refresh();
          return;
        }
      }
    }, 4000);
    return () => clearInterval(id);
  }, [hasPending, upload, videos, router]);

  async function onFile(file: File | undefined) {
    setError(null); setTip(null);
    if (!file) return;
    if (!consent) return setError(t("consentFirst"));
    if (file.size > MAX_UPLOAD_BYTES) return setError(t("tooBig"));
    const meta = await readDuration(file);
    if (!meta) return setError(t("unreadable"));
    if (isFinite(meta.duration) && meta.duration > 120) return setError(t("tooLong", { time: fmtTime(meta.duration) }));
    if (isFinite(meta.duration) && meta.duration < 30) setTip(t("tooShort"));

    const lang = slot ? slot.lang : newLang;
    const res = await startVideo({ language: lang, consent, replaceId: slot?.id ?? null });
    if (!res.ok) return setError(te(res.error));
    setUpload({ slot: active, pct: 0, phase: "uploading", videoId: res.videoId });
    const up = new tus.Upload(file, {
      endpoint: `/api/videos/tus?videoId=${encodeURIComponent(res.videoId)}`,
      chunkSize: 50 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      metadata: { filename: file.name, filetype: file.type },
      removeFingerprintOnSuccess: true,
      onProgress: (sent, total) => setUpload((u) => (u ? { ...u, pct: Math.round((sent / total) * 100) } : u)),
      onSuccess: () => { setUpload((u) => (u ? { ...u, pct: 100, phase: "processing" } : u)); router.refresh(); },
      onError: () => setUpload((u) => (u ? { ...u, phase: "error", error: t("uploadFailed") } : u)),
    });
    up.start();
    if (slot && slot.status === "live") toast(t("replaceNote"));
  }

  async function run(p: Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    const r = await p;
    if (!r.ok) setError(te(r.error ?? "generic"));
    else { if (okMsg) toast(okMsg); router.refresh(); }
  }

  const status = upload && upload.slot === active ? (upload.phase === "error" ? null : upload.phase) : slot?.status;
  const statusMsg = status ? t.has(`statusMsg.${status}`) ? t(`statusMsg.${status}`) : null : null;
  const canUpload = uploadsEnabled && !(upload && upload.phase === "uploading");

  return (
    <div className="stack">
      <div>
        <h1 className="h2">{t("title")}</h1>
        <p className="p">{t("intro")}</p>
      </div>

      {!uploadsEnabled ? <div className="card" style={{ background: "var(--warnbg)", borderColor: "transparent" }}><p className="p" style={{ color: "var(--tx)" }}>{t("notConfigured")}</p></div> : null}

      <div className="seg" role="tablist">
        {[0, 1].map((i) => {
          const v = videos[i];
          return (
            <button key={i} type="button" role="tab" aria-selected={active === i} className={active === i ? "on" : ""} onClick={() => { setActive(i); setError(null); setConfirmRemove(false); }}>
              <span>{t("slot", { n: i + 1 })}</span>
              <small>{v ? tl(v.lang) : t("empty")}{v?.primary ? ` · ${t("primary")}` : ""}{v?.status === "live" && !v.isDemo ? ` · 👁 ${v.views}` : ""}</small>
            </button>
          );
        })}
      </div>

      <div>
        <label className="lbl" htmlFor="lang" style={{ marginTop: 0 }}>{t("language")}</label>
        <select
          className="i"
          id="lang"
          value={slot ? slot.lang : newLang}
          onChange={(e) => {
            const l = e.target.value as VideoLang;
            const other = videos.find((v, i) => i !== active);
            if (other && other.lang === l) return setError(t("differentLanguages"));
            setError(null);
            if (slot) run(changeVideoLanguage(slot.id, l));
            else setNewLang(l);
          }}
        >
          {VIDEO_LANGUAGES.map((l) => <option key={l} value={l}>{tl(l)}</option>)}
        </select>
      </div>

      <div className="vid">
        {slot?.isDemo ? <span>{t("demoVideo")}</span> : slot?.hls ? (
          <Player src={slot.hls} poster={slot.poster} landscape={slot.landscape} active={false} load muted={false} controls loop={false} />
        ) : upload && upload.slot === active && upload.phase === "uploading" ? (
          <div style={{ width: "100%" }}><p>{t("uploadingPct", { pct: upload.pct })}</p><div className="bar"><i style={{ width: `${upload.pct}%` }} /></div></div>
        ) : <span>{slot ? ts(slot.status) : t("noVideo")}</span>}
      </div>
      {slot?.landscape ? <p className="note" style={{ textAlign: "center" }}>{t("landscapeNote")}</p> : null}
      {slot && status && status !== "rejected" ? (
        <div className={`vstatus ${status}`} role="status">
          <span className="vstatus-ic" aria-hidden="true">{status === "live" ? "✓" : status === "failed" ? "!" : status === "review" ? "⏳" : "…"}</span>
          <div><b>{status === "review" ? t("pendingTitle") : ts(status)}</b>{statusMsg ? <p>{statusMsg}</p> : null}{status === "live" && !slot.isDemo ? <p id="views"><b>👁 {t("viewsCount", { n: slot.views })}</b></p> : null}</div>
        </div>
      ) : null}

      {slot && slot.status === "rejected" ? (
        <div className="card" style={{ background: "var(--badbg)", borderColor: "transparent" }}>
          <h2 className="h3" style={{ color: "var(--bad)" }}>{t("rejectedTitle")}</h2>
          <p className="p" style={{ color: "var(--tx)" }}>{t("rejectedReason", { reason: reasonText(slot.reason) })}</p>
          <p className="note" style={{ marginTop: 6 }}>{t("rejectedNext")}</p>
        </div>
      ) : null}
      {slot?.replacement ? (
        <div className="card" style={{ background: slot.replacement.status === "rejected" ? "var(--badbg)" : "var(--warnbg)", borderColor: "transparent" }}>
          <h2 className="h3">{t("replacementTitle")}: {ts(slot.replacement.status)}</h2>
          <p className="p" style={{ color: "var(--tx)" }}>
            {slot.replacement.status === "rejected" ? t("rejectedReason", { reason: reasonText(slot.replacement.reason) }) : t("replacementBody")}
          </p>
        </div>
      ) : null}

      {upload?.phase === "error" && upload.slot === active ? <p className="err" role="alert">{upload.error}</p> : null}
      {error ? <p className="err" role="alert" style={{ textAlign: "center" }}>{error}</p> : null}
      {tip ? <p className="note" style={{ textAlign: "center" }}>{tip}</p> : null}

      <label className="chk" style={{ marginTop: 0 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{t("consent")}</span>
      </label>
      <Recorder open={recording} points={points} onClose={() => setRecording(false)} onFallback={() => recordRef.current?.click()} onDone={(f) => { setRecording(false); void onFile(f); }} />
      <input ref={recordRef} type="file" accept="video/*" capture="user" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={pickRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="row">
        <button type="button" className="btn" disabled={!canUpload} onClick={() => {
          if (!consent) return setError(t("consentFirst"));
          // Record inside Hireel with the coach; phones without it use their camera app.
          if (recorderSupported()) setRecording(true); else recordRef.current?.click();
        }}>{slot ? t("recordNew") : t("record")}</button>
        <button type="button" className="btn g" disabled={!canUpload} onClick={() => (consent ? pickRef.current?.click() : setError(t("consentFirst")))}>{t("upload")}</button>
      </div>
      {slot && !slot.primary && slot.status === "live" ? <button type="button" className="btn g w" onClick={() => run(makePrimary(slot.id), t("primaryDone"))}>{t("makePrimary")}</button> : null}
      {slot ? (
        confirmRemove ? (
          <div className="card" style={{ background: "var(--badbg)", borderColor: "transparent" }}>
            <p className="p" style={{ color: "var(--tx)" }}>{t("removeConfirm")}</p>
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className="btn sm g" onClick={() => setConfirmRemove(false)}>{t("cancel")}</button>
              <button type="button" className="btn sm bad" onClick={() => { setConfirmRemove(false); run(removeVideo(slot.id), t("removed")); }}>{t("remove")}</button>
            </div>
          </div>
        ) : <button type="button" className="btn o w" onClick={() => setConfirmRemove(true)}>{t("remove")}</button>
      ) : null}
      {slot ? <p className="note">{t("archiveNote")}</p> : null}

      <div className="card">
        <h2 className="h3">{t("questionsTitle")}</h2>
        <div className="stack" style={{ gap: 6, marginTop: 6 }}>
          <div className="q">1. {t("q1")}</div>
          <div className="q">2. {t("q2")}</div>
          <div className="q">3. {t("q3")}</div>
        </div>
        <p className="note" style={{ marginTop: 10 }}>{t("tips")}</p>
      </div>

      <div className="card">
        <div className="sw">
          <div><h2 className="h3">{t("textOnlyTitle")}</h2><p className="p">{t("textOnlyBody")}</p></div>
          <Toggle on={textOnly} label={t("textOnlyTitle")} onChange={(on) => run(setTextOnly(on), on ? t("textOnlyOn") : t("textOnlyOff"))} />
        </div>
        {!aboutOk && !textOnly ? <p className="note" style={{ marginTop: 8 }}>{t.rich("textOnlyNeedsAbout", { link: (c) => <Link href="/candidate/edit">{c}</Link> })}</p> : null}
      </div>
    </div>
  );
}

function fmtTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}
