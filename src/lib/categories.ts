/** A category as the browser sees it: the stored key and its name in the page's language. */
export type CategoryOption = { key: string; name: string };

/** Keys are lowercase letters, digits and dashes, made from the English name. */
export const CATEGORY_KEY = /^[a-z0-9-]{1,40}$/;

export function categoryKey(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40).replace(/^-|-$/g, "");
}

/** How many companies the Hireel team can show under "Top employers" (one row on the homepage). */
export const FEATURED_MAX = 6;
