import { describe, expect, it } from "vitest";
import { normalizeSocial } from "@/lib/social";

describe("company social links", () => {
  it("accepts full links, links without https and plain usernames", () => {
    expect(normalizeSocial("instagram", "https://www.instagram.com/impex/")).toBe("https://www.instagram.com/impex/");
    expect(normalizeSocial("instagram", "instagram.com/impex")).toBe("https://instagram.com/impex");
    expect(normalizeSocial("instagram", "@impex.lb")).toBe("https://www.instagram.com/impex.lb");
    expect(normalizeSocial("linkedin", "impex")).toBe("https://www.linkedin.com/company/impex");
    expect(normalizeSocial("linkedin", "lb.linkedin.com/company/impex")).toBe("https://lb.linkedin.com/company/impex");
    expect(normalizeSocial("facebook", "http://m.facebook.com/impex")).toBe("https://m.facebook.com/impex");
    expect(normalizeSocial("facebook", "fb.com/impex")).toBe("https://fb.com/impex");
  });
  it("leaves empty as empty", () => {
    expect(normalizeSocial("facebook", "  ")).toBe("");
  });
  it("refuses links to other sites or tricks", () => {
    expect(normalizeSocial("instagram", "https://evil.com/instagram.com")).toBeNull();
    expect(normalizeSocial("linkedin", "https://linkedin.com.evil.com/x")).toBeNull();
    expect(normalizeSocial("facebook", "javascript:alert(1)")).toBeNull();
    expect(normalizeSocial("instagram", "https://user:pw@instagram.com/x")).toBeNull();
    expect(normalizeSocial("linkedin", "https://www.linkedin.com/")).toBeNull();
    expect(normalizeSocial("facebook", "impex.com")).toBeNull();
  });
});
