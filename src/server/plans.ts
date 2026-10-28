import "server-only";
import { prisma } from "@/lib/db";
import { periodStart } from "./rules/plans";

export async function defaultPlan() {
  const plan = (await prisma.plan.findFirst({ where: { isDefault: true } })) ?? (await prisma.plan.findFirst({ orderBy: { sortOrder: "asc" } }));
  if (!plan) throw new Error("No plans exist. Run `npm run db:setup` to create the default plans.");
  return plan;
}

export async function usageThisMonth(companyId: string, now = new Date()) {
  const start = periodStart(now);
  const [intro, cv] = await Promise.all([
    prisma.usageLedger.count({ where: { companyId, kind: "INTRO_REQUEST", periodStart: start } }),
    prisma.usageLedger.count({ where: { companyId, kind: "CV_CONTACT_REQUEST", periodStart: start } }),
  ]);
  return { intro, cv, periodStart: start };
}
