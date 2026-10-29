import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CandidateNav } from "@/components/Nav";
import { PushCard } from "@/components/PushCard";
import { ConversationRow } from "@/components/chat/ConversationRow";
import { listTime } from "@/lib/chat-time";
import { prisma } from "@/lib/db";
import { logoUrl } from "@/lib/logo";
import { completion, interestedCompanies, requireOnboardedCandidate, studioVideos } from "@/server/candidate-data";
import { categoryNamer } from "@/server/categories";
import { InterestList } from "@/components/InterestList";
import { hasUnread } from "@/server/chat";
import { PUBLIC_VIEW_THRESHOLD } from "@/server/rules/views";
import { CandidateHeader } from "./CandidateHeader";

/** The candidate's dashboard: what needs attention first (requests and messages), then their numbers. */
export default async function CandidateHome() {
  const { profile, viewer } = await requireOnboardedCandidate();
  const [t, tc, tr, ti, fmt, catName] = await Promise.all([getTranslations("candidate"), getTranslations("chat"), getTranslations("requests"), getTranslations("interest"), getFormatter(), categoryNamer()]);
  const [videos, skills, profileViews, saves, reqs, interest] = await Promise.all([
    studioVideos(profile.id),
    prisma.candidateSkill.count({ where: { candidateId: profile.id } }),
    prisma.profileView.count({ where: { candidateId: profile.id } }),
    prisma.savedCandidate.count({ where: { candidateId: profile.id } }),
    prisma.introRequest.findMany({
      where: { candidateId: profile.id, status: { in: ["PENDING", "ACCEPTED"] }, company: { status: { not: "SUSPENDED" }, blocks: { none: { candidateId: profile.id } } } },
      include: { company: true, sender: { include: { user: { select: { name: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    interestedCompanies(profile.id, 3),
  ]);
  const { pct, next } = completion(profile, skills, videos.some((v) => v.status === "live"));
  const firstName = profile.fullName.split(" ")[0];
  const videoViews = videos.filter((v) => v.status === "live").reduce((a, v) => a + v.views, 0);

  const pending = reqs.filter((r) => r.status === "PENDING");
  const chats = reqs.filter((r) => r.status === "ACCEPTED")
    .sort((a, b) => (b.lastMessageAt ?? b.respondedAt ?? b.createdAt).getTime() - (a.lastMessageAt ?? a.respondedAt ?? a.createdAt).getTime());
  const unread = chats.filter((r) => hasUnread(r, "candidate")).length;
  // At most four rows here: new requests first, then the latest chats. The rest is one tap away.
  const rows = [
    ...pending.map((r) => ({
      href: "/candidate/requests", name: r.company.name, avatar: logoUrl(r.company), verified: r.company.status === "VERIFIED",
      sub: r.roleTitle, last: null, time: listTime(r.createdAt, fmt), unread: true, ended: false, hint: tc("wantsToMeet"), key: r.id,
    })),
    ...chats.map((r) => ({
      href: `/candidate/chat/${r.id}`, name: r.company.name, avatar: logoUrl(r.company), verified: r.company.status === "VERIFIED",
      sub: `${r.roleTitle} · ${r.sender.user.name}`,
      last: r.messages[0] ? { body: r.messages[0].body, mine: r.messages[0].senderId === viewer.id } : null,
      time: listTime(r.lastMessageAt ?? r.respondedAt, fmt), unread: hasUnread(r, "candidate"), ended: Boolean(r.chatClosedAt), key: r.id,
    })),
  ].slice(0, 4);
  const labels = { you: tc("you"), start: tc("startChat"), ended: tc("ended"), unread: tc("new") };
  const summary = pending.length && unread ? t("attentionBoth", { r: pending.length, m: unread })
    : pending.length ? t("newRequests", { n: pending.length })
    : unread ? t("unreadMessages", { n: unread })
    : null;

  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} />
      <main className="main">
        <div className="stack">
          <div>
            <h1 className="h2">{t("welcome", { name: firstName })}</h1>
            <p className="p">{summary ?? t("welcomeSub")}</p>
          </div>

          {profile.status !== "PUBLISHED" ? (
            <div className="card" style={{ background: "var(--warnbg)", borderColor: "transparent" }}>
              <h2 className="h3" style={{ color: "var(--warn)" }}>{t("unpublishedTitle")}</h2>
              <p className="p">{t("unpublishedBody")}</p>
            </div>
          ) : profile.searchPaused ? (
            <div className="card" style={{ background: "var(--warnbg)", borderColor: "transparent" }}>
              <h2 className="h3" style={{ color: "var(--warn)" }}>{t("pausedTitle")}</h2>
              <p className="p">{t("pausedBody")}</p>
            </div>
          ) : null}

          <section className="msec" aria-labelledby="home-msgs">
            <h2 className="msec-h" id="home-msgs">
              {tr("title")}
              <Link className="lsec-link" href="/candidate/requests">{t("seeAll")} →</Link>
            </h2>
            {rows.length ? (
              <div className="convs">{rows.map(({ key, ...c }) => <ConversationRow key={key} c={c} labels={labels} />)}</div>
            ) : <div className="mempty"><b>{tr("emptyTitle")}</b>{tr("empty")}</div>}
          </section>

          {profile.status === "PUBLISHED" ? <PushCard variant="prompt" who="candidate" /> : null}

          {pct < 100 ? (
            <div className="card">
              <h2 className="h3">{t("complete", { pct })}</h2>
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
              <p className="p">{next ? t(`next.${next}`) : t("next.done")}</p>
            </div>
          ) : null}

          <div className="grid3">
            <Link className="stat link" href="/candidate/interest"><b>{profileViews}</b><span>{t("stats.profileViews")} →</span></Link>
            <Link className="stat link" href="/candidate/interest"><b>{saves}</b><span>{t("stats.saves")} →</span></Link>
            <Link className="stat link" href="/candidate/video"><b>{videoViews}</b><span>{t("stats.videoViews")} →</span></Link>
          </div>
          {interest.length ? (
            <section className="msec" aria-labelledby="home-int">
              <h2 className="msec-h" id="home-int">{ti("title")}<Link className="lsec-link" href="/candidate/interest">{t("seeAll")} →</Link></h2>
              <InterestList rows={interest} category={catName} when={(d) => listTime(d, fmt)}
                label={(c) => (c.savedAt ? (c.views ? ti("savedAndViewed", { n: c.views }) : ti("saved")) : ti("viewed", { n: c.views }))} />
            </section>
          ) : null}

          <p className="note">{t("viewRule")} {videoViews < PUBLIC_VIEW_THRESHOLD ? t("publicFrom", { n: PUBLIC_VIEW_THRESHOLD }) : ""}</p>
        </div>
      </main>
      <CandidateNav />
    </div>
  );
}
