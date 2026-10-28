import { NextResponse, type NextRequest } from "next/server";
import { INDUSTRIES, VIDEO_LANGUAGES, type VideoLang } from "@/lib/constants";
import { feedPage } from "@/server/feed";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { employerOrNull } from "@/server/session";

/** Next page of the feed. Small pages + rate limits make bulk scraping slow and visible. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const emp = await employerOrNull();
  const key = emp ? `feed:u:${emp.viewer.id}` : `feed:ip:${await clientIp()}`;
  if (!(await rateLimit(key, emp ? 240 : 60, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const industry = sp.get("industry");
  const lang = sp.get("lang");
  const page = await feedPage({
    seed: sp.get("seed") || "x",
    cursor: sp.get("cursor"),
    industry: industry && (INDUSTRIES as readonly string[]).includes(industry) ? industry : null,
    lang: lang && (VIDEO_LANGUAGES as readonly string[]).includes(lang) ? (lang as VideoLang) : null,
    viewer: emp ? { kind: "employer", companyId: emp.company.id, memberId: emp.member.id } : { kind: "visitor" },
  });
  return NextResponse.json(page, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
