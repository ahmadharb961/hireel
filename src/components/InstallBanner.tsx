"use client";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isIOSDevice, isMobileOrTablet, shouldShowBanner } from "./install-logic";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const PV = "hireel_pv";
const DISMISSED = "hireel_install_dismissed";

function read(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function write(key: string, v: string) { try { localStorage.setItem(key, v); } catch { /* private mode */ } }

/** "Install Hireel" banner: Android/Chrome install button, or iPhone/iPad Share → Add to Home Screen steps. */
export function InstallBanner() {
  const t = useTranslations("install");
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [steps, setSteps] = useState(false);
  const prompt = useRef<BIPEvent | null>(null);

  const evaluate = useCallback(() => {
    const n = navigator as Navigator & { standalone?: boolean };
    const isIos = isIOSDevice(n.userAgent, n.platform, n.maxTouchPoints || 0);
    setIos(isIos);
    setShow(shouldShowBanner({
      standalone: window.matchMedia("(display-mode: standalone)").matches || n.standalone === true,
      mobile: isMobileOrTablet(n.userAgent, n.platform, n.maxTouchPoints || 0),
      pageViews: Number(read(PV)) || 0,
      dismissedAt: Number(read(DISMISSED)) || null,
      now: Date.now(),
      canPrompt: Boolean(prompt.current),
      ios: isIos,
    }));
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); prompt.current = e as BIPEvent; evaluate(); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setShow(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [evaluate]);

  useEffect(() => {
    // Count this page view, then decide after the page has painted.
    write(PV, String((Number(read(PV)) || 0) + 1));
    const id = setTimeout(evaluate, 0);
    return () => clearTimeout(id);
  }, [path, evaluate]);

  function dismiss() { write(DISMISSED, String(Date.now())); setShow(false); setSteps(false); }

  async function install() {
    if (ios) return setSteps(true);
    const e = prompt.current;
    if (!e) return;
    await e.prompt();
    const choice = await e.userChoice.catch(() => ({ outcome: "dismissed" }));
    prompt.current = null;
    if (choice.outcome === "accepted") setShow(false); else dismiss();
  }

  // Never cover a form someone is filling in.
  const busyScreen = /^\/(signup|login|forgot-password|reset-password|welcome|candidate\/(onboarding|edit)|admin)/.test(path);
  if (!show || busyScreen) return null;
  // On the full-screen feed the banner sits under the header so it never covers the card buttons.
  const place = path.startsWith("/feed") ? { top: "calc(64px + env(safe-area-inset-top, 0px))" } : { bottom: "calc(80px + env(safe-area-inset-bottom, 0px))" };
  return (
    <>
      <div role="region" aria-label={t("title")} style={{ position: "fixed", insetInline: 12, ...place, zIndex: 40, maxWidth: 406, margin: "0 auto", background: "var(--card)", border: "1px solid var(--bd)", borderRadius: 18, boxShadow: "0 10px 30px rgba(0,0,0,.18)", padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
        <img src="/icons/icon-192.png" alt="" width={44} height={44} style={{ borderRadius: 10 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", fontSize: 15 }}>{t("title")}</b>
          <span className="note">{t("body")}</span>
        </div>
        <button type="button" className="btn sm" onClick={install}>{t("install")}</button>
        <button type="button" className="ib" aria-label={t("close")} onClick={dismiss} style={{ width: 36, height: 36 }}>✕</button>
      </div>
      {steps ? (
        <div className="sheet" style={{ position: "fixed" }} onClick={(e) => { if (e.target === e.currentTarget) setSteps(false); }}>
          <div className="panel" role="dialog" aria-modal="true" aria-label={t("iosTitle")} style={{ maxWidth: 430, margin: "0 auto" }}>
            <h3 className="h3" style={{ fontSize: 18 }}>{t("iosTitle")}</h3>
            <ol className="steps" style={{ marginTop: 12 }}>
              <li><span className="n">1</span><div><b>{t("ios1")}</b><span>{t("ios1Sub")}</span></div></li>
              <li><span className="n">2</span><div><b>{t("ios2")}</b><span>{t("ios2Sub")}</span></div></li>
              <li><span className="n">3</span><div><b>{t("ios3")}</b></div></li>
            </ol>
            <button type="button" className="btn w" style={{ marginTop: 16 }} onClick={() => setSteps(false)}>{t("gotIt")}</button>
            <button type="button" className="btn o w" style={{ marginTop: 8 }} onClick={dismiss}>{t("notNow")}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
