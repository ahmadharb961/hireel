import { notFound } from "next/navigation";
import { photoUrl } from "@/lib/photo";
import { listMessages, markRead, openChat } from "@/server/chat";
import { sharedContact } from "@/server/requests";
import { requireEmployer } from "@/server/session";
import { EmployerChat } from "./EmployerChat";

export default async function EmployerChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { viewer, company } = await requireEmployer();
  const { id } = await params;
  const chat = await openChat(viewer.id, id);
  if (!chat || chat.side !== "company") notFound();
  const { r } = chat;
  const [messages, shared] = await Promise.all([listMessages(id, viewer.id), sharedContact(company.id, r.candidateId)]);
  await markRead(id, "company");
  return (
    <EmployerChat
      id={id}
      side="company"
      state={chat.state}
      closedByMe={r.chatClosedBy === "company"}
      initial={messages}
      otherReadAt={r.candidateReadAt?.toISOString() ?? null}
      back="/employer/inbox"
      candidateId={r.candidateId}
      other={{ name: r.candidate.fullName, sub: r.roleTitle, avatar: photoUrl(r.candidate), href: `/c/${r.candidateId}` }}
      contacts={{ email: shared?.email ?? null, phone: shared?.phone ?? null, cvUrl: shared?.cvFileName ? `/api/cv/${r.candidateId}` : null }}
    />
  );
}
