"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { reportCandidate, toggleSave } from "@/app/employer/safe-actions";
import { GateSheet, RequestSheet, UpgradeBody, type Quota } from "./Sheets";

const REASONS = ["fake", "inappropriate", "contact_in_video", "other"] as const;

export function ProfileActions({ candidate, saved, requested, quota }: { candidate: { id: string; name: string }; saved: boolean; requested: boolean; quota: Quota | null }) {
  const t = useTranslations("feed");
  const tr = useTranslations("report");
  const te = useTranslations("errors");
  const tu = useTranslations("upgrade");
  const toast = useToast();
  const router = useRouter();
  const [isSaved, setSaved] = useState(saved);
  const [sent, setSent] = useState(requested);
  const [sheet, setSheet] = useState<null | "gate" | "request" | "report" | "upgrade">(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("fake");
  const [details, setDetails] = useState("");

  async function save() {
    if (!quota) return setSheet("gate");
    const r = await toggleSave(candidate.id);
    if (!r.ok) return r.error === "saved_limit" ? setSheet("upgrade") : toast(te(r.error));
    setSaved(Boolean(r.saved));
    toast(r.saved ? t("saved") : t("unsaved"));
  }

  return (
    <>
      <div className="row">
        <button type="button" className="btn g" onClick={save}>{isSaved ? `${t("savedBtn")} ✓` : t("save")}</button>
        <button type="button" className="btn" disabled={sent} onClick={() => setSheet(quota ? "request" : "gate")}>{sent ? t("requestSent") : t("requestIntro")}</button>
      </div>
      {quota ? <button type="button" className="btn o w" onClick={() => setSheet("report")}>{tr("button")}</button> : null}

      <GateSheet open={sheet === "gate"} onClose={() => setSheet(null)} why="req" />
      {quota && sheet === "request" ? (
        <RequestSheet open onClose={() => setSheet(null)} candidate={candidate} quota={quota}
          onSent={() => { setSent(true); setSheet(null); toast(t("sent", { name: candidate.name.split(" ")[0] })); router.refresh(); }} />
      ) : null}
      <Sheet open={sheet === "upgrade"} onClose={() => setSheet(null)} label={tu("title")}>
        <UpgradeBody reason={tu("savedLimit", { plan: quota?.planName ?? "" })} onClose={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === "report"} onClose={() => setSheet(null)} label={tr("title")}>
        <h3 className="h3" style={{ fontSize: 18 }}>{tr("title")}</h3>
        <p className="p">{tr("body")}</p>
        {REASONS.map((k) => <label key={k} className="chk"><input type="radio" name="rp" checked={reason === k} onChange={() => setReason(k)} /><span>{tr(`reasons.${k}`)}</span></label>)}
        <label className="lbl" htmlFor="rpx">{tr("details")}</label>
        <textarea className="i" id="rpx" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn g" onClick={() => setSheet(null)}>{tr("cancel")}</button>
          <button type="button" className="btn" onClick={async () => { const r = await reportCandidate(candidate.id, reason, details); setSheet(null); toast(r.ok ? tr("sent") : te(r.error)); }}>{tr("send")}</button>
        </div>
      </Sheet>
    </>
  );
}
