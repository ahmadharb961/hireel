// Runs on every deploy. Safe to run many times.
// 1. Creates the Freemium and Premium plans if they're missing.
// 2. If ADMIN_EMAIL is set, turns that (email-verified) account into a Super Admin.
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { DEFAULT_PLANS } from "../src/lib/default-plans";

async function ensurePlans() {
  for (const p of DEFAULT_PLANS) {
    const exists = await prisma.plan.findUnique({ where: { key: p.key } });
    if (!exists) {
      await prisma.plan.create({ data: p });
      console.log(`Created plan: ${p.nameEn}`);
    }
  }
}

/**
 * The account must already exist and have confirmed its email, so only the owner of that
 * inbox can become admin. Its candidate profile or company seat is removed: admins only administer.
 */
async function promoteAdmin(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { member: true } });
  if (!user) return console.log(`ADMIN_EMAIL: no account for ${email} yet. Sign up on the site first, confirm the email, then redeploy.`);
  if (!user.emailVerified) return console.log(`ADMIN_EMAIL: ${email} hasn't confirmed its email yet. Click the link in the email, then redeploy.`);
  if (user.role === "ADMIN") return console.log(`ADMIN_EMAIL: ${email} is already a Super Admin.`);
  await prisma.$transaction(async (tx) => {
    await tx.candidateProfile.deleteMany({ where: { userId: user.id } });
    if (user.member) {
      await tx.companyMember.delete({ where: { id: user.member.id } });
      const left = await tx.companyMember.count({ where: { companyId: user.member.companyId } });
      if (!left) await tx.company.delete({ where: { id: user.member.companyId } });
    }
    await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
  console.log(`ADMIN_EMAIL: ${email} is now a Super Admin. Log in again; you'll be asked to set up two-step sign-in.`);
}

async function main() {
  await ensurePlans();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) await promoteAdmin(adminEmail);
  console.log("Setup complete.");
}
main().finally(() => prisma.$disconnect());
