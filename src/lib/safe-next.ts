/**
 * A page inside Hireel to return to after logging in (e.g. the chat a notification opened).
 * Only our own app pages are accepted, so a link can't send people to another site.
 */
export function safeNext(v: string | null | undefined): string | null {
  if (!v || v.length > 200 || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  return /^\/(candidate|employer|admin|feed|search|c\/)/.test(v) ? v : null;
}

export const loginTo = (path: string) => `/login?next=${encodeURIComponent(path)}`;

/** Where a "Back" link may return to: any page on Hireel itself. */
export function safeBack(v: string | null | undefined): string | null {
  if (!v || v.length > 200 || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  return v;
}

/** Link to a company page that remembers where to go back to. */
export const companyHref = (id: string, back: string) => `/companies/${id}?back=${encodeURIComponent(back)}`;
