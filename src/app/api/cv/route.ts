import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { CV_TYPES, detectCvKind, MAX_CV_BYTES, safeCvName } from "@/server/rules/cv";
import { rateLimit } from "@/server/ratelimit";
import { candidateOrNull } from "@/server/session";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Candidate uploads (or replaces) their CV: one PDF or Word file, up to 5 MB. */
export async function POST(req: NextRequest) {
  const me = await candidateOrNull();
  if (!me) return fail("UNAUTHORIZED", 401);
  if (!(await rateLimit(`cv:${me.viewer.id}`, 20, 3600))) return fail("rate_limited", 429);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_CV_BYTES + 64 * 1024) return fail("cv_too_big", 413);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("cv_missing");
  if (file.size > MAX_CV_BYTES) return fail("cv_too_big", 413);
  const data = new Uint8Array(await file.arrayBuffer());
  const kind = detectCvKind(data.subarray(0, 16), file.name);
  if (!kind) return fail("cv_type");
  const row = { fileName: safeCvName(file.name, kind), mimeType: CV_TYPES[kind].mime, size: data.byteLength, data, createdAt: new Date() };
  await prisma.cvFile.upsert({ where: { candidateId: me.profile.id }, create: { candidateId: me.profile.id, ...row }, update: row });
  return NextResponse.json({ ok: true, fileName: row.fileName, size: row.size });
}

/** Candidate removes their CV. Companies lose access immediately. */
export async function DELETE() {
  const me = await candidateOrNull();
  if (!me) return fail("UNAUTHORIZED", 401);
  await prisma.cvFile.deleteMany({ where: { candidateId: me.profile.id } });
  return NextResponse.json({ ok: true });
}
