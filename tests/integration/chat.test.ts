import { beforeEach, describe, expect, it, vi } from "vitest";

const pings: { to: string[]; email: boolean; title: string; url: string }[] = [];
vi.mock("@/server/push", () => ({
  notifyUsers: async (to: string[], build: (t: (k: string) => string) => { title: string; url: string }, opts: { email?: boolean } = {}) => {
    const m = build((k) => k);
    pings.push({ to, email: opts.email !== false, title: m.title, url: m.url });
  },
}));

import { prisma } from "@/lib/db";
import { sendIntroRequest } from "@/server/requests";
import { closeChat, hasUnread, listMessages, markLeft, markRead, openChat, sendMessage, unreadChatsForCandidate, unreadChatsForMember } from "@/server/chat";
import { intro, makeCandidate, makeCompany, reset } from "./helpers";

async function setup(accept = true) {
  const c = await makeCandidate();
  const e = await makeCompany();
  const r = await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro });
  if (!r.ok) throw new Error("setup");
  if (accept) await prisma.introRequest.update({ where: { id: r.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
  return { c, e, id: r.id };
}
const at = (s: number) => new Date(Date.UTC(2026, 9, 1, 10, 0, 0) + s * 1000);

describe("chat after an accepted request", () => {
  beforeEach(async () => { await reset(); pings.length = 0; });

  it("opens only once the candidate accepts", async () => {
    const { c, e, id } = await setup(false);
    expect(await openChat(c.userId, id)).toBeNull();
    expect(await sendMessage(e.userId, id, "Hi")).toEqual({ ok: false, error: "not_found" });
    await prisma.introRequest.update({ where: { id }, data: { status: "ACCEPTED" } });
    expect((await openChat(c.userId, id))?.side).toBe("candidate");
    expect((await openChat(e.userId, id))?.side).toBe("company");
  });

  it("is only between the candidate and the person who sent the request", async () => {
    const { e, id } = await setup();
    const stranger = await makeCandidate();
    const otherCo = await makeCompany();
    expect(await openChat(stranger.userId, id)).toBeNull();
    expect(await openChat(otherCo.userId, id)).toBeNull();
    // A teammate in the same company who didn't send it can't read or write.
    const mate = await prisma.user.create({ data: { id: "mate-1", email: "mate@co.test", name: "Mate", emailVerified: true, role: "EMPLOYER" } });
    await prisma.companyMember.create({ data: { userId: mate.id, companyId: e.companyId } });
    expect(await openChat(mate.id, id)).toBeNull();
  });

  it("either side can write first, and messages come back in order", async () => {
    const { c, e, id } = await setup();
    expect((await sendMessage(c.userId, id, "Hello, thanks for reaching out!", at(1))).ok).toBe(true);
    expect((await sendMessage(e.userId, id, "  Can we talk tomorrow?\r\n10am?  ", at(2))).ok).toBe(true);
    const forCand = await listMessages(id, c.userId);
    expect(forCand.map((m) => [m.body, m.mine])).toEqual([["Hello, thanks for reaching out!", true], ["Can we talk tomorrow?\n10am?", false]]);
    expect((await listMessages(id, e.userId, at(2))).map((m) => m.body)).toEqual(["Can we talk tomorrow?\n10am?"]);
  });

  it("rejects empty and over-long messages", async () => {
    const { c, id } = await setup();
    expect(await sendMessage(c.userId, id, "   ")).toEqual({ ok: false, error: "message_empty" });
    expect(await sendMessage(c.userId, id, "x".repeat(2001))).toEqual({ ok: false, error: "too_long" });
  });

  it("counts unread chats until they are opened", async () => {
    const { c, e, id } = await setup();
    await sendMessage(e.userId, id, "Hi", at(1));
    expect(await unreadChatsForCandidate(c.profileId)).toBe(1);
    expect(await unreadChatsForMember(e.memberId)).toBe(0);
    await markRead(id, "candidate", at(5));
    expect(await unreadChatsForCandidate(c.profileId)).toBe(0);
    const r = await prisma.introRequest.findUniqueOrThrow({ where: { id } });
    expect(hasUnread(r, "candidate")).toBe(false);
  });

  it("phones every message but emails once per unread batch, and stays quiet while the person is in the chat", async () => {
    const { c, e, id } = await setup();
    await sendMessage(e.userId, id, "One", at(0));
    await sendMessage(e.userId, id, "Two", at(1));
    expect(pings.map((p) => p.email)).toEqual([true, false]);
    expect(pings[0]).toMatchObject({ to: [c.userId], title: "push.messageTitle", url: `/candidate/chat/${id}` });
    // The candidate reads, then leaves. The next message emails again.
    await markRead(id, "candidate", at(10));
    await sendMessage(e.userId, id, "Three", at(60));
    expect(pings.at(-1)?.email).toBe(true);
    // Reading right now: no ping at all.
    await markRead(id, "candidate", at(100), true);
    await sendMessage(e.userId, id, "Four", at(105));
    expect(pings).toHaveLength(3);
    // They leave the chat: the very next message notifies them, even seconds later.
    // A check-in that was on its way when they left arrives just after: it doesn't count.
    await markLeft(id, "candidate", at(106));
    await markRead(id, "candidate", at(106.5), true);
    await sendMessage(e.userId, id, "Five", at(107));
    expect(pings).toHaveLength(4);
    // Leaving doesn't make messages they already read count as unread.
    expect(await unreadChatsForCandidate(c.profileId)).toBe(1);
    await markRead(id, "candidate", at(108));
    expect(await unreadChatsForCandidate(c.profileId)).toBe(0);
  });

  it("nobody can write after the chat is ended or the company is blocked", async () => {
    const a = await setup();
    expect(await closeChat(a.c.userId, a.id)).toBe(true);
    expect((await openChat(a.e.userId, a.id))?.state).toBe("closed");
    expect(await sendMessage(a.e.userId, a.id, "Hello?")).toEqual({ ok: false, error: "chat_closed" });

    const b = await setup();
    await prisma.block.create({ data: { candidateId: b.c.profileId, companyId: b.e.companyId } });
    expect((await openChat(b.c.userId, b.id))?.state).toBe("blocked");
    expect(await sendMessage(b.e.userId, b.id, "Hello?")).toEqual({ ok: false, error: "chat_closed" });
  });

  it("hides the chat from the candidate when the company is suspended", async () => {
    const { c, e, id } = await setup();
    await prisma.company.update({ where: { id: e.companyId }, data: { status: "SUSPENDED" } });
    expect(await openChat(c.userId, id)).toBeNull();
    expect((await openChat(e.userId, id))?.state).toBe("unavailable");
  });
});
