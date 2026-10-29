import { NextResponse, type NextRequest } from "next/server";
import { closeChat, listMessages, markRead, openChat, sendMessage } from "@/server/chat";
import { getViewer } from "@/server/session";

const none = () => NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

/** New messages since `after` (the chat page asks every few seconds). `seen=1` marks them read. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return none();
  const chat = await openChat(viewer.id, id);
  if (!chat) return none();
  const a = req.nextUrl.searchParams.get("after");
  const after = a && !Number.isNaN(Date.parse(a)) ? new Date(a) : undefined;
  const messages = await listMessages(id, viewer.id, after);
  if (req.nextUrl.searchParams.get("seen") === "1") await markRead(id, chat.side);
  return NextResponse.json({ ok: true, state: chat.state, messages }, { headers: { "Cache-Control": "no-store" } });
}

/** Send a message ({ body }) or end the chat ({ close: true }). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return none();
  // JSON only: a form on another site can't send this content type without the browser asking first.
  if (!req.headers.get("content-type")?.includes("application/json")) return none();
  const input = (await req.json().catch(() => ({}))) as { body?: unknown; close?: unknown };
  if (input.close === true) return (await closeChat(viewer.id, id)) ? NextResponse.json({ ok: true }) : none();
  const res = await sendMessage(viewer.id, id, typeof input.body === "string" ? input.body : "");
  return NextResponse.json(res, { status: res.ok ? 200 : res.error === "not_found" ? 404 : 400 });
}
