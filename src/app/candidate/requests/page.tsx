import { getFormatter, getTranslations } from "next-intl/server";
import { CandidateNav } from "@/components/Nav";
import { ConversationRow } from "@/components/chat/ConversationRow";
import { listTime } from "@/lib/chat-time";
import { prisma } from "@/lib/db";
import { bannerUrl, logoUrl } from "@/lib/logo";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { categoryNamer } from "@/server/categories";
import { hasUnread } from "@/server/chat";
import { CandidateHeader } from "../CandidateHeader";
import { RequestCard, type RequestView } from "./RequestCard";

/**
 * Messages: everything from companies in one place.
 * New requests to answer first, then conversations (newest first), then older requests folded away.
 */
export default async function MessagesPage() {
  const { profile, viewer } = await requireOnboardedCandidate();
  const [t, tc, fmt, catName] = await Promise.all([getTranslations("requests"), getTranslations("chat"), getFormatter(), categoryNamer()]);
  const reqs = await prisma.introRequest.findMany({
    where: { candidateId: profile.id, company: { status: { not: "SUSPENDED" } } },
    orderBy: { createdAt: "desc" },
    include: { company: true, sender: { include: { user: { select: { name: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 200,
  });
  const blocked = new Set((await prisma.block.findMany({ where: { candidateId: profile.id }, select: { companyId: true } })).map((b) => b.companyId));

  const view = (r: (typeof reqs)[number]): RequestView => ({
    id: r.id, companyId: r.company.id, company: r.company.name, verified: r.company.status === "VERIFIED",
    rep: `${r.sender.user.name}${r.sender.position ? `, ${r.sender.position}` : ""}`,
    description: r.company.description, industry: catName(r.company.industry), size: r.company.size, phone: r.company.phone,
    website: r.company.website, logo: logoUrl(r.company), banner: bannerUrl(r.company),
    social: { linkedin: r.company.linkedinUrl, instagram: r.company.instagramUrl, facebook: r.company.facebookUrl },
    country: r.company.country, since: fmt.dateTime(r.company.createdAt, { month: "long", year: "numeric" }),
    roleTitle: r.roleTitle, employment: r.employment, workLocation: r.workLocation, payRange: r.payRange, message: r.message, wantsCv: r.wantsCv,
    status: blocked.has(r.companyId) ? "BLOCKED" : r.status, date: fmt.relativeTime(r.createdAt, new Date()),
    shared: { email: r.shareEmail, phone: r.sharePhone, cv: r.shareCv, salary: r.shareSalary }, isDemo: r.isDemo,
    salaryLabel: profile.salaryMin ? `${fmt.number(profile.salaryMin)} ${profile.salaryCurrency}` : null,
  });

  const pending = reqs.filter((r) => r.status === "PENDING" && !blocked.has(r.companyId));
  const chats = reqs
    .filter((r) => r.status === "ACCEPTED" && !blocked.has(r.companyId))
    .sort((a, b) => (b.lastMessageAt ?? b.respondedAt ?? b.createdAt).getTime() - (a.lastMessageAt ?? a.respondedAt ?? a.createdAt).getTime());
  const earlier = reqs.filter((r) => !pending.includes(r) && !chats.includes(r));
  const labels = { you: tc("you"), start: tc("startChat"), ended: tc("ended"), unread: tc("new") };

  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} />
      <main className="main">
        <div className="stack">
          <div><h1 className="h2">{t("title")}</h1><p className="p">{t("subtitle")}</p></div>

          {reqs.length === 0 ? <div className="mempty"><b>{t("emptyTitle")}</b>{t("empty")}</div> : null}

          {pending.length ? (
            <section className="msec" aria-labelledby="m-new">
              <h2 className="msec-h" id="m-new">{t("newTitle")} <span className="tag warn">{pending.length}</span></h2>
              <div className="stack cards2">{pending.map((r) => <RequestCard key={r.id} r={view(r)} />)}</div>
            </section>
          ) : null}

          {chats.length ? (
            <section className="msec" aria-labelledby="m-chats">
              <h2 className="msec-h" id="m-chats">{t("chatsTitle")}</h2>
              <div className="convs">
                {chats.map((r) => (
                  <ConversationRow
                    key={r.id}
                    labels={labels}
                    c={{
                      href: `/candidate/chat/${r.id}`, name: r.company.name, avatar: logoUrl(r.company), verified: r.company.status === "VERIFIED",
                      sub: `${r.roleTitle} · ${r.sender.user.name}`,
                      last: r.messages[0] ? { body: r.messages[0].body, mine: r.messages[0].senderId === viewer.id } : null,
                      time: listTime(r.lastMessageAt ?? r.respondedAt, fmt), unread: hasUnread(r, "candidate"), ended: Boolean(r.chatClosedAt),
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {earlier.length ? (
            <details className="msec msec-more">
              <summary>{t("earlierTitle", { n: earlier.length })}</summary>
              <div className="stack cards2" style={{ marginTop: 8 }}>{earlier.map((r) => <RequestCard key={r.id} r={view(r)} />)}</div>
            </details>
          ) : null}
        </div>
      </main>
      <CandidateNav />
    </div>
  );
}
