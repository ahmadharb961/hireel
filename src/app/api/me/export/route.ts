import { NextResponse } from "next/server";
import { exportData } from "@/server/account";
import { rateLimit } from "@/server/ratelimit";
import { getViewer } from "@/server/session";

/** "Download my data": a JSON file with everything Hireel keeps about the signed-in person. */
export async function GET() {
  const v = await getViewer();
  if (!v) return new NextResponse("Not found", { status: 404 });
  if (!(await rateLimit(`export:${v.id}`, 10, 3600))) return new NextResponse("Too many requests", { status: 429 });
  const data = await exportData(v.id);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="hireel-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
