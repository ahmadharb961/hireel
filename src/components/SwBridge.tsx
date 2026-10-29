"use client";
import { useEffect } from "react";

/**
 * When a notification is tapped while Hireel is already open, the service worker asks this
 * page to go to the notification's page (the chat), in case the phone didn't move it there itself.
 */
export function SwBridge() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; url?: string } | null;
      if (d?.type !== "hireel-open" || !d.url) return;
      const to = new URL(d.url, location.origin);
      if (to.origin !== location.origin) return;
      if (to.pathname + to.search !== location.pathname + location.search) location.assign(to.pathname + to.search);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);
  return null;
}
