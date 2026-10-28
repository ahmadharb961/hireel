import "server-only";
import { createHmac, createPrivateKey, timingSafeEqual } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";
import { env, streamConfigured } from "@/lib/env";
import { customerCodeFromUrl, saveStreamSetting, streamSettings } from "@/lib/stream-settings";

/** Cloudflare Stream: uploads, status, signed playback and deletion. */

export const MAX_DURATION_SEC = 120;
const api = () => `https://api.cloudflare.com/client/v4/accounts/${env.cloudflare.accountId}/stream`;
const authHeaders = () => ({ Authorization: `Bearer ${env.cloudflare.apiToken}` });

function b64(v: string) {
  return Buffer.from(v, "utf8").toString("base64");
}

/**
 * Starts a resumable (tus) upload that goes straight from the phone to Cloudflare.
 * Our API token never reaches the browser; the browser only gets the one-time upload URL.
 */
export async function createTusUpload(opts: { uploadLength: string; fileName: string; creator: string }) {
  if (!streamConfigured()) throw new Error("STREAM_NOT_CONFIGURED");
  const metadata = [
    `name ${b64(opts.fileName.slice(0, 100) || "intro.mp4")}`,
    `maxDurationSeconds ${b64(String(MAX_DURATION_SEC))}`,
    "requiresignedurls",
  ].join(",");
  const res = await fetch(`${api()}?direct_user=true`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Tus-Resumable": "1.0.0",
      "Upload-Length": opts.uploadLength,
      "Upload-Metadata": metadata,
      "Upload-Creator": opts.creator,
    },
  });
  const location = res.headers.get("location");
  const uid = res.headers.get("stream-media-id");
  if (!res.ok || !location || !uid) throw new Error(`STREAM_UPLOAD_FAILED ${res.status}`);
  return { location, uid };
}

export type StreamVideoInfo = { ready: boolean; failed: boolean; durationSec: number | null; width: number | null; height: number | null };

export async function getStreamVideo(uid: string): Promise<StreamVideoInfo | null> {
  if (!streamConfigured()) return null;
  const res = await fetch(`${api()}/${uid}`, { headers: authHeaders(), cache: "no-store" });
  if (res.status === 404) return { ready: false, failed: true, durationSec: null, width: null, height: null };
  if (!res.ok) return null;
  const { result } = (await res.json()) as { result: CloudflareVideo };
  return parseVideo(result);
}

type CloudflareVideo = {
  uid?: string;
  readyToStream?: boolean;
  status?: { state?: string };
  duration?: number;
  input?: { width?: number; height?: number };
};

export function parseVideo(v: CloudflareVideo): StreamVideoInfo {
  const state = v.status?.state;
  return {
    ready: Boolean(v.readyToStream) && state === "ready",
    failed: state === "error",
    durationSec: typeof v.duration === "number" && v.duration > 0 ? Math.round(v.duration) : null,
    width: v.input?.width && v.input.width > 0 ? v.input.width : null,
    height: v.input?.height && v.input.height > 0 ? v.input.height : null,
  };
}

export async function deleteStreamVideo(uid: string) {
  if (!streamConfigured()) return;
  const res = await fetch(`${api()}/${uid}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(`STREAM_DELETE_FAILED ${res.status}`);
}

let keyPromise: { id: string; key: ReturnType<typeof importPKCS8> } | null = null;

/** Short-lived playback token so videos can't be hot-linked or bulk-downloaded by URL. */
export async function playbackToken(uid: string, ttlSec = 60 * 60): Promise<string> {
  const c = await streamSettings();
  if (c.signingKeyId && c.signingKeyPem) {
    // Cloudflare gives the key base64-encoded; it may also be pasted as raw PEM.
    const pem = c.signingKeyPem.includes("BEGIN") ? c.signingKeyPem : Buffer.from(c.signingKeyPem, "base64").toString("utf8");
    if (keyPromise?.id !== c.signingKeyId) keyPromise = { id: c.signingKeyId, key: importPKCS8(toPkcs8(pem), "RS256") };
    const key = await keyPromise.key;
    return new SignJWT({ sub: uid, kid: c.signingKeyId })
      .setProtectedHeader({ alg: "RS256", kid: c.signingKeyId })
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSec)
      .sign(key);
  }
  const res = await fetch(`${api()}/${uid}/token`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ttlSec }),
  });
  if (!res.ok) throw new Error(`STREAM_TOKEN_FAILED ${res.status}`);
  return ((await res.json()) as { result: { token: string } }).result.token;
}

function toPkcs8(pem: string) {
  // Cloudflare keys are PKCS#1 ("RSA PRIVATE KEY"); jose needs PKCS#8.
  if (!pem.includes("BEGIN RSA PRIVATE KEY")) return pem;
  return createPrivateKey(pem).export({ type: "pkcs8", format: "pem" }).toString();
}

/** Account-specific playback host code; learned from Cloudflare the first time it's needed. */
async function customerCode(uid: string) {
  const s = await streamSettings();
  if (s.customerCode) return s.customerCode;
  const res = await fetch(`${api()}/${uid}`, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) return null;
  const code = customerCodeFromUrl(((await res.json()) as { result?: { playback?: { hls?: string } } }).result?.playback?.hls);
  if (code) await saveStreamSetting("customerCode", code);
  return code;
}

export async function playbackUrls(uid: string, token: string) {
  const code = await customerCode(uid);
  if (!code) return null;
  const base = `https://customer-${code}.cloudflarestream.com/${token}`;
  return { hls: `${base}/manifest/video.m3u8`, poster: `${base}/thumbnails/thumbnail.jpg?time=1s&height=720` };
}

/** Checks Cloudflare's `Webhook-Signature: time=…,sig1=…` header (HMAC-SHA256 of "time.body"). */
export function verifyWebhookSignature(body: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const time = Number(parts.time);
  const sig = parts.sig1;
  if (!time || !sig || Math.abs(nowSec - time) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.time}.${body}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
