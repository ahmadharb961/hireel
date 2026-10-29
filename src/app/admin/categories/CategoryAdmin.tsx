"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { addCategory, editCategory, reorderCategory, showCategory } from "../safe-actions";

type Row = { key: string; nameEn: string; nameAr: string; active: boolean; candidates: number; companies: number };
type Res = { ok: boolean; error?: string; field?: string };

export function CategoryAdmin({ rows }: { rows: Row[] }) {
  const t = useTranslations("adminCat");
  const te = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [add, setAdd] = useState({ nameEn: "", nameAr: "" });
  const [busy, setBusy] = useState(false);

  async function run(p: Promise<Res>, msg: string) {
    setBusy(true);
    const r = await p;
    setBusy(false);
    if (!r.ok) { toast(r.error === "duplicate" ? t("duplicate") : te((r.error ?? "generic") as "generic")); return false; }
    toast(msg);
    router.refresh();
    return true;
  }

  return (
    <>
      <section className="card">
        <h2 className="h3">{t("addTitle")}</h2>
        <div className="catrow-in">
          <div><label className="lbl" htmlFor="cat-en">{t("nameEn")}</label><input className="i" id="cat-en" value={add.nameEn} maxLength={40} onChange={(e) => setAdd({ ...add, nameEn: e.target.value })} placeholder="Real estate" /></div>
          <div><label className="lbl" htmlFor="cat-ar">{t("nameAr")}</label><input className="i" id="cat-ar" dir="rtl" value={add.nameAr} maxLength={40} onChange={(e) => setAdd({ ...add, nameAr: e.target.value })} placeholder="العقارات" /></div>
        </div>
        <button type="button" className="btn" style={{ marginTop: 12 }} disabled={busy || !add.nameEn.trim() || !add.nameAr.trim()}
          onClick={async () => { if (await run(addCategory(add.nameEn, add.nameAr), t("added"))) setAdd({ nameEn: "", nameAr: "" }); }}>{t("add")}</button>
        <p className="note" style={{ marginTop: 8 }}>{t("addNote")}</p>
      </section>

      <section className="card">
        <h2 className="h3">{t("listTitle", { n: rows.length })}</h2>
        <div className="stack" style={{ gap: 10, marginTop: 8 }}>
          {rows.map((r, i) => <CatRow key={r.key} r={r} first={i === 0} last={i === rows.length - 1} run={run} busy={busy} />)}
        </div>
      </section>
    </>
  );
}

function CatRow({ r, first, last, run, busy }: { r: Row; first: boolean; last: boolean; run: (p: Promise<Res>, msg: string) => Promise<boolean>; busy: boolean }) {
  const t = useTranslations("adminCat");
  const [v, setV] = useState({ nameEn: r.nameEn, nameAr: r.nameAr });
  const changed = v.nameEn !== r.nameEn || v.nameAr !== r.nameAr;
  return (
    <div className={`catrow${r.active ? "" : " off"}`}>
      <div className="catrow-move">
        <button type="button" className="btn sm g" disabled={first || busy} onClick={() => run(reorderCategory(r.key, -1), t("moved"))} aria-label={t("up", { name: r.nameEn })}>↑</button>
        <button type="button" className="btn sm g" disabled={last || busy} onClick={() => run(reorderCategory(r.key, 1), t("moved"))} aria-label={t("down", { name: r.nameEn })}>↓</button>
      </div>
      <div className="catrow-main">
        <div className="catrow-in">
          <input className="i" value={v.nameEn} maxLength={40} onChange={(e) => setV({ ...v, nameEn: e.target.value })} aria-label={`${t("nameEn")} · ${r.nameEn}`} />
          <input className="i" dir="rtl" value={v.nameAr} maxLength={40} onChange={(e) => setV({ ...v, nameAr: e.target.value })} aria-label={`${t("nameAr")} · ${r.nameEn}`} />
        </div>
        <p className="note">{t("usage", { c: r.candidates, e: r.companies })}{r.active ? "" : ` · ${t("hiddenNote")}`}</p>
      </div>
      <div className="catrow-btns">
        {changed ? <button type="button" className="btn sm" disabled={busy} onClick={() => run(editCategory(r.key, v.nameEn, v.nameAr), t("saved"))}>{t("save")}</button> : null}
        <button type="button" className="btn sm g" disabled={busy} onClick={() => run(showCategory(r.key, !r.active), r.active ? t("hiddenDone") : t("shownDone"))}>{r.active ? t("hide") : t("show")}</button>
      </div>
    </div>
  );
}
