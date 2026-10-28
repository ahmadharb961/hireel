import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/** Company logos are public branding. Suspended companies' logos are hidden. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true, logo: { select: { data: true } } } });
  if (!c?.logo || c.status === "SUSPENDED") return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(c.logo.data), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
