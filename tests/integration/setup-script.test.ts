import { execSync } from "node:child_process";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeCandidate, reset } from "./helpers";

const run = (adminEmail: string) =>
  execSync("npx tsx scripts/setup.ts", { env: { ...process.env, ADMIN_EMAIL: adminEmail }, encoding: "utf8" });

describe("deploy setup script", () => {
  beforeEach(reset);

  it("promotes a verified account named in ADMIN_EMAIL and removes its candidate profile", async () => {
    const c = await makeCandidate();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: c.userId } });
    const out = run(user.email.toUpperCase());
    expect(out).toContain("is now a Super Admin");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: c.userId } });
    expect(after.role).toBe("ADMIN");
    expect(await prisma.candidateProfile.count({ where: { userId: c.userId } })).toBe(0);
    expect(run(user.email)).toContain("already a Super Admin");
  });

  it("refuses accounts that haven't confirmed their email, and unknown emails", async () => {
    const c = await makeCandidate();
    await prisma.user.update({ where: { id: c.userId }, data: { emailVerified: false } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: c.userId } });
    expect(run(user.email)).toContain("hasn't confirmed");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: c.userId } })).role).toBe("CANDIDATE");
    expect(run("nobody@example.com")).toContain("no account");
  });
});
