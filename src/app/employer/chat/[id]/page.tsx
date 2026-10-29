import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ChatDesk } from "@/components/chat/ChatDesk";
import { listTime } from "@/lib/chat-time";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { loginTo } from "@/lib/safe-next";
import { categoryNamer } from "@/server/categories";
import { hasUnread, listMessages, markRead, openChat } from "@/server/chat";
import { sharedContact } from "@/server/requests";
import { getViewer, requireEmployer } from "@/server/session";
import { EmployerChat } from "./EmployerChat";

export default async function EmployerChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getViewer())) redirect(loginTo(`/employer/chat/${id}`));
  const { viewer, company, member } = await requireEmployer();
  const chat = await openChat(viewer.id, id);
  if (!chat || chat.side !== "company") notFound();
  const { r } = chat;
  const [messages, shared, others, tn, tc, td, fmt, catName] = await Promise.all([
    listMessages(id, viewer.id),
    sharedContact(company.id, r.candidateId),
    prisma.introRequest.findMany({
      where: { senderId: member.id, status: "ACCEPTED" },
      include: { candidate: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { respondedAt: "desc" }],
      take: 100,
    }),
    getTranslations("nav"), getTranslations("chat"), getTranslations("chatDesk"), getFormatter(), categoryNamer(),
  ]);
  await markRead(id, "company");
  const c = r.candidate;
  const contacts = { email: shared?.email ?? null, phone: shared?.phone ?? null, cvUrl: shared?.cvFileName ? `/api/cv/${r.candidateId}` : null, salary: shared?.salary ? td("salaryValue", { amount: fmt.number(shared.salary.min), currency: shared.salary.currency }) : null };

  const details = (
    <div>
      <div className="cd-who">
        <div className="cd-av round">{photoUrl(c) ? <img src={photoUrl(c)!} alt="" /> : c.fullName.slice(0, 1)}</div>
        <h2>{c.fullName}</h2>
        <p>{c.headline}</p>
        <p>{[c.location, catName(c.industry), td("years", { n: c.yearsExperience })].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="cd-btns"><Link className="btn" href={`/c/${c.id}`}>{td("viewProfile")}</Link></div>
      <div className="cd-sec">
        <h3>{td("request")}</h3>
        <div className="kv"><span>{td("role")}</span><b>{r.roleTitle}</b></div>
        <div className="kv"><span>{td("accepted")}</span><b>{r.respondedAt ? fmt.dateTime(r.respondedAt, { dateStyle: "medium" }) : "—"}</b></div>
      </div>
      <div className="cd-sec">
        <h3>{tc("contactDetails")}</h3>
        {contacts.email ? <div className="kv"><span>{tc("email")}</span><b dir="ltr"><a href={`mailto:${contacts.email}`}>{contacts.email}</a></b></div> : null}
        {contacts.phone ? <div className="kv"><span>{tc("phone")}</span><b dir="ltr"><a href={`tel:${contacts.phone.replace(/[^+0-9]/g, "")}`}>{contacts.phone}</a></b></div> : null}
        {contacts.cvUrl ? <div className="kv"><span>{tc("cv")}</span><b><a href={contacts.cvUrl}>{tc("downloadCv")}</a></b></div> : null}
        {contacts.salary ? <div className="kv"><span>{tc("salary")}</span><b dir="ltr">{contacts.salary}</b></div> : null}
        {!contacts.email && !contacts.phone && !contacts.cvUrl && !contacts.salary ? <p className="note">{tc("sharedNothing")}</p> : null}
      </div>
    </div>
  );

  return (
    <ChatDesk
      who="employer"
      nav={[
        { href: "/employer/account", icon: "home", label: tn("dashboard") },
        { href: "/feed", icon: "discover", label: tn("discover") },
        { href: "/search", icon: "search", label: tn("search") },
        { href: "/employer/saved", icon: "saved", label: tn("saved") },
        { href: "/employer/inbox", icon: "chat", label: tn("inbox"), on: true },
      ]}
      list={others.map((o) => ({
        href: `/employer/chat/${o.id}`, name: o.candidate.fullName, avatar: photoUrl(o.candidate), sub: o.roleTitle,
        last: o.messages[0] ? { body: o.messages[0].body, mine: o.messages[0].senderId === viewer.id } : null,
        time: listTime(o.lastMessageAt ?? o.respondedAt, fmt), unread: o.id !== id && hasUnread(o, "company"), ended: Boolean(o.chatClosedAt), active: o.id === id,
      }))}
      details={details}
      labels={{ chats: td("chats"), you: tc("you"), start: tc("startChat"), ended: tc("ended"), unread: tc("new"), menu: td("menu") }}
    >
      <EmployerChat
        id={id}
        side="company"
        state={chat.state}
        closedByMe={r.chatClosedBy === "company"}
        initial={messages}
        otherReadAt={r.candidateReadAt?.toISOString() ?? null}
        back="/employer/inbox"
        candidateId={r.candidateId}
        other={{ name: c.fullName, sub: r.roleTitle, avatar: photoUrl(c), href: `/c/${r.candidateId}` }}
        contacts={contacts}
      />
    </ChatDesk>
  );
}
