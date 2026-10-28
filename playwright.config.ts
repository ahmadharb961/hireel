import { defineConfig, devices } from "@playwright/test";

// Run against a started server: see tests/e2e/README in docs/TESTING.md.
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    ...devices["iPhone 13"],
    browserName: "chromium",
    trace: "retain-on-failure",
  },
});
