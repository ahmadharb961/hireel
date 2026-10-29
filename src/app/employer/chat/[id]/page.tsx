import { notFound, redirect } from "next/navigation";
import { loginTo } from "@/lib/safe-next";
import { photoUrl } from "@/lib/photo";
import { listMessages, markRead, openChat } from "@/server/chat";
import { sharedContact } from "@/server/requests";
import { getViewer, requireEmployer } from "@/server/session";
import { EmployerChat } from "./EmployerChat";

export default async function EmployerChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getViewer())) redirect(loginTo(`/employer/chat/${id}`));
  const { viewer, company } = await requireEmployer();
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
