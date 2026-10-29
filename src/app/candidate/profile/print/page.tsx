import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { photoUrl } from "@/lib/photo";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { categoryNamer } from "@/server/categories";
import { PrintBar } from "./PrintBar";

export const metadata = { title: "Hireel profile" };

/**
 * One-page profile (A4) the candidate saves as a PDF or prints, with a QR code to their video
 * (their share link). Uses the phone's or computer's own "Save as PDF", so Arabic prints correctly.
 */
export default async function PrintProfile() {
  const { profile: p, viewer } = await requireOnboardedCandidate();
  const [t, tp, ta, tm, tco, catName, skills, link] = await Promise.all([
    getTranslations("printProfile"), getTranslations("prefs"), getTranslations("availability"), getTranslations("employment"), getTranslations("signup.countries"),
    categoryNamer(),
    prisma.candidateSkill.findMany({ where: { candidateId: p.id }, include: { skill: true } }),
    prisma.shareLink.findUnique({ where: { candidateId: p.id } }),
  ]);
  const url = link?.enabled ? `${env.appUrl}/p/${link.token}` : null;
  const qr = url ? await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#182722", light: "#ffffff" } }) : null;
  const email = p.contactEmail || viewer.email;
  const lookingFor = [...p.jobTypes.map((k) => tm(k)), ...p.workModes.map((k) => tp(`mode.${k}` as "mode.ONSITE"))].join(" · ");

  return (
    <div className="cvp">
      <PrintBar shareOn={Boolean(url)} />
      <article className="cvp-page">
        <header className="cvp-head">
          {photoUrl(p) ? <img className="cvp-photo" src={photoUrl(p)!} alt="" /> : <span className="cvp-photo ini">{p.fullName.slice(0, 1)}</span>}
          <div className="cvp-id">
            <h1>{p.fullName}</h1>
            <p className="cvp-headline">{p.headline || p.currentTitle}</p>
            <p className="cvp-meta">{[p.location, catName(p.industry), t("years", { n: p.yearsExperience }), ta(p.availability)].filter(Boolean).join(" · ")}</p>
            <p className="cvp-contact" dir="ltr">{[email, p.phone].filter(Boolean).join("  ·  ")}</p>
          </div>
          {qr ? (
            <div className="cvp-qr">
              <span dangerouslySetInnerHTML={{ __html: qr }} />
              <small>{t("scan")}</small>
            </div>
          ) : null}
        </header>

        {p.about ? <section className="cvp-sec"><h2>{t("about")}</h2><p className="cvp-pre" dir="auto">{p.about}</p></section> : null}

        {p.desiredRoles.length || lookingFor || p.relocateTo.length ? (
          <section className="cvp-sec">
            <h2>{tp("lookingFor")}</h2>
            {p.desiredRoles.length ? <p><b>{p.desiredRoles.join(" · ")}</b></p> : null}
            {lookingFor ? <p>{lookingFor}</p> : null}
            {p.relocateTo.length ? <p>{tp("openTo", { places: p.relocateTo.map((k) => tco(k as "Lebanon")).join(", ") })}</p> : null}
          </section>
        ) : null}

        {skills.length ? (
          <section className="cvp-sec"><h2>{t("skills")}</h2><p className="cvp-skills">{skills.map((s) => <span key={s.skillId}>{s.skill.name}</span>)}</p></section>
        ) : null}

        {p.workHistory ? <section className="cvp-sec"><h2>{t("work")}</h2><p className="cvp-pre" dir="auto">{p.workHistory}</p></section> : null}
        {p.education ? <section className="cvp-sec"><h2>{t("education")}</h2><p className="cvp-pre" dir="auto">{p.education}</p></section> : null}

        <footer className="cvp-foot">{url ? <span dir="ltr">{url.replace(/^https?:\/\//, "")}</span> : null}<span>{t("madeWith")}</span></footer>
      </article>
    </div>
  );
}
