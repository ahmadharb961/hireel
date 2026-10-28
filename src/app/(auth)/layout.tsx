import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LIcon } from "@/components/landing/icons";
import { Logo } from "@/components/Logo";

/** On computers: the green brand panel beside the form. On phones: just the form, as approved. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("authside");
  const th = await getTranslations("home");
  const tl = await getTranslations("landing.hero");
  const ti = await getTranslations("industries");
  const items = [["bolt", "why1"], ["people", "why2"], ["lock", "why3"]] as const;
  return (
    <div className="authwrap">
      <aside className="authside" aria-hidden="true">
        <div className="as-waves" />
        <Link href="/" tabIndex={-1} className="as-logo"><Logo white height={34} /></Link>
        <div className="as-body">
          <div className="as-copy">
            <p className="as-pill">{t("pill")}</p>
            <h2 className="as-title">{t("title1")}<br /><span>{t("title2")}</span></h2>
            <p className="as-lead">{th("lead")}</p>
            <ul className="as-list">
              {items.map(([icon, k]) => (
                <li key={k}><span className="as-ic"><LIcon name={icon} size={22} /></span><div><b>{th(k)}</b><span>{th(`${k}Sub`)}</span></div></li>
              ))}
            </ul>
            <p className="hand as-hand"><span>{tl("hand1")}</span><span>{tl("hand2")}</span><span>{tl("hand3")}</span></p>
          </div>
          <div className="as-art">
            <figure className="pcard ac1"><img src="/photos/p1.jpg" alt="" /><figcaption><b>{tl("c1Role")}</b><span>{tl("c1Meta")}</span></figcaption><span className="pcard-play"><LIcon name="play" fill size={14} /></span></figure>
            <figure className="pcard ac2"><img src="/photos/p2.jpg" alt="" /><figcaption><b>{tl("c2Role")}</b><span>{tl("c2Meta")}</span></figcaption><span className="pcard-play"><LIcon name="play" fill size={14} /></span></figure>
            <figure className="pcard ac3"><img src="/photos/p3.jpg" alt="" /><figcaption><b>{tl("c3Role")}</b><span>{tl("c3Meta")}</span></figcaption><span className="pcard-play"><LIcon name="play" fill size={14} /></span></figure>
            <span className="as-chip c1"><LIcon name="sales" size={16} /> {ti("marketing")}</span>
            <span className="as-chip c2"><LIcon name="people" size={16} /> {ti("hr")}</span>
          </div>
        </div>
      </aside>
      <div className="authmain">{children}</div>
    </div>
  );
}
