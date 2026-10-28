import { randomBytes } from "node:crypto";

/** 24 random bytes → 32-character URL-safe token. Unguessable. */
export function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isShareTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}
