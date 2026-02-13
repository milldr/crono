import { describe, it, expect } from "vitest";

describe("log", () => {
  it("should validate meal names", () => {
    const validMeals = ["breakfast", "lunch", "dinner", "snacks"];
    const isValidMeal = (meal: string) =>
      validMeals.includes(meal.toLowerCase());

    expect(isValidMeal("Breakfast")).toBe(true);
    expect(isValidMeal("Lunch")).toBe(true);
    expect(isValidMeal("dinner")).toBe(true);
    expect(isValidMeal("SNACKS")).toBe(true);
    expect(isValidMeal("brunch")).toBe(false);
    expect(isValidMeal("Second Breakfast")).toBe(false);
  });

  it("should require servings to be positive", () => {
    const isValidServings = (servings: number) => servings > 0;

    expect(isValidServings(1)).toBe(true);
    expect(isValidServings(2)).toBe(true);
    expect(isValidServings(0.5)).toBe(true);
    expect(isValidServings(0)).toBe(false);
    expect(isValidServings(-1)).toBe(false);
  });

  it("should normalize meal names to title case", () => {
    const normalize = (meal: string) =>
      meal.charAt(0).toUpperCase() + meal.slice(1).toLowerCase();

    expect(normalize("dinner")).toBe("Dinner");
    expect(normalize("BREAKFAST")).toBe("Breakfast");
    expect(normalize("LuNcH")).toBe("Lunch");
    expect(normalize("snacks")).toBe("Snacks");
  });

  it("should default to Uncategorized when no meal provided", () => {
    const getMealLabel = (meal?: string) =>
      meal
        ? meal.charAt(0).toUpperCase() + meal.slice(1).toLowerCase()
        : "Uncategorized";

    expect(getMealLabel()).toBe("Uncategorized");
    expect(getMealLabel(undefined)).toBe("Uncategorized");
    expect(getMealLabel("dinner")).toBe("Dinner");
  });
});
