import { notFound } from "next/navigation";
import { photoUrl } from "@/lib/photo";
import { listMessages, markRead, openChat } from "@/server/chat";
import { requireEmployer } from "@/server/session";
import { EmployerChat } from "./EmployerChat";

export default async function EmployerChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { viewer } = await requireEmployer();
  const { id } = await params;
  const chat = await openChat(viewer.id, id);
  if (!chat || chat.side !== "company") notFound();
  const { r } = chat;
  const messages = await listMessages(id, viewer.id);
  await markRead(id, "company");
  return (
    <EmployerChat
      id={id}
      side="company"
      state={chat.state}
      closedByMe={r.chatClosedBy === "company"}
      initial={messages}
      back="/employer/inbox"
      candidateId={r.candidateId}
      other={{ name: r.candidate.fullName, sub: r.roleTitle, avatar: photoUrl(r.candidate), href: `/c/${r.candidateId}` }}
    />
  );
}
