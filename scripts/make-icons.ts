// Generates every PWA icon size (normal + maskable + Apple touch) from the Hireel mark.
import fs from "node:fs/promises";
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

const GREEN = "#195C48";

/** White mark on a brand-green tile: crisp in browser tabs, light or dark. */
async function tile(size: number, radius: number, padRatio: number) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const alpha = await sharp(mark).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().extractChannel(3).toBuffer();
  const white = await sharp({ create: { width: inner, height: inner, channels: 3, background: "#ffffff" } }).joinChannel(alpha).png().toBuffer();
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${GREEN}"/></svg>`);
  return sharp(bg).composite([{ input: white, gravity: "center" }]).png().toBuffer();
}

/** .ico files may simply wrap PNG images, one per size. */
function ico(images: { size: number; png: Buffer }[]) {
  const head = Buffer.alloc(6 + images.length * 16);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png }, i) => {
    const e = 6 + i * 16;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map((x) => x.png)]);
}

async function main() {
  // Browser tab icons (Next.js serves these from src/app automatically).
  const app = path.join(__dirname, "..", "src", "app");
  const fav = await Promise.all([16, 32, 48].map(async (s) => ({ size: s, png: await tile(s, Math.round(s * 0.22), 0.14) })));
  await fs.writeFile(path.join(app, "favicon.ico"), ico(fav));
  await fs.writeFile(path.join(app, "icon.png"), await tile(512, 112, 0.18));
  await fs.writeFile(path.join(app, "apple-icon.png"), await tile(180, 0, 0.2));

  for (const s of [48, 72, 96, 128, 144, 152, 192, 256, 384, 512]) await icon(s, 0.16, `icon-${s}.png`);
  // Maskable icons keep the mark inside the central safe zone.
  for (const s of [192, 512]) await icon(s, 0.24, `maskable-${s}.png`);
  await icon(180, 0.14, "apple-touch-icon.png");
  await icon(32, 0.08, "favicon-32.png");
  console.log("Icons written to public/icons and src/app");
}
main();
