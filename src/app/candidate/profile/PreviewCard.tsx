"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Player } from "@/components/Player";

type V = { id: string; lang: "EN" | "AR" | "FR"; primary: boolean; hls: string | null; poster: string | null; landscape: boolean };

export function PreviewCard({ name, photo, headline, city, skills, textOnly, about, videos }: { name: string; photo: string | null; headline: string; city: string; skills: string[]; textOnly: boolean; about: string; videos: V[] }) {
  const t = useTranslations("candidate");
  const tl = useTranslations("languages");
  const [sel, setSel] = useState(() => videos.find((v) => v.primary)?.id ?? videos[0]?.id);
  const v = videos.find((x) => x.id === sel);
  return (
    <div className={`pp${textOnly ? " text" : ""}`}>
      <div className="pp-media">
      {textOnly ? (
        <div className="vp" style={{ aspectRatio: "auto", padding: 16, textAlign: "start", display: "block", lineHeight: 1.5 }}>{about}</div>
      ) : (
        <div className="vp">
          {v?.hls ? <Player src={v.hls} poster={v.poster} landscape={v.landscape} active load muted /> : <span>{v ? t("demoVideo") : t("videoHere")}</span>}
        </div>
      )}
      {!textOnly && videos.length > 1 ? (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {videos.map((x) => (
            <button key={x.id} type="button" className={`lgp${x.id === sel ? " on" : ""}`} onClick={() => setSel(x.id)}>{tl(x.lang)}{x.primary ? " ★" : ""}</button>
          ))}
        </div>
      ) : null}
      </div>
      <div className="pp-info">
        <div className="pv-name">{photo ? <img className="pv-av" src={photo} alt="" /> : null}<h2 className="h2">{name}</h2></div>
        <p style={{ color: "#e3efe9", fontSize: 14 }}>{headline}{city ? ` · ${city}` : ""}</p>
        <div>{skills.map((s) => <span key={s} className="t">{s}</span>)}</div>
        {about && !textOnly ? <p className="pp-about">{about}</p> : null}
      </div>
    </div>
  );
}
