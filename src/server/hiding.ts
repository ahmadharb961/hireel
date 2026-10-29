import "server-only";
import { prisma } from "@/lib/db";

/**
 * "Hide my profile from these companies" (for example a current employer).
 * Hiding works through the same Block row as blocking after a request, so every place that
 * already respects a block (reels, search, profile pages, intro requests) hides the candidate.
 * A typed name also hides companies that join Hireel later.
 */

/** Lowercase letters and digits only (Arabic letters kept), so "IMPEX s.a.l." matches "impex". */
export function simplifyName(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export type HideResult = { ok: true } | { ok: false; error: "not_found" | "too_short" | "too_long" | "duplicate" | "too_many" };
const MAX_RULES = 30;

/** Hide from one company that's on Hireel. Its pending requests are declined, as when blocking. */
export async function hideFromCompany(candidateId: string, companyId: string): Promise<HideResult> {
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!c) return { ok: false, error: "not_found" };
  await prisma.$transaction([
    prisma.block.upsert({ where: { candidateId_companyId: { candidateId, companyId } }, update: {}, create: { candidateId, companyId, source: "hide" } }),
    prisma.introRequest.updateMany({ where: { candidateId, companyId, status: "PENDING" }, data: { status: "DECLINED", respondedAt: new Date() } }),
  ]);
  return { ok: true };
}

/** Hide from every company whose name contains this text, now and in the future. */
export async function hideFromName(candidateId: string, raw: string): Promise<HideResult> {
  const term = raw.trim().replace(/\s+/g, " ");
  const match = simplifyName(term);
  if (match.length < 3) return { ok: false, error: "too_short" };
  if (term.length > 60) return { ok: false, error: "too_long" };
  if ((await prisma.hiddenCompanyName.count({ where: { candidateId } })) >= MAX_RULES) return { ok: false, error: "too_many" };
  const exists = await prisma.hiddenCompanyName.findUnique({ where: { candidateId_match: { candidateId, match } } });
  if (exists) return { ok: false, error: "duplicate" };
  await prisma.hiddenCompanyName.create({ data: { candidateId, term, match } });
  await applyRules(candidateId);
  return { ok: true };
}

/** Companies (already on Hireel) whose names match this candidate's hidden names get a block. */
async function applyRules(candidateId: string) {
  const rules = await prisma.hiddenCompanyName.findMany({ where: { candidateId }, select: { match: true } });
  if (!rules.length) return;
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const hits = companies.filter((c) => { const n = simplifyName(c.name); return rules.some((r) => n.includes(r.match)); });
  if (hits.length) await prisma.block.createMany({ data: hits.map((c) => ({ candidateId, companyId: c.id, source: "name" })), skipDuplicates: true });
  await prisma.introRequest.updateMany({ where: { candidateId, companyId: { in: hits.map((c) => c.id) }, status: "PENDING" }, data: { status: "DECLINED", respondedAt: new Date() } });
}

/** A new or renamed company: hide it from every candidate whose hidden names match. */
export async function applyHiddenNamesToCompany(companyId: string) {
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  if (!c) return 0;
  const n = simplifyName(c.name);
  if (!n) return 0;
  const rows = await prisma.$queryRaw<{ candidateId: string }[]>`SELECT DISTINCT "candidateId" FROM "HiddenCompanyName" WHERE strpos(${n}, "match") > 0`;
  if (rows.length) await prisma.block.createMany({ data: rows.map((r) => ({ candidateId: r.candidateId, companyId, source: "name" })), skipDuplicates: true });
  return rows.length;
}

/** Show the profile to this company again (removes the hide or block). */
export async function unhideCompany(candidateId: string, companyId: string) {
  await prisma.block.deleteMany({ where: { candidateId, companyId } });
  return { ok: true } as const;
}

/** Remove a hidden name; companies hidden only because of it become visible again. */
export async function unhideName(candidateId: string, id: string) {
  await prisma.hiddenCompanyName.deleteMany({ where: { id, candidateId } });
  await prisma.block.deleteMany({ where: { candidateId, source: "name" } });
  await applyRules(candidateId);
  return { ok: true } as const;
}

export async function hiddenList(candidateId: string) {
  const [blocks, names] = await Promise.all([
    prisma.block.findMany({ where: { candidateId }, include: { company: { select: { id: true, name: true, logoUpdatedAt: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.hiddenCompanyName.findMany({ where: { candidateId }, orderBy: { createdAt: "desc" } }),
  ]);
  return { blocks, names };
}

/** Companies a candidate can pick to hide from (by name), for the search box. */
export async function searchCompanies(q: string) {
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  return prisma.company.findMany({
    where: { name: { contains: term, mode: "insensitive" }, status: { not: "SUSPENDED" } },
    select: { id: true, name: true, logoUpdatedAt: true, country: true },
    orderBy: { name: "asc" },
    take: 8,
  });
}
