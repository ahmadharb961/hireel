import { NextResponse, type NextRequest } from "next/server";
import { logoUrl } from "@/lib/logo";
import { searchCompanies } from "@/server/hiding";
import { rateLimit } from "@/server/ratelimit";
import { candidateOrNull } from "@/server/session";

/** Company names for the "Hide my profile from…" search (candidates only). */
export async function GET(req: NextRequest) {
  const c = await candidateOrNull();
  if (!c) return NextResponse.json({ results: [] }, { status: 401 });
  if (!(await rateLimit(`co-search:${c.viewer.id}`, 120, 600))) return NextResponse.json({ results: [] }, { status: 429 });
  const rows = await searchCompanies(req.nextUrl.searchParams.get("q") ?? "");
  return NextResponse.json({ results: rows.map((r) => ({ id: r.id, name: r.name, country: r.country, logo: logoUrl(r) })) }, { headers: { "Cache-Control": "no-store" } });
}
