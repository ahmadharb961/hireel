import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { DEFAULT_PLANS } from "@/lib/default-plans";

export async function reset() {
  await prisma.$executeRawUnsafe(`TRUNCATE "user", "Company", "Plan", "Skill", "AppRateLimit", "Report", "AuditLog" RESTART IDENTITY CASCADE`);
  for (const p of DEFAULT_PLANS) await prisma.plan.create({ data: p });
}

let n = 0;
export async function makeCandidate(opts: { name?: string; published?: boolean; visibility?: "EVERYONE" | "EMPLOYERS_ONLY"; paused?: boolean; industry?: string; videos?: { lang: "EN" | "AR" | "FR"; primary?: boolean; moderation?: "APPROVED" | "PENDING" | "REJECTED"; views?: number }[] } = {}) {
  const id = randomUUID();
  const name = opts.name ?? `Cand ${++n}`;
  const user = await prisma.user.create({
    data: {
      id, email: `${id}@test.local`, name, emailVerified: true, role: "CANDIDATE",
      candidate: {
        create: {
          fullName: name, headline: "Tester", location: "Beirut, Lebanon", industry: opts.industry ?? "technology",
          status: opts.published === false ? "DRAFT" : "PUBLISHED", publishConsentAt: opts.published === false ? null : new Date(),
          visibility: opts.visibility ?? "EVERYONE", searchPaused: Boolean(opts.paused), onboardingStep: 5,
          videos: { create: (opts.videos ?? [{ lang: "EN", primary: true }]).map((v) => ({
            language: v.lang, isPrimary: Boolean(v.primary), processing: "READY", moderation: v.moderation ?? "APPROVED", consentAt: new Date(), viewCount: v.views ?? 0,
          })) },
        },
      },
    },
    include: { candidate: true },
  });
  return { userId: user.id, profileId: user.candidate!.id };
}

export async function makeCompany(planKey = "free") {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { key: planKey } });
  const id = randomUUID();
  await prisma.user.create({ data: { id, email: `${id}@co.test`, name: "Recruiter", emailVerified: true, role: "EMPLOYER" } });
  const company = await prisma.company.create({ data: { name: `Co ${id.slice(0, 4)}`, planId: plan.id, members: { create: { userId: id } } }, include: { members: true } });
  return { userId: id, companyId: company.id, memberId: company.members[0].id };
}

export const intro = { roleTitle: "Marketing Lead", employment: "FULL_TIME", workLocation: "Beirut", payRange: "", message: "We liked your intro video.", wantsCv: false };
