import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { MAX_PHOTO_INPUT_BYTES, processPhoto } from "@/server/photo";
import { rateLimit } from "@/server/ratelimit";
import { candidateOrNull } from "@/server/session";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Candidate uploads or replaces their profile photo. */
export async function POST(req: NextRequest) {
  const me = await candidateOrNull();
  if (!me) return fail("UNAUTHORIZED", 401);
  if (!(await rateLimit(`photo:${me.viewer.id}`, 30, 3600))) return fail("rate_limited", 429);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_PHOTO_INPUT_BYTES + 64 * 1024) return fail("photo_too_big", 413);
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("photo_type");
  if (file.size > MAX_PHOTO_INPUT_BYTES) return fail("photo_too_big", 413);
  const data = await processPhoto(new Uint8Array(await file.arrayBuffer()));
  if (!data) return fail("photo_type");
  const now = new Date();
  await prisma.$transaction([
    prisma.profilePhoto.upsert({ where: { candidateId: me.profile.id }, create: { candidateId: me.profile.id, data }, update: { data } }),
    prisma.candidateProfile.update({ where: { id: me.profile.id }, data: { photoUpdatedAt: now } }),
  ]);
  return NextResponse.json({ ok: true, url: photoUrl({ id: me.profile.id, photoUpdatedAt: now }) });
}

/** Candidate removes their profile photo. */
export async function DELETE() {
  const me = await candidateOrNull();
  if (!me) return fail("UNAUTHORIZED", 401);
  await prisma.$transaction([
    prisma.profilePhoto.deleteMany({ where: { candidateId: me.profile.id } }),
    prisma.candidateProfile.update({ where: { id: me.profile.id }, data: { photoUpdatedAt: null } }),
  ]);
  return NextResponse.json({ ok: true });
}
