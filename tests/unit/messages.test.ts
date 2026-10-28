import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DYNAMIC, hasKey, usedKeys } from "../../scripts/message-keys";

const load = (l: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "messages", `${l}.json`), "utf8"));

function flatten(o: Record<string, unknown>, p = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? flatten(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
}

describe("translations", () => {
  const { keys } = usedKeys();
  const all = [...new Set([...keys, ...DYNAMIC])];
  for (const locale of ["en", "ar"]) {
    it(`${locale} has every key the app uses`, () => {
      const msgs = load(locale);
      expect(all.filter((k) => !hasKey(msgs, k))).toEqual([]);
    });
  }
  it("English and Arabic have exactly the same keys", () => {
    expect(flatten(load("ar")).sort()).toEqual(flatten(load("en")).sort());
  });
  it("finds a realistic number of keys (the scanner works)", () => {
    expect(keys.size).toBeGreaterThan(400);
  });
});
