import { describe, expect, it } from "vitest";
import { isIOSDevice, isMobileOrTablet, shouldShowBanner } from "@/components/install-logic";

const now = Date.UTC(2026, 9, 28);
const ok = { standalone: false, mobile: true, pageViews: 2, dismissedAt: null, now, canPrompt: true, ios: false };

describe("install banner", () => {
  it("detects iPad even when it reports itself as a Mac", () => {
    const ipadUa = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
    expect(isIOSDevice(ipadUa, "MacIntel", 5)).toBe(true);
    expect(isIOSDevice(ipadUa, "MacIntel", 0)).toBe(false); // a real Mac
    expect(isMobileOrTablet(ipadUa, "MacIntel", 0)).toBe(false);
    expect(isMobileOrTablet("Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile", "Linux armv8l", 5)).toBe(true);
  });
  it("shows only from the second page view", () => {
    expect(shouldShowBanner({ ...ok, pageViews: 1 })).toBe(false);
    expect(shouldShowBanner(ok)).toBe(true);
  });
  it("never shows when already installed or on desktop", () => {
    expect(shouldShowBanner({ ...ok, standalone: true })).toBe(false);
    expect(shouldShowBanner({ ...ok, mobile: false })).toBe(false);
  });
  it("stays hidden for 30 days after dismissal", () => {
    expect(shouldShowBanner({ ...ok, dismissedAt: now - 29 * 86400000 })).toBe(false);
    expect(shouldShowBanner({ ...ok, dismissedAt: now - 31 * 86400000 })).toBe(true);
  });
  it("on iPhone shows instructions even without an install prompt", () => {
    expect(shouldShowBanner({ ...ok, canPrompt: false, ios: true })).toBe(true);
    expect(shouldShowBanner({ ...ok, canPrompt: false, ios: false })).toBe(false);
  });
});
