"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { removeCandidatePhoto, setCandidateSuspended, unpublishCandidate } from "../../safe-actions";

export function CandidateControls({ id, suspended, published, hasPhoto }: { id: string; suspended: boolean; published: boolean; hasPhoto: boolean }) {
  const t = useTranslations("adminC");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast(te(r.error ?? "generic"));
    toast(done);
    setReason("");
    router.refresh();
  });
  return (
    <div className="card">
      <h2 className="h3">{t("actions")}</h2>
      <label className="lbl" htmlFor="adm-reason">{t("reasonOptional")}</label>
      <input className="i" id="adm-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
      <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
        {hasPhoto ? <button type="button" className="btn sm g" disabled={pending} onClick={() => run(() => removeCandidatePhoto(id, reason), t("photoRemoved"))}>{t("removePhoto")}</button> : null}
        {published ? <button type="button" className="btn sm g" disabled={pending} onClick={() => run(() => unpublishCandidate(id, reason), t("unpublished"))}>{t("unpublish")}</button> : null}
        {suspended
          ? <button type="button" className="btn sm" disabled={pending} onClick={() => run(() => setCandidateSuspended(id, false, reason), t("restored"))}>{t("restore")}</button>
          : <button type="button" className="btn sm bad" disabled={pending} onClick={() => { if (confirm(t("suspendConfirm"))) run(() => setCandidateSuspended(id, true, reason), t("suspendedDone")); }}>{t("suspend")}</button>}
      </div>
      <p className="note" style={{ marginTop: 8 }}>{t("actionsNote")}</p>
    </div>
  );
}
