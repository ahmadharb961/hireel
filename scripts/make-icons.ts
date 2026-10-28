// Generates every PWA icon size (normal + maskable + Apple touch) from one SVG mark.
import sharp from "sharp";
import path from "node:path";

const out = path.join(__dirname, "..", "public", "icons");
const mark = (pad: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#195C48"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <rect x="132" y="96" width="248" height="320" rx="44" fill="none" stroke="#B3E2CD" stroke-width="28"/>
    <path d="M220 196 L316 256 L220 316 Z" fill="#FAF9F6"/>
  </g>
</svg>`;

async function main() {
  const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];
  for (const s of sizes) await sharp(Buffer.from(mark(40))).resize(s, s).png().toFile(path.join(out, `icon-${s}.png`));
  // Maskable icons keep the mark inside the 80% safe zone.
  for (const s of [192, 512]) await sharp(Buffer.from(mark(110))).resize(s, s).png().toFile(path.join(out, `maskable-${s}.png`));
  await sharp(Buffer.from(mark(60))).resize(180, 180).png().toFile(path.join(out, "apple-touch-icon.png"));
  await sharp(Buffer.from(mark(40))).resize(32, 32).png().toFile(path.join(out, "favicon-32.png"));
  console.log("Icons written to public/icons");
}
main();
