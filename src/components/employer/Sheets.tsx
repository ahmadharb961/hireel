"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { EMPLOYMENT_TYPES } from "@/lib/constants";
import { requestIntro } from "@/app/employer/actions";

export type Quota = { introLeft: number; cvLeft: number; planName: string; isPremium: boolean };

/** Shown to visitors when they try to act on a reel. */
export function GateSheet({ open, onClose, why }: { open: boolean; onClose: () => void; why: string }) {
  const tg = useTranslations("gate");
  return (
    <Sheet open={open} onClose={onClose} label={tg("title")}>
      <h3 className="h3" style={{ fontSize: 18 }}>{tg("title")}</h3>
      <p className="p">{tg("body", { action: tg(`actions.${why}`) })}</p>
      <div className="stack" style={{ marginTop: 16 }}>
        <Link className="btn w" href="/signup?role=employer">{tg("signup")}</Link>
        <Link className="btn g w" href="/login">{tg("login")}</Link>
        <button type="button" className="btn o w" onClick={onClose}>{tg("keep")}</button>
      </div>
    </Sheet>
  );
}

export function UpgradeBody({ reason, onClose }: { reason: string; onClose: () => void }) {
  const tu = useTranslations("upgrade");
  return (
    <>
      <h3 className="h3" style={{ fontSize: 18 }}>{tu("title")}</h3>
      <p className="p">{reason}</p>
      <p className="p" style={{ marginTop: 10 }}>{tu("how")}</p>
      <Link className="btn w" style={{ marginTop: 14 }} href="/employer/account">{tu("seePlan")}</Link>
      <button type="button" className="btn g w" style={{ marginTop: 8 }} onClick={onClose}>{tu("notNow")}</button>
    </>
  );
}

/** Request introduction form (from the approved design) with plan credits shown. */
export function RequestSheet({ open, onClose, candidate, quota, onSent }: { open: boolean; onClose: () => void; candidate: { id: string; name: string }; quota: Quota; onSent: (wantsCv: boolean) => void }) {
  const t = useTranslations("intro");
  const tm = useTranslations("employment");
  const te = useTranslations("errors");
  const tu = useTranslations("upgrade");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<string | null>(quota.introLeft <= 0 ? tu("introLimit", { plan: quota.planName }) : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      candidateId: candidate.id,
      roleTitle: String(f.get("roleTitle") ?? ""),
      employment: String(f.get("employment") ?? "FULL_TIME"),
      workLocation: String(f.get("workLocation") ?? ""),
      payRange: String(f.get("payRange") ?? ""),
      message: String(f.get("message") ?? ""),
      wantsCv: f.get("wantsCv") === "on",
    };
    if (!input.roleTitle.trim() || input.message.trim().length < 10) return setErr(t("missing"));
    setBusy(true); setErr(null);
    const r = await requestIntro(input);
    setBusy(false);
    if (!r.ok) {
      if (r.error === "intro_limit") return setLimit(tu("introLimit", { plan: quota.planName }));
      return setErr(te(r.error));
    }
    onSent(input.wantsCv);
  }

  return (
    <Sheet open={open} onClose={onClose} label={t("title")}>
      {limit ? <UpgradeBody reason={limit} onClose={onClose} /> : (
        <form onSubmit={onSubmit} noValidate>
          <h3 className="h3" style={{ fontSize: 18 }}>{t("title")}</h3>
          <p className="p">{t("to", { name: candidate.name })}</p>
          <label className="lbl" htmlFor="roleTitle">{t("roleTitle")}</label>
          <input className="i" id="roleTitle" name="roleTitle" placeholder={t("roleTitleHint")} maxLength={100} />
          <div className="row">
            <div><label className="lbl" htmlFor="employment">{t("employment")}</label>
              <select className="i" id="employment" name="employment" defaultValue="FULL_TIME">{EMPLOYMENT_TYPES.map((k) => <option key={k} value={k}>{tm(k)}</option>)}</select></div>
            <div><label className="lbl" htmlFor="workLocation">{t("workLocation")}</label><input className="i" id="workLocation" name="workLocation" placeholder={t("workLocationHint")} maxLength={100} /></div>
          </div>
          <label className="lbl" htmlFor="message">{t("message")}</label>
          <textarea className="i" id="message" name="message" rows={3} placeholder={t("messageHint")} maxLength={1000} />
          <label className="lbl" htmlFor="payRange">{t("payRange")}</label>
          <input className="i" id="payRange" name="payRange" placeholder={t("payRangeHint")} maxLength={80} />
          <label className="chk">
            <input type="checkbox" name="wantsCv" disabled={quota.cvLeft <= 0} />
            <span>{t("wantsCv")}<br /><span className="note">{quota.cvLeft > 0 ? t("wantsCvNote", { n: quota.cvLeft }) : t("noCvLeft")}</span></span>
          </label>
          {err ? <p className="err" role="alert">{err}</p> : null}
          <div className="row" style={{ marginTop: 14 }}>
            <button type="button" className="btn g" onClick={onClose}>{t("cancel")}</button>
            <button className="btn" type="submit" disabled={busy}>{t("send")}</button>
          </div>
          <p className="note" style={{ marginTop: 10, textAlign: "center" }}>{t("usesOne", { n: quota.introLeft, plan: quota.planName })}</p>
        </form>
      )}
    </Sheet>
  );
}
