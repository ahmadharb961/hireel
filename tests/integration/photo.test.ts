import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processLogo, processPhoto } from "@/server/photo";

describe("profile photos", () => {
  it("crops to a 512px square WebP and removes location and other metadata", async () => {
    const withGps = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#195C48" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret" }, GPS: { GPSLatitudeRef: "N", GPSLatitude: "33/1 53/1 0/1" } } as never)
      .toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeTruthy();
    const out = await processPhoto(new Uint8Array(withGps));
    const meta = await sharp(Buffer.from(out!)).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([512, 512]);
    expect(meta.exif).toBeUndefined();
  });
  it("keeps a logo's whole shape on a transparent 256px square", async () => {
    const wide = await sharp({ create: { width: 900, height: 300, channels: 4, background: { r: 25, g: 92, b: 72, alpha: 1 } } }).png().toBuffer();
    const meta = await sharp(Buffer.from((await processLogo(new Uint8Array(wide)))!)).metadata();
    expect([meta.width, meta.height, meta.format, meta.hasAlpha]).toEqual([256, 256, "webp", true]);
  });
  it("refuses files that aren't images", async () => {
    expect(await processPhoto(new TextEncoder().encode("%PDF-1.4 not a photo"))).toBeNull();
  });
});
