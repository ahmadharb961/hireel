import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { endpoint: string; payload: string }[] = [];
vi.mock("web-push", async (orig) => {
  const real = (await orig()) as { default: typeof import("web-push") };
  return {
    default: {
      ...real.default,
      setVapidDetails: () => {},
      sendNotification: async (sub: { endpoint: string }, payload: string) => {
        if (sub.endpoint.includes("gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
        sent.push({ endpoint: sub.endpoint, payload });
      },
    },
  };
});

const mails: { to: string; subject: string; html: string; text: string }[] = [];
vi.mock("@/lib/mailer", async (orig) => ({
  ...((await orig()) as object),
  sendMail: async (m: { to: string; subject: string; html: string; text: string }) => { mails.push(m); },
}));

import { prisma } from "@/lib/db";
import { notifyUsers, vapidKeys } from "@/server/push";
import { makeCandidate, reset } from "./helpers";

describe("notifications", () => {
  beforeEach(async () => { await reset(); sent.length = 0; mails.length = 0; await prisma.platformSetting.deleteMany({ where: { key: { startsWith: "push." } } }); });

  it("creates the signing keys once and keeps them", async () => {
    const a = await vapidKeys();
    expect(a.publicKey.length).toBeGreaterThan(40);
    expect(await prisma.platformSetting.count({ where: { key: { startsWith: "push." } } })).toBe(2);
  });

  it("sends in each person's language and removes devices that are gone", async () => {
    const c = await makeCandidate();
    await prisma.user.update({ where: { id: c.userId }, data: { locale: "ar" } });
    await prisma.pushSubscription.createMany({ data: [
      { userId: c.userId, endpoint: "https://push.example/ok", p256dh: "x".repeat(20), auth: "y".repeat(10) },
      { userId: c.userId, endpoint: "https://push.example/gone", p256dh: "x".repeat(20), auth: "y".repeat(10) },
    ] });
    await notifyUsers([c.userId], (t) => ({ title: t("push.newRequestTitle"), body: t("push.newRequestBody", { company: "Impex", role: "Marketing" }), url: "/candidate/requests", tag: "t" }));
    expect(sent).toHaveLength(1);
    const msg = JSON.parse(sent[0].payload);
    expect(msg.title).toBe("طلب تعارف جديد");
    expect(msg.body).toContain("Impex");
    expect(msg.url).toBe("/candidate/requests");
    expect(await prisma.pushSubscription.count({ where: { userId: c.userId } })).toBe(1);
  });

  it("also emails the person, with a button to the right page, and makes their text safe", async () => {
    const c = await makeCandidate();
    await notifyUsers([c.userId], (t) => ({
      title: t("push.newRequestTitle"), body: t("push.newRequestBody", { company: "<b>Impex</b>", role: "Marketing" }),
      url: "/candidate/requests", tag: "t", cta: t("push.ctaRequest"), lines: ["Their message: <script>x</script>"],
    }));
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe(`${c.userId}@test.local`);
    expect(mails[0].subject).toBe("New intro request");
    expect(mails[0].html).toContain("See the request");
    expect(mails[0].html).toContain("/candidate/requests");
    expect(mails[0].html).not.toContain("<script>");
    expect(mails[0].html).toContain("&lt;b&gt;Impex&lt;/b&gt;");
  });

  it("doesn't email demo or unconfirmed accounts", async () => {
    const a = await makeCandidate();
    const b = await makeCandidate();
    await prisma.user.update({ where: { id: a.userId }, data: { isDemo: true } });
    await prisma.user.update({ where: { id: b.userId }, data: { emailVerified: false } });
    await notifyUsers([a.userId, b.userId], (t) => ({ title: t("push.videoLiveTitle"), body: t("push.videoLiveBody"), url: "/candidate/video", tag: "v" }));
    expect(mails).toHaveLength(0);
  });

  it("never throws, even with no devices", async () => {
    await expect(notifyUsers(["nobody"], (t) => ({ title: t("push.reviewTitle"), body: "", url: "/", tag: "x" }))).resolves.toBeUndefined();
  });
});
