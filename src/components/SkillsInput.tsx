"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MAX_SKILLS } from "@/lib/constants";

export function SkillsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useTranslations("onboarding");
  const [draft, setDraft] = useState("");
  function add() {
    const s = draft.trim().slice(0, 40);
    if (!s || value.length >= MAX_SKILLS || value.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    onChange([...value, s]);
    setDraft("");
  }
  return (
    <>
      <label className="lbl" htmlFor="skill">{t("skills", { max: MAX_SKILLS })}</label>
      <div className="row">
        <input className="i" id="skill" style={{ flex: 2 }} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={t("skillHint")} />
        <button type="button" className="btn sm" style={{ flex: "none" }} onClick={add}>{t("add")}</button>
      </div>
      <div className="wrap" style={{ marginTop: 8 }}>
        {value.map((s, i) => (
          <button key={s} type="button" className="chipbtn on" aria-label={t("removeSkill", { skill: s })} onClick={() => onChange(value.filter((_, j) => j !== i))}>{s} ✕</button>
        ))}
      </div>
    </>
  );
}
