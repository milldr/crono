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

  it("should include click timeouts in helper functions", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("click({ timeout: 5000 })");
    expect(code).toContain("click({ button: 'right', timeout: 5000 })");
  });

  it("should check dialog dismissal instead of silently catching", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("dialogDismissed");
    expect(code).toContain("dialog did not close");
    expect(code).not.toMatch(
      /waitForSelector\('text="Add Food to Diary"',\s*\{\s*state:\s*'hidden'[^)]*\)\.catch\(\(\)\s*=>\s*\{\s*\}\)/
    );
  });

  it("should check context menu visibility instead of silently catching", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("menuVisible");
    expect(code).toContain("Context menu did not appear");
  });

  it("should check search results instead of silently catching", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("resultsAppeared");
    expect(code).toContain("Search results did not appear");
  });

  it("should navigate to target date using prev-day arrows when date is provided", () => {
    const code = buildQuickAddCode({ protein: 30, date: "2026-02-10" });
    expect(code).toContain('"2026-02-10"');
    expect(code).toContain("diary-date-previous");
    expect(code).toContain("daysBack");
  });

  it("should not include date navigation when no date provided", () => {
    const code = buildQuickAddCode({ protein: 30 });
    expect(code).toContain("targetDate = null");
  });

  it("should search for Quick Add, Alcohol when alcohol provided", () => {
    const code = buildQuickAddCode({ alcohol: 143 });
    expect(code).toContain("Quick Add, Alcohol");
    expect(code).toContain("143");
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

  it("should map alcohol to Quick Add, Alcohol", () => {
    expect(MACRO_SEARCH_NAMES.alcohol).toBe("Quick Add, Alcohol");
  });
});
