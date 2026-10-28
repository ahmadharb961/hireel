import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseVideo, verifyWebhookSignature } from "@/server/stream";

const secret = "test-secret";
const sign = (body: string, time: number, key = secret) => `time=${time},sig1=${createHmac("sha256", key).update(`${time}.${body}`).digest("hex")}`;

describe("Cloudflare webhook signature", () => {
  const body = JSON.stringify({ uid: "abc", readyToStream: true });
  const t = 1_800_000_000;
  it("accepts a correctly signed, fresh message", () => {
    expect(verifyWebhookSignature(body, sign(body, t), secret, t + 10)).toBe(true);
  });
  it("rejects a wrong signature, a changed body, or a missing header", () => {
    expect(verifyWebhookSignature(body, sign(body, t, "other"), secret, t)).toBe(false);
    expect(verifyWebhookSignature(body + " ", sign(body, t), secret, t)).toBe(false);
    expect(verifyWebhookSignature(body, null, secret, t)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, t), "", t)).toBe(false);
  });
  it("rejects replayed old messages", () => {
    expect(verifyWebhookSignature(body, sign(body, t), secret, t + 301)).toBe(false);
  });
});

describe("Cloudflare video status", () => {
  it("reads ready, failed, size and duration", () => {
    expect(parseVideo({ readyToStream: true, status: { state: "ready" }, duration: 61.4, input: { width: 1080, height: 1920 } }))
      .toEqual({ ready: true, failed: false, durationSec: 61, width: 1080, height: 1920 });
    expect(parseVideo({ status: { state: "error" }, duration: -1, input: { width: -1, height: -1 } }))
      .toEqual({ ready: false, failed: true, durationSec: null, width: null, height: null });
  });
});
