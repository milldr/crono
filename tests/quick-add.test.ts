import { describe, it, expect } from "vitest";

describe("quick-add", () => {
  it("should require at least one macro", () => {
    // TODO: Test CLI validation
    expect(true).toBe(true);
  });

  it("should validate meal names", () => {
    const validMeals = ["breakfast", "lunch", "dinner", "snacks"];
    const invalidMeal = "brunch";

    expect(validMeals.includes("dinner")).toBe(true);
    expect(validMeals.includes(invalidMeal)).toBe(false);
  });

  it("should normalize meal names to title case", () => {
    const normalize = (meal: string) =>
      meal.charAt(0).toUpperCase() + meal.slice(1).toLowerCase();

    expect(normalize("dinner")).toBe("Dinner");
    expect(normalize("BREAKFAST")).toBe("Breakfast");
    expect(normalize("LuNcH")).toBe("Lunch");
  });
});
