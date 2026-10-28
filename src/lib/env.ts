import "server-only";

/** Server-side settings. Read from environment variables only, never hard-coded. */
export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  isProd: process.env.NODE_ENV === "production",
  cronSecret: process.env.CRON_SECRET ?? "",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 465),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.MAIL_FROM ?? "Hireel <no-reply@localhost>",
  },
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    apiToken: process.env.CLOUDFLARE_STREAM_API_TOKEN ?? "",
    customerCode: process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE ?? "",
    webhookSecret: process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET ?? "",
    signingKeyId: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID ?? "",
    signingKeyPem: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_PEM ?? "",
  },
};

export function smtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

export function streamConfigured() {
  const c = env.cloudflare;
  // The signing key, webhook and customer code are set up automatically (see lib/stream-settings).
  return Boolean(c.accountId && c.apiToken);
}
