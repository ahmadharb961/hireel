import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { feedPage } from "@/server/feed";
import { applyHiddenNamesToCompany, hideFromCompany, hideFromName, simplifyName, unhideCompany, unhideName } from "@/server/hiding";
import { sendIntroRequest } from "@/server/requests";
import { intro, makeCandidate, makeCompany, reset } from "./helpers";

const viewerOf = (e: { companyId: string; memberId: string }) => ({ kind: "employer" as const, companyId: e.companyId, memberId: e.memberId });
const inFeed = async (e: { companyId: string; memberId: string }, candId: string, extra = {}) =>
  (await feedPage({ seed: "s", viewer: viewerOf(e), limit: 10, ...extra })).cards.some((c) => c.id === candId);

describe("hide my profile from companies", () => {
  beforeEach(reset);

  it("a hidden company can't see the candidate or send a request; others still can", async () => {
    const c = await makeCandidate();
    const boss = await makeCompany();
    const other = await makeCompany();
    const pending = await sendIntroRequest({ ...boss, candidateId: c.profileId, input: intro });
    expect((await hideFromCompany(c.profileId, boss.companyId)).ok).toBe(true);
    expect(await inFeed(boss, c.profileId)).toBe(false);
    expect(await inFeed(other, c.profileId)).toBe(true);
    // Their pending request is closed, and they can't send another.
    if (pending.ok) expect((await prisma.introRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("DECLINED");
    expect(await sendIntroRequest({ ...boss, candidateId: c.profileId, input: intro, now: new Date(Date.now() + 200 * 86400000) })).toEqual({ ok: false, error: "blocked" });
    await unhideCompany(c.profileId, boss.companyId);
    expect(await inFeed(boss, c.profileId)).toBe(true);
  });

  it("a hidden name also hides companies that join later", async () => {
    expect(simplifyName("IMPEX s.a.l.")).toBe("impexsal");
    const c = await makeCandidate();
    expect(await hideFromName(c.profileId, "Im")).toEqual({ ok: false, error: "too_short" });
    expect((await hideFromName(c.profileId, "Impex")).ok).toBe(true);
    expect(await hideFromName(c.profileId, " impex ")).toEqual({ ok: false, error: "duplicate" });
    // Joins later.
    const later = await makeCompany();
    await prisma.company.update({ where: { id: later.companyId }, data: { name: "IMPEX S.A.L." } });
    expect(await applyHiddenNamesToCompany(later.companyId)).toBe(1);
    expect(await inFeed(later, c.profileId)).toBe(false);
    // Removing the name shows the profile to it again.
    const rule = await prisma.hiddenCompanyName.findFirstOrThrow({ where: { candidateId: c.profileId } });
    await unhideName(c.profileId, rule.id);
    expect(await inFeed(later, c.profileId)).toBe(true);
  });
});

describe("job preferences", () => {
  beforeEach(reset);

  it("companies can filter by work style, job type and where people would move", async () => {
    const remote = await makeCandidate({ name: "Remote Rana" });
    const office = await makeCandidate({ name: "Office Omar" });
    await prisma.candidateProfile.update({ where: { id: remote.profileId }, data: { workModes: ["REMOTE"], jobTypes: ["FREELANCE"], relocateTo: ["United_Arab_Emirates"] } });
    await prisma.candidateProfile.update({ where: { id: office.profileId }, data: { workModes: ["ONSITE"], jobTypes: ["FULL_TIME"] } });
    const e = await makeCompany();
    expect(await inFeed(e, remote.profileId, { mode: "REMOTE" })).toBe(true);
    expect(await inFeed(e, office.profileId, { mode: "REMOTE" })).toBe(false);
    expect(await inFeed(e, office.profileId, { jtype: "FULL_TIME" })).toBe(true);
    // Lives in Beirut but open to the UAE.
    expect(await inFeed(e, remote.profileId, { place: "United_Arab_Emirates" })).toBe(true);
    expect(await inFeed(e, office.profileId, { place: "United_Arab_Emirates" })).toBe(false);
  });

  it("the salary is never in what companies receive", async () => {
    const c = await makeCandidate();
    await prisma.candidateProfile.update({ where: { id: c.profileId }, data: { salaryMin: 2500, desiredRoles: ["QA Lead"] } });
    const e = await makeCompany();
    const card = (await feedPage({ seed: "s", viewer: viewerOf(e), limit: 10 })).cards.find((x) => x.id === c.profileId)!;
    expect(card.prefs.roles).toEqual(["QA Lead"]);
    expect(JSON.stringify(card)).not.toContain("2500");
  });
});
