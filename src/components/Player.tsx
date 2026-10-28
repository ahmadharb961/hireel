"use client";
import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";

type Props = {
  src: string | null;
  poster: string | null;
  landscape?: boolean;
  active: boolean;
  /** Only mount the real <video> for the active card and its neighbours. */
  load: boolean;
  muted: boolean;
  paused?: boolean;
  controls?: boolean;
  loop?: boolean;
  onWatched3s?: () => void;
  onProgress?: (fraction: number) => void;
  onError?: () => void;
  /** Browsers may refuse to start a video with sound before the person has tapped anything. */
  onAutoplayBlocked?: () => void;
};

/**
 * HLS player. Safari plays HLS natively; other browsers get hls.js, loaded only when needed.
 * Landscape videos are shown whole (contain) over a blurred copy of their poster, never stretched.
 */
export function Player({ src, poster, landscape, active, load, muted, paused, controls, loop = true, onWatched3s, onProgress, onError, onAutoplayBlocked }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const watched = useRef(0);
  const last = useRef<number | null>(null);
  const reported = useRef(false);
  const [failed, setFailed] = useState(false);
  const onErrorRef = useRef(onError);
  const onBlockedRef = useRef(onAutoplayBlocked);
  useEffect(() => { onErrorRef.current = onError; onBlockedRef.current = onAutoplayBlocked; });

  useEffect(() => {
    const v = ref.current;
    if (!v || !src || !load) return;
    let cancelled = false;
    setFailed(false);
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
    } else {
      import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled || !HlsLib.isSupported()) return;
        const hls = new HlsLib({ maxBufferLength: saveData ? 6 : 12, capLevelToPlayerSize: true, startLevel: -1 });
        hls.loadSource(src);
        hls.attachMedia(v);
        hls.on(HlsLib.Events.ERROR, (_e, d) => { if (d.fatal) { setFailed(true); onErrorRef.current?.(); } });
        hlsRef.current = hls;
      });
    }
    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      v.removeAttribute("src");
      v.load();
    };
  }, [src, load]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active && !paused) {
      v.play().catch((e: unknown) => {
        // Sound not allowed yet: start muted instead, and let the page show the sound button.
        if ((e as { name?: string })?.name === "NotAllowedError" && !v.muted) {
          v.muted = true;
          onBlockedRef.current?.();
          v.play().catch(() => {});
        }
      });
    } else v.pause();
  }, [active, paused, load]);

  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);

  function onTime() {
    const v = ref.current;
    if (!v) return;
    if (v.duration) onProgress?.(v.currentTime / v.duration);
    const now = performance.now();
    if (last.current !== null && !v.paused) watched.current += Math.min(now - last.current, 1000);
    last.current = now;
    if (!reported.current && watched.current >= 3000) {
      reported.current = true;
      onWatched3s?.();
    }
  }

  if (!src) return null;
  return (
    <div className={`player${landscape ? " land" : ""}`}>
      {poster ? <img className="poster" src={poster} alt="" aria-hidden="true" style={landscape ? { filter: "blur(24px) brightness(.6)", transform: "scale(1.2)" } : undefined} /> : null}
      {load ? (
        <video
          ref={ref}
          className="fg"
          poster={poster ?? undefined}
          muted={muted}
          playsInline
          loop={loop}
          controls={controls}
          preload={active ? "auto" : "metadata"}
          onTimeUpdate={onTime}
          onPause={() => { last.current = null; }}
          onError={() => { setFailed(true); onError?.(); }}
        />
      ) : null}
      {failed ? <div className="pz" style={{ pointerEvents: "auto" }}><span>!</span></div> : null}
    </div>
  );
}
