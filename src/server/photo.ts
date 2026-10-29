import "server-only";
import type SharpType from "sharp";

// Loaded only when an image is actually processed, so building the site never starts the image library.
let sharpLib: typeof SharpType | null = null;
async function sharp(...args: Parameters<typeof SharpType>) {
  sharpLib ??= (await import("sharp")).default;
  sharpLib.concurrency(1);
  return sharpLib(...args);
}

export const MAX_PHOTO_INPUT_BYTES = 12 * 1024 * 1024;

/**
 * Turns any uploaded image into a 512×512 WebP: rotated upright, centred square crop,
 * and with all metadata removed (phone photos can contain the GPS location).
 * Returns null if the file isn't a readable image.
 */
export async function processPhoto(input: Uint8Array): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const img = await sharp(input, { limitInputPixels: 60_000_000, failOn: "error" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height || !["jpeg", "png", "webp", "heif", "avif", "gif", "tiff"].includes(meta.format ?? "")) return null;
    const out = await img.rotate().resize(512, 512, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}

/** Company logos keep their whole shape (no cropping) on a transparent 256×256 square, metadata removed. */
export async function processLogo(input: Uint8Array): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const img = await sharp(input, { limitInputPixels: 60_000_000, failOn: "error" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height || !["jpeg", "png", "webp", "heif", "avif", "gif", "tiff"].includes(meta.format ?? "")) return null;
    const out = await img.rotate().resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88 }).toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}

/**
 * The part of an image the person chose, as fractions of the upright image (0 = left/top edge, 1 = right/bottom).
 * It may reach past the edges when they zoomed out to fit the whole picture; that space is filled with white.
 */
export type Crop = { x: number; y: number; w: number; h: number };

/** Reads a crop sent by the browser. Anything odd is ignored (the automatic crop is used instead). */
export function parseCrop(raw: unknown): Crop | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  try {
    const c = JSON.parse(raw) as Partial<Crop>;
    const ok = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
    if (!ok(c.x, -2, 1) || !ok(c.y, -2, 1) || !ok(c.w, 0.001, 3) || !ok(c.h, 0.001, 3)) return null;
    return { x: c.x!, y: c.y!, w: c.w!, h: c.h! };
  } catch {
    return null;
  }
}

/** Company cover banners: 1500×500 (3:1), WebP, metadata removed. Uses the person's crop, or picks the busiest area. */
export async function processBanner(input: Uint8Array, crop: Crop | null = null): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const img = await sharp(input, { limitInputPixels: 80_000_000, failOn: "error" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height || !["jpeg", "png", "webp", "heif", "avif", "tiff"].includes(meta.format ?? "")) return null;
    if (!crop) {
      const out = await img.rotate().resize(1500, 500, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
      return new Uint8Array(out);
    }
    // Turn the photo upright first, so the fractions match what the person saw on screen.
    const up = await img.rotate().toBuffer({ resolveWithObject: true });
    const W = up.info.width;
    const H = up.info.height;
    let left = Math.round(crop.x * W);
    let top = Math.round(crop.y * H);
    const width = Math.max(1, Math.round(crop.w * W));
    const height = Math.max(1, Math.round(crop.h * H));
    // Pad with white wherever the chosen area goes past the picture, then cut it out.
    const pad = { left: Math.max(0, -left), top: Math.max(0, -top), right: Math.max(0, left + width - W), bottom: Math.max(0, top + height - H) };
    left += pad.left;
    top += pad.top;
    // Two passes: sharp always cuts before it pads within one pass.
    const padded = Object.values(pad).some(Boolean)
      ? await (await sharp(up.data)).extend({ ...pad, background: { r: 255, g: 255, b: 255, alpha: 1 } }).toBuffer()
      : up.data;
    const out = await (await sharp(padded))
      .extract({ left, top, width, height })
      .resize(1500, 500, { fit: "fill" })
      .flatten({ background: "#ffffff" })
      .webp({ quality: 82 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}
