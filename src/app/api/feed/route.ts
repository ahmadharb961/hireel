import { NextResponse, type NextRequest } from "next/server";
import { parseFeedFilters } from "@/lib/feed-filters";
import { feedPage } from "@/server/feed";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { employerOrNull } from "@/server/session";

/** Next page of the feed. Small pages + rate limits make bulk scraping slow and visible. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const emp = await employerOrNull();
  const key = emp ? `feed:u:${emp.viewer.id}` : `feed:ip:${await clientIp()}`;
  if (!(await rateLimit(key, emp ? 240 : 60, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const page = await feedPage({
    seed: sp.get("seed") || "x",
    cursor: sp.get("cursor"),
    ...parseFeedFilters((k) => sp.get(k)),
    viewer: emp ? { kind: "employer", companyId: emp.company.id, memberId: emp.member.id } : { kind: "visitor" },
  });
  return NextResponse.json(page, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
