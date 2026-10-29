import { Client } from "pg";

/**
 * Rate limits are real in tests too, so clear their counters for a fresh run.
 * The admin test sets up two-step sign-in from scratch each run.
 * Each run also undoes the admin test's homepage and category changes.
 */
export default async function setup() {
  const db = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://hireel:hireel_dev@localhost:5432/hireel_e2e" });
  await db.connect();
  await db.query(`TRUNCATE "AppRateLimit", "rateLimit"`);
  const admin = `SELECT id FROM "user" WHERE email = 'admin@hireel.test'`;
  await db.query(`DELETE FROM "twoFactor" WHERE "userId" IN (${admin})`);
  await db.query(`DELETE FROM "session" WHERE "userId" IN (${admin})`);
  await db.query(`UPDATE "user" SET "twoFactorEnabled" = false WHERE email = 'admin@hireel.test'`);
  // The admin test adds a category, renames one and picks a Top employer: start from the original state.
  await db.query(`DELETE FROM "Category" WHERE "key" = 'real-estate'`);
  await db.query(`UPDATE "Category" SET "nameEn" = 'Marketing' WHERE "key" = 'marketing'`);
  await db.query(`UPDATE "Company" SET "featuredRank" = NULL`);
  await db.end();
}
