"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIcon } from "@/components/landing/icons";
import { siteLink } from "@/lib/social";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { blockCompany, reportCompany, respondToRequest } from "../safe-actions";

export type RequestView = {
  id: string; companyId: string; company: string; verified: boolean; rep: string; description: string; industry: string; size: string; phone: string;
  website: string; country: string; since: string; logo: string | null; banner: string | null;
  social: { linkedin: string; instagram: string; facebook: string };
  roleTitle: string; employment: string; workLocation: string; payRange: string; message: string; wantsCv: boolean;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "BLOCKED"; date: string;
  shared: { email: boolean; phone: boolean; cv: boolean }; isDemo: boolean;
  chat: { unread: boolean; last: { body: string; mine: boolean } | null; ended: boolean };
};

const REPORT_REASONS = ["fake", "money", "harassment", "other"] as const;

export function RequestCard({ r }: { r: RequestView }) {
  const t = useTranslations("requests");
  const tc = useTranslations("chat");
  const tm = useTranslations("employment");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | "accept" | "report" | "company">(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [share, setShare] = useState({ email: true, phone: r.wantsCv, cv: r.wantsCv });
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("fake");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(p: Promise<{ ok: boolean; error?: string }>, msg: string) {
    setBusy(true);
    const res = await p;
    setBusy(false);
    setSheet(null); setConfirmBlock(false);
    if (!res.ok) toast(te(res.error ?? "generic")); else { toast(msg); router.refresh(); }
  }

  const tag = r.status === "PENDING" ? <span className="tag warn">{t("new")}</span>
    : r.status === "ACCEPTED" ? <span className="tag">{t("accepted")}</span>
    : r.status === "BLOCKED" ? <span className="tag bad">{t("blocked")}</span>
    : <span className="tag mute">{t("declined")}</span>;
  const site = siteLink(r.website);
  const sharedList = [r.shared.email && t("shareEmail"), r.shared.phone && t("sharePhone"), r.shared.cv && t("shareCv")].filter(Boolean).join(", ");

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
        <>
          <p className="note" style={{ marginTop: 10 }}>{t("youShared", { list: sharedList || t("nothing") })}</p>
          {r.chat.last ? <p className={`chatlast${r.chat.unread ? " new" : ""}`} dir="auto">{r.chat.last.mine ? `${tc("you")}: ` : ""}{r.chat.last.body}</p> : null}
          <Link className={`btn sm w chatbtn${r.chat.last || r.chat.ended ? " g" : ""}`} href={`/candidate/chat/${r.id}`}>
            {r.chat.last || r.chat.ended ? tc("openChat") : tc("messageX", { name: r.company })}
            {r.chat.unread ? <span className="nb2">{tc("new")}</span> : null}
          </Link>
        </>
      ) : null}

      <Sheet open={sheet === "accept"} onClose={() => setSheet(null)} label={t("acceptTitle", { company: r.company })}>
        <h3 className="h3" style={{ fontSize: 18 }}>{t("acceptTitle", { company: r.company })}</h3>
        <p className="p">{t("acceptBody")}</p>
        {(["email", "phone", "cv"] as const).map((k) => (
          <label key={k} className="chk"><input type="checkbox" checked={share[k]} onChange={(e) => setShare({ ...share, [k]: e.target.checked })} /><span>{t(k === "email" ? "shareEmail" : k === "phone" ? "sharePhone" : "shareCv")}</span></label>
        ))}
        <div className="row" style={{ marginTop: 16 }}>
          <button type="button" className="btn g" onClick={() => setSheet(null)}>{t("cancel")}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => run(respondToRequest(r.id, "accept", share), t("acceptedDone", { company: r.company }))}>{t("acceptShare")}</button>
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

      <Sheet open={sheet === "company"} onClose={() => setSheet(null)} label={r.company}>
        <div className="cprof">
          <div className="cprof-banner" style={r.banner ? { backgroundImage: `url(${r.banner})` } : undefined}>
            <button type="button" className="cprof-x" onClick={() => setSheet(null)} aria-label={t("close")}>✕</button>
          </div>
          <span className="chead-logo cprof-logo">{r.logo ? <img src={r.logo} alt="" /> : r.company.slice(0, 1)}</span>
          <h2 className="h2" style={{ marginTop: 8 }}>{r.company} {r.verified ? <span className="tag">✓ {t("verified")}</span> : <span className="tag mute">{t("notVerified")}</span>}</h2>
          <p className="p">{[r.industry, r.country].filter(Boolean).join(" · ")}</p>
          <p className="note">{t("sentBy", { name: r.rep })}</p>
          <div className="cprof-body">
          {r.description ? <p className="p" style={{ color: "var(--tx)", whiteSpace: "pre-wrap" }}>{r.description}</p> : <p className="note">{t("noDescription")}</p>}
          <div className="kv"><span>{t("website")}</span><b>{site ? <a href={site.href} target="_blank" rel="noopener noreferrer nofollow">{site.label} ↗</a> : "—"}</b></div>
          <div className="kv"><span>{t("industry")}</span><b>{r.industry || "—"}</b></div>
          <div className="kv"><span>{t("size")}</span><b>{r.size ? t("employees", { size: r.size }) : "—"}</b></div>
          {r.phone ? <div className="kv"><span>{t("phone")}</span><b dir="ltr"><a href={`tel:${r.phone.replace(/[^+0-9]/g, "")}`}>{r.phone}</a></b></div> : null}
          <div className="kv"><span>{t("country")}</span><b>{r.country || "—"}</b></div>
          <div className="kv"><span>{t("since")}</span><b>{r.since}</b></div>
          {Object.values(r.social).some(Boolean) ? (
            <div className="csocial">
              {(["linkedin", "instagram", "facebook"] as const).filter((k) => r.social[k]).map((k) => (
                <a key={k} href={r.social[k]} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${r.company} · ${k}`}><LIcon name={k} size={18} /><span>{k === "linkedin" ? "LinkedIn" : k === "instagram" ? "Instagram" : "Facebook"}</span></a>
              ))}
            </div>
          ) : null}
          <p className="note" style={{ marginTop: 8 }}>{r.verified ? t("verifiedExplain") : t("notVerifiedExplain")}</p>
          <p className="note">{t("safetyTip")}</p>
                  </div>
          <button type="button" className="btn g w" style={{ marginTop: 14 }} onClick={() => setSheet(null)}>{t("close")}</button>
        </div>
      </Sheet>
    </div>
  );
}
