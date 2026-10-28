import "server-only";
import { prisma } from "@/lib/db";
import { periodStart, quotaError, REQUEST_COOLDOWN_DAYS } from "./rules/plans";

export type IntroInput = {
  roleTitle: string;
  employment: string;
  workLocation: string;
  payRange: string;
  message: string;
  wantsCv: boolean;
};

export type IntroResult =
  | { ok: true; id: string }
  | { ok: false; error: "suspended" | "not_found" | "blocked" | "duplicate" | "cooldown" | "intro_limit" | "cv_limit" };

/**
 * Sends one intro request. Runs in a transaction that locks the company row,
 * so two quick taps can't spend more credits than the plan allows.
 */
export async function sendIntroRequest(opts: { companyId: string; memberId: string; candidateId: string; input: IntroInput; now?: Date }): Promise<IntroResult> {
  const now = opts.now ?? new Date();
  const start = periodStart(now);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Company" WHERE "id" = ${opts.companyId} FOR UPDATE`;
    const company = await tx.company.findUnique({ where: { id: opts.companyId }, include: { plan: true } });
    if (!company || company.status === "SUSPENDED") return { ok: false, error: "suspended" } as const;

    const candidate = await tx.candidateProfile.findFirst({
      where: { id: opts.candidateId, status: "PUBLISHED", user: { suspendedAt: null } },
      select: { id: true },
    });
    if (!candidate) return { ok: false, error: "not_found" } as const;

    const blocked = await tx.block.findUnique({ where: { candidateId_companyId: { candidateId: opts.candidateId, companyId: opts.companyId } } });
    if (blocked) return { ok: false, error: "blocked" } as const;

    const previous = await tx.introRequest.findFirst({
      where: { companyId: opts.companyId, candidateId: opts.candidateId },
      orderBy: { createdAt: "desc" },
    });
    if (previous && (previous.status === "PENDING" || previous.status === "ACCEPTED")) return { ok: false, error: "duplicate" } as const;
    if (previous?.status === "DECLINED" && previous.respondedAt && now.getTime() - previous.respondedAt.getTime() < REQUEST_COOLDOWN_DAYS * 86400000) {
      return { ok: false, error: "cooldown" } as const;
    }

    const [introUsed, cvUsed] = await Promise.all([
      tx.usageLedger.count({ where: { companyId: opts.companyId, kind: "INTRO_REQUEST", periodStart: start } }),
      tx.usageLedger.count({ where: { companyId: opts.companyId, kind: "CV_CONTACT_REQUEST", periodStart: start } }),
    ]);
    const quota = quotaError({
      introLimit: company.plan.monthlyIntroRequests,
      introUsed,
      cvLimit: company.plan.monthlyCvRequests,
      cvUsed,
      wantsCv: opts.input.wantsCv,
    });
    if (quota) return { ok: false, error: quota } as const;

    const req = await tx.introRequest.create({
      data: {
        companyId: opts.companyId,
        senderId: opts.memberId,
        candidateId: opts.candidateId,
        roleTitle: opts.input.roleTitle,
        employment: opts.input.employment,
        workLocation: opts.input.workLocation,
        payRange: opts.input.payRange,
        message: opts.input.message,
        wantsCv: opts.input.wantsCv,
      },
    });
    await tx.usageLedger.create({ data: { companyId: opts.companyId, kind: "INTRO_REQUEST", periodStart: start, requestId: req.id } });
    if (opts.input.wantsCv) {
      await tx.usageLedger.create({ data: { companyId: opts.companyId, kind: "CV_CONTACT_REQUEST", periodStart: start, requestId: req.id } });
    }
    return { ok: true, id: req.id } as const;
  });
}

/** Contact details a company may see: only what the candidate chose to share on an accepted request. */
export async function sharedContact(companyId: string, candidateId: string) {
  const req = await prisma.introRequest.findFirst({
    where: { companyId, candidateId, status: "ACCEPTED" },
    orderBy: { respondedAt: "desc" },
    include: { candidate: { include: { user: { select: { email: true } } } } },
  });
  if (!req) return null;
  const c = req.candidate;
  return {
    email: req.shareEmail ? c.contactEmail || c.user.email : null,
    phone: req.sharePhone && c.phone ? c.phone : null,
    workHistory: req.shareCv ? c.workHistory : null,
    education: req.shareCv ? c.education : null,
  };
}
