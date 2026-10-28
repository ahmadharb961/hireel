import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { sendIntroRequest, sharedContact } from "@/server/requests";
import { intro, makeCandidate, makeCompany, reset } from "./helpers";

describe("intro requests and plan limits", () => {
  beforeEach(reset);

  it("sends a request and records usage", async () => {
    const c = await makeCandidate();
    const e = await makeCompany();
    const r = await sendIntroRequest({ ...e, candidateId: c.profileId, input: { ...intro, wantsCv: true } });
    expect(r.ok).toBe(true);
    expect(await prisma.usageLedger.count({ where: { companyId: e.companyId } })).toBe(2);
  });

  it("allows one open request per candidate", async () => {
    const c = await makeCandidate();
    const e = await makeCompany();
    await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro });
    expect(await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro })).toEqual({ ok: false, error: "duplicate" });
  });

  it("waits 90 days after a decline", async () => {
    const c = await makeCandidate();
    const e = await makeCompany();
    const first = await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro });
    if (!first.ok) throw new Error("setup");
    await prisma.introRequest.update({ where: { id: first.id }, data: { status: "DECLINED", respondedAt: new Date() } });
    expect(await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro })).toEqual({ ok: false, error: "cooldown" });
    const later = new Date(Date.now() + 91 * 86400000);
    expect((await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro, now: later })).ok).toBe(true);
  });

  it("stops at the monthly intro limit set by the admin", async () => {
    await prisma.plan.update({ where: { key: "free" }, data: { monthlyIntroRequests: 2 } });
    const e = await makeCompany("free");
    const cands = await Promise.all([1, 2, 3].map(() => makeCandidate()));
    expect((await sendIntroRequest({ ...e, candidateId: cands[0].profileId, input: intro })).ok).toBe(true);
    expect((await sendIntroRequest({ ...e, candidateId: cands[1].profileId, input: intro })).ok).toBe(true);
    expect(await sendIntroRequest({ ...e, candidateId: cands[2].profileId, input: intro })).toEqual({ ok: false, error: "intro_limit" });
  });

  it("can't be beaten by sending many requests at the same moment", async () => {
    await prisma.plan.update({ where: { key: "free" }, data: { monthlyIntroRequests: 3 } });
    const e = await makeCompany("free");
    const cands = await Promise.all(Array.from({ length: 8 }, () => makeCandidate()));
    const results = await Promise.all(cands.map((c) => sendIntroRequest({ ...e, candidateId: c.profileId, input: intro })));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(await prisma.introRequest.count({ where: { companyId: e.companyId } })).toBe(3);
  });

  it("enforces the CV & contact limit separately", async () => {
    await prisma.plan.update({ where: { key: "free" }, data: { monthlyCvRequests: 1 } });
    const e = await makeCompany("free");
    const [a, b] = await Promise.all([makeCandidate(), makeCandidate()]);
    expect((await sendIntroRequest({ ...e, candidateId: a.profileId, input: { ...intro, wantsCv: true } })).ok).toBe(true);
    expect(await sendIntroRequest({ ...e, candidateId: b.profileId, input: { ...intro, wantsCv: true } })).toEqual({ ok: false, error: "cv_limit" });
    expect((await sendIntroRequest({ ...e, candidateId: b.profileId, input: intro })).ok).toBe(true);
  });

  it("refuses blocked and suspended companies", async () => {
    const c = await makeCandidate();
    const e = await makeCompany();
    await prisma.block.create({ data: { candidateId: c.profileId, companyId: e.companyId } });
    expect(await sendIntroRequest({ ...e, candidateId: c.profileId, input: intro })).toEqual({ ok: false, error: "blocked" });
    const s = await makeCompany();
    await prisma.company.update({ where: { id: s.companyId }, data: { status: "SUSPENDED" } });
    expect(await sendIntroRequest({ ...s, candidateId: c.profileId, input: intro })).toEqual({ ok: false, error: "suspended" });
  });

  it("keeps contact details private until accepted, then shares only what the candidate chose", async () => {
    const c = await makeCandidate();
    await prisma.candidateProfile.update({ where: { id: c.profileId }, data: { phone: "+961 70 000 001", workHistory: "Head of Digital", contactEmail: "me@x.test" } });
    const e = await makeCompany();
    const r = await sendIntroRequest({ ...e, candidateId: c.profileId, input: { ...intro, wantsCv: true } });
    if (!r.ok) throw new Error("setup");
    expect(await sharedContact(e.companyId, c.profileId)).toBeNull();
    await prisma.introRequest.update({ where: { id: r.id }, data: { status: "ACCEPTED", respondedAt: new Date(), shareEmail: true, sharePhone: false, shareCv: false } });
    expect(await sharedContact(e.companyId, c.profileId)).toEqual({ email: "me@x.test", phone: null, workHistory: null, education: null, cvFileName: null });
    const other = await makeCompany();
    expect(await sharedContact(other.companyId, c.profileId)).toBeNull();
  });
});
