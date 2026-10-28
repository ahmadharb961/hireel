import "server-only";
import { prisma } from "@/lib/db";
import { ARCHIVE_DAYS } from "@/lib/constants";
import type { Prisma, Video } from "@/generated/prisma/client";
import { deleteStreamVideo, getStreamVideo, parseVideo, playbackToken, playbackUrls } from "./stream";
import { streamConfigured } from "@/lib/env";

/** Videos that currently fill a candidate's slots (not archived, not a pending replacement). */
export function activeVideoWhere(candidateId: string): Prisma.VideoWhereInput {
  return { candidateId, archivedAt: null, replacesVideoId: null };
}

/** A video employers may watch: processed, approved, not archived. */
export const liveVideoWhere: Prisma.VideoWhereInput = { archivedAt: null, processing: "READY", moderation: "APPROVED" };

export function candidateStatus(v: Pick<Video, "processing" | "moderation">): "uploading" | "processing" | "review" | "live" | "rejected" | "failed" {
  if (v.processing === "FAILED") return "failed";
  if (v.processing === "UPLOADING") return "uploading";
  if (v.processing === "PROCESSING") return "processing";
  if (v.moderation === "REJECTED") return "rejected";
  if (v.moderation === "PENDING") return "review";
  return "live";
}

/** Apply a Cloudflare status update (from the webhook or a status check). */
export async function applyStreamInfo(video: Video, info: ReturnType<typeof parseVideo>) {
  if (video.processing === "READY" || video.processing === "FAILED") return video;
  const data: Prisma.VideoUpdateInput = {
    durationSec: info.durationSec ?? video.durationSec,
    width: info.width ?? video.width,
    height: info.height ?? video.height,
  };
  if (info.failed) data.processing = "FAILED";
  else if (info.ready) data.processing = "READY";
  else data.processing = "PROCESSING";
  return prisma.video.update({ where: { id: video.id }, data });
}

/** Fallback when no webhook is configured: ask Cloudflare directly. */
export async function refreshFromStream(video: Video) {
  if (!video.streamUid || video.processing === "READY" || video.processing === "FAILED") return video;
  const info = await getStreamVideo(video.streamUid);
  if (!info) return video;
  return applyStreamInfo(video, info);
}

export async function signedPlayback(video: Pick<Video, "streamUid">) {
  if (!video.streamUid || !streamConfigured()) return null;
  try {
    return await playbackUrls(video.streamUid, await playbackToken(video.streamUid));
  } catch (e) {
    console.error("playback token failed", e);
    return null;
  }
}

/**
 * Approving a replacement archives the video it replaces (kept privately for 30 days)
 * and passes the "primary" flag on.
 */
export async function approveVideo(videoId: string) {
  return prisma.$transaction(async (tx) => {
    const v = await tx.video.update({ where: { id: videoId }, data: { moderation: "APPROVED", rejectionReason: null } });
    if (v.replacesVideoId) {
      const old = await tx.video.findUnique({ where: { id: v.replacesVideoId } });
      if (old && !old.archivedAt) {
        await tx.video.update({ where: { id: old.id }, data: archiveData() });
        await tx.video.update({ where: { id: v.id }, data: { replacesVideoId: null, isPrimary: old.isPrimary } });
      } else {
        await tx.video.update({ where: { id: v.id }, data: { replacesVideoId: null } });
      }
    }
    await ensurePrimary(tx, v.candidateId);
    return v;
  });
}

export function archiveData() {
  const now = new Date();
  return { archivedAt: now, deleteAfter: new Date(now.getTime() + ARCHIVE_DAYS * 86400000), isPrimary: false };
}

/** Exactly one active video is primary; prefer an approved one. */
export async function ensurePrimary(tx: Prisma.TransactionClient, candidateId: string) {
  const active = await tx.video.findMany({ where: activeVideoWhere(candidateId), orderBy: { createdAt: "asc" } });
  if (!active.length) return;
  const primaries = active.filter((v) => v.isPrimary);
  if (primaries.length === 1) return;
  const pick = primaries[0] ?? active.find((v) => v.moderation === "APPROVED") ?? active[0];
  await tx.video.updateMany({ where: { candidateId, id: { not: pick.id } }, data: { isPrimary: false } });
  await tx.video.update({ where: { id: pick.id }, data: { isPrimary: true } });
}

/** Safety net if a "video ready" webhook is missed: ask Cloudflare about videos still processing. */
export async function refreshStuckVideos(limit = 20) {
  const stuck = await prisma.video.findMany({
    where: { archivedAt: null, processing: { in: ["UPLOADING", "PROCESSING"] }, streamUid: { not: null }, updatedAt: { lt: new Date(Date.now() - 60_000) } },
    take: limit,
  });
  for (const v of stuck) await refreshFromStream(v).catch(() => {});
  return stuck.length;
}

/** Daily cleanup: delete archived videos past their 30 days, and abandoned uploads older than a day. */
export async function cleanupVideos(now = new Date()) {
  const expired = await prisma.video.findMany({
    where: {
      OR: [
        { deleteAfter: { lte: now } },
        { processing: "UPLOADING", createdAt: { lte: new Date(now.getTime() - 86400000) } },
        { processing: "FAILED", createdAt: { lte: new Date(now.getTime() - 7 * 86400000) } },
      ],
    },
    select: { id: true, streamUid: true },
    take: 200,
  });
  let deleted = 0;
  for (const v of expired) {
    try {
      if (v.streamUid) await deleteStreamVideo(v.streamUid);
      await prisma.video.delete({ where: { id: v.id } });
      deleted++;
    } catch (e) {
      console.error("cleanup failed for", v.id, e);
    }
  }
  return { checked: expired.length, deleted };
}
