import { describe, it, expect } from "vitest";
import {
  buildAddCustomFoodCode,
  NUTRIENT_LABELS,
} from "../../src/kernel/add-custom-food.js";

describe("buildAddCustomFoodCode", () => {
  it("should navigate to the custom foods page", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    expect(code).toContain("cronometer.com/#custom-foods");
  });

  it("should click CREATE FOOD button", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    expect(code).toContain("CREATE FOOD");
  });

  it("should include the food name", () => {
    const code = buildAddCustomFoodCode({
      name: "Wendy's Chicken Sandwich",
      protein: 50,
    });
    expect(code).toContain("Wendy's Chicken Sandwich");
  });

  it("should include protein value when provided", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    expect(code).toContain('"Protein"');
    expect(code).toContain("30");
  });

  it("should include carbs value when provided", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", carbs: 100 });
    expect(code).toContain('"Total Carbohydrate"');
    expect(code).toContain("100");
  });

  it("should include fat value when provided", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", fat: 20 });
    expect(code).toContain('"Total Fat"');
    expect(code).toContain("20");
  });

  it("should include all macros when all provided", () => {
    const code = buildAddCustomFoodCode({
      name: "Test Food",
      protein: 30,
      carbs: 100,
      fat: 20,
    });
    expect(code).toContain('"Protein"');
    expect(code).toContain('"Total Carbohydrate"');
    expect(code).toContain('"Total Fat"');
  });

  it("should only include provided macros", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    expect(code).toContain('"Protein"');
    expect(code).not.toContain('"Total Carbohydrate"');
    expect(code).not.toContain('"Total Fat"');
  });

  it("should click Save Changes button", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    expect(code).toContain("Save Changes");
  });

  it("should set mealLabel to null when log is not set", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    expect(code).toContain("const mealLabel = null");
  });

  it("should include diary logging when log is true", () => {
    const code = buildAddCustomFoodCode({
      name: "Test Food",
      protein: 30,
      log: true,
    });
    expect(code).toContain("cronometer.com/#diary");
    expect(code).toContain("ADD TO DIARY");
    expect(code).toContain("Uncategorized");
  });

  it("should include diary logging with meal when log is a meal name", () => {
    const code = buildAddCustomFoodCode({
      name: "Test Food",
      protein: 30,
      log: "Dinner",
    });
    expect(code).toContain("cronometer.com/#diary");
    expect(code).toContain("ADD TO DIARY");
    expect(code).toContain("Dinner");
  });

  it("should normalize meal name in log to title case", () => {
    const code = buildAddCustomFoodCode({
      name: "Test Food",
      protein: 30,
      log: "breakfast",
    });
    expect(code).toContain("Breakfast");
  });

  it("should check for login redirect", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    expect(code).toContain("Not logged in");
  });

  it("should return success result", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    expect(code).toContain("return { success: true }");
  });

  it("should auto-calculate calories from macros", () => {
    const code = buildAddCustomFoodCode({
      name: "Test Food",
      protein: 30,
      carbs: 50,
      fat: 10,
    });
    // 30*4 + 50*4 + 10*9 = 120 + 200 + 90 = 410
    expect(code).toContain('"Calories"');
    expect(code).toContain("410");
  });

  it("should use explicit calories when provided", () => {
    const code = buildAddCustomFoodCode({
      name: "Test Food",
      protein: 30,
      calories: 500,
    });
    expect(code).toContain('"Calories"');
    expect(code).toContain("500");
  });

  it("should always include calories even with only one macro", () => {
    const code = buildAddCustomFoodCode({ name: "Test Food", protein: 30 });
    // 30*4 = 120
    expect(code).toContain('"Calories"');
    expect(code).toContain("120");
  });
});
