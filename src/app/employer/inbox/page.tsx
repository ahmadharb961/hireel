import { getFormatter, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { EmployerNav } from "@/components/Nav";
import { ConversationRow } from "@/components/chat/ConversationRow";
import { listTime } from "@/lib/chat-time";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { hasUnread } from "@/server/chat";
import { savedCount } from "@/server/employer-data";
import { requireEmployer } from "@/server/session";

/**
 * Messages: conversations with candidates who accepted (newest first), requests still waiting
 * for an answer, and declined ones folded away. Contact details they shared are inside each chat.
 */
export default async function InboxPage() {
  const { member, company } = await requireEmployer();
  const [t, tc, fmt] = await Promise.all([getTranslations("inbox"), getTranslations("chat"), getFormatter()]);
  const reqs = await prisma.introRequest.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: { candidate: true, sender: { include: { user: { select: { name: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 200,
  });
  const n = await savedCount(member.id);
  const first = (name: string) => name.split(" ")[0] || name;
  const chats = reqs.filter((r) => r.status === "ACCEPTED")
    .sort((a, b) => (b.lastMessageAt ?? b.respondedAt ?? b.createdAt).getTime() - (a.lastMessageAt ?? a.respondedAt ?? a.createdAt).getTime());
  const waiting = reqs.filter((r) => r.status === "PENDING");
  const closed = reqs.filter((r) => r.status === "DECLINED" || r.status === "WITHDRAWN");
  const labels = { you: tc("you"), start: tc("startChat"), ended: tc("ended"), unread: tc("new") };

  return (
    <div className="scr">
      <Header home="/feed" />
      <main className="main"><div className="stack">
        <div><h1 className="h2">{t("title")}</h1><p className="p">{t("subtitle")}</p></div>
        {reqs.length === 0 ? <div className="mempty"><b>{t("emptyTitle")}</b>{t("empty")}</div> : null}

        {chats.length ? (
          <section className="msec" aria-labelledby="e-chats">
            <h2 className="msec-h" id="e-chats">{t("chatsTitle")}</h2>
            <div className="convs">
              {chats.map((r) => {
                // Only the person who sent the request chats with the candidate.
                const mine = r.senderId === member.id;
                return (
                  <ConversationRow
                    key={r.id}
                    labels={labels}
                    c={{
                      href: mine ? `/employer/chat/${r.id}` : `/c/${r.candidateId}`, name: r.candidate.fullName, avatar: photoUrl(r.candidate),
                      sub: r.roleTitle, time: listTime(r.lastMessageAt ?? r.respondedAt, fmt),
                      last: mine && r.messages[0] ? { body: r.messages[0].body, mine: r.messages[0].senderId === member.userId } : null,
                      unread: mine && hasUnread(r, "company"), ended: Boolean(r.chatClosedAt),
                      hint: mine ? undefined : tc("onlySender", { name: r.sender.user.name }),
                    }}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {waiting.length ? (
          <section className="msec" aria-labelledby="e-wait">
            <h2 className="msec-h" id="e-wait">{t("waitingTitle")} <span className="tag warn">{waiting.length}</span></h2>
            <div className="convs">
              {waiting.map((r) => (
                <ConversationRow
                  key={r.id}
                  labels={labels}
                  c={{
                    href: `/c/${r.candidateId}`, name: r.candidate.fullName, avatar: photoUrl(r.candidate), sub: r.roleTitle,
                    time: listTime(r.createdAt, fmt), last: null, unread: false, ended: false,
                    hint: r.wantsCv ? t("waitingHintCv", { name: first(r.candidate.fullName) }) : t("waitingHint", { name: first(r.candidate.fullName) }),
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        {closed.length ? (
          <details className="msec msec-more">
            <summary>{t("closedTitle", { n: closed.length })}</summary>
            <div className="convs" style={{ marginTop: 8 }}>
              {closed.map((r) => (
                <ConversationRow
                  key={r.id}
                  labels={labels}
                  c={{ href: `/c/${r.candidateId}`, name: r.candidate.fullName, avatar: photoUrl(r.candidate), sub: r.roleTitle, time: listTime(r.respondedAt ?? r.createdAt, fmt), last: null, unread: false, ended: false, hint: t(`status.${r.status}`) }}
                />
              ))}
            </div>
          </details>
        ) : null}
      </div></main>
      <EmployerNav savedCount={n} />
    </div>
  );
}
