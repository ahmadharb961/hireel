import { execSync } from "node:child_process";

/** Applies migrations to the separate test database before the tests run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://hireel:hireel_dev@localhost:5432/hireel_test";
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
