import "server-only";
import sharp from "sharp";

export const MAX_PHOTO_INPUT_BYTES = 12 * 1024 * 1024;

/**
 * Turns any uploaded image into a 512×512 WebP: rotated upright, centred square crop,
 * and with all metadata removed (phone photos can contain the GPS location).
 * Returns null if the file isn't a readable image.
 */
export async function processPhoto(input: Uint8Array): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const img = sharp(input, { limitInputPixels: 60_000_000, failOn: "error" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height || !["jpeg", "png", "webp", "heif", "avif", "gif", "tiff"].includes(meta.format ?? "")) return null;
    const out = await img.rotate().resize(512, 512, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}
