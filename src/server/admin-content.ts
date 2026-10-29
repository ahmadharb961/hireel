import "server-only";
import { prisma } from "@/lib/db";
import { FEATURED_MAX, categoryKey } from "@/lib/categories";

/** Homepage and category settings the Hireel team manages from the admin dashboard. */

type Err = "required" | "too_long" | "duplicate" | "not_found" | "featured_full" | "suspended";
export type ContentResult = { ok: true; key?: string } | { ok: false; error: Err; field?: string };

const NAME_MAX = 40;

function checkNames(nameEn: string, nameAr: string): ContentResult | null {
  if (!nameEn) return { ok: false, error: "required", field: "nameEn" };
  if (!nameAr) return { ok: false, error: "required", field: "nameAr" };
  if (nameEn.length > NAME_MAX) return { ok: false, error: "too_long", field: "nameEn" };
  if (nameAr.length > NAME_MAX) return { ok: false, error: "too_long", field: "nameAr" };
  return null;
}

async function nameTaken(nameEn: string, nameAr: string, except?: string) {
  const hit = await prisma.category.findFirst({
    where: { key: except ? { not: except } : undefined, OR: [{ nameEn: { equals: nameEn, mode: "insensitive" } }, { nameAr }] },
    select: { key: true },
  });
  return Boolean(hit);
}

/** Adds a category at the end of the list. Its key comes from the English name and never changes. */
export async function createCategory(nameEnRaw: string, nameArRaw: string): Promise<ContentResult> {
  const nameEn = nameEnRaw.trim();
  const nameAr = nameArRaw.trim();
  const bad = checkNames(nameEn, nameAr);
  if (bad) return bad;
  if (await nameTaken(nameEn, nameAr)) return { ok: false, error: "duplicate", field: "nameEn" };
  const base = categoryKey(nameEn) || "category";
  let key = base;
  for (let i = 2; await prisma.category.findUnique({ where: { key } }); i++) key = `${base.slice(0, 36)}-${i}`;
  const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
  await prisma.category.create({ data: { key, nameEn, nameAr, sortOrder: (last._max.sortOrder ?? 0) + 10 } });
  return { ok: true, key };
}

/** New names show everywhere at once: profiles store the key, not the name. */
export async function renameCategory(key: string, nameEnRaw: string, nameArRaw: string): Promise<ContentResult> {
  const nameEn = nameEnRaw.trim();
  const nameAr = nameArRaw.trim();
  const bad = checkNames(nameEn, nameAr);
  if (bad) return bad;
  if (!(await prisma.category.findUnique({ where: { key } }))) return { ok: false, error: "not_found" };
  if (await nameTaken(nameEn, nameAr, key)) return { ok: false, error: "duplicate", field: "nameEn" };
  await prisma.category.update({ where: { key }, data: { nameEn, nameAr } });
  return { ok: true, key };
}

/** Hidden categories can't be picked any more; people who already chose one keep it. */
export async function setCategoryActive(key: string, active: boolean): Promise<ContentResult> {
  const res = await prisma.category.updateMany({ where: { key }, data: { active } });
  return res.count ? { ok: true, key } : { ok: false, error: "not_found" };
}

/** Moves a category one place up (-1) or down (1). */
export async function moveCategory(key: string, dir: -1 | 1): Promise<ContentResult> {
  return prisma.$transaction(async (tx) => {
    const all = await tx.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { key: true } });
    const i = all.findIndex((c) => c.key === key);
    if (i < 0) return { ok: false, error: "not_found" } as const;
    const j = i + dir;
    if (j >= 0 && j < all.length) [all[i], all[j]] = [all[j], all[i]];
    for (const [n, c] of all.entries()) await tx.category.update({ where: { key: c.key }, data: { sortOrder: (n + 1) * 10 } });
    return { ok: true, key } as const;
  });
}

// ---------- Top employers ----------

/** Adds a company to the end of "Top employers". At most FEATURED_MAX at a time. */
export async function featureCompany(companyId: string): Promise<ContentResult> {
  return prisma.$transaction(async (tx) => {
    // One change at a time, so two quick clicks can't go over the limit.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(482017)`;
    const c = await tx.company.findUnique({ where: { id: companyId }, select: { status: true, featuredRank: true } });
    if (!c) return { ok: false, error: "not_found" } as const;
    if (c.featuredRank) return { ok: true } as const;
    if (c.status === "SUSPENDED") return { ok: false, error: "suspended" } as const;
    const ranks = await tx.company.findMany({ where: { featuredRank: { not: null } }, select: { featuredRank: true } });
    if (ranks.length >= FEATURED_MAX) return { ok: false, error: "featured_full" } as const;
    const next = Math.max(0, ...ranks.map((r) => r.featuredRank ?? 0)) + 1;
    await tx.company.update({ where: { id: companyId }, data: { featuredRank: next } });
    return { ok: true } as const;
  });
}

async function renumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], ids: string[]) {
  for (const [n, id] of ids.entries()) await tx.company.update({ where: { id }, data: { featuredRank: n + 1 } });
}

export async function unfeatureCompany(companyId: string): Promise<ContentResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(482017)`;
    await tx.company.updateMany({ where: { id: companyId }, data: { featuredRank: null } });
    const rest = await tx.company.findMany({ where: { featuredRank: { not: null } }, orderBy: { featuredRank: "asc" }, select: { id: true } });
    await renumber(tx, rest.map((r) => r.id));
    return { ok: true } as const;
  });
}

/** Moves a company one place earlier (-1) or later (1) in the row. */
export async function moveFeatured(companyId: string, dir: -1 | 1): Promise<ContentResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(482017)`;
    const ids = (await tx.company.findMany({ where: { featuredRank: { not: null } }, orderBy: { featuredRank: "asc" }, select: { id: true } })).map((r) => r.id);
    const i = ids.indexOf(companyId);
    if (i < 0) return { ok: false, error: "not_found" } as const;
    const j = i + dir;
    if (j >= 0 && j < ids.length) [ids[i], ids[j]] = [ids[j], ids[i]];
    await renumber(tx, ids);
    return { ok: true } as const;
  });
}

// ---------- homepage switches ----------

const TOP_KEY = "home.topEmployers";

/** Whether the homepage shows the Top employers section (on unless the Hireel team switched it off). */
export async function topEmployersVisible() {
  const row = await prisma.platformSetting.findUnique({ where: { key: TOP_KEY } });
  return row?.value !== "off";
}

export async function setTopEmployersVisible(on: boolean) {
  await prisma.platformSetting.upsert({ where: { key: TOP_KEY }, create: { key: TOP_KEY, value: on ? "on" : "off" }, update: { value: on ? "on" : "off" } });
}
