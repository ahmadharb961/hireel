import "server-only";
import { prisma } from "@/lib/db";
import { remaining } from "./rules/plans";
import { usageThisMonth } from "./plans";
import type { employerOrNull } from "./session";

type Emp = NonNullable<Awaited<ReturnType<typeof employerOrNull>>>;

export async function quotaFor(emp: Emp, locale: string) {
  const used = await usageThisMonth(emp.company.id);
  const plan = emp.company.plan;
  return {
    introLeft: remaining(plan.monthlyIntroRequests, used.intro),
    cvLeft: remaining(plan.monthlyCvRequests, used.cv),
    planName: locale === "ar" ? plan.nameAr : plan.nameEn,
    isPremium: plan.key !== "free",
    used,
  };
}

export function savedCount(memberId: string) {
  return prisma.savedCandidate.count({ where: { memberId } });
}
