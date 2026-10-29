import "server-only";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { CategoryOption } from "@/lib/categories";

/** Every category, in the order the Hireel team set. Read once per page. */
export const allCategories = cache(() => prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }));

const nameIn = (c: { nameEn: string; nameAr: string }, locale: string) => (locale === "ar" ? c.nameAr || c.nameEn : c.nameEn);

/** Categories people can choose (hidden ones left out), named in the page's language. */
export async function categoryOptions(): Promise<CategoryOption[]> {
  const locale = await getLocale();
  return (await allCategories()).filter((c) => c.active).map((c) => ({ key: c.key, name: nameIn(c, locale) }));
}

/** Turns a stored key into its name. Hidden categories keep their name on old profiles. */
export async function categoryNamer() {
  const locale = await getLocale();
  const names = new Map((await allCategories()).map((c) => [c.key, nameIn(c, locale)]));
  return (key: string | null | undefined) => (key ? names.get(key) ?? key : "");
}

/** True for a category people may pick right now. */
export async function isCategory(key: string) {
  return Boolean(await prisma.category.findFirst({ where: { key, active: true }, select: { key: true } }));
}

/** Options for a form, keeping the person's current category in the list even if it was hidden since. */
export async function categoryOptionsWith(current: string | null | undefined) {
  const list = await categoryOptions();
  if (!current || list.some((c) => c.key === current)) return list;
  return [...list, { key: current, name: (await categoryNamer())(current) }];
}
