import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminOrNull, candidateOrNull, employerOrNull } from "@/server/session";

/**
 * A profile photo is visible to the same people as the profile: the candidate, admins,
 * signed-in employers (unless blocked), and visitors when the profile is public to everyone.
 */
async function allowed(c: { id: string; status: string; visibility: string; user: { suspendedAt: Date | null } }) {
  if (await adminOrNull()) return true;
  const me = await candidateOrNull();
  if (me?.profile.id === c.id) return true;
  if (c.status !== "PUBLISHED" || c.user.suspendedAt) return false;
  const emp = await employerOrNull();
  if (emp) return !(await prisma.block.findUnique({ where: { candidateId_companyId: { candidateId: c.id, companyId: emp.company.id } } }));
  return c.visibility === "EVERYONE";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const c = await prisma.candidateProfile.findUnique({ where: { id: candidateId }, select: { id: true, status: true, visibility: true, user: { select: { suspendedAt: true } }, photo: { select: { data: true } } } });
  if (!c?.photo || !(await allowed(c))) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(c.photo.data), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" },
  });
}
