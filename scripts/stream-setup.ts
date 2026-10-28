// One-time Cloudflare Stream setup. Creates a signing key (for private playback links)
// and registers the webhook (so Hireel knows when a video is ready).
// Usage: npm run stream:setup -- https://yourdomain.com
// Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN in .env first.
import "dotenv/config";

async function main() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const site = (process.argv[2] ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  if (!account || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN in .env first.");
  if (!site.startsWith("https://")) throw new Error("Pass your live https:// address, e.g. npm run stream:setup -- https://hireel.com");
  const api = `https://api.cloudflare.com/client/v4/accounts/${account}/stream`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const key = await fetch(`${api}/keys`, { method: "POST", headers }).then((r) => r.json());
  if (!key.success) throw new Error(`Signing key failed: ${JSON.stringify(key.errors)}`);
  const hook = await fetch(`${api}/webhook`, { method: "PUT", headers, body: JSON.stringify({ notificationUrl: `${site}/api/stream/webhook` }) }).then((r) => r.json());
  if (!hook.success) throw new Error(`Webhook failed: ${JSON.stringify(hook.errors)}`);

  console.log("\nCopy these lines into your settings (Hostinger environment variables and .env):\n");
  console.log(`CLOUDFLARE_STREAM_SIGNING_KEY_ID="${key.result.id}"`);
  console.log(`CLOUDFLARE_STREAM_SIGNING_KEY_PEM="${key.result.pem}"`);
  console.log(`CLOUDFLARE_STREAM_WEBHOOK_SECRET="${hook.result.secret}"`);
  console.log("\nKeep them secret. Don't paste them anywhere public.");
}
main().catch((e) => { console.error(e.message); process.exit(1); });
