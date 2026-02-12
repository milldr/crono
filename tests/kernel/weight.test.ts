import { describe, it, expect } from "vitest";
import { buildWeightCode } from "../../src/kernel/weight.js";

describe("buildWeightCode", () => {
  it("should navigate to diary page", () => {
    const code = buildWeightCode(["2026-02-10"]);
    expect(code).toContain("cronometer.com/#diary");
  });

  it("should check for login redirect", () => {
    const code = buildWeightCode(["2026-02-10"]);
    expect(code).toContain("Not logged in");
  });

  it("should include the requested dates", () => {
    const code = buildWeightCode(["2026-02-10", "2026-02-09"]);
    expect(code).toContain("2026-02-10");
    expect(code).toContain("2026-02-09");
  });

  it("should search for weight text in the page", () => {
    const code = buildWeightCode(["2026-02-10"]);
    expect(code).toContain("weight");
  });

  it("should extract numeric weight values", () => {
    const code = buildWeightCode(["2026-02-10"]);
    expect(code).toContain("parseFloat");
  });

  it("should handle weight units (lbs and kg)", () => {
    const code = buildWeightCode(["2026-02-10"]);
    expect(code).toContain("lbs");
    expect(code).toContain("kg");
  });

  it("should return entries array with success flag", () => {
    const code = buildWeightCode(["2026-02-10"]);
    expect(code).toContain("return { success: true, entries }");
  });

  it("should handle missing weight by returning null", () => {
    const code = buildWeightCode(["2026-02-10"]);
    expect(code).toContain("weight: null");
  });
});
