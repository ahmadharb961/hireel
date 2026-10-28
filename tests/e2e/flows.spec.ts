import { expect, test, type Page } from "@playwright/test";
import { linkFromEmail, noSideScroll, totp, unique } from "./helpers";

const PASSWORD = "Str0ng-pass!";
const id = unique();
const candEmail = `cand.${id}@example.com`;
const empEmail = `emp.${id}@example.com`;
const lastName = `Cand${id}`;

async function verifyFromEmail(page: Page, email: string) {
  const link = await linkFromEmail(email, /Confirm|تأكيد/);
  await page.goto(link);
}

async function login(page: Page, email: string, password = PASSWORD) {
  await page.context().clearCookies(); // start signed out
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Log in" }).last().click();
}

/** Log in and wait until the app has moved past the login screen. */
async function signIn(page: Page, email: string, password = PASSWORD) {
  await login(page, email, password);
  await page.waitForURL((u) => !/^\/(login|welcome)$/.test(u.pathname));
  await page.waitForLoadState("networkidle");
}

// The install banner has its own test; keep it out of the way elsewhere.
test.beforeEach(async ({ page }, info) => {
  if (info.title.startsWith("install banner")) return;
  await page.addInitScript(() => localStorage.setItem("hireel_install_dismissed", String(Date.now())));
});

test.describe.serial("Hireel core loop", () => {
  test("visitor can watch reels but must sign up to act", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Your next opportunity starts with a video/ })).toBeVisible();
    await noSideScroll(page);
    await page.getByRole("link", { name: "Discover Talent" }).first().click();
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.locator(".item").first()).toBeVisible();
    // Employers-only demo candidate is hidden from visitors.
    await expect(page.getByText("Karim Nassar")).toHaveCount(0);
    await expect(page.locator(".item")).toHaveCount(5);
    await page.locator(".item").first().getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog", { name: "Sign up as an employer" })).toBeVisible();
    await page.getByRole("button", { name: "Keep watching" }).click();
    // Filters panel closes after a choice.
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.locator(".chips").getByRole("button", { name: "Arabic" }).click();
    await expect(page).toHaveURL(/lang=AR/);
    await expect(page.locator(".chips")).toHaveCount(0);
    await expect(page.locator(".item")).toHaveCount(4); // Lina, Maya, Omar, Nour have Arabic videos
  });

  test("candidate signs up, verifies email, onboards and publishes", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#firstName", "Test");
    await page.fill("#lastName", lastName);
    await page.fill("#email", candEmail);
    await page.fill("#password", PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Please agree to the Terms")).toBeVisible();
    await page.check('input[name="agree"]');
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

    // Can't log in before verifying.
    await login(page, candEmail);
    await expect(page.getByText("Please confirm your email first")).toBeVisible();

    await verifyFromEmail(page, candEmail);
    await expect(page).toHaveURL(/\/candidate\/onboarding/);
    await page.fill("#headline", "QA Engineer");
    await page.fill("#location", "Beirut, Lebanon");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.fill("#currentTitle", "QA Lead");
    await page.selectOption("#industry", "technology");
    await page.fill("#years", "5");
    await page.fill("#skill", "Playwright");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Text-only profile/ }).click();
    await page.fill("#about", "I test web apps end to end and care about accessibility and speed.");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Publish my profile" }).click();
    await expect(page.getByText("Please tick the consent box to publish.")).toBeVisible();
    await page.check('input[type="checkbox"]');
    await page.getByRole("button", { name: "Publish my profile" }).click();
    await expect(page).toHaveURL(/\/candidate$/);
    await expect(page.getByRole("heading", { name: "Welcome, Test" })).toBeVisible();
    await noSideScroll(page);

    // Video studio honestly says uploads aren't connected (no Cloudflare keys in this test).
    await page.getByRole("link", { name: "My Video" }).click();
    await expect(page.getByText("Video uploads aren’t switched on yet")).toBeVisible();
  });

  test("share link is off by default, works when on, and dies when regenerated", async ({ page }) => {
    await signIn(page, candEmail);
    await page.goto("/candidate/share");
    await expect(page.locator("#share-url")).toHaveCount(0);
    await page.getByRole("button", { name: "Shareable profile link" }).click();
    const url = await page.locator("#share-url").inputValue();
    expect(url).toMatch(/\/p\/[A-Za-z0-9_-]{32}$/);
    const path = new URL(url).pathname;
    const pub = await page.context().newPage();
    const res = await pub.goto(path);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(pub.getByRole("heading", { name: `Test ${lastName}` })).toBeVisible();
    await expect(pub.getByText("Playwright")).toBeVisible();
    await expect(pub.getByText(candEmail)).toHaveCount(0);
    await page.getByRole("button", { name: "Make a new link" }).click();
    await expect(page.locator("#share-url")).not.toHaveValue(url);
    await pub.goto(path);
    await expect(pub.getByRole("heading", { name: "This link doesn’t work anymore" })).toBeVisible();
  });

  test("employer signs up, finds the candidate and requests an intro within plan limits", async ({ page }) => {
    await page.goto("/signup?role=employer");
    await page.fill("#companyName", `Cedar Test ${id}`);
    await page.fill("#email", empEmail);
    await page.fill("#contactName", "Sara Recruiter");
    await page.fill("#position", "HR Manager");
    await page.selectOption("#industry", "retail");
    await page.fill("#password", PASSWORD);
    await page.check('input[name="agree"]');
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await verifyFromEmail(page, empEmail);
    await expect(page).toHaveURL(/\/feed/);
    // Signed-in employers also see employers-only candidates.
    await expect(page.locator(".item")).toHaveCount(5);
    // The page now shows before it is fully interactive, so keep scrolling until more load.
    await expect(async () => {
      await page.locator(".feed").evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await expect(page.locator(".item")).toHaveCount(6, { timeout: 1000 });
    }).toPass({ timeout: 10000 });

    await page.goto(`/search?q=${lastName}`);
    await page.getByRole("link", { name: new RegExp(lastName) }).click();
    await expect(page.getByText("Hidden until Test accepts your request.")).toBeVisible();
    await page.getByRole("button", { name: "Request intro" }).click();
    await page.fill("#roleTitle", "QA Lead");
    await page.fill("#message", "Your profile is a great fit for our team.");
    await page.check('input[name="wantsCv"]');
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("button", { name: "Request sent" })).toBeVisible();

    await page.goto("/employer/account");
    await expect(page.getByText("Free during our launch")).toBeVisible();
    await expect(page.getByText("Fair-use limits this month")).toBeVisible();
    await expect(page.locator(".meter").first()).toBeVisible();
    await expect(page.getByText(/^1$/).first()).toBeVisible();
    await noSideScroll(page);
  });

  test("candidate accepts and chooses what to share; employer then sees only that", async ({ page }) => {
    await signIn(page, candEmail);
    await page.goto("/candidate/requests");
    await expect(page.getByText(`Cedar Test ${id}`)).toBeVisible();
    await expect(page.getByText("They also asked to see your CV and contact details")).toBeVisible();
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Phone").uncheck();
    await dialog.getByLabel(/CV/).uncheck();
    await dialog.getByRole("button", { name: "Accept and share" }).click();
    await expect(page.getByText("You shared: Email.")).toBeVisible();

    await signIn(page, empEmail);
    await page.goto("/employer/inbox");
    await expect(page.getByText("Accepted")).toBeVisible();
    await expect(page.getByText(candEmail)).toBeVisible();
  });

  test("permissions are enforced on the server", async ({ page, request }) => {
    await signIn(page, empEmail);
    await page.goto("/candidate");
    await expect(page).toHaveURL(/\/feed/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/feed/);
    expect((await request.post("/api/videos/tus?videoId=x")).status()).toBe(401);
    expect((await request.post("/api/stream/webhook", { data: { uid: "x" } })).status()).toBe(401);
    expect((await request.get("/api/cron/cleanup")).status()).toBe(401);
    const view = await request.post("/api/views", { data: { videoId: "x", watchedMs: 5000 } });
    expect((await view.json()).counted).toBe(false);
  });

  test("admin must set up two-step sign-in, then can verify companies and edit plans", async ({ page }) => {
    await login(page, "admin@hireel.test", "AdminPass-123");
    await expect(page).toHaveURL(/\/admin\/setup-2fa/);
    await page.fill("#password", "AdminPass-123");
    await page.getByRole("button", { name: "Continue" }).click();
    const secret = (await page.locator("code").innerText()).trim();
    await page.fill("#code", totp(secret));
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByRole("heading", { name: "Save your backup codes" })).toBeVisible();
    await page.getByRole("link", { name: "Go to admin" }).click();
    await expect(page.getByText("Real accounts only")).toBeVisible();

    // Sign out and back in: the code is now required.
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await login(page, "admin@hireel.test", "AdminPass-123");
    await expect(page).toHaveURL(/\/login\/two-factor/);
    await page.fill("#code", totp(secret));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/admin/);

    await page.goto("/admin/plans");
    await page.fill("#free-monthlyIntroRequests", "7");
    await page.getByRole("button", { name: "Save plans" }).click();
    await expect(page.getByText("Plans saved")).toBeVisible();

    await page.goto("/admin/employers");
    const card = page.locator(".card", { hasText: `Cedar Test ${id}` });
    await card.getByRole("button", { name: "Verify" }).click();
    await expect(card.getByText("Verified")).toBeVisible();

    await signIn(page, empEmail);
    await page.goto("/employer/account");
    await expect(page.getByText("/ 7").first()).toBeVisible();
    await expect(page.getByText("Verified").first()).toBeVisible();
  });

  test("the whole app works in Arabic, right to left", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Language/ }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: /فرصتك القادمة تبدأ بفيديو/ })).toBeVisible();
    for (const p of ["/", "/signup", "/login", "/feed", "/search", "/privacy", "/terms"]) {
      const r = await page.goto(p);
      expect(r?.status(), p).toBeLessThan(400);
      await noSideScroll(page);
    }
    await page.goto("/login");
    await page.fill("#email", candEmail);
    await page.fill("#password", PASSWORD);
    await page.getByRole("button", { name: "تسجيل الدخول" }).last().click();
    await expect(page.getByRole("heading", { name: /مرحباً، Test/ })).toBeVisible();
    for (const p of ["/candidate/video", "/candidate/profile", "/candidate/share", "/candidate/requests", "/candidate/edit"]) {
      const r = await page.goto(p);
      expect(r?.status(), p).toBeLessThan(400);
      await noSideScroll(page);
    }
  });

  test("PWA: manifest, icons and service worker are served", async ({ request }) => {
    const m = await (await request.get("/manifest.webmanifest")).json();
    expect(m.display).toBe("standalone");
    expect(m.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
    for (const i of m.icons) expect((await request.get(i.src)).status()).toBe(200);
    expect((await request.get("/sw.js")).status()).toBe(200);
    expect((await request.get("/offline.html")).status()).toBe(200);
  });

  test("install banner: shows on the 2nd page view on iPhone, explains Add to Home Screen, and stays hidden 30 days after closing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Install Hireel" })).toHaveCount(0);
    await page.goto("/privacy");
    const banner = page.getByRole("region", { name: "Install Hireel" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Install" }).click();
    await expect(page.getByRole("dialog", { name: "Add Hireel to your Home Screen" })).toBeVisible();
    await page.getByRole("button", { name: "Not now" }).click();
    await page.goto("/terms");
    await expect(page.getByRole("region", { name: "Install Hireel" })).toHaveCount(0);
  });

  test("desktop: wide layouts, not a phone column", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator(".h2-art")).toBeVisible();
    const hero = await page.locator(".h2-hero").boundingBox();
    expect(hero!.width).toBeGreaterThan(1400);
    const copy = await page.locator(".h2-copy").boundingBox();
    const art = await page.locator(".h2-art").boundingBox();
    expect(art!.x).toBeGreaterThan(copy!.x + copy!.width - 1); // side by side
    await noSideScroll(page);
    await page.goto("/login");
    await expect(page.locator(".authside")).toBeVisible();
    await page.fill("#email", candEmail);
    await page.fill("#password", PASSWORD);
    await page.getByRole("button", { name: "Log in" }).last().click();
    await page.waitForURL(/\/candidate/);
    await expect(page.locator("nav.bn")).toBeVisible();
    const nav = await page.locator("nav.bn").boundingBox();
    expect(nav!.height).toBeGreaterThan(nav!.width); // menu runs down the side
    const main = await page.locator(".main").boundingBox();
    expect(main!.width).toBeGreaterThan(1000);
    await noSideScroll(page);
    await ctx.close();
  });
});
