import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { streamSettings } from "@/lib/stream-settings";
import { parseVideo, verifyWebhookSignature } from "@/server/stream";
import { applyStreamInfo } from "@/server/videos";

/** Cloudflare calls this when a video finishes processing (or fails). Signature is required. */
export async function POST(req: Request) {
  const body = await req.text();
  const { webhookSecret } = await streamSettings();
  if (!verifyWebhookSignature(body, req.headers.get("webhook-signature"), webhookSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  let payload: { uid?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  if (!payload.uid) return NextResponse.json({ ok: true });
  const video = await prisma.video.findUnique({ where: { streamUid: payload.uid } });
  if (video) await applyStreamInfo(video, parseVideo(payload));
  return NextResponse.json({ ok: true });
}
