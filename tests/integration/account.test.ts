import { beforeEach, describe, expect, it, vi } from "vitest";

const pings: { to: string[]; title: string; url: string }[] = [];
vi.mock("@/server/push", () => ({
  notifyUsers: async (to: string[], build: (t: (k: string) => string) => { title: string; url: string }) => {
    const m = build((k) => k);
    pings.push({ to, title: m.title, url: m.url });
  },
}));

import { prisma } from "@/lib/db";
import { deleteAccount, exportData } from "@/server/account";
import { interestedCompanies } from "@/server/candidate-data";
import { maybeRunJobs, sendProfileReminders } from "@/server/jobs";
import { sendIntroRequest } from "@/server/requests";
import { intro, makeCandidate, makeCompany, reset } from "./helpers";

const DAY = 86400000;

describe("delete my account and download my data", () => {
  beforeEach(reset);

  it("a candidate's account, profile, requests and chats are removed for good", async () => {
    const c = await makeCandidate();
    const e = await makeCompany();
    const r = await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro });
    if (!r.ok) throw new Error("setup");
    await prisma.introRequest.update({ where: { id: r.id }, data: { status: "ACCEPTED" } });
    await prisma.message.create({ data: { requestId: r.id, senderId: c.userId, body: "Hi" } });
    expect(await deleteAccount(c.userId)).toEqual({ ok: true });
    expect(await prisma.user.findUnique({ where: { id: c.userId } })).toBeNull();
    expect(await prisma.candidateProfile.findUnique({ where: { id: c.profileId } })).toBeNull();
    expect(await prisma.introRequest.count({ where: { id: r.id } })).toBe(0);
    expect(await prisma.message.count({ where: { requestId: r.id } })).toBe(0);
    // The company is untouched.
    expect(await prisma.company.count({ where: { id: e.companyId } })).toBe(1);
  });

  it("the last person in a company takes the company with them; otherwise it stays", async () => {
    const solo = await makeCompany();
    expect((await deleteAccount(solo.userId)).ok).toBe(true);
    expect(await prisma.company.count({ where: { id: solo.companyId } })).toBe(0);

    const team = await makeCompany();
    const mate = await prisma.user.create({ data: { id: "mate-x", email: "mate-x@co.test", name: "Mate", emailVerified: true, role: "EMPLOYER" } });
    await prisma.companyMember.create({ data: { userId: mate.id, companyId: team.companyId } });
    expect((await deleteAccount(team.userId)).ok).toBe(true);
    expect(await prisma.company.count({ where: { id: team.companyId } })).toBe(1);
  });

  it("admins can't delete themselves here", async () => {
    const a = await prisma.user.create({ data: { id: "adm-1", email: "adm@x.test", name: "A", emailVerified: true, role: "ADMIN" } });
    expect(await deleteAccount(a.id)).toEqual({ ok: false, error: "admin" });
  });

  it("the download has the profile, requests, chats and who viewed or saved them", async () => {
    const c = await makeCandidate({ name: "Rana Haddad" });
    const e = await makeCompany();
    const r = await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro });
    if (!r.ok) throw new Error("setup");
    await prisma.message.create({ data: { requestId: r.id, senderId: e.userId, body: "Hello Rana" } });
    await prisma.profileView.create({ data: { candidateId: c.profileId, companyId: e.companyId } });
    const d = (await exportData(c.userId)) as Record<string, unknown> & { profile: { fullName: string }; introRequests: unknown[]; messages: { text: string; fromYou: boolean }[]; companiesThatViewedYou: unknown[] };
    expect(d.profile.fullName).toBe("Rana Haddad");
    expect(d.introRequests).toHaveLength(1);
    expect(d.messages).toEqual([expect.objectContaining({ text: "Hello Rana", fromYou: false })]);
    expect(d.companiesThatViewedYou).toHaveLength(1);
    const emp = (await exportData(e.userId)) as { introRequestsSent: unknown[]; messages: { fromYou: boolean }[] };
    expect(emp.introRequestsSent).toHaveLength(1);
    expect(emp.messages[0].fromYou).toBe(true);
  });
});

describe("companies interested in a candidate", () => {
  beforeEach(reset);

  it("lists companies that viewed or saved, newest first, without blocked or suspended ones", async () => {
    const c = await makeCandidate();
    const [a, b, blocked, suspended] = await Promise.all([1, 2, 3, 4].map(() => makeCompany()));
    await prisma.profileView.create({ data: { candidateId: c.profileId, companyId: a.companyId, viewedAt: new Date(Date.now() - 2 * DAY) } });
    await prisma.profileView.create({ data: { candidateId: c.profileId, companyId: a.companyId, viewedAt: new Date(Date.now() - DAY) } });
    await prisma.savedCandidate.create({ data: { memberId: b.memberId, candidateId: c.profileId } });
    await prisma.profileView.create({ data: { candidateId: c.profileId, companyId: blocked.companyId } });
    await prisma.block.create({ data: { candidateId: c.profileId, companyId: blocked.companyId } });
    await prisma.savedCandidate.create({ data: { memberId: suspended.memberId, candidateId: c.profileId } });
    await prisma.company.update({ where: { id: suspended.companyId }, data: { status: "SUSPENDED" } });
    const rows = await interestedCompanies(c.profileId);
    expect(rows.map((r) => r.id)).toEqual([b.companyId, a.companyId]);
    expect(rows[0].savedAt).not.toBeNull();
    expect(rows[1]).toMatchObject({ views: 2, savedAt: null });
  });
});

describe("reminders for unfinished profiles", () => {
  beforeEach(async () => { await reset(); pings.length = 0; await prisma.platformSetting.deleteMany({ where: { key: "jobs.lastRun" } }); });
  const old = (id: string, days: number) => prisma.candidateProfile.update({ where: { id }, data: { createdAt: new Date(Date.now() - days * DAY) } });

  it("reminds people who stopped halfway, at most twice, three days apart", async () => {
    const draft = await makeCandidate({ published: false });
    const noVideo = await makeCandidate({ videos: [] });
    const done = await makeCandidate();
    const fresh = await makeCandidate({ published: false });
    await Promise.all([old(draft.profileId, 2), old(noVideo.profileId, 2), old(done.profileId, 2)]);

    const now = new Date();
    expect(await sendProfileReminders(now)).toBe(2);
    expect(pings.map((p) => [p.to[0], p.url]).sort()).toEqual([[draft.userId, "/candidate/onboarding"], [noVideo.userId, "/candidate/video"]].sort());
    expect(pings.some((p) => p.to[0] === done.userId || p.to[0] === fresh.userId)).toBe(false);

    // A day later only the newer sign-up gets its first one; the others wait three days for their second.
    expect(await sendProfileReminders(new Date(now.getTime() + DAY))).toBe(1);
    expect(pings.at(-1)?.to[0]).toBe(fresh.userId);
    expect(await sendProfileReminders(new Date(now.getTime() + 3.5 * DAY))).toBe(2);
    expect(await sendProfileReminders(new Date(now.getTime() + 8 * DAY))).toBe(1);
    // Never a third time.
    expect(await sendProfileReminders(new Date(now.getTime() + 20 * DAY))).toBe(0);
    expect(pings).toHaveLength(6);
  });

  it("the hourly jobs run once even when many pages ask at the same moment", async () => {
    const draft = await makeCandidate({ published: false });
    await old(draft.profileId, 2);
    const now = new Date();
    await Promise.all(Array.from({ length: 5 }, () => maybeRunJobs(now)));
    expect(pings).toHaveLength(1);
    await maybeRunJobs(new Date(now.getTime() + 10 * 60 * 1000)); // 10 minutes later: not due
    expect(pings).toHaveLength(1);
  });
});
