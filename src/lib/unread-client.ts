"use client";
import { useSyncExternalStore } from "react";

/**
 * Unread chats, shared by every menu and alert on the page so the server is asked once.
 * Checked every 20 seconds while the page is on screen, and straight away when it comes back.
 */
export type Unread = { n: number; latest: { id: string; from: string; snippet: string; url: string } | null };

const EMPTY: Unread = { n: 0, latest: null };
const POLL_MS = 20_000;
let state: Unread = EMPTY;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function load() {
  try {
    const d = (await fetch("/api/chat/unread", { cache: "no-store" }).then((r) => r.json())) as Unread;
    if (d.n !== state.n || d.latest?.id !== state.latest?.id) {
      state = { n: d.n, latest: d.latest };
      listeners.forEach((l) => l());
    }
  } catch {
    // Offline for a moment: try again next round.
  }
}
const onVis = () => { if (document.visibilityState === "visible") void load(); };

function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) {
    void load();
    timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, POLL_MS);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    }
  };
}

/** Pass false for visitors (nothing is asked). */
export function useUnread(on = true): Unread {
  const s = useSyncExternalStore(on ? subscribe : () => () => {}, () => state, () => EMPTY);
  return on ? s : EMPTY;
}

/** Ask again now (after reading a chat). */
export const refreshUnread = () => void load();
