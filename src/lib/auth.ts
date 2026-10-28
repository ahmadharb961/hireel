import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { prisma } from "./db";
import { sendResetEmail, sendVerificationEmail } from "./emails";
import { env } from "./env";

function localeOf(user: object): "en" | "ar" {
  return (user as { locale?: unknown }).locale === "ar" ? "ar" : "en";
}

export const auth = betterAuth({
  appName: "Hireel",
  baseURL: env.appUrl,
  trustedOrigins: [env.appUrl],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    additionalFields: {
      // Never settable from the browser: roles are assigned on the server only.
      role: { type: "string", required: false, defaultValue: "CANDIDATE", input: false },
      locale: { type: "string", required: false, defaultValue: "en", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetEmail(user.email, url, localeOf(user));
    },
  },
  emailVerification: {
    // Sent by our sign-up action after the account language is saved.
    sendOnSignUp: false,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url, localeOf(user));
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      // Per IP. Offices share one IP, so this is generous; AUTH_SIGNIN_LIMIT can tune it.
      "/sign-in/email": { window: 60, max: Number(process.env.AUTH_SIGNIN_LIMIT) || 20 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
      "/send-verification-email": { window: 60 * 10, max: 3 },
      "/two-factor/verify-totp": { window: 60, max: 6 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { suspendedAt: true } });
          if (user?.suspendedAt) throw new APIError("FORBIDDEN", { message: "ACCOUNT_SUSPENDED" });
        },
      },
    },
  },
  advanced: {
    useSecureCookies: env.isProd,
  },
  plugins: [twoFactor({ issuer: "Hireel" }), nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
