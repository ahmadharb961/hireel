import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { employerOrNull } from "@/server/session";
import { rateLimit, userAgent } from "@/server/ratelimit";
import { decideView, VIEW_WINDOW_MS } from "@/server/rules/views";

const body = z.object({ videoId: z.string().min(1).max(40), watchedMs: z.number().min(0).max(600000) });

/** The player reports a view after 3 seconds of watching. Only logged-in employers count. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ counted: false }, { status: 400 });
  const emp = await employerOrNull();
  if (!emp) return NextResponse.json({ counted: false, reason: "not_employer" });
  if (!(await rateLimit(`views:${emp.viewer.id}`, 300, 3600))) return NextResponse.json({ counted: false, reason: "rate" }, { status: 429 });

  const ua = await userAgent();
  const { videoId, watchedMs } = parsed.data;
  const counted = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Video" WHERE "id" = ${videoId} FOR UPDATE`;
    const video = await tx.video.findFirst({
      where: { id: videoId, archivedAt: null, moderation: "APPROVED", processing: "READY" },
      select: { id: true, candidate: { select: { userId: true } } },
    });
    if (!video) return false;
    const last = await tx.videoView.findFirst({
      where: { videoId, viewerId: emp.viewer.id, viewedAt: { gt: new Date(Date.now() - VIEW_WINDOW_MS) } },
      orderBy: { viewedAt: "desc" },
      select: { viewedAt: true },
    });
    const d = decideView({ viewerRole: emp.viewer.role, viewerId: emp.viewer.id, ownerUserId: video.candidate.userId, watchedMs, userAgent: ua, lastViewAt: last?.viewedAt ?? null, now: new Date() });
    if (!d.count) return false;
    await tx.videoView.create({ data: { videoId, viewerId: emp.viewer.id } });
    await tx.video.update({ where: { id: videoId }, data: { viewCount: { increment: 1 } } });
    return true;
  });
  return NextResponse.json({ counted });
}
