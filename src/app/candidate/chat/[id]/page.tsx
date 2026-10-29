import { notFound } from "next/navigation";
import { logoUrl } from "@/lib/logo";
import { listMessages, markRead, openChat } from "@/server/chat";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { CandidateChat } from "./CandidateChat";

export default async function CandidateChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { viewer } = await requireOnboardedCandidate();
  const { id } = await params;
  const chat = await openChat(viewer.id, id);
  if (!chat || chat.side !== "candidate") notFound();
  const { r } = chat;
  const messages = await listMessages(id, viewer.id);
  await markRead(id, "candidate");
  return (
    <CandidateChat
      id={id}
      side="candidate"
      state={chat.state}
      closedByMe={r.chatClosedBy === "candidate"}
      initial={messages}
      back="/candidate/requests"
      other={{ name: r.company.name, sub: `${r.sender.user.name} · ${r.roleTitle}`, avatar: logoUrl(r.company) }}
    />
  );
}
