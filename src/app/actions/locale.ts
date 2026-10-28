"use server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locales";
import { getViewer } from "@/server/session";

/** Switches the interface language and remembers it (cookie, plus the account if signed in). */
export async function setLocale(value: string) {
  const locale = resolveLocale(value);
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const viewer = await getViewer();
  if (viewer) await prisma.user.update({ where: { id: viewer.id }, data: { locale } });
}
