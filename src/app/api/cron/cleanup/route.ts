import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runJobs } from "@/server/jobs";

/**
 * Housekeeping and reminders. Hireel already runs these hourly by itself (server/jobs.ts);
 * a Hostinger cron job can also call this:
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://yourdomain/api/cron/cleanup
 */
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json(await runJobs());
}
