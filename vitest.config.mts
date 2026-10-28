import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://hireel:hireel_dev@localhost:5432/hireel_test" },
    fileParallelism: false,
    testTimeout: 20000,
  },
});
