// Removes every demo row. Real data is never touched.
import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const users = await prisma.user.deleteMany({ where: { isDemo: true } });
  const companies = await prisma.company.deleteMany({ where: { isDemo: true } });
  console.log(`Removed ${users.count} demo users and ${companies.count} demo companies (and everything linked to them).`);
}
main().finally(() => prisma.$disconnect());
