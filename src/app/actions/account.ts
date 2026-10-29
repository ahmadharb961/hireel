"use server";
import { cookies } from "next/headers";
import { deleteAccount } from "@/server/account";
import { rateLimit } from "@/server/ratelimit";
import { getViewer } from "@/server/session";

/** Words that confirm deletion; the person types one of them (English or Arabic). */
const CONFIRM = ["DELETE", "حذف"];

export async function deleteMyAccount(confirm: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await getViewer();
  if (!v) return { ok: false, error: "UNAUTHORIZED" };
  if (!CONFIRM.includes(String(confirm).trim().toUpperCase())) return { ok: false, error: "confirm_word" };
  if (!(await rateLimit(`delete-account:${v.id}`, 5, 3600))) return { ok: false, error: "rate_limited" };
  const r = await deleteAccount(v.id);
  if (!r.ok) return { ok: false, error: r.error === "admin" ? "generic" : r.error };
  // The sessions are gone with the account; drop the cookies too.
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.includes("better-auth")) jar.delete(c.name);
  return { ok: true };
}
