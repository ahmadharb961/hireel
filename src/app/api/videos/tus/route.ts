import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { candidateOrNull } from "@/server/session";
import { createTusUpload } from "@/server/stream";

/**
 * tus "create upload" endpoint. The browser's tus client calls this first; we ask Cloudflare
 * for a one-time upload URL and hand it back in the Location header. The file itself then
 * goes from the phone straight to Cloudflare, with resume support on bad connections.
 */
export async function POST(req: NextRequest) {
  const me = await candidateOrNull();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  const videoId = req.nextUrl.searchParams.get("videoId") ?? "";
  const video = await prisma.video.findFirst({ where: { id: videoId, candidateId: me.profile.id, processing: "UPLOADING", streamUid: null } });
  if (!video) return new NextResponse("Not found", { status: 404 });

  const length = req.headers.get("upload-length") ?? "";
  if (!/^\d+$/.test(length) || Number(length) <= 0) return new NextResponse("Upload-Length required", { status: 400 });
  if (Number(length) > MAX_UPLOAD_BYTES) return new NextResponse("File too large", { status: 413 });

  const meta = parseTusMetadata(req.headers.get("upload-metadata"));
  try {
    const { location, uid } = await createTusUpload({ uploadLength: length, fileName: meta.filename ?? meta.name ?? "intro.mp4", creator: me.profile.id });
    await prisma.video.update({ where: { id: video.id }, data: { streamUid: uid } });
    return new NextResponse(null, {
      status: 201,
      headers: { Location: location, "Tus-Resumable": "1.0.0", "Access-Control-Expose-Headers": "Location" },
    });
  } catch (e) {
    console.error("tus create failed", e);
    return new NextResponse("Upload service unavailable", { status: 502 });
  }
}

function parseTusMetadata(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of (header ?? "").split(",")) {
    const [k, v] = pair.trim().split(" ");
    if (k) out[k] = v ? Buffer.from(v, "base64").toString("utf8") : "";
  }
  return out;
}
