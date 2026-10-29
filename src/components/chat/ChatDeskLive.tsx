"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useUnread } from "@/lib/unread-client";
import { MessageAlerts } from "./MessageAlerts";

/** Keeps the desktop chat list fresh when a message arrives in another chat, and shows the alert card. */
export function ChatDeskLive() {
  const router = useRouter();
  const { n, latest } = useUnread();
  const seen = useRef<string | null>(null);
  const key = `${n}:${latest?.id ?? ""}`;
  useEffect(() => {
    if (seen.current !== null && seen.current !== key) router.refresh();
    seen.current = key;
  }, [key, router]);
  return <MessageAlerts />;
}
