// Creates (or promotes) a Super Admin account.
// Usage: npm run make-admin -- you@example.com "Your Name"
import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const name = process.argv[3]?.trim() || "Hireel Admin";
  if (!email || !email.includes("@")) {
    console.error('Usage: npm run make-admin -- you@example.com "Your Name"');
    process.exit(1);
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN", emailVerified: true } });
    console.log(`${email} is now a Super Admin. Sign in with the existing password; you'll be asked to set up two-step sign-in.`);
    return;
  }
  const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString("base64url");
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id, email, name, role: "ADMIN", emailVerified: true,
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    },
  });
  console.log(`Super Admin created.\n  Email:    ${email}\n  Password: ${password}\nSave this password now. You'll set up two-step sign-in on first login.`);
}
main().finally(() => prisma.$disconnect());
