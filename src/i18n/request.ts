import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./locales";

export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Asia/Beirut",
    onError(error) {
      // Missing translations should fail loudly in tests and development.
      if (process.env.NODE_ENV !== "production" || process.env.HIREEL_E2E === "1") throw error;
      console.error(error);
    },
  };
});
