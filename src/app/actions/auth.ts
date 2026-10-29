"use server";
import { isCategory } from "@/server/categories";
import { cookies } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { candidateSignUpSchema, employerSignUpSchema, firstError } from "@/lib/validation";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locales";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { defaultPlan } from "@/server/plans";
import { newShareToken } from "@/server/rules/share";

export type SignUpState = { error?: string; field?: string; email?: string; done?: boolean };

/**
 * Creates the account, then the candidate profile or company, then sends the verification email
 * in the visitor's language. Role is decided here on the server, never by the browser.
 */
export async function signUpAction(_prev: SignUpState, form: FormData): Promise<SignUpState> {
  if (!(await rateLimit(`signup:${await clientIp()}`, 8, 600))) return { error: "rate_limited" };
  const role = form.get("role") === "employer" ? "EMPLOYER" : "CANDIDATE";
  const raw = Object.fromEntries(form.entries());
  const parsed = role === "EMPLOYER" ? employerSignUpSchema.safeParse(raw) : candidateSignUpSchema.safeParse(raw);
  if (!parsed.success) {
    const e = firstError(parsed.error);
    return { error: e.code, field: e.field };
  }
  const data = parsed.data;
  if ("companyName" in data && !(await isCategory(data.industry))) return { error: "required", field: "industry" };
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const name = "companyName" in data ? data.contactName : `${data.firstName} ${data.lastName}`;

  let userId: string;
  try {
    const res = await auth.api.signUpEmail({ body: { name, email: data.email, password: data.password } });
    userId = res.user.id;
  } catch (e) {
    if (e instanceof APIError && /exist/i.test(String(e.body?.code ?? e.message))) return { error: "email_taken", field: "email" };
    console.error("sign up failed", e);
    return { error: "generic" };
  }

  try {
    if ("companyName" in data) {
      const plan = await defaultPlan();
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { role: "EMPLOYER", locale } }),
        prisma.company.create({
          data: {
            name: data.companyName, website: data.website, industry: data.industry, size: data.size, country: data.country, planId: plan.id,
            members: { create: { userId, position: data.position, role: "OWNER" } },
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { role: "CANDIDATE", locale } }),
        prisma.candidateProfile.create({ data: { userId, fullName: name, contactEmail: data.email, shareLink: { create: { token: newShareToken() } } } }),
      ]);
    }
  } catch (e) {
    console.error("profile creation failed; removing account", e);
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    return { error: "generic" };
  }

  await auth.api.sendVerificationEmail({ body: { email: data.email, callbackURL: "/welcome" } }).catch((e) => console.error("verification email failed", e));
  return { done: true, email: data.email };
}

export async function resendVerification(email: string) {
  if (!(await rateLimit(`resend:${await clientIp()}`, 5, 600))) return { error: "rate_limited" };
  await auth.api.sendVerificationEmail({ body: { email: String(email).trim().toLowerCase(), callbackURL: "/welcome" } }).catch(() => {});
  return { ok: true };
}
