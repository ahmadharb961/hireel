import "server-only";
import { createTranslator } from "next-intl";
import webpush from "web-push";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { layoutEmail, sendMail } from "@/lib/mailer";
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

type Msg = {
  title: string;
  body: string;
  /** Page inside Hireel to open (phone) or link to (email button). */
  url: string;
  tag: string;
  /** Email only: label of the button, and extra detail lines (escaped before sending). */
  cta?: string;
  lines?: string[];
};
type T = ReturnType<typeof createTranslator<typeof en>>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const translator = (locale: string) => createTranslator({ locale, messages: locale === "ar" ? ar : en }) as unknown as T;

/**
 * Tells these people about something, in each person's own language:
 * a phone notification on every device they turned on, and an email to their login address.
 * Never throws: a failed notification must not break the action that caused it.
 */
export async function notifyUsers(userIds: string[], build: (t: T) => Msg, opts: { email?: boolean } = {}) {
  if (!userIds.length) return;
  await Promise.allSettled([sendPush(userIds, build), opts.email === false ? null : sendEmails(userIds, build)]);
}

async function sendEmails(userIds: string[], build: (t: T) => Msg) {
  try {
    // Demo accounts use made-up addresses; unconfirmed addresses may not belong to the person.
    const users = await prisma.user.findMany({ where: { id: { in: userIds }, isDemo: false, emailVerified: true, suspendedAt: null }, select: { email: true, locale: true } });
    await Promise.allSettled(users.map(async (u) => {
      const t = translator(u.locale);
      const m = build(t);
      const link = new URL(m.url, env.appUrl).toString();
      const details = (m.lines ?? []).filter(Boolean);
      const html = `<p style="margin:0 0 12px">${esc(m.body)}</p>${details.map((l) => `<p style="margin:0 0 6px;color:#4b5a53">${esc(l)}</p>`).join("")}`;
      const text = [m.body, ...details, "", link, "", t("push.emailFooter")].join("\n");
      await sendMail({ to: u.email, subject: m.title, text, html: layoutEmail(u.locale === "ar" ? "ar" : "en", esc(m.title), html, { label: esc(m.cta ?? t("push.ctaOpen")), url: link }, esc(t("push.emailFooter"))) });
    }));
  } catch (e) {
    console.error("email notification error", e);
  }
}

async function sendPush(userIds: string[], build: (t: T) => Msg) {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } }, include: { user: { select: { locale: true } } } });
    if (!subs.length) return;
    const k = await vapidKeys();
    const subject = env.appUrl.startsWith("https://") ? env.appUrl : `mailto:${env.smtp.user || "no-reply@localhost"}`;
    webpush.setVapidDetails(subject, k.publicKey, k.privateKey);
    await Promise.allSettled(subs.map(async (s) => {
      const { title, body, url, tag } = build(translator(s.user.locale));
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url, tag }), { TTL: 60 * 60 * 24, timeout: 8000, urgency: "high" });
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
