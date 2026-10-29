"use client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Best length for an intro, and the hard stop (same limit as uploads). */
const IDEAL_SEC = 60;
const MAX_SEC = 120;

type Phase = "starting" | "ready" | "countdown" | "recording" | "review" | "error";

/** A recording format this browser can make (iPhone: MP4, Chrome/Android: MP4 or WebM). */
function pickType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return "";
}

export function recorderSupported() {
  return typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
}

/**
 * Record the intro video inside Hireel: camera preview with a face guide, three talking points
 * (teleprompter), a 3-2-1 countdown, a timer with the ideal length, retakes, then "Use this video".
 */
export function Recorder({ open, onClose, onDone, onFallback, points }: { open: boolean; onClose: () => void; onDone: (file: File) => void; onFallback: () => void; points: string[] }) {
  const t = useTranslations("recorder");
  const live = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [phase, setPhase] = useState<Phase>("starting");
  const [count, setCount] = useState(3);
  const [sec, setSec] = useState(0);
  const [point, setPoint] = useState(0);
  const [clip, setClip] = useState<{ url: string; file: File } | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [err, setErr] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  }, []);

  const startCamera = useCallback(async (face: "user" | "environment") => {
    stopCamera();
    setPhase("starting"); setErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      stream.current = s;
      if (live.current) { live.current.srcObject = s; await live.current.play().catch(() => {}); }
      setPhase("ready");
    } catch (e) {
      const name = (e as { name?: string }).name;
      setErr(name === "NotAllowedError" || name === "SecurityError" ? t("noPermission") : t("noCamera"));
      setPhase("error");
    }
  }, [stopCamera, t]);

  // Open: start the camera. Close: stop everything and free the preview.
  useEffect(() => {
    if (!open) return;
    void startCamera(facing);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      rec.current?.state === "recording" && rec.current.stop();
      stopCamera();
      document.body.style.overflow = prev;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);

  // Countdown, then record.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { begin(); return; }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, count]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer while recording; stops by itself at the limit.
  useEffect(() => {
    if (phase !== "recording") return;
    const started = Date.now() - sec * 1000;
    const timer = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setSec(s);
      if (s >= MAX_SEC) stop();
    }, 250);
    return () => clearInterval(timer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function begin() {
    const s = stream.current;
    const type = pickType();
    if (!s || type === null) { setErr(t("noCamera")); setPhase("error"); return; }
    chunks.current = [];
    const r = new MediaRecorder(s, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 2_500_000 });
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    r.onstop = () => {
      const mime = r.mimeType || type || "video/webm";
      const blob = new Blob(chunks.current, { type: mime });
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `hireel-intro.${ext}`, { type: mime.split(";")[0] });
      setClip({ url: URL.createObjectURL(blob), file });
      setPhase("review");
    };
    rec.current = r;
    r.start(1000);
    setSec(0); setPoint(0);
    setPhase("recording");
  }
  function stop() { if (rec.current?.state === "recording") rec.current.stop(); }
  function retake() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null); setSec(0); setPoint(0);
    setPhase("ready");
    if (live.current && stream.current) { live.current.srcObject = stream.current; void live.current.play().catch(() => {}); }
  }
  function use() {
    if (!clip) return;
    const f = clip.file;
    stopCamera();
    onDone(f);
  }
  function close() { stop(); stopCamera(); onClose(); }
  const flip = () => { const f = facing === "user" ? "environment" : "user"; setFacing(f); void startCamera(f); };

  if (!open || typeof document === "undefined") return null;
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const pct = Math.min(100, (sec / IDEAL_SEC) * 100);

  return createPortal(
    <div className="recx" role="dialog" aria-modal="true" aria-label={t("title")}>
      <div className="recx-stage">
        {phase === "review" && clip ? (
          <video className="recx-video" src={clip.url} controls playsInline autoPlay />
        ) : (
          <video ref={live} className={`recx-video${facing === "user" ? " mirror" : ""}`} muted playsInline autoPlay />
        )}

        {phase !== "review" && phase !== "error" ? <div className="recx-guide" aria-hidden="true"><span /></div> : null}

        <div className="recx-top">
          <button type="button" className="recx-x" onClick={close} aria-label={t("close")}>✕</button>
          {phase === "recording" ? (
            <div className={`recx-time${sec >= IDEAL_SEC ? " over" : ""}`} role="timer" aria-live="off">
              <span className="recx-dot" aria-hidden="true" />{mm(sec)}<small> / {mm(IDEAL_SEC)}</small>
            </div>
          ) : <b className="recx-title">{t("title")}</b>}
          {phase === "ready" ? <button type="button" className="recx-x" onClick={flip} aria-label={t("flip")}>⟲</button> : <span style={{ width: 40 }} />}
        </div>

        {phase === "recording" ? <div className="recx-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div> : null}

        {/* Teleprompter: one talking point at a time; tap to go to the next. */}
        {phase === "ready" || phase === "recording" || phase === "countdown" ? (
          <button type="button" className="recx-prompt" onClick={() => setPoint((p) => (p + 1) % points.length)} aria-label={t("nextPoint")}>
            <small>{t("pointOf", { n: point + 1, total: points.length })}</small>
            <span dir="auto">{points[point]}</span>
            <em>{t("tapNext")}</em>
          </button>
        ) : null}

        {phase === "countdown" ? <div className="recx-count" aria-live="assertive">{count}</div> : null}
        {phase === "starting" ? <div className="recx-msg">{t("starting")}</div> : null}
        {phase === "error" ? <div className="recx-msg"><p>{err}</p><button type="button" className="btn" onClick={() => { close(); onFallback(); }}>{t("useCameraApp")}</button></div> : null}
      </div>

      <div className="recx-controls">
        {phase === "ready" ? (
          <>
            <p className="recx-tips">{t("tips")}</p>
            <button type="button" className="recx-rec" onClick={() => { setCount(3); setPhase("countdown"); }} aria-label={t("start")}><span /></button>
          </>
        ) : phase === "recording" ? (
          <>
            <p className="recx-tips">{sec < 30 ? t("keepGoing") : sec < IDEAL_SEC ? t("goodLength") : t("wrapUp")}</p>
            <button type="button" className="recx-rec on" onClick={stop} aria-label={t("stop")}><span /></button>
          </>
        ) : phase === "review" ? (
          <div className="row" style={{ width: "100%" }}>
            <button type="button" className="btn g" onClick={retake}>{t("retake")}</button>
            <button type="button" className="btn" onClick={use}>{t("use")}</button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
