import { describe, it, expect } from "vitest";
import {
  buildLoginCheckCode,
  buildNavigateToLoginCode,
  buildQuickAddCode,
  SELECTORS,
} from "../../src/kernel/automation.js";

describe("buildLoginCheckCode", () => {
  it("should navigate to /diary", () => {
    const code = buildLoginCheckCode();
    expect(code).toContain("cronometer.com/diary");
  });

  it("should check for login redirect", () => {
    const code = buildLoginCheckCode();
    expect(code).toContain("/login");
    expect(code).toContain("loggedIn");
  });

  it("should return a result object", () => {
    const code = buildLoginCheckCode();
    expect(code).toContain("return {");
    expect(code).toContain("success: true");
  });
});

describe("buildNavigateToLoginCode", () => {
  it("should navigate to login page", () => {
    const code = buildNavigateToLoginCode();
    expect(code).toContain("cronometer.com/login");
  });
});

describe("buildQuickAddCode", () => {
  it("should include protein field when provided", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("proteinInput");
    expect(code).toContain("'30'");
  });

  it("should include carbs field when provided", () => {
    const code = buildQuickAddCode({ carbs: 100 });
    expect(code).toContain("carbsInput");
    expect(code).toContain("'100'");
  });

  it("should include fat field when provided", () => {
    const code = buildQuickAddCode({ fat: 20 });
    expect(code).toContain("fatInput");
    expect(code).toContain("'20'");
  });

  it("should include all macros when all provided", () => {
    const code = buildQuickAddCode({ protein: 30, carbs: 100, fat: 20 });
    expect(code).toContain("proteinInput");
    expect(code).toContain("carbsInput");
    expect(code).toContain("fatInput");
  });

  it("should omit macro fields that are not provided", () => {
    const code = buildQuickAddCode({ protein: 30 });
    // The SELECTORS JSON is always embedded, but the fill() calls should be absent
    expect(code).not.toContain("'Carbs input'");
    expect(code).not.toContain("'Fat input'");
  });

  it("should include meal selection when provided", () => {
    const code = buildQuickAddCode({ protein: 30, meal: "dinner" });
    expect(code).toContain("mealDropdown");
    expect(code).toContain("Dinner");
  });

  it("should normalize meal name to title case", () => {
    const code = buildQuickAddCode({ protein: 30, meal: "BREAKFAST" });
    expect(code).toContain("Breakfast");
  });

  it("should omit meal selection when not provided", () => {
    const code = buildQuickAddCode({ protein: 30 });
    // The SELECTORS JSON is always embedded, but the selectOption call should be absent
    expect(code).not.toContain("selectOption");
    expect(code).not.toContain("'Meal dropdown'");
  });

  it("should navigate to diary page", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("cronometer.com/diary");
  });

  it("should check for login redirect", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("Not logged in");
  });

  it("should click Add Food button", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("addFoodBtn");
    expect(code).toContain(".click()");
  });

  it("should click Quick Add tab", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("quickAddTab");
  });

  it("should click submit button", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("addBtn");
  });

  it("should include selector fallbacks", () => {
    const code = buildQuickAddCode({ protein: 30 });
    // The code embeds the full SELECTORS object which includes fallbacks
    expect(code).toContain("fallbacks");
    expect(code).toContain("findElement");
  });

  it("should return success result", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("return { success: true }");
  });
});

describe("SELECTORS", () => {
  it("should have primary and fallback selectors for each element", () => {
    for (const [name, sel] of Object.entries(SELECTORS)) {
      expect(sel.primary, `${name} should have a primary selector`).toBeTruthy();
      expect(
        sel.fallbacks.length,
        `${name} should have fallback selectors`
      ).toBeGreaterThan(0);
    }
  });
});
