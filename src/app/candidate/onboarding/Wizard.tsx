"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SkillsInput } from "@/components/SkillsInput";
import { AVAILABILITY, CITY_SUGGESTIONS, INDUSTRIES } from "@/lib/constants";
import { chooseProfileType, publishProfile, saveBasics, saveExperience } from "../safe-actions";

type Init = {
  fullName: string; headline: string; location: string; phone: string; currentTitle: string; industry: string;
  yearsExperience: string; availability: string; skills: string[]; about: string; profileType: "VIDEO" | "TEXT_ONLY"; visibility: "EVERYONE" | "EMPLOYERS_ONLY";
};

export function Wizard({ initialStep, initial }: { initialStep: number; initial: Init }) {
  const t = useTranslations("onboarding");
  const te = useTranslations("errors");
  const ti = useTranslations("industries");
  const ta = useTranslations("availability");
  const tc = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [v, setV] = useState(initial);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Init) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function next() {
    setErr(null); setOffline(false); setBusy(true);
    let res: { ok: boolean; error?: string } = { ok: true };
    if (step === 1) res = await saveBasics({ fullName: v.fullName, headline: v.headline, location: v.location, phone: v.phone }, 2);
    if (step === 2) res = await saveExperience({ currentTitle: v.currentTitle, industry: v.industry, yearsExperience: v.yearsExperience, availability: v.availability, skills: v.skills }, 3);
    if (step === 3) res = await chooseProfileType(v.profileType, v.about);
    if (step === 4) res = await publishProfile({ consent, visibility: v.visibility });
    setBusy(false);
    if (!res.ok) { setOffline(res.error === "network"); return setErr(te(res.error ?? "generic")); }
    if (step < 4) { setStep(step + 1); document.querySelector(".main")?.scrollTo(0, 0); return; }
    router.push(v.profileType === "VIDEO" ? "/candidate/video" : "/candidate");
    router.refresh();
  }

  return (
    <div>
      <p className="note">{t("stepOf", { step, total: 4 })} · {t("autosave")}</p>
      <div className="bar"><i style={{ width: `${step * 25}%` }} /></div>

      {step === 1 ? (
        <>
          <h1 className="h2">{t("s1Title")}</h1><p className="p">{t("s1Sub")}</p>
          <label className="lbl" htmlFor="fullName">{t("fullName")}</label>
          <input className="i" id="fullName" value={v.fullName} onChange={set("fullName")} autoComplete="name" />
          <label className="lbl" htmlFor="headline">{t("headline")}</label>
          <input className="i" id="headline" value={v.headline} onChange={set("headline")} placeholder={t("headlineHint")} />
          <label className="lbl" htmlFor="location">{t("location")}</label>
          <input className="i" id="location" value={v.location} onChange={set("location")} list="cities" placeholder={t("locationHint")} />
          <datalist id="cities">{CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
          <label className="lbl" htmlFor="phone">{t("phone")} <span className="tag mute">{t("private")}</span></label>
          <input className="i" id="phone" type="tel" value={v.phone} onChange={set("phone")} placeholder="+961" autoComplete="tel" dir="ltr" />
          <p className="note" style={{ marginTop: 6 }}>{t("phoneNote")}</p>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h1 className="h2">{t("s2Title")}</h1><p className="p">{t("s2Sub")}</p>
          <label className="lbl" htmlFor="currentTitle">{t("currentTitle")}</label>
          <input className="i" id="currentTitle" value={v.currentTitle} onChange={set("currentTitle")} />
          <div className="row">
            <div>
              <label className="lbl" htmlFor="industry">{t("industry")}</label>
              <select className="i" id="industry" value={v.industry} onChange={set("industry")}>
                <option value="" disabled>{tc("choose")}</option>
                {INDUSTRIES.map((k) => <option key={k} value={k}>{ti(k)}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl" htmlFor="years">{t("years")}</label>
              <input className="i" id="years" type="number" min={0} max={50} inputMode="numeric" value={v.yearsExperience} onChange={set("yearsExperience")} />
            </div>
          </div>
          <SkillsInput value={v.skills} onChange={(skills) => setV({ ...v, skills })} />
          <label className="lbl" htmlFor="availability">{t("availability")}</label>
          <select className="i" id="availability" value={v.availability} onChange={set("availability")}>
            {AVAILABILITY.map((k) => <option key={k} value={k}>{ta(k)}</option>)}
          </select>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h1 className="h2">{t("s3Title")}</h1><p className="p">{t("s3Sub")}</p>
          <div className="stack" style={{ marginTop: 14 }}>
            {(["VIDEO", "TEXT_ONLY"] as const).map((k) => (
              <button key={k} type="button" className="list-row" aria-pressed={v.profileType === k} onClick={() => setV({ ...v, profileType: k })} style={v.profileType === k ? { borderColor: "var(--g)", borderWidth: 2 } : undefined}>
                <div className="thumb" style={k === "TEXT_ONLY" ? { background: "var(--bd)", color: "var(--tx)" } : undefined}>{k === "VIDEO" ? "▶" : "Aa"}</div>
                <div className="t"><b>{t(k === "VIDEO" ? "videoOption" : "textOption")}</b><span>{t(k === "VIDEO" ? "videoOptionSub" : "textOptionSub")}</span></div>
              </button>
            ))}
          </div>
          {v.profileType === "TEXT_ONLY" ? (
            <>
              <label className="lbl" htmlFor="about">{t("about")}</label>
              <textarea className="i" id="about" value={v.about} onChange={set("about")} placeholder={t("aboutHint")} maxLength={1200} />
              <p className="note">{t("aboutCount", { n: v.about.trim().length })}</p>
            </>
          ) : <p className="note" style={{ marginTop: 12 }}>{t("videoLater")}</p>}
        </>
      ) : null}

      {step === 4 ? (
        <>
          <h1 className="h2">{t("s4Title")}</h1>
          <div className="card" style={{ marginTop: 12 }}>
            <h2 className="h3">{v.fullName}</h2>
            <p className="p">{v.headline} · {v.location}</p>
            <p className="p">{t("yearsShort", { n: Number(v.yearsExperience) || 0 })} · {ta(v.availability)}</p>
            <div className="wrap" style={{ marginTop: 8 }}>{v.skills.map((s) => <span key={s} className="sk">{s}</span>)}</div>
          </div>
          <h2 className="h3" style={{ marginTop: 16 }}>{t("whoWatch")}</h2>
          <label className="chk"><input type="radio" name="vis" checked={v.visibility === "EVERYONE"} onChange={() => setV({ ...v, visibility: "EVERYONE" })} /><span><b>{t("visEveryone")}</b><br /><span className="note">{t("visEveryoneSub")}</span></span></label>
          <label className="chk"><input type="radio" name="vis" checked={v.visibility === "EMPLOYERS_ONLY"} onChange={() => setV({ ...v, visibility: "EMPLOYERS_ONLY" })} /><span><b>{t("visEmployers")}</b><br /><span className="note">{t("visEmployersSub")}</span></span></label>
          <label className="chk" style={{ marginTop: 16 }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{t("consent")}</span></label>
        </>
      ) : null}

      {err ? <p className="err" role="alert">{err}</p> : null}
      {offline ? <button type="button" className="btn o w" style={{ marginTop: 8 }} onClick={() => window.location.reload()}>{tc("reload")}</button> : null}
      <div className="row" style={{ marginTop: 18 }}>
        {step > 1 ? <button type="button" className="btn g" onClick={() => { setErr(null); setStep(step - 1); }}>{tc("back")}</button> : null}
        <button type="button" className="btn" disabled={busy} onClick={next}>{busy ? tc("pleaseWait") : step === 4 ? t("publish") : t("continue")}</button>
      </div>
    </div>
  );
}
