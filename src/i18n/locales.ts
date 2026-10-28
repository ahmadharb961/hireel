export const LOCALES = ["en", "ar"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function resolveLocale(value: string | undefined | null): AppLocale {
  return value === "ar" ? "ar" : DEFAULT_LOCALE;
}

export function dirOf(locale: AppLocale) {
  return locale === "ar" ? "rtl" : "ltr";
}
