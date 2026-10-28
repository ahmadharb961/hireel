import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LIcon } from "./icons";

/** "A video says more than a CV" showcase. The phone is an illustration (marked Example), not a real candidate. */
export async function SeeItInAction() {
  const t = await getTranslations("landing.demo");
  const feats = [["video", "f1"], ["people", "f2"], ["bolt", "f3"]] as const;
  return (
    <section className="sia" aria-labelledby="sia-title">
      <div className="sia-blob" aria-hidden="true" />
      <div className="sia-copy">
        <span className="pillx">{t("pill")}</span>
        <h2 id="sia-title" className="sia-title">{t("title1")} <span>{t("title2")}</span></h2>
        <p className="sia-lead">{t("lead")}</p>
        <ul className="sia-feats">
          {feats.map(([ic, k]) => (
            <li key={k}><span className="sia-ic"><LIcon name={ic} size={26} /></span><div><b>{t(`${k}t`)}</b><span>{t(`${k}b`)}</span></div></li>
          ))}
        </ul>
        <div className="sia-ctas">
          <Link className="btn sia-go" href="/feed">{t("explore")} <LIcon name="arrow" size={18} className="flipx" /></Link>
          <Link className="sia-link" href="/#how">{t("learn")} <LIcon name="arrow" size={16} className="flipx" /></Link>
        </div>
      </div>

      <div className="sia-art" aria-hidden="true">
        <Link href="/feed" tabIndex={-1} className="sia-phone">
          <span className="sia-notch" />
          <span className="sia-status"><b>9:41</b><i /></span>
          <img src="/photos/reel-man.jpg" alt="" />
          <span className="sia-shade" />
          <span className="sia-top"><b>{t("role")}</b><span>{t("meta")}</span></span>
          <span className="sia-ex">{t("example")}</span>
          <span className="sia-x"><LIcon name="x" size={18} /></span>
          <span className="sia-player">
            <span className="sia-bar"><i /></span>
            <span className="sia-ctrl"><LIcon name="play" fill size={18} /><span>0:28 / 1:00</span><span className="sia-full">⛶</span></span>
          </span>
        </Link>
        <span className="sia-chip"><LIcon name="video" size={22} /><b>{t("chip")}</b></span>
        <span className="sia-card">
          <span className="sia-card-hd"><img src="/photos/reel-man-face.jpg" alt="" /><span><b>{t("role")}</b><span>{t("meta")}</span></span></span>
          <span className="sia-tags">{(t.raw("tags") as string[]).map((x) => <em key={x}>{x}</em>)}</span>
          <span className="sia-card-btn">{t("viewProfile")} <LIcon name="arrow" size={14} className="flipx" /></span>
        </span>
        <p className="hand sia-hand"><span>{t("hand1")}</span><span>{t("hand2")}</span><span>{t("hand3")}</span></p>
        <svg className="sia-arrow1" viewBox="0 0 70 50"><path d="M64 4c-2 18-18 30-40 36" /><path d="M24 40l8-9M24 40l11 3" /></svg>
        <svg className="sia-arrow2" viewBox="0 0 80 150"><path d="M10 4C2 40 8 70 30 84c18 12 30-8 16-14-14-6-22 12-8 34 8 12 22 22 36 28" /><path d="M74 132l-12 1M74 132l-6-10" /></svg>
      </div>
    </section>
  );
}
