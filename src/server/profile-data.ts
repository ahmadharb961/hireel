import "server-only";
import { prisma } from "@/lib/db";
import type { PV } from "@/components/employer/ProfileVideo";
import { publicViewCount } from "./rules/views";
import { signedPlayback } from "./videos";

export async function liveVideos(candidateId: string): Promise<PV[]> {
  const vids = await prisma.video.findMany({ where: { candidateId, archivedAt: null, processing: "READY", moderation: "APPROVED" }, orderBy: { createdAt: "asc" } });
  return Promise.all(vids.map(async (v) => {
    const play = await signedPlayback(v);
    return { id: v.id, lang: v.language, primary: v.isPrimary, hls: play?.hls ?? null, poster: play?.poster ?? null, landscape: Boolean(v.width && v.height && v.width > v.height), views: publicViewCount(v.viewCount) };
  }));
}

/** Count a profile view at most once per company per 24 hours. */
export async function recordProfileView(candidateId: string, companyId: string) {
  const recent = await prisma.profileView.findFirst({ where: { candidateId, companyId, viewedAt: { gt: new Date(Date.now() - 86400000) } }, select: { id: true } });
  if (!recent) await prisma.profileView.create({ data: { candidateId, companyId } });
}

export function initialsOf(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3);
}
