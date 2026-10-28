import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type Viewer = {
  id: string;
  email: string;
  name: string;
  role: "CANDIDATE" | "EMPLOYER" | "ADMIN";
  twoFactorEnabled: boolean;
};

/** The signed-in user for this request, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Read role from the database, never from anything the browser sent.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true, suspendedAt: true, emailVerified: true },
  });
  if (!user || user.suspendedAt || !user.emailVerified) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, twoFactorEnabled: Boolean(user.twoFactorEnabled) };
});

export function homeFor(role: Viewer["role"]) {
  if (role === "ADMIN") return "/admin";
  if (role === "EMPLOYER") return "/feed";
  return "/candidate";
}

export async function requireViewer() {
  const v = await getViewer();
  if (!v) redirect("/login");
  return v;
}

export async function requireCandidate() {
  const v = await requireViewer();
  if (v.role !== "CANDIDATE") redirect(homeFor(v.role));
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: v.id } });
  if (!profile) redirect("/login");
  return { viewer: v, profile };
}

export async function requireEmployer() {
  const v = await requireViewer();
  if (v.role !== "EMPLOYER") redirect(homeFor(v.role));
  const member = await prisma.companyMember.findUnique({ where: { userId: v.id }, include: { company: { include: { plan: true } } } });
  if (!member) redirect("/login");
  return { viewer: v, member, company: member.company };
}

/** Admins must have two-step sign-in turned on before they can use any admin page. */
export async function requireAdmin(opts: { allowWithout2fa?: boolean } = {}) {
  const v = await requireViewer();
  if (v.role !== "ADMIN") redirect(homeFor(v.role));
  if (!v.twoFactorEnabled && !opts.allowWithout2fa) redirect("/admin/setup-2fa");
  return v;
}

/** Same checks for API routes and server actions: returns null instead of redirecting. */
export async function employerOrNull() {
  const v = await getViewer();
  if (!v || v.role !== "EMPLOYER") return null;
  const member = await prisma.companyMember.findUnique({ where: { userId: v.id }, include: { company: { include: { plan: true } } } });
  if (!member) return null;
  return { viewer: v, member, company: member.company };
}

export async function candidateOrNull() {
  const v = await getViewer();
  if (!v || v.role !== "CANDIDATE") return null;
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: v.id } });
  if (!profile) return null;
  return { viewer: v, profile };
}

export async function adminOrNull() {
  const v = await getViewer();
  if (!v || v.role !== "ADMIN" || !v.twoFactorEnabled) return null;
  return v;
}
