"use server";
import { notifyUsers } from "@/server/push";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { companyProfileSchema, introRequestSchema, firstError } from "@/lib/validation";
import { employerOrNull } from "@/server/session";
import { rateLimit } from "@/server/ratelimit";
import { sendIntroRequest } from "@/server/requests";

type R = { ok: true; saved?: boolean } | { ok: false; error: string; field?: string };

export async function toggleSave(candidateId: string): Promise<R> {
  const emp = await employerOrNull();
  if (!emp) return { ok: false, error: "signup_required" };
  if (!(await rateLimit(`save:${emp.viewer.id}`, 120, 3600))) return { ok: false, error: "rate_limited" };
  const key = { memberId_candidateId: { memberId: emp.member.id, candidateId } };
  const existing = await prisma.savedCandidate.findUnique({ where: key });
  if (existing) {
    await prisma.savedCandidate.delete({ where: key });
    revalidatePath("/employer/saved");
    return { ok: true, saved: false };
  }
  const count = await prisma.savedCandidate.count({ where: { memberId: emp.member.id } });
  if (count >= emp.company.plan.maxSaved) return { ok: false, error: "saved_limit" };
  const exists = await prisma.candidateProfile.findFirst({ where: { id: candidateId, status: "PUBLISHED" }, select: { id: true } });
  if (!exists) return { ok: false, error: "not_found" };
  await prisma.savedCandidate.create({ data: { memberId: emp.member.id, candidateId } });
  revalidatePath("/employer/saved");
  return { ok: true, saved: true };
}

export async function requestIntro(input: unknown): Promise<R> {
  const emp = await employerOrNull();
  if (!emp) return { ok: false, error: "signup_required" };
  if (!(await rateLimit(`intro:${emp.viewer.id}`, 20, 3600))) return { ok: false, error: "rate_limited" };
  const p = introRequestSchema.safeParse(input);
  if (!p.success) { const e = firstError(p.error); return { ok: false, error: e.code, field: e.field }; }
  const { candidateId, ...rest } = p.data;
  const res = await sendIntroRequest({ companyId: emp.company.id, memberId: emp.member.id, candidateId, input: rest });
  if (!res.ok) return { ok: false, error: res.error };
  const cand = await prisma.candidateProfile.findUnique({ where: { id: candidateId }, select: { userId: true } });
  if (cand) {
    const company = emp.company.name;
    void notifyUsers([cand.userId], (t) => ({
      title: t("push.newRequestTitle"),
      body: t("push.newRequestBody", { company, role: rest.roleTitle }),
      url: "/candidate/requests",
      tag: `req-${res.id}`,
      cta: t("push.ctaRequest"),
      lines: [
        `${t("push.lineRole")}: ${rest.roleTitle} · ${t.has(`employment.${rest.employment}` as "employment.FULL_TIME") ? t(`employment.${rest.employment}` as "employment.FULL_TIME") : rest.employment}${rest.workLocation ? ` · ${rest.workLocation}` : ""}`,
        rest.payRange ? `${t("push.linePay")}: ${rest.payRange}` : "",
        `${t("push.lineMessage")}: “${rest.message}”`,
        rest.wantsCv ? t("push.lineWantsCv") : "",
        t("push.linePrivate"),
      ],
    }));
  }
  revalidatePath("/employer/inbox");
  revalidatePath("/employer/account");
  return { ok: true };
}

export async function reportCandidate(candidateId: string, reason: string, details: string): Promise<R> {
  const emp = await employerOrNull();
  if (!emp) return { ok: false, error: "signup_required" };
  if (!(await rateLimit(`report:${emp.viewer.id}`, 10, 3600))) return { ok: false, error: "rate_limited" };
  await prisma.report.create({ data: { reporterId: emp.viewer.id, targetType: "CANDIDATE", targetId: candidateId, reason: reason.slice(0, 60), details: details.slice(0, 1000) } });
  return { ok: true };
}

/** A company member updates the company's public details (not the name, which the Hireel team changes). */
export async function updateCompanyProfile(input: unknown): Promise<R> {
  const emp = await employerOrNull();
  if (!emp) return { ok: false, error: "signup_required" };
  if (!(await rateLimit(`company-edit:${emp.viewer.id}`, 30, 3600))) return { ok: false, error: "rate_limited" };
  const p = companyProfileSchema.safeParse(input);
  if (!p.success) { const e = firstError(p.error); return { ok: false, error: e.code, field: e.field }; }
  await prisma.company.update({ where: { id: emp.company.id }, data: p.data });
  revalidatePath("/employer", "layout");
  return { ok: true };
}
