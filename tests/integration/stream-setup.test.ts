import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { ensureStreamSetup, streamSettings } from "@/lib/stream-settings";

/** Fakes the three Cloudflare calls the deploy setup makes. */
function fakeCloudflare() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url.replace(/^.*\/stream/, "")}`);
    if (url.endsWith("/keys")) return Response.json({ success: true, result: { id: "key123", pem: "LS0tLS1CRUdJTi..." } });
    if (url.endsWith("/webhook")) return Response.json({ success: true, result: { secret: "whsec" } });
    return Response.json({ success: true, result: [{ playback: { hls: "https://customer-code42.cloudflarestream.com/u/manifest/video.m3u8" } }] });
  }));
  return calls;
}

describe("automatic Cloudflare setup on deploy", () => {
  beforeEach(async () => {
    await prisma.platformSetting.deleteMany();
    process.env.CLOUDFLARE_ACCOUNT_ID = "acc";
    process.env.CLOUDFLARE_STREAM_API_TOKEN = "tok";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_STREAM_API_TOKEN;
  });

  it("creates the signing key and webhook once, and learns the customer code", async () => {
    const calls = fakeCloudflare();
    await ensureStreamSetup("https://hireel.app", () => {});
    expect(calls).toEqual(["POST /keys", "PUT /webhook", "GET ?limit=1"]);
    expect(await streamSettings()).toMatchObject({ signingKeyId: "key123", webhookSecret: "whsec", customerCode: "code42" });
    calls.length = 0;
    await ensureStreamSetup("https://hireel.app", () => {});
    expect(calls).toEqual([]); // nothing repeated on the next deploy
  });

  it("does nothing until the token is set", async () => {
    const calls = fakeCloudflare();
    delete process.env.CLOUDFLARE_STREAM_API_TOKEN;
    const logs: string[] = [];
    await ensureStreamSetup("https://hireel.app", (m) => logs.push(m));
    expect(calls).toEqual([]);
    expect(logs[0]).toContain("not connected yet");
  });
});
