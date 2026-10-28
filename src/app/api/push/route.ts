import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { vapidKeys } from "@/server/push";
import { rateLimit } from "@/server/ratelimit";
import { getViewer } from "@/server/session";

const sub = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "https only"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** The public key a device needs to subscribe. */
export async function GET() {
  return NextResponse.json({ key: (await vapidKeys()).publicKey }, { headers: { "Cache-Control": "no-store" } });
}

/** Save this device for the signed-in person (or move it to them if someone else used it before). */
export async function POST(req: NextRequest) {
  const v = await getViewer();
  if (!v) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!(await rateLimit(`push:${v.id}`, 30, 3600))) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const p = sub.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const { endpoint, keys } = p.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: v.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: v.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  return NextResponse.json({ ok: true });
}

/** Turn notifications off for this device. */
export async function DELETE(req: NextRequest) {
  const v = await getViewer();
  if (!v) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const endpoint = String((await req.json().catch(() => ({})))?.endpoint ?? "");
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: v.id } });
  return NextResponse.json({ ok: true });
}
