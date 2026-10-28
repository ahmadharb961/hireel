import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limit stored in Postgres (no extra service needed).
 * Returns true when the call is allowed.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = new Date(now - (now % (windowSec * 1000)));
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "AppRateLimit" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AppRateLimit"."windowStart" = EXCLUDED."windowStart" THEN "AppRateLimit"."count" + 1 ELSE 1 END,
      "windowStart" = EXCLUDED."windowStart"
    RETURNING "count"`;
  return (rows[0]?.count ?? 1) <= max;
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function userAgent() {
  return (await headers()).get("user-agent") ?? "";
}
