/** Shared lists. Labels live in messages/*.json under the same keys. */

// Job categories live in the database (Category) so the Hireel team can manage them from the admin dashboard.

export const AVAILABILITY = ["AVAILABLE_NOW", "TWO_WEEKS", "ONE_MONTH", "TWO_MONTHS", "OPEN_TO_OFFERS"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const VIDEO_LANGUAGES = ["EN", "AR", "FR"] as const;
export type VideoLang = (typeof VIDEO_LANGUAGES)[number];

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE"] as const;
/** Job preferences: where they want to work and the currency of their expected salary. */
export const WORK_MODES = ["ONSITE", "HYBRID", "REMOTE"] as const;
export const SALARY_CURRENCIES = ["USD", "EUR", "AED", "SAR", "QAR", "KWD"] as const;
export const MAX_DESIRED_ROLES = 5;

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

export const COUNTRIES = ["Lebanon", "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Other"] as const;

export const CITY_SUGGESTIONS = [
  "Beirut, Lebanon", "Jounieh, Lebanon", "Tripoli, Lebanon", "Saida, Lebanon", "Zahle, Lebanon", "Byblos, Lebanon",
  "Dubai, UAE", "Abu Dhabi, UAE", "Riyadh, Saudi Arabia", "Jeddah, Saudi Arabia", "Doha, Qatar", "Kuwait City, Kuwait",
] as const;

export const MAX_SKILLS = 8;
export const MAX_VIDEOS = 2;
export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
export const ARCHIVE_DAYS = 30;
export const FEED_PAGE_SIZE = 5;

export const REJECTION_REASONS = ["quiet_audio", "not_intro", "contact_details", "inappropriate", "poor_quality"] as const;

export function slugify(s: string) {
  return s.trim().toLowerCase().normalize("NFKC").replace(/\s+/g, "-").replace(/[^\p{L}\p{N}+#.-]/gu, "").slice(0, 60);
}
