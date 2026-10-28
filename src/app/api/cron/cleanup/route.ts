import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { cleanupVideos, refreshStuckVideos } from "@/server/videos";

/**
 * Daily housekeeping, called by a Hostinger cron job:
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://yourdomain/api/cron/cleanup
 */
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const refreshed = await refreshStuckVideos(100);
  const videos = await cleanupVideos();
  const old = new Date(Date.now() - 2 * 86400000);
  const limits = await prisma.appRateLimit.deleteMany({ where: { windowStart: { lt: old } } });
  const views = await prisma.videoView.deleteMany({ where: { viewedAt: { lt: new Date(Date.now() - 180 * 86400000) } } });
  return NextResponse.json({ refreshed, videos, rateLimitRowsRemoved: limits.count, oldViewRowsRemoved: views.count });
}
