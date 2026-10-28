"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { pushState, resyncDevice, turnOff, turnOn, type PushState } from "@/lib/push-client";

const SNOOZE = "hireel_push_snooze";
const SNOOZE_DAYS = 14;

/**
 * Notifications card.
 * - "prompt": a friendly ask, shown only when notifications are off and the person hasn't said "Not now" lately.
 * - "settings": always shows the current state with a switch (account pages).
 * The phone's own "Allow?" question only appears after the person taps Turn on.
 */
export function PushCard({ variant, who }: { variant: "prompt" | "settings"; who: "candidate" | "employer" | "admin" }) {
  const t = useTranslations("pushCard");
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    pushState().then((s) => {
      if (!alive) return;
      if (variant === "prompt") {
        let snoozed = false;
        try { snoozed = Number(localStorage.getItem(SNOOZE) ?? 0) > Date.now(); } catch { /* private mode */ }
        if (snoozed) setHidden(true);
      }
      setState(s);
      if (s === "on") resyncDevice();
    });
    return () => { alive = false; };
  }, [variant]);

  if (!state || hidden) return null;
  if (variant === "prompt" && (state === "on" || state === "blocked" || state === "unsupported")) return null;

  const snooze = () => {
    try { localStorage.setItem(SNOOZE, String(Date.now() + SNOOZE_DAYS * 864e5)); } catch { /* ignore */ }
    setHidden(true);
  };
  const toggle = async () => {
    setBusy(true);
    try { setState(state === "on" ? await turnOff() : await turnOn()); } catch { setState(await pushState()); } finally { setBusy(false); }
  };

  return (
    <div className={`pushcard ${state}`} role="region" aria-label={t("title")}>
      <span className="pushcard-ic" aria-hidden="true">🔔</span>
      <div className="pushcard-tx">
        <b>{state === "on" ? t("onTitle") : t("title")}</b>
        <p>{state === "ios-needs-install" ? t("iosInstall") : state === "blocked" ? t("blocked") : state === "unsupported" ? t("unsupported") : state === "on" ? t("onBody") : t(`why.${who}`)}</p>
        {state === "off" || state === "on" ? (
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className={`btn sm${state === "on" ? " g" : ""}`} disabled={busy} onClick={toggle}>{busy ? "…" : state === "on" ? t("turnOff") : t("turnOn")}</button>
            {variant === "prompt" ? <button type="button" className="btn sm o" onClick={snooze}>{t("notNow")}</button> : null}
          </div>
        ) : variant === "prompt" ? <button type="button" className="btn sm o" style={{ marginTop: 8 }} onClick={snooze}>{t("notNow")}</button> : null}
      </div>
    </div>
  );
}
