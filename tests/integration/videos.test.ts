import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { approveVideo, cleanupVideos } from "@/server/videos";
import { makeCandidate, reset } from "./helpers";

describe("video replacement and cleanup", () => {
  beforeEach(reset);

  it("keeps the old video live until the replacement is approved, then archives it for 30 days", async () => {
    const c = await makeCandidate({ videos: [{ lang: "EN", primary: true }] });
    const old = await prisma.video.findFirstOrThrow({ where: { candidateId: c.profileId } });
    const rep = await prisma.video.create({ data: { candidateId: c.profileId, language: "EN", consentAt: new Date(), processing: "READY", replacesVideoId: old.id } });
    expect((await prisma.video.findUniqueOrThrow({ where: { id: old.id } })).archivedAt).toBeNull();

    await approveVideo(rep.id);
    const o = await prisma.video.findUniqueOrThrow({ where: { id: old.id } });
    const n = await prisma.video.findUniqueOrThrow({ where: { id: rep.id } });
    expect(o.archivedAt).not.toBeNull();
    expect(o.isPrimary).toBe(false);
    const days = (o.deleteAfter!.getTime() - o.archivedAt!.getTime()) / 86400000;
    expect(Math.round(days)).toBe(30);
    expect(n.isPrimary).toBe(true);
    expect(n.replacesVideoId).toBeNull();
  });

  it("deletes archived videos only after their 30 days", async () => {
    const c = await makeCandidate();
    const v = await prisma.video.findFirstOrThrow({ where: { candidateId: c.profileId } });
    await prisma.video.update({ where: { id: v.id }, data: { archivedAt: new Date(), deleteAfter: new Date(Date.now() + 86400000) } });
    expect((await cleanupVideos()).deleted).toBe(0);
    expect((await cleanupVideos(new Date(Date.now() + 2 * 86400000))).deleted).toBe(1);
    expect(await prisma.video.count({ where: { id: v.id } })).toBe(0);
  });
});
