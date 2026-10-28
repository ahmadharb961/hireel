import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { candidateOrNull } from "@/server/session";
import { candidateStatus, refreshFromStream } from "@/server/videos";

/** The candidate's studio polls this while a video is uploading or processing. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await candidateOrNull();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  let video = await prisma.video.findFirst({ where: { id, candidateId: me.profile.id } });
  if (!video) return new NextResponse("Not found", { status: 404 });
  video = await refreshFromStream(video);
  return NextResponse.json({ status: candidateStatus(video), reason: video.rejectionReason });
}
