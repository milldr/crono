import { describe, it, expect } from "vitest";
import { buildDiaryCode } from "../../src/kernel/diary.js";

describe("buildDiaryCode", () => {
  it("should navigate to diary page", () => {
    const code = buildDiaryCode(["2026-02-10"]);
    expect(code).toContain("cronometer.com/#diary");
  });

  it("should check for login redirect", () => {
    const code = buildDiaryCode(["2026-02-10"]);
    expect(code).toContain("Not logged in");
  });

  it("should include the requested dates", () => {
    const code = buildDiaryCode(["2026-02-10", "2026-02-09"]);
    expect(code).toContain("2026-02-10");
    expect(code).toContain("2026-02-09");
  });

  it("should extract nutrition data (kcal, protein, carbs, fat)", () => {
    const code = buildDiaryCode(["2026-02-10"]);
    expect(code).toContain("kcal");
    expect(code).toContain("protein");
    expect(code).toContain("carbs");
    expect(code).toContain("fat");
  });

  it("should parse numeric nutrition values", () => {
    const code = buildDiaryCode(["2026-02-10"]);
    expect(code).toContain("parseFloat");
  });

  it("should return entries array with success flag", () => {
    const code = buildDiaryCode(["2026-02-10"]);
    expect(code).toContain("return { success: true, entries }");
  });

  it("should handle empty diary days with zero values", () => {
    const code = buildDiaryCode(["2026-02-10"]);
    expect(code).toContain("calories: 0");
    expect(code).toContain("protein: 0");
    expect(code).toContain("carbs: 0");
    expect(code).toContain("fat: 0");
  });
});
