/** Optional company social pages. Only links on the matching site are accepted. */

export const SOCIALS = ["linkedin", "instagram", "facebook"] as const;
export type Social = (typeof SOCIALS)[number];

const HOSTS: Record<Social, string[]> = {
  linkedin: ["linkedin.com"],
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
};
const FROM_HANDLE: Record<Social, (h: string) => string> = {
  linkedin: (h) => `https://www.linkedin.com/company/${h}`,
  instagram: (h) => `https://www.instagram.com/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
};

/**
 * Turns what the person typed into a clean https link.
 * Accepts a full link, a link without https, or just a username ("@impex", "impex").
 * Returns "" for empty input and null when it isn't a page on that site.
 */
export function normalizeSocial(kind: Social, raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  if (v.length > 200) return null;
  const handle = v.replace(/^@/, "");
  if (/^[A-Za-z0-9._-]{2,100}$/.test(handle) && !handle.includes("..") && !/\.(com|net|org)$/i.test(handle)) return FROM_HANDLE[kind](handle);
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    const host = u.hostname.toLowerCase();
    // The site itself or one of its own subdomains (www., m., lb.), never a look-alike.
    if (!HOSTS[kind].some((h) => host === h || host.endsWith(`.${h}`))) return null;
    if (u.username || u.password || u.pathname.length < 2) return null;
    u.protocol = "https:";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}
