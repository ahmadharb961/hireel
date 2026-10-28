"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SkillsInput } from "@/components/SkillsInput";
import { useToast } from "@/components/Toast";
import { AVAILABILITY, CITY_SUGGESTIONS, INDUSTRIES } from "@/lib/constants";
import { saveAbout, saveBasics, saveExperience } from "../safe-actions";

type V = {
  fullName: string; headline: string; location: string; phone: string; currentTitle: string; industry: string; yearsExperience: string;
  availability: string; skills: string[]; about: string; workHistory: string; education: string; contactEmail: string;
};

export function EditForm({ initial }: { initial: V }) {
  const t = useTranslations("onboarding");
  const tx = useTranslations("edit");
  const te = useTranslations("errors");
  const ti = useTranslations("industries");
  const ta = useTranslations("availability");
  const toast = useToast();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof V) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function save() {
    setErr(null); setBusy(true);
    const results = [
      await saveBasics({ fullName: v.fullName, headline: v.headline, location: v.location, phone: v.phone }),
      await saveExperience({ currentTitle: v.currentTitle, industry: v.industry, yearsExperience: v.yearsExperience, availability: v.availability, skills: v.skills }),
      await saveAbout({ about: v.about, workHistory: v.workHistory, education: v.education, contactEmail: v.contactEmail }),
    ];
    setBusy(false);
    const bad = results.find((r) => !r.ok);
    if (bad && !bad.ok) return setErr(te(bad.error));
    toast(tx("saved"));
    router.refresh();
  }

  return (
    <div>
      <h1 className="h2">{tx("title")}</h1>
      <h2 className="h3" style={{ marginTop: 16 }}>{tx("basics")}</h2>
      <label className="lbl" htmlFor="fullName">{t("fullName")}</label><input className="i" id="fullName" value={v.fullName} onChange={set("fullName")} />
      <label className="lbl" htmlFor="headline">{t("headline")}</label><input className="i" id="headline" value={v.headline} onChange={set("headline")} />
      <label className="lbl" htmlFor="location">{t("location")}</label><input className="i" id="location" value={v.location} onChange={set("location")} list="cities" />
      <datalist id="cities">{CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>

      <h2 className="h3" style={{ marginTop: 20 }}>{tx("experience")}</h2>
      <label className="lbl" htmlFor="currentTitle">{t("currentTitle")}</label><input className="i" id="currentTitle" value={v.currentTitle} onChange={set("currentTitle")} />
      <div className="row">
        <div><label className="lbl" htmlFor="industry">{t("industry")}</label>
          <select className="i" id="industry" value={v.industry} onChange={set("industry")}>{INDUSTRIES.map((k) => <option key={k} value={k}>{ti(k)}</option>)}</select></div>
        <div><label className="lbl" htmlFor="years">{t("years")}</label><input className="i" id="years" type="number" min={0} max={50} value={v.yearsExperience} onChange={set("yearsExperience")} /></div>
      </div>
      <SkillsInput value={v.skills} onChange={(skills) => setV({ ...v, skills })} />
      <label className="lbl" htmlFor="availability">{t("availability")}</label>
      <select className="i" id="availability" value={v.availability} onChange={set("availability")}>{AVAILABILITY.map((k) => <option key={k} value={k}>{ta(k)}</option>)}</select>

      <h2 className="h3" style={{ marginTop: 20 }}>{tx("aboutTitle")}</h2>
      <label className="lbl" htmlFor="about">{t("about")}</label><textarea className="i" id="about" value={v.about} onChange={set("about")} maxLength={1200} />
      <p className="note">{tx("aboutVisible")}</p>

      <h2 className="h3" style={{ marginTop: 20 }}>{tx("cvTitle")} <span className="tag mute">{t("private")}</span></h2>
      <p className="note">{tx("cvNote")}</p>
      <label className="lbl" htmlFor="workHistory">{tx("workHistory")}</label><textarea className="i" id="workHistory" value={v.workHistory} onChange={set("workHistory")} placeholder={tx("workHistoryHint")} maxLength={3000} style={{ minHeight: 140 }} />
      <label className="lbl" htmlFor="education">{tx("education")}</label><textarea className="i" id="education" value={v.education} onChange={set("education")} maxLength={1500} />

      <h2 className="h3" style={{ marginTop: 20 }}>{tx("contactTitle")} <span className="tag mute">{t("private")}</span></h2>
      <label className="lbl" htmlFor="contactEmail">{tx("contactEmail")}</label><input className="i" id="contactEmail" type="email" dir="ltr" value={v.contactEmail} onChange={set("contactEmail")} />
      <label className="lbl" htmlFor="phone">{t("phone")}</label><input className="i" id="phone" type="tel" dir="ltr" value={v.phone} onChange={set("phone")} />

      {err ? <p className="err" role="alert">{err}</p> : null}
      <button type="button" className="btn w" style={{ marginTop: 18 }} disabled={busy} onClick={save}>{busy ? "…" : tx("save")}</button>
    </div>
  );
}
