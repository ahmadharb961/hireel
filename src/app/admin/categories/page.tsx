import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { allCategories } from "@/server/categories";
import { requireAdmin } from "@/server/session";
import { AdminFrame } from "../AdminFrame";
import { CategoryAdmin } from "./CategoryAdmin";

/** Add, rename, order and hide the job categories used across Hireel. */
export default async function CategoriesAdmin() {
  await requireAdmin();
  const t = await getTranslations("adminCat");
  const [cats, cands, cos] = await Promise.all([
    allCategories(),
    prisma.candidateProfile.groupBy({ by: ["industry"], _count: true }),
    prisma.company.groupBy({ by: ["industry"], _count: true }),
  ]);
  const n = (rows: { industry: string; _count: number }[], k: string) => rows.find((r) => r.industry === k)?._count ?? 0;
  return (
    <AdminFrame tab="categories">
      <div><h1 className="h2">{t("title")}</h1><p className="p">{t("sub")}</p></div>
      <CategoryAdmin rows={cats.map((c) => ({ key: c.key, nameEn: c.nameEn, nameAr: c.nameAr, active: c.active, forCandidates: c.forCandidates, candidates: n(cands, c.key), companies: n(cos, c.key) }))} />
    </AdminFrame>
  );
}
