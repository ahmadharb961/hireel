import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env, smtpConfigured } from "./env";

export type Mail = { to: string; subject: string; text: string; html: string };

let transport: Transporter | null = null;
function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transport;
}

/**
 * Sends one email through the configured SMTP mailbox (Hostinger).
 * In development without SMTP settings, the email is written to `.dev-mail/` instead,
 * so links can still be opened. Production refuses to run without SMTP.
 */
export async function sendMail(mail: Mail) {
  if (smtpConfigured()) {
    await getTransport().sendMail({ from: env.smtp.from, ...mail });
    return;
  }
  if (env.isProd && process.env.HIREEL_E2E !== "1") {
    throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }
  const dir = path.join(process.cwd(), ".dev-mail");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${mail.to.replace(/[^a-z0-9@.]/gi, "_")}.json`);
  await fs.writeFile(file, JSON.stringify(mail, null, 2));
  console.log(`[dev-mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
}

const BRAND = "#195C48";

/** `footer` is plain text, shown small under the button. */
export function layoutEmail(locale: "en" | "ar", title: string, body: string, cta?: { label: string; url: string }, footer?: string) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const button = cta
    ? `<p style="margin:28px 0"><a href="${cta.url}" style="background:${BRAND};color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700;display:inline-block">${cta.label}</a></p><p style="font-size:12px;color:#69766F;word-break:break-all">${cta.url}</p>`
    : "";
  return `<!doctype html><html dir="${dir}" lang="${locale}"><body style="margin:0;background:#FAF9F6;font-family:Inter,Arial,sans-serif;color:#182722"><div style="max-width:520px;margin:0 auto;padding:32px 20px"><div style="font-weight:800;font-size:22px;color:${BRAND}">Hireel</div><h1 style="font-size:20px;margin:24px 0 8px">${title}</h1><div style="font-size:15px;line-height:1.55;color:#182722">${body}</div>${button}${footer ? `<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #E3E8E5;font-size:12px;color:#69766F">${footer}</p>` : ""}</div></body></html>`;
}
