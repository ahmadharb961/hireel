"use client";
import { ChatView, type ChatProps } from "@/components/chat/ChatView";
import { blockCompany, reportCompany } from "../../safe-actions";

export function CandidateChat(p: Omit<ChatProps, "onReport" | "onBlock">) {
  return <ChatView {...p} onReport={(reason, details) => reportCompany(p.id, reason, details, true)} onBlock={() => blockCompany(p.id)} />;
}
