import { describe, expect, it } from "vitest";
import { customerCodeFromUrl } from "@/lib/stream-settings";

describe("Cloudflare customer code", () => {
  it("is read from a playback address", () => {
    expect(customerCodeFromUrl("https://customer-f33zs165nr7gyfy4.cloudflarestream.com/abc/manifest/video.m3u8")).toBe("f33zs165nr7gyfy4");
    expect(customerCodeFromUrl("https://example.com/video.m3u8")).toBeNull();
    expect(customerCodeFromUrl(undefined)).toBeNull();
  });
});
