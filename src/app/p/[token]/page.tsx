import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { ProfileVideo } from "@/components/employer/ProfileVideo";
import { prisma } from "@/lib/db";
import { initialsOf, liveVideos } from "@/server/profile-data";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { isShareTokenShape } from "@/server/rules/share";
import { getViewer } from "@/server/session";

export const metadata = { robots: { index: false, follow: false, nocache: true } };

/** Public share page: only the video, headline and skills. Never phone, email, CV or salary. */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("sharePage");
  const ok = isShareTokenShape(token) && (await rateLimit(`share:${await clientIp()}`, 60, 600));
  const link = ok ? await prisma.shareLink.findUnique({
    where: { token },
    include: { candidate: { include: { skills: { include: { skill: true } }, user: { select: { suspendedAt: true } } } } },
  }) : null;
  const c = link?.enabled && link.candidate.status === "PUBLISHED" && !link.candidate.user.suspendedAt ? link.candidate : null;
  if (!c) {
    return (
      <div className="shell"><div className="scr"><Header />
        <main className="main"><div className="card" style={{ textAlign: "center", padding: "28px 18px" }}>
          <h1 className="h2">{t("goneTitle")}</h1><p className="p" style={{ marginTop: 8 }}>{t("goneBody")}</p>
          <Link className="btn w" style={{ marginTop: 16 }} href="/feed">{t("discover")}</Link>
        </div></main>
      </div></div>
    );
  }
  const viewer = await getViewer();
  const videos = c.profileType === "VIDEO" ? await liveVideos(c.id) : [];
  return (
    <div className="shell"><div className="scr"><Header />
      <main className="main"><div className={`stack${videos.length ? " split" : ""}`}>
        {videos.length ? <div className="split-media"><ProfileVideo videos={videos} initials={initialsOf(c.fullName)} countViews={viewer?.role === "EMPLOYER"} /></div> : null}
        <div className="stack">
        <div>
          <h1 className="h2">{c.fullName}</h1>
          <p className="p">{c.headline}</p>
          <div className="wrap" style={{ marginTop: 10 }}>{c.skills.map((s) => <span key={s.skillId} className="sk">{s.skill.name}</span>)}</div>
        </div>
        <Link className="btn w m" href={viewer?.role === "EMPLOYER" ? `/c/${c.id}` : `/signup?role=employer`}>{t("requestIntro")}</Link>
        {viewer?.role !== "EMPLOYER" ? <p className="note">{t("needsEmployer")} <Link href="/login">{t("login")}</Link></p> : null}
        <p className="note">{t("privacy")}</p>
        </div>
      </div></main>
    </div></div>
  );
}
