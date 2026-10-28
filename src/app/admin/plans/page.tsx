import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/server/session";
import { AdminFrame } from "../AdminFrame";
import { PlansForm } from "./PlansForm";

export default async function PlansAdmin() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { companies: true } } } });
  return (
    <AdminFrame tab="plans">
      <div><h1 className="h2">{t("plansTitle")}</h1><p className="p">{t("plansSub")}</p></div>
      <PlansForm plans={plans.map(({ _count, updatedAt: _u, ...p }) => ({ ...p, companies: _count.companies }))} />
    </AdminFrame>
  );
}
