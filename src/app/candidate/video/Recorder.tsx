"use client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Best length for an intro, and the hard stop (same limit as uploads). */
const IDEAL_SEC = 60;
const MAX_SEC = 120;
const SCRIPT_KEY = "hireel_script";
const SPEED_KEY = "hireel_script_speed";
/** Teleprompter speed: pixels per second at 1×. */
const BASE_PX = 26;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

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

const load = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const keep = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

const IconX = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>;
const IconFlip = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><path d="M9.5 13.5a3 3 0 0 0 5 1.5M14.5 11.5a3 3 0 0 0-5-1.5" /><path d="M14.8 15.3l-.3-1.8 1.8-.2M9.2 9.7l.3 1.8-1.8.2" />
  </svg>
);

/**
 * Record the intro video inside Hireel: camera with a face guide, your own script on a teleprompter
 * that scrolls by itself at the speed you choose, a 3-2-1 countdown, a timer with the ideal length,
 * then a preview with retake or "Use this video".
 */
export function Recorder({ open, onClose, onDone, onFallback, points }: { open: boolean; onClose: () => void; onDone: (file: File) => void; onFallback: () => void; points: string[] }) {
  const t = useTranslations("recorder");
  const live = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  // Teleprompter position in pixels (a decimal), kept outside React so it updates every frame.
  const pos = useRef(0);
  const [phase, setPhase] = useState<Phase>("starting");
  const [count, setCount] = useState(3);
  const [sec, setSec] = useState(0);
  const [clip, setClip] = useState<{ url: string; file: File } | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [err, setErr] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);

  // The script: what they wrote last time, or suggested points from their profile.
  useEffect(() => {
    if (!open) return;
    setScript(load(SCRIPT_KEY) || points.join("\n\n"));
    const s = Number(load(SPEED_KEY));
    if (SPEEDS.includes(s)) setSpeed(s);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    if (live.current) live.current.srcObject = null;
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

  // Open: start the camera. Close: stop everything.
  useEffect(() => {
    if (!open) return;
    void startCamera(facing);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (rec.current?.state === "recording") rec.current.stop();
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
    const started = Date.now();
    const timer = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setSec(s);
      if (s >= MAX_SEC) stop();
    }, 250);
    return () => clearInterval(timer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Teleprompter: the text moves up by itself while recording, at the chosen speed; tap to pause.
  // It's moved with a transform from the clock (not scrollTop in tiny steps: iPhone Safari ignores
  // steps under one pixel, and a busy phone may skip frames).
  const place = useCallback(() => {
    const el = textRef.current;
    if (el) el.style.transform = `translate3d(0, ${-pos.current.toFixed(2)}px, 0)`;
  }, []);
  useEffect(() => {
    if (phase !== "recording" || paused) return;
    let raf = 0;
    const from = pos.current;
    const start = performance.now();
    const box = scroller.current;
    const text = textRef.current;
    // Stop when the last line has reached the top part of the box.
    const max = box && text ? Math.max(0, text.scrollHeight - box.clientHeight * 0.35) : Infinity;
    const step = (now: number) => {
      pos.current = Math.min(max, from + ((now - start) / 1000) * BASE_PX * speed);
      place();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused, speed, place]);

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
      // Camera off while reviewing, so the preview shows the recording (not the live camera).
      stopCamera();
      setClip({ url: URL.createObjectURL(blob), file });
      setPhase("review");
    };
    rec.current = r;
    r.start(1000);
    setSec(0); setPaused(false);
    // Start from wherever they scrolled the script to before recording.
    if (scroller.current) { pos.current = scroller.current.scrollTop; scroller.current.scrollTop = 0; }
    place();
    setPhase("recording");
  }
  function stop() { if (rec.current?.state === "recording") rec.current.stop(); }
  function retake() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null); setSec(0);
    pos.current = 0;
    void startCamera(facing);
  }
  function use() {
    if (!clip) return;
    const f = clip.file;
    stopCamera();
    onDone(f);
  }
  function close() { stop(); stopCamera(); onClose(); }
  const flip = () => { const f = facing === "user" ? "environment" : "user"; setFacing(f); void startCamera(f); };
  const changeSpeed = (dir: 1 | -1) => {
    const i = Math.min(SPEEDS.length - 1, Math.max(0, SPEEDS.indexOf(speed) + dir));
    setSpeed(SPEEDS[i]); keep(SPEED_KEY, String(SPEEDS[i]));
  };
  const saveScript = () => {
    const s = draft.trim() || points.join("\n\n");
    setScript(s); keep(SCRIPT_KEY, s); setEditing(false);
  };

  if (!open || typeof document === "undefined") return null;
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const pct = Math.min(100, (sec / IDEAL_SEC) * 100);
  const showPrompter = phase === "ready" || phase === "countdown" || phase === "recording";

  return createPortal(
    <div className="recx" role="dialog" aria-modal="true" aria-label={t("title")}>
      {/* Top bar: its own row, below the phone's status bar, so nothing is covered. */}
      <div className="recx-top">
        <button type="button" className="recx-ib" onClick={close} aria-label={t("close")}><IconX /></button>
        {phase === "recording" ? (
          <div className={`recx-time${sec >= IDEAL_SEC ? " over" : ""}`} role="timer" aria-live="off">
            <span className="recx-dot" aria-hidden="true" />{mm(sec)}<small> / {mm(IDEAL_SEC)}</small>
          </div>
        ) : <b className="recx-title">{phase === "review" ? t("preview") : t("title")}</b>}
        {phase === "ready" ? <button type="button" className="recx-ib" onClick={flip} aria-label={t("flip")}><IconFlip /></button> : <span className="recx-ib-space" />}
      </div>
      {phase === "recording" ? <div className="recx-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div> : null}

      <div className="recx-stage">
        {phase === "review" && clip ? (
          <video key="review" className="recx-video" src={clip.url} controls playsInline autoPlay loop={false} />
        ) : (
          <video key="live" ref={live} className={`recx-video${facing === "user" ? " mirror" : ""}`} muted playsInline autoPlay />
        )}

        {phase === "ready" || phase === "countdown" || phase === "recording" ? <div className="recx-guide" aria-hidden="true"><span /></div> : null}

        {/* Teleprompter near the top (close to the camera), scrolling while recording. */}
        {showPrompter ? (
          <div className="recx-prompt">
            <div className={`recx-scroll${phase === "recording" ? " moving" : ""}`} ref={scroller} onClick={() => phase === "recording" && setPaused((p) => !p)} dir="auto">
              <div ref={textRef} className="recx-text" style={phase === "recording" ? undefined : { transform: "none" }}>
                <p>{script}</p>
              </div>
            </div>
            <div className="recx-pctl">
              {phase === "ready" ? <button type="button" className="recx-chip" onClick={() => { setDraft(script); setEditing(true); }}>✎ {t("editScript")}</button> : <span className="recx-hint">{paused ? t("paused") : t("tapPause")}</span>}
              <div className="recx-speed" role="group" aria-label={t("speed")}>
                <button type="button" onClick={() => changeSpeed(-1)} aria-label={t("slower")}>−</button>
                <span>{speed}×</span>
                <button type="button" onClick={() => changeSpeed(1)} aria-label={t("faster")}>+</button>
              </div>
            </div>
          </div>
        ) : null}

        {phase === "countdown" ? <div className="recx-count" aria-live="assertive">{count}</div> : null}
        {phase === "starting" ? <div className="recx-msg">{t("starting")}</div> : null}
        {phase === "error" ? <div className="recx-msg"><p>{err}</p><button type="button" className="btn" onClick={() => { close(); onFallback(); }}>{t("useCameraApp")}</button></div> : null}

        {editing ? (
          <div className="recx-edit">
            <label className="recx-edit-l" htmlFor="rec-script">{t("scriptLabel")}</label>
            <textarea id="rec-script" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={3000} dir="auto" placeholder={t("scriptPh")} />
            <p className="recx-tips">{t("scriptNote")}</p>
            <div className="row">
              <button type="button" className="btn g" onClick={() => setDraft(points.join("\n\n"))}>{t("useSuggested")}</button>
              <button type="button" className="btn" onClick={saveScript}>{t("saveScript")}</button>
            </div>
          </div>
        ) : null}
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
