import { describe, expect, it } from "vitest";
import { isBot } from "@/server/rules/bots";
import { periodStart, quotaError, remaining } from "@/server/rules/plans";
import { isShareTokenShape, newShareToken } from "@/server/rules/share";
import { decideView, publicViewCount } from "@/server/rules/views";
import { parseReason } from "@/lib/reason";

const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const now = new Date("2026-10-28T12:00:00Z");
const base = { viewerRole: "EMPLOYER", viewerId: "emp1", ownerUserId: "cand1", watchedMs: 3200, userAgent: PHONE, lastViewAt: null, now };

describe("view counting", () => {
  it("counts a logged-in employer who watched 3+ seconds", () => {
    expect(decideView(base)).toEqual({ count: true });
  });
  it("ignores visitors and candidates", () => {
    expect(decideView({ ...base, viewerId: null, viewerRole: null })).toMatchObject({ count: false, reason: "not_employer" });
    expect(decideView({ ...base, viewerRole: "CANDIDATE" })).toMatchObject({ count: false, reason: "not_employer" });
  });
  it("ignores the candidate's own views", () => {
    expect(decideView({ ...base, viewerId: "cand1" })).toMatchObject({ count: false, reason: "own_video" });
  });
  it("needs at least 3 seconds", () => {
    expect(decideView({ ...base, watchedMs: 2999 })).toMatchObject({ count: false, reason: "too_short" });
    expect(decideView({ ...base, watchedMs: 3000 })).toEqual({ count: true });
  });
  it("ignores bots and scripted clients", () => {
    for (const ua of ["Googlebot/2.1", "curl/8.0", "python-requests/2.31", "HeadlessChrome/120", "", null]) {
      expect(decideView({ ...base, userAgent: ua })).toMatchObject({ count: false, reason: "bot" });
    }
    expect(isBot(PHONE)).toBe(false);
  });
  it("counts once per employer per video per 24 hours", () => {
    expect(decideView({ ...base, lastViewAt: new Date(now.getTime() - 23 * 3600000) })).toMatchObject({ count: false, reason: "recent" });
    expect(decideView({ ...base, lastViewAt: new Date(now.getTime() - 24 * 3600000 - 1) })).toEqual({ count: true });
  });
  it("hides the public number until it reaches 10", () => {
    expect(publicViewCount(0)).toBeNull();
    expect(publicViewCount(9)).toBeNull();
    expect(publicViewCount(10)).toBe(10);
  });
});

describe("plan limits", () => {
  it("starts each period on the 1st of the month", () => {
    expect(periodStart(new Date("2026-10-28T23:59:00Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
  it("blocks requests past the monthly limits", () => {
    expect(quotaError({ introLimit: 5, introUsed: 4, cvLimit: 2, cvUsed: 2, wantsCv: false })).toBeNull();
    expect(quotaError({ introLimit: 5, introUsed: 5, cvLimit: 2, cvUsed: 0, wantsCv: false })).toBe("intro_limit");
    expect(quotaError({ introLimit: 5, introUsed: 1, cvLimit: 2, cvUsed: 2, wantsCv: true })).toBe("cv_limit");
    expect(remaining(5, 7)).toBe(0);
  });
});

describe("share links", () => {
  it("are random, 32 URL-safe characters", () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).not.toBe(b);
    expect(isShareTokenShape(a)).toBe(true);
    expect(isShareTokenShape("abc")).toBe(false);
    expect(isShareTokenShape("../../etc/passwd" + "x".repeat(16))).toBe(false);
  });
});

describe("rejection reasons", () => {
  it("keeps a reason key and the admin's note", () => {
    expect(parseReason("quiet_audio::Try again outside")).toEqual({ key: "quiet_audio", note: "Try again outside" });
    expect(parseReason("custom::Please smile")).toEqual({ key: null, note: "Please smile" });
    expect(parseReason("legacy text")).toEqual({ key: null, note: "legacy text" });
    expect(parseReason(null)).toEqual({ key: null, note: "" });
  });
});
