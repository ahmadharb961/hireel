// Creates the records Hireel always needs (the Freemium and Premium plans). Safe to run many times.
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { DEFAULT_PLANS } from "../src/lib/default-plans";

async function main() {
  for (const p of DEFAULT_PLANS) {
    const exists = await prisma.plan.findUnique({ where: { key: p.key } });
    if (!exists) {
      await prisma.plan.create({ data: p });
      console.log(`Created plan: ${p.nameEn}`);
    }
  }
  console.log("Setup complete.");
}
main().finally(() => prisma.$disconnect());
