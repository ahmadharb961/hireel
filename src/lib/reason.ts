import { REJECTION_REASONS } from "./constants";

/** Rejection reasons are stored as "key::note" so each candidate reads them in their own language. */
export function parseReason(raw: string | null | undefined): { key: string | null; note: string } {
  if (!raw) return { key: null, note: "" };
  const i = raw.indexOf("::");
  if (i < 0) return { key: null, note: raw };
  const key = raw.slice(0, i);
  return { key: (REJECTION_REASONS as readonly string[]).includes(key) ? key : null, note: raw.slice(i + 2).trim() };
}
