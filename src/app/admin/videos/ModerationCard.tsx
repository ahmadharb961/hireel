"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Player } from "@/components/Player";
import { useToast } from "@/components/Toast";
import { REJECTION_REASONS } from "@/lib/constants";
import { moderateVideo } from "../actions";

type Item = { id: string; name: string; headline: string; lang: "EN" | "AR" | "FR"; duration: number | null; landscape: boolean; hls: string | null; poster: string | null; consent: boolean; isReplacement: boolean };

export function ModerationCard({ item }: { item: Item }) {
  const t = useTranslations("admin");
  const tr = useTranslations("rejection");
  const tl = useTranslations("languages");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [key, setKey] = useState<string>("custom");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approve" | "reject") {
    setBusy(true); setErr(null);
    const r = await moderateVideo(item.id, decision, key, note);
    setBusy(false);
    if (!r.ok) return setErr(te(r.error));
    toast(decision === "approve" ? t("approved") : t("rejected"));
    router.refresh();
  }

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ position: "relative", width: 140, aspectRatio: "9/16", borderRadius: 12, overflow: "hidden", background: "var(--media)", flex: "none" }}>
          {item.hls ? <Player src={item.hls} poster={item.poster} landscape={item.landscape} active={false} load muted={false} controls loop={false} /> : null}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="h3">{item.name}</h2>
          <p className="p">{item.headline}</p>
          <p className="p">{tl(item.lang)}{item.duration ? ` · ${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, "0")}` : ""}</p>
          <p className="note">{item.consent ? t("consentGiven") : t("consentMissing")}{item.landscape ? ` · ${t("landscape")}` : ""}{item.isReplacement ? ` · ${t("replacement")}` : ""}</p>
        </div>
      </div>
      {rejecting ? (
        <>
          <label className="lbl" htmlFor={`k-${item.id}`}>{t("reasonLabel")}</label>
          <select className="i" id={`k-${item.id}`} value={key} onChange={(e) => setKey(e.target.value)}>
            <option value="custom">{tr("custom")}</option>
            {REJECTION_REASONS.map((k) => <option key={k} value={k}>{tr(k)}</option>)}
          </select>
          <label className="lbl" htmlFor={`n-${item.id}`}>{t("noteLabel")}</label>
          <textarea className="i" id={`n-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} placeholder={t("notePlaceholder")} />
          {err ? <p className="err" role="alert">{err}</p> : null}
          <div className="row" style={{ marginTop: 10 }}>
            <button type="button" className="btn sm g" onClick={() => setRejecting(false)}>{t("cancel")}</button>
            <button type="button" className="btn sm bad" disabled={busy} onClick={() => decide("reject")}>{t("rejectVideo")}</button>
          </div>
        </>
      ) : (
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn sm g" onClick={() => setRejecting(true)}>{t("reject")}</button>
          <button type="button" className="btn sm" disabled={busy || !item.consent} onClick={() => decide("approve")}>{t("approve")}</button>
        </div>
      )}
      {err && !rejecting ? <p className="err" role="alert">{err}</p> : null}
    </div>
  );
}
