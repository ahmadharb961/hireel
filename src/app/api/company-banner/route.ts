import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bannerUrl } from "@/lib/logo";
import { MAX_PHOTO_INPUT_BYTES, processBanner } from "@/server/photo";
import { rateLimit } from "@/server/ratelimit";
import { employerOrNull } from "@/server/session";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** A company member uploads or replaces the company cover banner. */
export async function POST(req: NextRequest) {
  const emp = await employerOrNull();
  if (!emp) return fail("UNAUTHORIZED", 401);
  if (!(await rateLimit(`banner:${emp.viewer.id}`, 30, 3600))) return fail("rate_limited", 429);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_PHOTO_INPUT_BYTES + 64 * 1024) return fail("photo_too_big", 413);
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("photo_type");
  if (file.size > MAX_PHOTO_INPUT_BYTES) return fail("photo_too_big", 413);
  const data = await processBanner(new Uint8Array(await file.arrayBuffer()));
  if (!data) return fail("photo_type");
  const now = new Date();
  await prisma.$transaction([
    prisma.companyBanner.upsert({ where: { companyId: emp.company.id }, create: { companyId: emp.company.id, data }, update: { data } }),
    prisma.company.update({ where: { id: emp.company.id }, data: { bannerUpdatedAt: now } }),
  ]);
  return NextResponse.json({ ok: true, url: bannerUrl({ id: emp.company.id, bannerUpdatedAt: now }) });
}

export async function DELETE() {
  const emp = await employerOrNull();
  if (!emp) return fail("UNAUTHORIZED", 401);
  await prisma.$transaction([
    prisma.companyBanner.deleteMany({ where: { companyId: emp.company.id } }),
    prisma.company.update({ where: { id: emp.company.id }, data: { bannerUpdatedAt: null } }),
  ]);
  return NextResponse.json({ ok: true });
}
