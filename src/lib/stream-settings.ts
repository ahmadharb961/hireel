// Cloudflare Stream settings that Hireel creates for itself on deploy, so the site owner only
// has to provide CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN.
// Environment variables always win over stored values.
import { prisma } from "./db";

const KEYS = {
  signingKeyId: "stream.signingKeyId",
  signingKeyPem: "stream.signingKeyPem",
  webhookSecret: "stream.webhookSecret",
  customerCode: "stream.customerCode",
} as const;
type Name = keyof typeof KEYS;
const ENV: Record<Name, string> = {
  signingKeyId: "CLOUDFLARE_STREAM_SIGNING_KEY_ID",
  signingKeyPem: "CLOUDFLARE_STREAM_SIGNING_KEY_PEM",
  webhookSecret: "CLOUDFLARE_STREAM_WEBHOOK_SECRET",
  customerCode: "CLOUDFLARE_STREAM_CUSTOMER_CODE",
};

export type StreamSettings = Record<Name, string>;

let cache: { at: number; value: StreamSettings } | null = null;

export async function streamSettings(): Promise<StreamSettings> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const rows = await prisma.platformSetting.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const value = Object.fromEntries(
    (Object.keys(KEYS) as Name[]).map((n) => [n, process.env[ENV[n]] || stored[KEYS[n]] || ""]),
  ) as StreamSettings;
  cache = { at: Date.now(), value };
  return value;
}

export async function saveStreamSetting(name: Name, value: string) {
  await prisma.platformSetting.upsert({ where: { key: KEYS[name] }, update: { value }, create: { key: KEYS[name], value } });
  cache = null;
}

/** "https://customer-abc123.cloudflarestream.com/…" → "abc123" */
export function customerCodeFromUrl(url: string | undefined | null) {
  return url?.match(/customer-([a-z0-9]+)\.cloudflarestream\.com/i)?.[1] ?? null;
}

type CfResponse<T> = { success: boolean; errors?: { message: string }[]; result: T };

/**
 * Run on every deploy: creates the signing key (private playback links) and registers the
 * webhook (videos-ready notices) if they don't exist yet. Safe to run many times.
 */
export async function ensureStreamSetup(appUrl: string, log: (m: string) => void = console.log) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!account || !token) return log("Video: Cloudflare not connected yet (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN missing).");
  const api = `https://api.cloudflare.com/client/v4/accounts/${account}/stream`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const s = await streamSettings();

  if (!s.signingKeyId || !s.signingKeyPem) {
    const r = (await fetch(`${api}/keys`, { method: "POST", headers }).then((x) => x.json())) as CfResponse<{ id: string; pem: string }>;
    if (!r.success) return log(`Video: could not create the signing key: ${r.errors?.map((e) => e.message).join("; ")}. Check the API token has "Stream: Edit".`);
    await saveStreamSetting("signingKeyId", r.result.id);
    await saveStreamSetting("signingKeyPem", r.result.pem);
    log("Video: signing key created.");
  }

  if (!s.webhookSecret) {
    if (!appUrl.startsWith("https://")) {
      log("Video: webhook skipped (APP_URL is not https). Upload status will be checked by polling.");
    } else {
      const r = (await fetch(`${api}/webhook`, { method: "PUT", headers, body: JSON.stringify({ notificationUrl: `${appUrl.replace(/\/$/, "")}/api/stream/webhook` }) }).then((x) => x.json())) as CfResponse<{ secret: string }>;
      if (!r.success) log(`Video: could not register the webhook: ${r.errors?.map((e) => e.message).join("; ")}.`);
      else { await saveStreamSetting("webhookSecret", r.result.secret); log("Video: webhook registered."); }
    }
  }

  if (!s.customerCode) {
    const r = (await fetch(`${api}?limit=1`, { headers }).then((x) => x.json())) as CfResponse<{ playback?: { hls?: string } }[]>;
    const code = r.success ? customerCodeFromUrl(r.result?.[0]?.playback?.hls) : null;
    if (code) { await saveStreamSetting("customerCode", code); log("Video: customer code detected."); }
    else log("Video: customer code will be detected automatically after the first upload.");
  }
  log("Video: Cloudflare Stream connected.");
}
