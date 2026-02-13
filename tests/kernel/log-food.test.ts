import { describe, it, expect } from "vitest";
import { buildLogFoodCode } from "../../src/kernel/log-food.js";

describe("buildLogFoodCode", () => {
  it("should navigate to the diary page", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("cronometer.com/#diary");
  });

  it("should include the food name in search", () => {
    const code = buildLogFoodCode({ name: "Wendy's Chicken Sandwich" });
    expect(code).toContain("Wendy's Chicken Sandwich");
  });

  it("should right-click meal category", () => {
    const code = buildLogFoodCode({ name: "Test Food", meal: "dinner" });
    expect(code).toContain("button: 'right'");
    expect(code).toContain("Dinner");
  });

  it("should default to Uncategorized when no meal provided", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("Uncategorized");
  });

  it("should normalize meal name to title case", () => {
    const code = buildLogFoodCode({ name: "Test Food", meal: "BREAKFAST" });
    expect(code).toContain("Breakfast");
  });

  it("should handle specified meals", () => {
    const code = buildLogFoodCode({ name: "Test Food", meal: "snacks" });
    expect(code).toContain("Snacks");
  });

  it("should click Add Food from context menu", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("Add Food");
    expect(code).toContain("addFoodClicked");
  });

  it("should search in the food search bar", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("SEARCH");
    expect(code).toContain("foodName");
  });

  it("should click Add to Diary", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("ADD TO DIARY");
  });

  it("should default to 1 serving", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("servingCount = 1");
  });

  it("should handle custom servings", () => {
    const code = buildLogFoodCode({ name: "Test Food", servings: 2 });
    expect(code).toContain("servingCount = 2");
    expect(code).toContain("servingCount !== 1");
  });

  it("should check for login redirect", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("Not logged in");
  });

  it("should return success result", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("return { success: true }");
  });

  it("should fail with clear error when no results found", () => {
    const code = buildLogFoodCode({ name: "Test Food" });
    expect(code).toContain("No food found matching");
  });
});
