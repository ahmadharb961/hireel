/**
 * A page inside Hireel to return to after logging in (e.g. the chat a notification opened).
 * Only our own app pages are accepted, so a link can't send people to another site.
 */
export function safeNext(v: string | null | undefined): string | null {
  if (!v || v.length > 200 || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  return /^\/(candidate|employer|admin|feed|search|c\/)/.test(v) ? v : null;
}

export const loginTo = (path: string) => `/login?next=${encodeURIComponent(path)}`;
