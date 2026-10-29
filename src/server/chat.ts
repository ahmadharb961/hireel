import "server-only";
import { prisma } from "@/lib/db";
import { notifyUsers } from "./push";
import { rateLimit } from "./ratelimit";

/**
 * Chat after an accepted intro request: text only, between the candidate and the
 * company member who sent the request. Either side may write first.
 */
export const MESSAGE_MAX = 2000;
/** Someone who read the chat this recently is looking at it: no phone or email ping. */
const ACTIVE_MS = 20_000;

export type ChatSide = "candidate" | "company";
/** open: both can write. closed: someone ended it. blocked: the candidate blocked the company. unavailable: an account is suspended. */
export type ChatState = "open" | "closed" | "blocked" | "unavailable";

export type ChatMessage = { id: string; mine: boolean; body: string; at: string };

async function load(requestId: string) {
  return prisma.introRequest.findUnique({
    where: { id: requestId },
    include: {
      company: true,
      sender: { include: { user: { select: { id: true, name: true, suspendedAt: true } } } },
      candidate: { include: { user: { select: { id: true, suspendedAt: true } } } },
    },
  });
}
type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

/** Who this person is in the chat, or null if they may not see it. */
export async function openChat(userId: string, requestId: string) {
  const r = await load(requestId);
  if (!r || r.status !== "ACCEPTED") return null;
  const side: ChatSide | null = r.candidate.userId === userId ? "candidate" : r.sender.userId === userId ? "company" : null;
  if (!side) return null;
  // Candidates never see suspended companies anywhere in Hireel.
  if (side === "candidate" && r.company.status === "SUSPENDED") return null;
  return { r, side, state: await stateOf(r) };
}

async function stateOf(r: Loaded): Promise<ChatState> {
  const blocked = await prisma.block.findUnique({ where: { candidateId_companyId: { candidateId: r.candidateId, companyId: r.companyId } } });
  if (blocked) return "blocked";
  if (r.company.status === "SUSPENDED" || r.sender.user.suspendedAt || r.candidate.user.suspendedAt) return "unavailable";
  if (r.chatClosedAt) return "closed";
  return "open";
}

/** Messages in order, oldest first. `after` returns only newer ones (for the few-second refresh). */
export async function listMessages(requestId: string, viewerId: string, after?: Date): Promise<ChatMessage[]> {
  const rows = after
    ? await prisma.message.findMany({ where: { requestId, createdAt: { gte: after } }, orderBy: { createdAt: "asc" }, take: 200 })
    : (await prisma.message.findMany({ where: { requestId }, orderBy: { createdAt: "desc" }, take: 300 })).reverse();
  return rows.map((m) => ({ id: m.id, mine: m.senderId === viewerId, body: m.body, at: m.createdAt.toISOString() }));
}

export async function markRead(requestId: string, side: ChatSide, now = new Date()) {
  await prisma.introRequest.update({ where: { id: requestId }, data: side === "candidate" ? { candidateReadAt: now } : { employerReadAt: now } });
}

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: "not_found" | "chat_closed" | "message_empty" | "too_long" | "rate_limited" };

export async function sendMessage(userId: string, requestId: string, text: string, now = new Date()): Promise<SendResult> {
  const chat = await openChat(userId, requestId);
  if (!chat) return { ok: false, error: "not_found" };
  if (chat.state !== "open") return { ok: false, error: "chat_closed" };
  const body = text.replace(/\r\n/g, "\n").trim();
  if (!body) return { ok: false, error: "message_empty" };
  if (body.length > MESSAGE_MAX) return { ok: false, error: "too_long" };
  if (!(await rateLimit(`chat:${userId}`, 30, 60))) return { ok: false, error: "rate_limited" };

  const { r, side } = chat;
  const mine = side === "candidate" ? { candidateReadAt: now } : { employerReadAt: now };
  const [m] = await prisma.$transaction([
    prisma.message.create({ data: { requestId, senderId: userId, body, createdAt: now } }),
    prisma.introRequest.update({ where: { id: requestId }, data: { lastMessageAt: now, ...mine } }),
  ]);

  // Tell the other person, unless they are looking at the chat right now.
  // Phone: every message (each replaces the last one for this chat). Email: once per unread batch.
  const toCandidate = side === "company";
  const readAt = toCandidate ? r.candidateReadAt : r.employerReadAt;
  const emailedAt = toCandidate ? r.candidateEmailedAt : r.employerEmailedAt;
  const active = readAt && now.getTime() - readAt.getTime() < ACTIVE_MS;
  if (!active) {
    const email = !emailedAt || Boolean(readAt && readAt > emailedAt);
    if (email) await prisma.introRequest.update({ where: { id: requestId }, data: toCandidate ? { candidateEmailedAt: now } : { employerEmailedAt: now } });
    const from = toCandidate ? `${r.sender.user.name} · ${r.company.name}` : r.candidate.fullName;
    const snippet = body.length > 140 ? `${body.slice(0, 140)}…` : body;
    void notifyUsers([toCandidate ? r.candidate.userId : r.sender.userId], (t) => ({
      title: t("push.messageTitle", { name: from }),
      body: snippet,
      url: toCandidate ? `/candidate/chat/${requestId}` : `/employer/chat/${requestId}`,
      tag: `chat-${requestId}`,
      cta: t("push.ctaReply"),
      lines: [`${t("push.lineRole")}: ${r.roleTitle}`, t("push.lineMoreMessages")],
    }), { email });
  }
  return { ok: true, message: { id: m.id, mine: true, body: m.body, at: m.createdAt.toISOString() } };
}

/** Either side can end the chat. Nobody can write after that; the messages stay readable. */
export async function closeChat(userId: string, requestId: string) {
  const chat = await openChat(userId, requestId);
  if (!chat) return false;
  if (!chat.r.chatClosedAt) await prisma.introRequest.update({ where: { id: requestId }, data: { chatClosedAt: new Date(), chatClosedBy: chat.side } });
  return true;
}

/** True when the chat has messages this side hasn't read. */
export function hasUnread(r: { lastMessageAt: Date | null; candidateReadAt: Date | null; employerReadAt: Date | null }, side: ChatSide) {
  const read = side === "candidate" ? r.candidateReadAt : r.employerReadAt;
  return Boolean(r.lastMessageAt && (!read || r.lastMessageAt > read));
}

/** Number of chats with unread messages, for the candidate's bell. */
export async function unreadChatsForCandidate(candidateId: string) {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "IntroRequest" r JOIN "Company" c ON c."id" = r."companyId"
    WHERE r."candidateId" = ${candidateId} AND r."status" = 'ACCEPTED' AND c."status" <> 'SUSPENDED'
      AND r."lastMessageAt" IS NOT NULL AND (r."candidateReadAt" IS NULL OR r."lastMessageAt" > r."candidateReadAt")`;
  return Number(rows[0]?.n ?? 0);
}

/** Number of chats with unread messages for this company member. */
export async function unreadChatsForMember(memberId: string) {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "IntroRequest" r
    WHERE r."senderId" = ${memberId} AND r."status" = 'ACCEPTED'
      AND r."lastMessageAt" IS NOT NULL AND (r."employerReadAt" IS NULL OR r."lastMessageAt" > r."employerReadAt")`;
  return Number(rows[0]?.n ?? 0);
}
