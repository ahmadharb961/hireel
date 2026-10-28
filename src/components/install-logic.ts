/** Pure rules for the "Install Hireel" banner (kept separate so they can be tested). */
export const DISMISS_DAYS = 30;
export const MIN_PAGE_VIEWS = 2;

export function isIOSDevice(ua: string, platform: string, maxTouchPoints: number) {
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function isMobileOrTablet(ua: string, platform: string, maxTouchPoints: number) {
  return isIOSDevice(ua, platform, maxTouchPoints) || /Android|Mobi|Tablet|Silk|Kindle/i.test(ua);
}

export function shouldShowBanner(opts: { standalone: boolean; mobile: boolean; pageViews: number; dismissedAt: number | null; now: number; canPrompt: boolean; ios: boolean }) {
  if (opts.standalone || !opts.mobile) return false;
  if (opts.pageViews < MIN_PAGE_VIEWS) return false;
  if (opts.dismissedAt && opts.now - opts.dismissedAt < DISMISS_DAYS * 86400000) return false;
  return opts.canPrompt || opts.ios;
}
