import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { canDownloadCv, type CvViewer } from "@/server/rules/cv";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { sharedContact } from "@/server/requests";
import { adminOrNull, candidateOrNull, employerOrNull } from "@/server/session";

async function viewerFor(candidateId: string): Promise<{ v: CvViewer; actorId?: string }> {
  const admin = await adminOrNull();
  if (admin) return { v: { kind: "admin" }, actorId: admin.id };
  const cand = await candidateOrNull();
  if (cand) return { v: { kind: "candidate", candidateId: cand.profile.id } };
  const emp = await employerOrNull();
  if (emp && emp.company.status !== "SUSPENDED") {
    // Same rule as the profile page: the latest accepted request decides what is shared.
    const shared = await sharedContact(emp.company.id, candidateId);
    return { v: { kind: "employer", sharedWithCompany: Boolean(shared?.cvFileName) } };
  }
  return { v: { kind: "none" } };
}

/** Download a CV. Allowed for the candidate, admins (logged), and companies the candidate shared it with. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  if (!(await rateLimit(`cvdl:${await clientIp()}`, 60, 3600))) return new NextResponse("Too many requests", { status: 429 });
  const { v, actorId } = await viewerFor(candidateId);
  if (!canDownloadCv(v, candidateId)) return new NextResponse("Not found", { status: 404 });
  const cv = await prisma.cvFile.findUnique({ where: { candidateId } });
  if (!cv) return new NextResponse("Not found", { status: 404 });
  if (actorId) await prisma.auditLog.create({ data: { actorId, action: "admin.download_cv", targetType: "CandidateProfile", targetId: candidateId } });
  return new NextResponse(Buffer.from(cv.data), {
    headers: {
      "Content-Type": cv.mimeType,
      "Content-Length": String(cv.size),
      "Content-Disposition": `attachment; filename="cv.${cv.fileName.split(".").pop()}"; filename*=UTF-8''${encodeURIComponent(cv.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
