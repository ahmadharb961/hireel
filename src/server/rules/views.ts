import { isBot } from "./bots";

export const MIN_WATCH_MS = 3000;
export const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
export const PUBLIC_VIEW_THRESHOLD = 10;

export type ViewCheck = {
  viewerRole: string | null;
  viewerId: string | null;
  ownerUserId: string;
  watchedMs: number;
  userAgent: string | null;
  lastViewAt: Date | null;
  now: Date;
};

export type ViewDecision = { count: true } | { count: false; reason: "not_employer" | "own_video" | "too_short" | "bot" | "recent" };

/** Hireel's view rule: a logged-in employer, 3+ seconds, once per 24 hours, never the owner, never a bot. */
export function decideView(c: ViewCheck): ViewDecision {
  if (!c.viewerId || c.viewerRole !== "EMPLOYER") return { count: false, reason: "not_employer" };
  if (c.viewerId === c.ownerUserId) return { count: false, reason: "own_video" };
  if (!(c.watchedMs >= MIN_WATCH_MS)) return { count: false, reason: "too_short" };
  if (isBot(c.userAgent)) return { count: false, reason: "bot" };
  if (c.lastViewAt && c.now.getTime() - c.lastViewAt.getTime() < VIEW_WINDOW_MS) return { count: false, reason: "recent" };
  return { count: true };
}

/** Public count is hidden until it reaches 10. */
export function publicViewCount(count: number): number | null {
  return count >= PUBLIC_VIEW_THRESHOLD ? count : null;
}
