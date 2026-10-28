import { describe, expect, it } from "vitest";
import { filtersToQuery, parseFeedFilters } from "@/lib/feed-filters";

describe("feed filters", () => {
  it("keeps only allowed, job-related values", () => {
    const q = new URLSearchParams("industry=finance&exp=3-5&place=Qatar&avail=AVAILABLE_NOW&lang=AR&age=30&exp2=x");
    expect(parseFeedFilters((k) => q.get(k))).toEqual({ industry: "finance", lang: "AR", exp: "3-5", place: "Qatar", avail: "AVAILABLE_NOW" });
  });
  it("ignores unknown values", () => {
    const q = new URLSearchParams("industry=gender&exp=99&place=Mars&avail=x&lang=DE");
    expect(Object.values(parseFeedFilters((k) => q.get(k))).every((v) => v === null)).toBe(true);
  });
  it("round-trips through the address bar", () => {
    expect(filtersToQuery({ industry: "hr", exp: null, place: "Lebanon" }).toString()).toBe("industry=hr&place=Lebanon");
  });
});
