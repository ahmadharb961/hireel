"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { pushState, turnOn, type PushState } from "@/lib/push-client";
import { useUnread } from "@/lib/unread-client";
import { Icon } from "@/components/Icons";

const SEEN_KEY = "hireel_msg_alert_seen";

/** A short, soft two-note chime. Browsers only allow sound after the person has tapped or clicked the page. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx || !navigator.userActivation?.hasBeenActive) return;
    const ctx = new Ctx();
    [[880, 0], [1320, 0.12]].forEach(([f, at]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.4);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {
    // No sound available: the card is still shown.
  }
}
const read = () => { try { return sessionStorage.getItem(SEEN_KEY); } catch { return null; } };
const remember = (id: string) => { try { sessionStorage.setItem(SEEN_KEY, id); } catch { /* private mode */ } };

/**
 * While Hireel is open (phone or computer): a card in the corner when a new message arrives,
 * and the number of unread chats in the browser tab title, e.g. "(1) Discover talent".
 * Phone/computer notifications for when Hireel is closed come from the notifications setting;
 * the card offers to turn them on for this device.
 */
export function MessageAlerts() {
  const t = useTranslations("msgAlert");
  const { n, latest } = useUnread();
  const path = usePathname();
  const [shown, setShown] = useState<typeof latest>(null);
  const [push, setPush] = useState<PushState | null>(null);

  // Count in the tab title (re-applied after every page change, which resets the title).
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s/, "");
    document.title = n ? `(${n > 9 ? "9+" : n}) ${base}` : base;
  }, [n, path]);

  useEffect(() => {
    if (!latest) return;
    const seen = read();
    // Each message is announced once per browser tab, and not while its chat is already open.
    if (latest.id === seen || path === latest.url) { remember(latest.id); return; }
    remember(latest.id);
    // Stays until closed or opened, so a message that arrives while the person is away isn't missed.
    setShown(latest);
    chime();
    pushState().then((s) => {
      setPush(s);
      // Hireel is open in a background tab and notifications are allowed but this device isn't
      // subscribed: show the computer's own notification from here. (When subscribed, the server sends it.)
      if (document.visibilityState === "hidden" && s !== "on" && "Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker?.getRegistration("/").then((reg) =>
          reg?.showNotification(t("title", { name: latest.from }), { body: latest.snippet, tag: `chat-${latest.url}`, data: { url: latest.url }, icon: "/icons/icon-192.png" }),
        ).catch(() => {});
      }
    }).catch(() => setPush(null));
  }, [latest, path]);

  if (!shown || typeof document === "undefined") return null;
  return createPortal(
    <div className="malert" role="status" aria-live="polite">
      <span className="malert-ic"><Icon name="chat" /></span>
      <div className="malert-tx">
        <b>{t("title", { name: shown.from })}</b>
        <span dir="auto">{shown.snippet}</span>
        <div className="malert-btns">
          <Link className="btn sm" href={shown.url} onClick={() => setShown(null)}>{t("open")}</Link>
          {push === "off" ? <button type="button" className="btn sm g" onClick={async () => setPush(await turnOn())}>{t("turnOn")}</button> : null}
        </div>
        {push === "off" ? <span className="malert-note">{t("turnOnWhy")}</span> : null}
      </div>
      <button type="button" className="malert-x" onClick={() => setShown(null)} aria-label={t("close")}>✕</button>
    </div>,
    document.body,
  );
}
