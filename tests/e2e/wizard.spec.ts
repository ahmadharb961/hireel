import { expect, test, type Page } from "@playwright/test";
import { linkFromEmail, unique } from "./helpers";
const PASSWORD = "Str0ng-pass!";
test("setup steps: Back works and a failed save never freezes the button", async ({ page }) => {
  const email = `repro.${unique()}@example.com`;
  await page.goto("/signup");
  await page.fill("#firstName", "Ahmad"); await page.fill("#lastName", "Harb");
  await page.fill("#email", email); await page.fill("#password", PASSWORD);
  await page.check('input[name="agree"]');
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.goto(await linkFromEmail(email));
  await expect(page).toHaveURL(/\/candidate\/onboarding/);
  await page.fill("#headline", "Marketing Director"); await page.fill("#location", "Lebanon"); await page.fill("#phone", "+96176000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.fill("#currentTitle", "Director"); await page.selectOption("#industry", "marketing"); await page.fill("#years", "8");
  await page.fill("#skill", "SEO"); await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Text-only profile/ }).click();
  await page.fill("#about", "I lead marketing teams and grow brands across the region with data.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Publish my profile" })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  // Saving fails (no connection, or the site was updated): the button must recover.
  await page.route("**/candidate/onboarding", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/Couldn’t save/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
  await page.unroute("**/candidate/onboarding");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 2 of 4")).toBeVisible();

  // The candidate can always sign out from the profile menu at the top.
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto("/candidate");
  await expect(page).toHaveURL(/\/login/);
});
