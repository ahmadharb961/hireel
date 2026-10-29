import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { FEATURED_MAX } from "@/lib/categories";
import { createCategory, featureCompany, moveCategory, moveFeatured, renameCategory, setCategoryActive, unfeatureCompany } from "@/server/admin-content";
import { isCategory } from "@/server/categories";
import { featuredCompanies } from "@/server/landing-data";
import { makeCompany, reset } from "./helpers";

const STARTING = ["marketing", "technology", "finance", "sales", "design", "hospitality", "engineering", "healthcare", "education", "logistics", "retail", "hr", "other"];

describe("categories managed by the Hireel team", () => {
  // The starting categories come from the migration; put them back exactly after each test.
  const before = async () => prisma.category.findMany();
  let saved: Awaited<ReturnType<typeof before>> = [];
  beforeEach(async () => { saved = await before(); });
  afterEach(async () => {
    await prisma.category.deleteMany({ where: { key: { notIn: saved.map((c) => c.key) } } });
    for (const c of saved) await prisma.category.update({ where: { key: c.key }, data: c });
  });

  it("starts with the original categories for everyone, plus industries for companies only", async () => {
    const all = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
    expect(all.filter((c) => c.forCandidates).map((c) => c.key)).toEqual(STARTING);
    expect(all.find((c) => c.key === "automotive")).toMatchObject({ nameEn: "Automotive", nameAr: "السيارات", forCandidates: false });
    expect(all.filter((c) => !c.forCandidates).length).toBeGreaterThan(50);
    expect(await isCategory("fintech", "company")).toBe(true);
    expect(await isCategory("fintech")).toBe(false);
    expect(await isCategory("marketing", "company")).toBe(true);
    expect(all.find((c) => c.key === "hr")).toMatchObject({ nameEn: "HR & People", nameAr: "الموارد البشرية" });
  });

  it("adds a category at the end with a key made from the English name", async () => {
    const r = await createCategory("  Marine Biology ", "علم الأحياء البحرية");
    expect(r).toEqual({ ok: true, key: "marine-biology" });
    const last = (await prisma.category.findMany({ orderBy: { sortOrder: "asc" } })).at(-1);
    expect(last).toMatchObject({ key: "marine-biology", nameEn: "Marine Biology", active: true, forCandidates: true });
    expect(await isCategory("marine-biology")).toBe(true);
    expect((await createCategory("Ports", "الموانئ", false)).ok).toBe(true);
    expect(await isCategory("ports")).toBe(false);
    expect(await isCategory("ports", "company")).toBe(true);
  });

  it("refuses empty, too long and duplicate names", async () => {
    expect(await createCategory("", "عربي")).toMatchObject({ ok: false, error: "required", field: "nameEn" });
    expect(await createCategory("Legal", "")).toMatchObject({ ok: false, error: "required", field: "nameAr" });
    expect(await createCategory("x".repeat(41), "عربي")).toMatchObject({ ok: false, error: "too_long" });
    expect(await createCategory("marketing", "جديد")).toMatchObject({ ok: false, error: "duplicate" });
    expect(await renameCategory("sales", "Marketing", "مبيعات")).toMatchObject({ ok: false, error: "duplicate" });
  });

  it("renaming keeps the key, so profiles keep their category", async () => {
    expect((await renameCategory("hr", "Human Resources", "الموارد البشرية")).ok).toBe(true);
    expect(await prisma.category.findUnique({ where: { key: "hr" } })).toMatchObject({ nameEn: "Human Resources" });
  });

  it("hidden categories can't be picked", async () => {
    await setCategoryActive("design", false);
    expect(await isCategory("design")).toBe(false);
    await setCategoryActive("design", true);
    expect(await isCategory("design")).toBe(true);
  });

  it("moves a category up and down", async () => {
    await moveCategory("technology", -1);
    let keys = (await prisma.category.findMany({ orderBy: { sortOrder: "asc" } })).map((c) => c.key);
    expect(keys.slice(0, 2)).toEqual(["technology", "marketing"]);
    await moveCategory("technology", -1); // already first: nothing changes
    await moveCategory("technology", 1);
    keys = (await prisma.category.findMany({ orderBy: { sortOrder: "asc" } })).map((c) => c.key);
    expect(keys.slice(0, 2)).toEqual(["marketing", "technology"]);
  });
});

describe("Top employers on the homepage", () => {
  beforeEach(reset);

  it(`shows at most ${FEATURED_MAX}, in the order chosen`, async () => {
    const cos = await Promise.all(Array.from({ length: FEATURED_MAX + 1 }, () => makeCompany()));
    for (const c of cos.slice(0, FEATURED_MAX)) expect((await featureCompany(c.companyId)).ok).toBe(true);
    expect(await featureCompany(cos[FEATURED_MAX].companyId)).toEqual({ ok: false, error: "featured_full" });
    expect((await featuredCompanies()).map((c) => c.id)).toEqual(cos.slice(0, FEATURED_MAX).map((c) => c.companyId));

    await moveFeatured(cos[2].companyId, -1);
    expect((await featuredCompanies()).map((c) => c.id).slice(0, 3)).toEqual([cos[0], cos[2], cos[1]].map((c) => c.companyId));

    // Removing one frees a place and closes the gap.
    await unfeatureCompany(cos[0].companyId);
    const ranks = (await prisma.company.findMany({ where: { featuredRank: { not: null } }, orderBy: { featuredRank: "asc" } })).map((c) => c.featuredRank);
    expect(ranks).toEqual([1, 2, 3, 4, 5]);
    expect((await featureCompany(cos[FEATURED_MAX].companyId)).ok).toBe(true);
  });

  it("two quick clicks can't go over the limit", async () => {
    const cos = await Promise.all(Array.from({ length: FEATURED_MAX + 3 }, () => makeCompany()));
    await Promise.all(cos.map((c) => featureCompany(c.companyId)));
    expect(await prisma.company.count({ where: { featuredRank: { not: null } } })).toBe(FEATURED_MAX);
  });

  it("never shows suspended companies", async () => {
    const a = await makeCompany();
    const b = await makeCompany();
    await prisma.company.update({ where: { id: b.companyId }, data: { status: "SUSPENDED" } });
    expect(await featureCompany(b.companyId)).toEqual({ ok: false, error: "suspended" });
    await featureCompany(a.companyId);
    await prisma.company.update({ where: { id: a.companyId }, data: { status: "SUSPENDED" } });
    expect(await featuredCompanies()).toEqual([]);
  });
});
