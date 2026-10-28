import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { feedPage } from "@/server/feed";
import { makeCandidate, makeCompany, reset } from "./helpers";

const visitor = { kind: "visitor" } as const;

describe("discovery feed", () => {
  beforeEach(reset);

  it("shows only published, consented, approved candidates; respects visibility and pause", async () => {
    const live = await makeCandidate({ name: "Live" });
    await makeCandidate({ name: "Draft", published: false });
    await makeCandidate({ name: "Paused", paused: true });
    await makeCandidate({ name: "Pending video", videos: [{ lang: "EN", primary: true, moderation: "PENDING" }] });
    const quiet = await makeCandidate({ name: "Employers only", visibility: "EMPLOYERS_ONLY" });
    const emp = await makeCompany();

    const asVisitor = await feedPage({ seed: "s", viewer: visitor });
    expect(asVisitor.cards.map((c) => c.name)).toEqual(["Live"]);

    const asEmployer = await feedPage({ seed: "s", viewer: { kind: "employer", companyId: emp.companyId, memberId: emp.memberId } });
    expect(asEmployer.cards.map((c) => c.id).sort()).toEqual([live.profileId, quiet.profileId].sort());
  });

  it("hides candidates from companies they blocked", async () => {
    const c = await makeCandidate();
    const emp = await makeCompany();
    await prisma.block.create({ data: { candidateId: c.profileId, companyId: emp.companyId } });
    const page = await feedPage({ seed: "s", viewer: { kind: "employer", companyId: emp.companyId, memberId: emp.memberId } });
    expect(page.cards).toHaveLength(0);
  });

  it("shows each candidate once, starting with the primary video or the filtered language", async () => {
    await makeCandidate({ name: "Two langs", videos: [{ lang: "EN", primary: true }, { lang: "AR" }] });
    const all = await feedPage({ seed: "s", viewer: visitor });
    expect(all.cards).toHaveLength(1);
    expect(all.cards[0].videos.map((v) => v.lang).sort()).toEqual(["AR", "EN"]);
    expect(all.cards[0].startLang).toBe("EN");
    const ar = await feedPage({ seed: "s", lang: "AR", viewer: visitor });
    expect(ar.cards[0].startLang).toBe("AR");
    const fr = await feedPage({ seed: "s", lang: "FR", viewer: visitor });
    expect(fr.cards).toHaveLength(0);
  });

  it("never orders by views, and pages through everyone exactly once", async () => {
    for (let i = 0; i < 12; i++) await makeCandidate({ name: `P${i}`, videos: [{ lang: "EN", primary: true, views: i * 100 }] });
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: Awaited<ReturnType<typeof feedPage>> = await feedPage({ seed: "abc", cursor, viewer: visitor, limit: 5 });
      seen.push(...page.cards.map((c) => c.name));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(12);
    expect(new Set(seen).size).toBe(12);
    const byViews = [...seen].sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)));
    expect(seen).not.toEqual(byViews);
    // Another seed gives another order.
    const other = await feedPage({ seed: "different", viewer: visitor, limit: 12 });
    expect(other.cards.map((c) => c.name)).not.toEqual(seen);
  });

  it("hides view numbers under 10 and sends no about text to visitors", async () => {
    await makeCandidate({ videos: [{ lang: "EN", primary: true, views: 9 }, { lang: "AR", views: 10 }] });
    const page = await feedPage({ seed: "s", viewer: visitor });
    const views = Object.fromEntries(page.cards[0].videos.map((v) => [v.lang, v.views]));
    expect(views).toEqual({ EN: null, AR: 10 });
    expect(page.cards[0].about).toBeNull();
  });
});
