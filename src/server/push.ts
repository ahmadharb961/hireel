import "server-only";
import { createTranslator } from "next-intl";
import webpush from "web-push";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

const PUB = "push.vapidPublic";
const PRIV = "push.vapidPrivate";
let keys: { publicKey: string; privateKey: string } | null = null;

/**
 * The key pair that signs notifications. Environment variables win; otherwise Hireel creates
 * a pair once and keeps it in the database (nothing to set up on Hostinger).
 */
export async function vapidKeys() {
  if (keys) return keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    return keys;
  }
  const read = async () => Object.fromEntries((await prisma.platformSetting.findMany({ where: { key: { in: [PUB, PRIV] } } })).map((r) => [r.key, r.value]));
  let row = await read();
  if (!row[PUB] || !row[PRIV]) {
    const k = webpush.generateVAPIDKeys();
    // If two servers race, the first pair written wins and both read it back.
    await prisma.platformSetting.createMany({ data: [{ key: PUB, value: k.publicKey }, { key: PRIV, value: k.privateKey }], skipDuplicates: true });
    row = await read();
  }
  keys = { publicKey: row[PUB], privateKey: row[PRIV] };
  return keys;
}

type Msg = { title: string; body: string; url: string; tag: string };
type T = ReturnType<typeof createTranslator<typeof en, "push">>;

/**
 * Sends a notification to every device of these people, in each person's language.
 * Never throws: a failed notification must not break the action that caused it.
 * Devices that the browser says are gone are removed.
 */
export async function notifyUsers(userIds: string[], build: (t: T) => Msg) {
  try {
    if (!userIds.length) return;
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } }, include: { user: { select: { locale: true } } } });
    if (!subs.length) return;
    const k = await vapidKeys();
    const subject = env.appUrl.startsWith("https://") ? env.appUrl : `mailto:${env.smtp.user || "no-reply@localhost"}`;
    webpush.setVapidDetails(subject, k.publicKey, k.privateKey);
    await Promise.allSettled(subs.map(async (s) => {
      const t = createTranslator({ locale: s.user.locale, messages: s.user.locale === "ar" ? ar : en, namespace: "push" }) as unknown as T;
      const payload = JSON.stringify(build(t));
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, timeout: 8000, urgency: "high" });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error("push failed", code ?? e);
      }
    }));
  } catch (e) {
    console.error("push error", e);
  }
}

export async function adminIds() {
  return (await prisma.user.findMany({ where: { role: "ADMIN", suspendedAt: null }, select: { id: true } })).map((u) => u.id);
}
