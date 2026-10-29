"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { hideCompany, hideName, removeHiddenName, showToCompany } from "../safe-actions";

type Hidden = { companyId: string; name: string; logo: string | null; source: string };
type Rule = { id: string; term: string };
type Found = { id: string; name: string; country: string; logo: string | null };

/**
 * "Hide my profile from…": search companies on Hireel, or type a name so any company with that
 * name never sees you, even if it joins later. Companies are never told.
 */
export function HiddenCompanies({ hidden, rules }: { hidden: Hidden[]; rules: Rule[] }) {
  const t = useTranslations("hide");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [busy, setBusy] = useState(false);
  const hiddenIds = new Set(hidden.map((h) => h.companyId));

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setFound([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/companies/search?q=${encodeURIComponent(term)}`).then((r) => r.json()).then((d: { results: Found[] }) => setFound(d.results ?? [])).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  async function run(p: Promise<{ ok: boolean; error?: string }>, msg: string, clear = false) {
    setBusy(true);
    const r = await p;
    setBusy(false);
    if (!r.ok) return toast(t.has(`err.${r.error}` as "err.too_short") ? t(`err.${r.error}` as "err.too_short") : te((r.error ?? "generic") as "generic"));
    toast(msg);
    if (clear) { setQ(""); setFound([]); }
    router.refresh();
  }

  return (
    <section className="card" aria-labelledby="hide-title">
      <h2 className="h3" id="hide-title">🙈 {t("title")}</h2>
      <p className="p">{t("sub")}</p>
      <label className="lbl" htmlFor="hide-q">{t("searchLabel")}</label>
      <input className="i" id="hide-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} autoComplete="off" />
      {q.trim().length >= 2 ? (
        <div className="hide-res">
          {found.map((c) => (
            <div key={c.id} className="hide-row">
              <span className="hide-av">{c.logo ? <img src={c.logo} alt="" /> : c.name.slice(0, 1)}</span>
              <span className="hide-nm"><b>{c.name}</b><small>{c.country}</small></span>
              {hiddenIds.has(c.id) ? <span className="tag mute">{t("hidden")}</span>
                : <button type="button" className="btn sm" disabled={busy} onClick={() => run(hideCompany(c.id), t("hiddenDone", { name: c.name }), true)}>{t("hide")}</button>}
            </div>
          ))}
          <div className="hide-row any">
            <span className="hide-nm"><b>{t("anyNamed", { name: q.trim() })}</b><small>{t("anyNamedSub")}</small></span>
            <button type="button" className="btn sm g" disabled={busy} onClick={() => run(hideName(q), t("nameDone", { name: q.trim() }), true)}>{t("hide")}</button>
          </div>
        </div>
      ) : null}

      {hidden.length || rules.length ? (
        <>
          <h3 className="lbl" style={{ marginTop: 16 }}>{t("listTitle", { n: hidden.length + rules.length })}</h3>
          <div className="hide-res">
            {rules.map((r) => (
              <div key={r.id} className="hide-row">
                <span className="hide-av">“”</span>
                <span className="hide-nm"><b>{t("anyNamed", { name: r.term })}</b><small>{t("ruleSub")}</small></span>
                <button type="button" className="btn sm o" disabled={busy} onClick={() => run(removeHiddenName(r.id), t("ruleRemoved"))}>{t("remove")}</button>
              </div>
            ))}
            {hidden.map((h) => (
              <div key={h.companyId} className="hide-row">
                <span className="hide-av">{h.logo ? <img src={h.logo} alt="" /> : h.name.slice(0, 1)}</span>
                <span className="hide-nm"><b>{h.name}</b><small>{t(`source.${h.source === "name" ? "name" : h.source === "hide" ? "hide" : "block"}`)}</small></span>
                {h.source === "name" ? null : <button type="button" className="btn sm o" disabled={busy} onClick={() => run(showToCompany(h.companyId), t("shownDone", { name: h.name }))}>{t("show")}</button>}
              </div>
            ))}
          </div>
        </>
      ) : null}
      <p className="note" style={{ marginTop: 10 }}>{t("note")}</p>
    </section>
  );
}
