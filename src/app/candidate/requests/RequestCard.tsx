"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { CompanySheet, type CompanyInfo } from "@/components/CompanySheet";
import { useToast } from "@/components/Toast";
import { blockCompany, reportCompany, respondToRequest } from "../safe-actions";

export type RequestView = CompanyInfo & {
  id: string; companyId: string;
  roleTitle: string; employment: string; workLocation: string; payRange: string; message: string; wantsCv: boolean;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "BLOCKED"; date: string;
  shared: { email: boolean; phone: boolean; cv: boolean; salary: boolean }; isDemo: boolean;
  /** The candidate set an expected salary (they can choose to share it). */
  salaryLabel: string | null;
};

const REPORT_REASONS = ["fake", "money", "harassment", "other"] as const;

export function RequestCard({ r }: { r: RequestView }) {
  const t = useTranslations("requests");
  const tm = useTranslations("employment");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | "accept" | "report" | "company">(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [share, setShare] = useState({ email: true, phone: r.wantsCv, cv: r.wantsCv, salary: false });
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("fake");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(p: Promise<{ ok: boolean; error?: string }>, msg: string, then?: string) {
    setBusy(true);
    const res = await p;
    setBusy(false);
    setSheet(null); setConfirmBlock(false);
    if (!res.ok) return toast(te(res.error ?? "generic"));
    toast(msg);
    if (then) router.push(then); else router.refresh();
  }

  const tag = r.status === "PENDING" ? <span className="tag warn">{t("new")}</span>
    : r.status === "ACCEPTED" ? <span className="tag">{t("accepted")}</span>
    : r.status === "BLOCKED" ? <span className="tag bad">{t("blocked")}</span>
    : <span className="tag mute">{t("declined")}</span>;
  const sharedList = [r.shared.email && t("shareEmail"), r.shared.phone && t("sharePhone"), r.shared.cv && t("shareCv"), r.shared.salary && t("salary")].filter(Boolean).join(", ");

  return (
    <div className="card">
      <div className="sw">
        <div className="pv-name" style={{ alignItems: "flex-start" }}>
          <button type="button" className="clink" onClick={() => setSheet("company")} aria-label={t("viewCompany")}>{r.logo ? <img className="clogo" src={r.logo} alt="" /> : <span className="clogo ini">{r.company.slice(0, 1)}</span>}</button>
          <div>
          <h2 className="h3"><button type="button" className="clink cname" onClick={() => setSheet("company")}>{r.company}</button> {r.verified ? <span className="tag">✓ {t("verified")}</span> : <span className="tag mute">{t("notVerified")}</span>}</h2>
          <p className="p">{r.rep}</p>
          </div>
        </div>
        {tag}
      </div>
      <p className="note" style={{ marginTop: 4 }}>{[r.industry, r.size, r.country].filter(Boolean).join(" · ")}</p>
      <button type="button" className="btn sm o cview" onClick={() => setSheet("company")}>{t("viewCompany")} →</button>
      <div style={{ marginTop: 10 }}>
        <div className="kv"><span>{t("opportunity")}</span><b>{r.roleTitle}</b></div>
        <div className="kv"><span>{t("typeLocation")}</span><b>{tm(r.employment)}{r.workLocation ? ` · ${r.workLocation}` : ""}</b></div>
        {r.payRange ? <div className="kv"><span>{t("pay")}</span><b>{r.payRange}</b></div> : null}
        <div className="kv"><span>{t("received")}</span><b>{r.date}</b></div>
      </div>
      <p className="p" style={{ marginTop: 10, color: "var(--tx)", whiteSpace: "pre-wrap" }}>“{r.message}”</p>
      {r.wantsCv && r.status === "PENDING" ? <p className="tag warn" style={{ marginTop: 10, whiteSpace: "normal" }}>{t("wantsCv")}</p> : null}

      {r.status === "PENDING" ? (
        confirmBlock ? (
          <div className="card" style={{ background: "var(--badbg)", borderColor: "transparent", marginTop: 10 }}>
            <p className="p" style={{ color: "var(--tx)" }}>{t("blockConfirm", { company: r.company })}</p>
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className="btn sm g" onClick={() => setConfirmBlock(false)}>{t("cancel")}</button>
              <button type="button" className="btn sm bad" disabled={busy} onClick={() => run(blockCompany(r.id), t("blockedDone"))}>{t("block")}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="button" className="btn sm g" disabled={busy} onClick={() => run(respondToRequest(r.id, "decline"), t("declinedDone"))}>{t("decline")}</button>
              <button type="button" className="btn sm" onClick={() => setSheet("accept")}>{t("accept")}</button>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <button type="button" className="btn sm o" onClick={() => setConfirmBlock(true)}>{t("block")}</button>
              <button type="button" className="btn sm o" onClick={() => setSheet("report")}>{t("report")}</button>
            </div>
          </>
        )
      ) : r.status === "ACCEPTED" ? (
        <p className="note" style={{ marginTop: 10 }}>{t("youShared", { list: sharedList || t("nothing") })}</p>
      ) : null}

      <Sheet open={sheet === "accept"} onClose={() => setSheet(null)} label={t("acceptTitle", { company: r.company })}>
        <h3 className="h3" style={{ fontSize: 18 }}>{t("acceptTitle", { company: r.company })}</h3>
        <p className="p">{t("acceptBody")}</p>
        {(["email", "phone", "cv"] as const).map((k) => (
          <label key={k} className="chk"><input type="checkbox" checked={share[k]} onChange={(e) => setShare({ ...share, [k]: e.target.checked })} /><span>{t(k === "email" ? "shareEmail" : k === "phone" ? "sharePhone" : "shareCv")}</span></label>
        ))}
        {r.salaryLabel ? (
          <label className="chk"><input type="checkbox" checked={share.salary} onChange={(e) => setShare({ ...share, salary: e.target.checked })} /><span>{t("shareSalary", { salary: r.salaryLabel })}</span></label>
        ) : null}
        <div className="row" style={{ marginTop: 16 }}>
          <button type="button" className="btn g" onClick={() => setSheet(null)}>{t("cancel")}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => run(respondToRequest(r.id, "accept", share), t("acceptedDone", { company: r.company }), `/candidate/chat/${r.id}`)}>{t("acceptShare")}</button>
        </div>
      </Sheet>

      <Sheet open={sheet === "report"} onClose={() => setSheet(null)} label={t("reportTitle")}>
        <h3 className="h3" style={{ fontSize: 18 }}>{t("reportTitle")}</h3>
        <p className="p">{t("reportBody")}</p>
        {REPORT_REASONS.map((k) => (
          <label key={k} className="chk"><input type="radio" name={`rp-${r.id}`} checked={reason === k} onChange={() => setReason(k)} /><span>{t(`reasons.${k}`)}</span></label>
        ))}
        <label className="lbl" htmlFor={`rpx-${r.id}`}>{t("details")}</label>
        <textarea className="i" id={`rpx-${r.id}`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn g" onClick={() => setSheet(null)}>{t("cancel")}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => run(reportCompany(r.id, reason, details), t("reportSent"))}>{t("send")}</button>
        </div>
      </Sheet>

      <CompanySheet open={sheet === "company"} onClose={() => setSheet(null)} c={r} />
    </div>
  );
}
