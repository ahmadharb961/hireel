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

import { prisma } from "@/lib/db";
import { notifyUsers, vapidKeys } from "@/server/push";
import { makeCandidate, reset } from "./helpers";

describe("notifications", () => {
  beforeEach(async () => { await reset(); sent.length = 0; await prisma.platformSetting.deleteMany({ where: { key: { startsWith: "push." } } }); });

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
    await notifyUsers([c.userId], (t) => ({ title: t("newRequestTitle"), body: t("newRequestBody", { company: "Impex", role: "Marketing" }), url: "/candidate/requests", tag: "t" }));
    expect(sent).toHaveLength(1);
    const msg = JSON.parse(sent[0].payload);
    expect(msg.title).toBe("طلب تعارف جديد");
    expect(msg.body).toContain("Impex");
    expect(msg.url).toBe("/candidate/requests");
    expect(await prisma.pushSubscription.count({ where: { userId: c.userId } })).toBe(1);
  });

  it("never throws, even with no devices", async () => {
    await expect(notifyUsers(["nobody"], (t) => ({ title: t("reviewTitle"), body: "", url: "/", tag: "x" }))).resolves.toBeUndefined();
  });
});
