"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { REJECTION_REASONS } from "@/lib/constants";
import { adminOrNull } from "@/server/session";
import { approveVideo } from "@/server/videos";

type R = { ok: true } | { ok: false; error: string };

async function admin() {
  const a = await adminOrNull();
  if (!a) throw new Error("FORBIDDEN");
  return a;
}

async function audit(actorId: string, action: string, targetType: string, targetId: string, reason = "") {
  await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, reason: reason.slice(0, 500) } });
}

export async function moderateVideo(videoId: string, decision: "approve" | "reject", reasonKey?: string, note?: string): Promise<R> {
  const a = await admin();
  const v = await prisma.video.findFirst({ where: { id: videoId, archivedAt: null, processing: "READY" } });
  if (!v) return { ok: false, error: "not_found" };
  if (decision === "approve") {
    await approveVideo(v.id);
    await audit(a.id, "video.approve", "Video", v.id);
  } else {
    const key = (REJECTION_REASONS as readonly string[]).includes(reasonKey ?? "") ? reasonKey! : "custom";
    const text = (note ?? "").trim().slice(0, 400);
    if (key === "custom" && text.length < 5) return { ok: false, error: "reason_required" };
    // Stored as "key::note" so the candidate sees the reason in their own language plus the admin's note.
    const reason = `${key}::${text}`;
    await prisma.video.update({ where: { id: v.id }, data: { moderation: "REJECTED", rejectionReason: reason } });
    await audit(a.id, "video.reject", "Video", v.id, reason);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setCompanyStatus(companyId: string, status: "VERIFIED" | "UNVERIFIED" | "SUSPENDED"): Promise<R> {
  const a = await admin();
  await prisma.company.update({ where: { id: companyId }, data: { status } });
  await audit(a.id, `company.${status.toLowerCase()}`, "Company", companyId);
  revalidatePath("/admin/employers");
  return { ok: true };
}

export async function setCompanyPlan(companyId: string, planId: string): Promise<R> {
  const a = await admin();
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "not_found" };
  await prisma.company.update({ where: { id: companyId }, data: { planId } });
  await audit(a.id, "company.plan", "Company", companyId, plan.key);
  revalidatePath("/admin/employers");
  return { ok: true };
}

const planSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().trim().min(1).max(40),
  nameAr: z.string().trim().min(1).max(40),
  priceLabelEn: z.string().trim().min(1).max(40),
  priceLabelAr: z.string().trim().min(1).max(40),
  monthlyIntroRequests: z.coerce.number().int().min(0).max(100000),
  monthlyCvRequests: z.coerce.number().int().min(0).max(100000),
  maxSaved: z.coerce.number().int().min(0).max(100000),
});

export async function savePlans(input: unknown[]): Promise<R> {
  const a = await admin();
  const parsed = z.array(planSchema).safeParse(input);
  if (!parsed.success) return { ok: false, error: "plan_invalid" };
  for (const p of parsed.data) {
    const { id, ...data } = p;
    await prisma.plan.update({ where: { id }, data });
    await audit(a.id, "plan.update", "Plan", id, JSON.stringify(data));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resolveReport(reportId: string, suspendTarget: boolean): Promise<R> {
  const a = await admin();
  const r = await prisma.report.findUnique({ where: { id: reportId } });
  if (!r) return { ok: false, error: "not_found" };
  if (suspendTarget) {
    if (r.targetType === "COMPANY") await prisma.company.update({ where: { id: r.targetId }, data: { status: "SUSPENDED" } });
    else {
      const c = await prisma.candidateProfile.findUnique({ where: { id: r.targetId }, select: { userId: true } });
      if (c) {
        await prisma.user.update({ where: { id: c.userId }, data: { suspendedAt: new Date() } });
        await prisma.session.deleteMany({ where: { userId: c.userId } });
      }
    }
    await audit(a.id, "report.suspend", r.targetType, r.targetId, r.reason);
  }
  await prisma.report.update({ where: { id: reportId }, data: { status: "RESOLVED" } });
  await audit(a.id, "report.resolve", "Report", reportId);
  revalidatePath("/admin/reports");
  return { ok: true };
}
