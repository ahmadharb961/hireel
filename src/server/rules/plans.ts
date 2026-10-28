/** Usage resets at the start of each calendar month (UTC). */
export function periodStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function remaining(limit: number, used: number) {
  return Math.max(0, limit - used);
}

export type RequestQuotaCheck = { introLimit: number; introUsed: number; cvLimit: number; cvUsed: number; wantsCv: boolean };

export function quotaError(q: RequestQuotaCheck): "intro_limit" | "cv_limit" | null {
  if (q.introUsed >= q.introLimit) return "intro_limit";
  if (q.wantsCv && q.cvUsed >= q.cvLimit) return "cv_limit";
  return null;
}

/** After a decline, the same company may ask again only after this many days. */
export const REQUEST_COOLDOWN_DAYS = 90;
