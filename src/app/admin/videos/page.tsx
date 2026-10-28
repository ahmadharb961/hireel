import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/server/session";
import { signedPlayback } from "@/server/videos";
import { AdminFrame } from "../AdminFrame";
import { ModerationCard } from "./ModerationCard";

export default async function VideosQueue() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const queue = await prisma.video.findMany({
    where: { archivedAt: null, processing: "READY", moderation: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { candidate: { select: { fullName: true, headline: true } } },
    take: 30,
  });
  const items = await Promise.all(queue.map(async (v) => {
    const play = await signedPlayback(v);
    return {
      id: v.id, name: v.candidate.fullName, headline: v.candidate.headline, lang: v.language,
      duration: v.durationSec, landscape: Boolean(v.width && v.height && v.width > v.height),
      hls: play?.hls ?? null, poster: play?.poster ?? null, consent: Boolean(v.consentAt), isReplacement: Boolean(v.replacesVideoId),
    };
  }));
  return (
    <AdminFrame tab="videos">
      <div><h1 className="h2">{t("videosTitle")}</h1><p className="p">{t("videosSub")}</p></div>
      {items.length === 0 ? <div className="empty">{t("queueEmpty")}</div> : items.map((it) => <ModerationCard key={it.id} item={it} />)}
    </AdminFrame>
  );
}
