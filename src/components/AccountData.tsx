"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { safe } from "@/lib/safe-action";
import { deleteMyAccount } from "@/app/actions/account";
import { forgetDevice } from "@/lib/push-client";

const remove = safe(deleteMyAccount);

/** "Your data": download everything, or delete the account for good (typed confirmation). */
export function AccountData({ who, soleMember }: { who: "candidate" | "employer"; soleMember?: boolean }) {
  const t = useTranslations("accountData");
  const te = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true); setErr(null);
    await forgetDevice().catch(() => {});
    const r = await remove(word);
    setBusy(false);
    if (!r.ok) return setErr(r.error === "confirm_word" ? t("typeWord") : te(r.error as "generic"));
    window.location.href = "/?deleted=1";
  }

  return (
    <section className="card">
      <h2 className="h3">{t("title")}</h2>
      <p className="p">{t("sub")}</p>
      <div className="row" style={{ marginTop: 10 }}>
        <a className="btn sm g" href="/api/me/export" download>{t("download")}</a>
        <button type="button" className="btn sm bad" onClick={() => { setOpen(true); setWord(""); setErr(null); }}>{t("delete")}</button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} label={t("delete")}>
        <h3 className="h3" style={{ fontSize: 18 }}>{t("confirmTitle")}</h3>
        <p className="p">{who === "candidate" ? t("whatCandidate") : soleMember ? t("whatCompanyLast") : t("whatCompany")}</p>
        <p className="p" style={{ marginTop: 8 }}><b>{t("cantUndo")}</b> {t("downloadFirst")}</p>
        <label className="lbl" htmlFor="del-word">{t("typeLabel")}</label>
        <input className="i" id="del-word" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="DELETE" />
        {err ? <p className="err" role="alert">{err}</p> : null}
        <div className="row" style={{ marginTop: 14 }}>
          <button type="button" className="btn g" onClick={() => setOpen(false)}>{t("cancel")}</button>
          <button type="button" className="btn bad" disabled={busy || !word.trim()} onClick={go}>{busy ? "…" : t("deleteForever")}</button>
        </div>
      </Sheet>
    </section>
  );
}
