import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

const MAIL_DIR = path.join(process.cwd(), ".dev-mail");

/** Reads the newest development email sent to `to` and returns the first link in it. */
export async function linkFromEmail(to: string, subjectPart?: RegExp): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const files = fs.existsSync(MAIL_DIR) ? fs.readdirSync(MAIL_DIR).filter((f) => f.includes(to.replace(/[^a-z0-9@.]/gi, "_"))).sort() : [];
    for (const f of files.reverse()) {
      const mail = JSON.parse(fs.readFileSync(path.join(MAIL_DIR, f), "utf8")) as { subject: string; text: string };
      if (subjectPart && !subjectPart.test(mail.subject)) continue;
      const m = mail.text.match(/https?:\/\/\S+/);
      if (m) return m[0];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email for ${to}`);
}

function base32Decode(s: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** Standard 6-digit TOTP code (what an authenticator app shows). */
export function totp(secret: string, now = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const h = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString();
  return code.padStart(6, "0");
}

export async function noSideScroll(page: Page) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(wide, `page scrolls sideways: ${page.url()}`).toBe(false);
}

export const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
