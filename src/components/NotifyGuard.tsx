"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { pushState, resyncDevice, turnOn, type PushState } from "@/lib/push-client";

const LATER_KEY = "hireel_notify_later";
const LATER_MS = 24 * 60 * 60 * 1000;

/**
 * Checks on every visit (phone or computer) that this device gets Hireel notifications:
 * - on: re-confirms the device with the server so notifications keep arriving;
 * - off or blocked: a small card asks to turn them on (or explains how to unblock).
 * "Later" hides it for one day only, so chats keep getting answered quickly.
 */
export function NotifyGuard({ who, inChat }: { who: "candidate" | "employer"; inChat?: boolean }) {
  const t = useTranslations("notifyGuard");
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () => pushState().then((s) => {
      if (!alive) return;
      if (s === "on") { void resyncDevice(); setState(null); return; }
      let later = false;
      try { later = Number(localStorage.getItem(LATER_KEY) ?? 0) > Date.now(); } catch { /* private mode */ }
      // iPhone in Safari (not added to the Home Screen) gets the install banner instead.
      setState(later || s === "unsupported" || s === "ios-needs-install" ? null : s);
    }).catch(() => {});
    check();
    // Someone may allow notifications in the browser settings and come back.
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVis); };
  }, []);

  if (!state || typeof document === "undefined") return null;
  const later = () => {
    try { localStorage.setItem(LATER_KEY, String(Date.now() + LATER_MS)); } catch { /* ignore */ }
    setState(null);
  };
  return createPortal(
    <div className={`nguard${inChat ? " inchat" : ""}`} role="region" aria-label={t("title")}>
      <span className="nguard-ic" aria-hidden="true">🔔</span>
      <div className="nguard-tx">
        <b>{state === "blocked" ? t("blockedTitle") : t("title")}</b>
        <span>{state === "blocked" ? t("blockedBody") : t(`why.${who}`)}</span>
        <div className="nguard-btns">
          {state === "off" ? (
            <button type="button" className="btn sm" disabled={busy} onClick={async () => {
              setBusy(true);
              const s = await turnOn().catch(() => "off" as PushState);
              setBusy(false);
              setState(s === "on" ? null : s);
            }}>{busy ? "…" : t("turnOn")}</button>
          ) : (
            <button type="button" className="btn sm" onClick={() => location.reload()}>{t("done")}</button>
          )}
          <button type="button" className="btn sm o" onClick={later}>{t("later")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
