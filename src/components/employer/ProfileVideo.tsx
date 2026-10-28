"use client";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Player } from "@/components/Player";

export type PV = { id: string; lang: "EN" | "AR" | "FR"; primary: boolean; hls: string | null; poster: string | null; landscape: boolean; views: number | null };

/** Video block on full-profile and share pages, with the language switch. */
export function ProfileVideo({ videos, initials, countViews, demoLabel }: { videos: PV[]; initials: string; countViews: boolean; demoLabel?: string }) {
  const t = useTranslations("feed");
  const tl = useTranslations("languages");
  const [sel, setSel] = useState(() => videos.find((v) => v.primary)?.id ?? videos[0]?.id);
  const counted = useRef(new Set<string>());
  const v = videos.find((x) => x.id === sel);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="vid" style={{ background: "linear-gradient(160deg,#195C48,#2f8a6c)", maxHeight: "48vh", padding: 0 }}>
        {v?.views !== null && v?.views !== undefined ? <span className="st"><span className="pill">{t("views", { n: v.views })}</span></span> : null}
        {v?.hls ? (
          <Player src={v.hls} poster={v.poster} landscape={v.landscape} active load muted controls loop={false}
            onWatched3s={() => { if (countViews && !counted.current.has(v.id)) { counted.current.add(v.id); fetch("/api/views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId: v.id, watchedMs: 3000 }) }).catch(() => {}); } }} />
        ) : (
          <div style={{ color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <b style={{ fontSize: 64, opacity: 0.3 }}>{initials}</b>
            {demoLabel ? <span className="pill">{demoLabel}</span> : null}
          </div>
        )}
      </div>
      {videos.length > 1 ? (
        <div className="wrap" style={{ justifyContent: "center" }}>
          {videos.map((x) => <button key={x.id} type="button" className={`chipbtn${x.id === sel ? " on" : ""}`} aria-pressed={x.id === sel} onClick={() => setSel(x.id)}>{tl(x.lang)}{x.primary ? " ★" : ""}</button>)}
        </div>
      ) : null}
    </div>
  );
}
