"use client";
import { ChatView, type ChatProps } from "@/components/chat/ChatView";
import { reportCandidate } from "../../safe-actions";

export function EmployerChat({ candidateId, ...p }: Omit<ChatProps, "onReport" | "onBlock"> & { candidateId: string }) {
  return <ChatView {...p} onReport={(reason, details) => reportCandidate(candidateId, reason, details, p.id)} />;
}
