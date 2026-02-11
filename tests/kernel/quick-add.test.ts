import { describe, it, expect } from "vitest";
import {
  buildQuickAddCode,
  MACRO_SEARCH_NAMES,
} from "../../src/kernel/quick-add.js";

describe("buildQuickAddCode", () => {
  it("should search for Quick Add, Protein when protein provided", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("Quick Add, Protein");
    expect(code).toContain("30");
  });

  it("should search for Quick Add, Carbohydrate when carbs provided", () => {
    const code = buildQuickAddCode({ carbs: 100 });
    expect(code).toContain("Quick Add, Carbohydrate");
    expect(code).toContain("100");
  });

  it("should search for Quick Add, Fat when fat provided", () => {
    const code = buildQuickAddCode({ fat: 20 });
    expect(code).toContain("Quick Add, Fat");
    expect(code).toContain("20");
  });

  it("should include all macros when all provided", () => {
    const code = buildQuickAddCode({ protein: 30, carbs: 100, fat: 20 });
    expect(code).toContain("Quick Add, Protein");
    expect(code).toContain("Quick Add, Carbohydrate");
    expect(code).toContain("Quick Add, Fat");
  });

  it("should only include provided macros", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("Quick Add, Protein");
    expect(code).not.toContain("Quick Add, Carbohydrate");
    expect(code).not.toContain("Quick Add, Fat");
  });

  it("should right-click the specified meal category", () => {
    const code = buildQuickAddCode({ protein: 30, meal: "dinner" });
    expect(code).toContain("Dinner");
    expect(code).toContain("button: 'right'");
  });

  it("should normalize meal name to title case", () => {
    const code = buildQuickAddCode({ protein: 30, meal: "BREAKFAST" });
    expect(code).toContain("Breakfast");
  });

  it("should default to Uncategorized when no meal provided", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("Uncategorized");
  });

  it("should navigate to diary page", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("cronometer.com/#diary");
  });

  it("should check for login redirect", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("Not logged in");
  });

  it("should click Add Food from context menu", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("Add Food");
    expect(code).toContain("addFoodClicked");
  });

  it("should search in the food search bar", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("Search");
    expect(code).toContain("macro.searchName");
  });

  it("should click Add to Diary", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("Add to Diary");
  });

  it("should return success result", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("return { success: true }");
  });
});

describe("MACRO_SEARCH_NAMES", () => {
  it("should map protein to Quick Add, Protein", () => {
    expect(MACRO_SEARCH_NAMES.protein).toBe("Quick Add, Protein");
  });

  it("should map carbs to Quick Add, Carbohydrate", () => {
    expect(MACRO_SEARCH_NAMES.carbs).toBe("Quick Add, Carbohydrate");
  });

  it("should map fat to Quick Add, Fat", () => {
    expect(MACRO_SEARCH_NAMES.fat).toBe("Quick Add, Fat");
  });
});
