import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { parseCrop, processBanner, processLogo, processPhoto } from "@/server/photo";

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

describe("cover banner crop", () => {
  // 1200×300: left half red, right half blue.
  async function twoColour() {
    const sharp = (await import("sharp")).default;
    const blue = await sharp({ create: { width: 600, height: 300, channels: 3, background: "#0000ff" } }).png().toBuffer();
    return new Uint8Array(await sharp({ create: { width: 1200, height: 300, channels: 3, background: "#ff0000" } }).composite([{ input: blue, left: 600, top: 0 }]).png().toBuffer());
  }
  async function pixel(img: Uint8Array, x: number, y: number) {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(img).raw().toBuffer({ resolveWithObject: true });
    const i = (y * info.width + x) * info.channels;
    return { w: info.width, h: info.height, rgb: [data[i], data[i + 1], data[i + 2]] };
  }
  const near = (rgb: number[], want: number[]) => rgb.every((v, i) => Math.abs(v - want[i]) < 30);

  it("keeps exactly the part the person chose", async () => {
    const src = await twoColour();
    const left = await processBanner(src, { x: 0, y: 1 / 6, w: 0.5, h: 2 / 3 });
    const right = await processBanner(src, { x: 0.5, y: 1 / 6, w: 0.5, h: 2 / 3 });
    const l = await pixel(left!, 750, 250);
    expect([l.w, l.h]).toEqual([1500, 500]);
    expect(near(l.rgb, [255, 0, 0])).toBe(true);
    expect(near((await pixel(right!, 750, 250)).rgb, [0, 0, 255])).toBe(true);
  });

  it("zoomed out to fit the whole picture: white around it", async () => {
    const src = await twoColour();
    // Picture is 4:1, frame 3:1: fitting the width leaves white above and below.
    const out = await processBanner(src, { x: 0, y: -1 / 6, w: 1, h: 4 / 3 });
    expect(near((await pixel(out!, 750, 5)).rgb, [255, 255, 255])).toBe(true);
    expect(near((await pixel(out!, 300, 250)).rgb, [255, 0, 0])).toBe(true);
    expect(near((await pixel(out!, 1200, 250)).rgb, [0, 0, 255])).toBe(true);
  });

  it("ignores a broken crop and crops automatically", async () => {
    expect(parseCrop("{bad")).toBeNull();
    expect(parseCrop(JSON.stringify({ x: 0, y: 0, w: 0, h: 1 }))).toBeNull();
    expect(parseCrop(JSON.stringify({ x: "1", y: 0, w: 1, h: 1 }))).toBeNull();
    expect(parseCrop(JSON.stringify({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 }))).toEqual({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 });
    expect((await pixel((await processBanner(await twoColour(), null))!, 0, 0)).w).toBe(1500);
  });
});
