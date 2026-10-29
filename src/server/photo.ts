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

/** Company cover banners: 1500×500 (3:1) centre crop, WebP, metadata removed. */
export async function processBanner(input: Uint8Array): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const img = await sharp(input, { limitInputPixels: 80_000_000, failOn: "error" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height || !["jpeg", "png", "webp", "heif", "avif", "tiff"].includes(meta.format ?? "")) return null;
    const out = await img.rotate().resize(1500, 500, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}
