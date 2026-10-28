// Generates every PWA icon size (normal + maskable + Apple touch) from the Hireel mark.
import path from "node:path";
import sharp from "sharp";

const pub = path.join(__dirname, "..", "public");
const out = path.join(pub, "icons");
const mark = path.join(pub, "brand", "mark.png");
const BG = { r: 250, g: 249, b: 246, alpha: 1 };

async function icon(size: number, padRatio: number, file: string) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const m = await sharp(mark).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } }).composite([{ input: m, gravity: "center" }]).png().toFile(path.join(out, file));
}

async function main() {
  for (const s of [48, 72, 96, 128, 144, 152, 192, 256, 384, 512]) await icon(s, 0.16, `icon-${s}.png`);
  // Maskable icons keep the mark inside the central safe zone.
  for (const s of [192, 512]) await icon(s, 0.24, `maskable-${s}.png`);
  await icon(180, 0.14, "apple-touch-icon.png");
  await icon(32, 0.08, "favicon-32.png");
  console.log("Icons written to public/icons");
}
main();
