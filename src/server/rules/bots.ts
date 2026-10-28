const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|curl|wget|python-requests|httpclient|axios|node-fetch|go-http|java\/|okhttp|scrapy|phantomjs|puppeteer|playwright/i;

/** True for crawlers, link previewers and scripted clients. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length < 12) return true;
  return BOT_PATTERN.test(userAgent);
}
