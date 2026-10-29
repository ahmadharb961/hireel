"use client";
import { useTranslations } from "next-intl";
import { LIcon } from "@/components/landing/icons";
import { Sheet } from "@/components/Sheet";
import { siteLink } from "@/lib/social";

/** Everything a candidate sees about a company: on a request, and from the chat. */
export type CompanyInfo = {
  company: string; verified: boolean; rep: string; description: string; industry: string; size: string;
  website: string; phone: string; country: string; since: string; logo: string | null; banner: string | null;
  social: { linkedin: string; instagram: string; facebook: string };
};

export function CompanySheet({ open, onClose, c, extra }: { open: boolean; onClose: () => void; c: CompanyInfo; extra?: React.ReactNode }) {
  const t = useTranslations("requests");
  const site = siteLink(c.website);
  return (
    <Sheet open={open} onClose={onClose} label={c.company}>
      <div className="cprof">
        <div className="cprof-banner" style={c.banner ? { backgroundImage: `url(${c.banner})` } : undefined}>
          <button type="button" className="cprof-x" onClick={onClose} aria-label={t("close")}>✕</button>
        </div>
        <span className="chead-logo cprof-logo">{c.logo ? <img src={c.logo} alt="" /> : c.company.slice(0, 1)}</span>
        <h2 className="h2" style={{ marginTop: 8 }}>{c.company} {c.verified ? <span className="tag">✓ {t("verified")}</span> : <span className="tag mute">{t("notVerified")}</span>}</h2>
        <p className="p">{[c.industry, c.country].filter(Boolean).join(" · ")}</p>
        <p className="note">{t("sentBy", { name: c.rep })}</p>
        <div className="cprof-body">
          {extra}
          {c.description ? <p className="p" style={{ color: "var(--tx)", whiteSpace: "pre-wrap" }}>{c.description}</p> : <p className="note">{t("noDescription")}</p>}
          <div className="kv"><span>{t("website")}</span><b>{site ? <a href={site.href} target="_blank" rel="noopener noreferrer nofollow">{site.label} ↗</a> : "—"}</b></div>
          <div className="kv"><span>{t("industry")}</span><b>{c.industry || "—"}</b></div>
          <div className="kv"><span>{t("size")}</span><b>{c.size ? t("employees", { size: c.size }) : "—"}</b></div>
          {c.phone ? <div className="kv"><span>{t("phone")}</span><b dir="ltr"><a href={`tel:${c.phone.replace(/[^+0-9]/g, "")}`}>{c.phone}</a></b></div> : null}
          <div className="kv"><span>{t("country")}</span><b>{c.country || "—"}</b></div>
          <div className="kv"><span>{t("since")}</span><b>{c.since}</b></div>
          {Object.values(c.social).some(Boolean) ? (
            <div className="csocial">
              {(["linkedin", "instagram", "facebook"] as const).filter((k) => c.social[k]).map((k) => (
                <a key={k} href={c.social[k]} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${c.company} · ${k}`}><LIcon name={k} size={18} /><span>{k === "linkedin" ? "LinkedIn" : k === "instagram" ? "Instagram" : "Facebook"}</span></a>
              ))}
            </div>
          ) : null}
          <p className="note" style={{ marginTop: 8 }}>{c.verified ? t("verifiedExplain") : t("notVerifiedExplain")}</p>
          <p className="note">{t("safetyTip")}</p>
        </div>
        <button type="button" className="btn g w" style={{ marginTop: 14 }} onClick={onClose}>{t("close")}</button>
      </div>
    </Sheet>
  );
}
