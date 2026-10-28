import { describe, expect, it } from "vitest";
import { candidateSignUpSchema, employerSignUpSchema, introRequestSchema, profileExperienceSchema } from "@/lib/validation";

describe("form checks", () => {
  it("requires consent to the terms and an 8+ character password", () => {
    const ok = { firstName: "Lina", lastName: "Haddad", email: "LINA@Example.com ", password: "longenough", country: "Lebanon", agree: "on" };
    const p = candidateSignUpSchema.safeParse(ok);
    expect(p.success && p.data.email).toBe("lina@example.com");
    expect(candidateSignUpSchema.safeParse({ ...ok, agree: undefined }).success).toBe(false);
    expect(candidateSignUpSchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
  });
  it("never accepts a role from the sign-up form", () => {
    const p = employerSignUpSchema.safeParse({ companyName: "Cedar", email: "a@b.co", password: "longenough", contactName: "Sara", position: "", industry: "retail", website: "", size: "11-50", country: "Lebanon", agree: "on", role: "ADMIN" });
    expect(p.success).toBe(true);
    expect(p.success && "role" in p.data).toBe(false);
  });
  it("limits skills to 8 and needs at least one", () => {
    const base = { currentTitle: "Dev", industry: "technology", yearsExperience: "4", availability: "AVAILABLE_NOW" };
    expect(profileExperienceSchema.safeParse({ ...base, skills: [] }).success).toBe(false);
    expect(profileExperienceSchema.safeParse({ ...base, skills: Array(9).fill("x") }).success).toBe(false);
    expect(profileExperienceSchema.safeParse({ ...base, skills: ["React"] }).success).toBe(true);
  });
  it("needs a 10+ character intro message", () => {
    const base = { candidateId: "c1", roleTitle: "Marketing Lead", employment: "FULL_TIME", workLocation: "", payRange: "", wantsCv: false };
    expect(introRequestSchema.safeParse({ ...base, message: "hi" }).success).toBe(false);
    expect(introRequestSchema.safeParse({ ...base, message: "We liked your video a lot." }).success).toBe(true);
  });
});
