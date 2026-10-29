import { CATEGORY_KEY } from "./categories";
import { AVAILABILITY, EMPLOYMENT_TYPES, VIDEO_LANGUAGES, WORK_MODES, type VideoLang } from "./constants";

/** Experience bands offered as feed filters (years, inclusive). */
export const EXP_BANDS: Record<string, [number, number]> = { "0-2": [0, 2], "3-5": [3, 5], "5-10": [5, 10], "10+": [10, 60] };

/** Places offered as feed filters. Keys match signup.countries labels; terms are matched against the typed location. */
export const FEED_PLACES: Record<string, string[]> = {
  Lebanon: ["Lebanon", "لبنان"],
  United_Arab_Emirates: ["UAE", "Emirates", "Dubai", "Abu Dhabi", "الإمارات"],
  Saudi_Arabia: ["Saudi", "Riyadh", "Jeddah", "السعودية"],
  Qatar: ["Qatar", "Doha", "قطر"],
  Kuwait: ["Kuwait", "الكويت"],
  Bahrain: ["Bahrain", "Manama", "البحرين"],
  Oman: ["Oman", "Muscat", "عُمان", "عمان"],
};

export type FeedFilters = { industry: string | null; lang: VideoLang | null; exp: string | null; place: string | null; avail: string | null; mode: string | null; jtype: string | null };
export const FILTER_KEYS = ["industry", "lang", "exp", "place", "avail", "mode", "jtype"] as const;

/** Reads filters from the address bar; anything not on the allowed lists is ignored. */
export function parseFeedFilters(get: (k: string) => string | null | undefined): FeedFilters {
  const pick = <T extends string>(v: string | null | undefined, list: readonly T[]) => (v && (list as readonly string[]).includes(v) ? (v as T) : null);
  return {
    // Categories are managed by the Hireel team; an unknown one simply finds nobody.
    industry: CATEGORY_KEY.test(get("industry") ?? "") ? get("industry")! : null,
    lang: pick(get("lang"), VIDEO_LANGUAGES),
    exp: pick(get("exp"), Object.keys(EXP_BANDS)),
    place: pick(get("place"), Object.keys(FEED_PLACES)),
    avail: pick(get("avail"), AVAILABILITY),
    mode: pick(get("mode"), WORK_MODES),
    jtype: pick(get("jtype"), EMPLOYMENT_TYPES),
  };
}

export function filtersToQuery(f: Partial<FeedFilters>) {
  const qs = new URLSearchParams();
  for (const k of FILTER_KEYS) if (f[k]) qs.set(k, f[k] as string);
  return qs;
}
