"use client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sheet } from "./Sheet";

export type CropArea = { x: number; y: number; w: number; h: number };
type View = { s: number; x: number; y: number };

/**
 * Lets the person choose the part of a picture to keep: drag to move, pinch / slider / mouse wheel to zoom.
 * Zooming all the way out fits the whole picture, with white around it.
 * Returns the area as fractions of the picture, which the server cuts out at full quality.
 */
export function ImageCropper({ file, aspect, onCancel, onDone }: { file: File | null; aspect: number; onCancel: () => void; onDone: (crop: CropArea | null) => void }) {
  const t = useTranslations("cropper");
  const frame = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setSrc(u); setNat(null);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // The frame's size on screen (changes when the phone turns).
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  const limits = useCallback(() => {
    if (!nat || !box.w) return { min: 1, cover: 1, max: 4 };
    const cover = Math.max(box.w / nat.w, box.h / nat.h);
    const min = Math.min(box.w / nat.w, box.h / nat.h);
    return { min, cover, max: cover * 4 };
  }, [nat, box]);

  /** Keeps the picture inside sensible bounds: no gaps when it's larger than the frame, centred-ish when smaller. */
  const clamp = useCallback((v: View): View => {
    if (!nat) return v;
    const { min, max } = limits();
    const s = Math.min(max, Math.max(min, v.s));
    const iw = nat.w * s, ih = nat.h * s;
    const fit = (pos: number, img: number, fr: number) => (img >= fr ? Math.min(0, Math.max(fr - img, pos)) : Math.max(0, Math.min(fr - img, pos)));
    return { s, x: fit(v.x, iw, box.w), y: fit(v.y, ih, box.h) };
  }, [nat, box, limits]);

  // Start filled and centred, and re-centre if the frame size changes.
  const center = useCallback((s: number) => {
    if (!nat) return;
    setView(clamp({ s, x: (box.w - nat.w * s) / 2, y: (box.h - nat.h * s) / 2 }));
  }, [nat, box, clamp]);
  useEffect(() => { if (nat && box.w) center(limits().cover); }, [nat, box.w, box.h]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Zoom around a point in the frame (the fingers, the mouse, or the middle for the slider). */
  const zoomTo = (s: number, cx = box.w / 2, cy = box.h / 2) => {
    setView((v) => {
      const k = s / v.s;
      return clamp({ s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
    });
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const r = frame.current!.getBoundingClientRect();
      zoomTo(pinch.current.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    } else if (pointers.current.size === 1) {
      setView((v) => clamp({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    const r = frame.current!.getBoundingClientRect();
    zoomTo(view.s * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = 12;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) { e.preventDefault(); setView((v) => clamp({ ...v, x: v.x + moves[e.key][0], y: v.y + moves[e.key][1] })); }
    if (e.key === "+" || e.key === "=") zoomTo(view.s * 1.1);
    if (e.key === "-") zoomTo(view.s / 1.1);
  };

  function save() {
    if (!nat) return onDone(null);
    const iw = nat.w * view.s, ih = nat.h * view.s;
    onDone({ x: -view.x / iw, y: -view.y / ih, w: box.w / iw, h: box.h / ih });
  }

  const { min, cover, max } = limits();
  // The slider works on a log scale so zooming feels even.
  const toSlider = (s: number) => (Math.log(s / min) / Math.log(max / min)) * 100;
  const fromSlider = (p: number) => min * Math.pow(max / min, p / 100);

  return (
    <Sheet open={Boolean(file)} onClose={onCancel} label={t("title")}>
      <h3 className="h3" style={{ fontSize: 18 }}>{t("title")}</h3>
      <p className="p">{t("help")}</p>
      <div
        ref={frame}
        className="crop-frame"
        style={{ aspectRatio: String(aspect) }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        onKeyDown={onKey}
        tabIndex={0}
        role="application"
        aria-label={t("frame")}
      >
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            // A format this browser can't show (some HEIC photos): upload it and let the server choose.
            onError={() => onDone(null)}
            style={nat ? { width: nat.w * view.s, height: nat.h * view.s, transform: `translate(${view.x}px, ${view.y}px)` } : { opacity: 0 }}
          />
        ) : null}
        <span className="crop-grid" aria-hidden="true" />
      </div>
      <div className="crop-zoom">
        <span aria-hidden="true">−</span>
        <input type="range" min={0} max={100} step={0.5} value={nat ? toSlider(view.s) : 0} onChange={(e) => zoomTo(fromSlider(Number(e.target.value)))} aria-label={t("zoom")} disabled={!nat} />
        <span aria-hidden="true">+</span>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <button type="button" className="btn sm g" disabled={!nat} onClick={() => center(min)}>{t("fitAll")}</button>
        <button type="button" className="btn sm g" disabled={!nat} onClick={() => center(cover)}>{t("fill")}</button>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button type="button" className="btn g" onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className="btn" disabled={!nat} onClick={save}>{t("save")}</button>
      </div>
    </Sheet>
  );
}
