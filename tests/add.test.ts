import { describe, it, expect } from "vitest";

describe("add custom-food", () => {
  it("should require at least one macro", () => {
    // Validation: at least one of -p, -c, -f must be provided
    const hasAnyMacro = (options: {
      protein?: number;
      carbs?: number;
      fat?: number;
    }) => !!(options.protein || options.carbs || options.fat);

    expect(hasAnyMacro({})).toBe(false);
    expect(hasAnyMacro({ protein: 30 })).toBe(true);
    expect(hasAnyMacro({ carbs: 50 })).toBe(true);
    expect(hasAnyMacro({ fat: 20 })).toBe(true);
    expect(hasAnyMacro({ protein: 30, carbs: 50, fat: 20 })).toBe(true);
  });

  it("should validate meal names for --log", () => {
    const validMeals = ["breakfast", "lunch", "dinner", "snacks"];
    const isValidMeal = (meal: string) =>
      validMeals.includes(meal.toLowerCase());

    expect(isValidMeal("Breakfast")).toBe(true);
    expect(isValidMeal("Dinner")).toBe(true);
    expect(isValidMeal("snacks")).toBe(true);
    expect(isValidMeal("brunch")).toBe(false);
    expect(isValidMeal("Midnight Snack")).toBe(false);
  });

  it("should format macro display correctly", () => {
    const formatDisplay = (options: {
      protein?: number;
      carbs?: number;
      fat?: number;
      total?: number;
    }) => {
      const calories =
        options.total ??
        (options.protein ?? 0) * 4 +
          (options.carbs ?? 0) * 4 +
          (options.fat ?? 0) * 9;
      const parts: string[] = [];
      parts.push(`${calories} cal`);
      if (options.protein) parts.push(`P: ${options.protein}g`);
      if (options.carbs) parts.push(`C: ${options.carbs}g`);
      if (options.fat) parts.push(`F: ${options.fat}g`);
      return parts.join(" | ");
    };

    expect(formatDisplay({ protein: 50, carbs: 100, fat: 50 })).toBe(
      "1050 cal | P: 50g | C: 100g | F: 50g"
    );
    expect(formatDisplay({ protein: 30 })).toBe("120 cal | P: 30g");
    expect(formatDisplay({ protein: 40, carbs: 60 })).toBe(
      "400 cal | P: 40g | C: 60g"
    );
  });

  it("should use explicit total calories when provided", () => {
    const calcCalories = (options: {
      protein?: number;
      carbs?: number;
      fat?: number;
      total?: number;
    }) =>
      options.total ??
      (options.protein ?? 0) * 4 +
        (options.carbs ?? 0) * 4 +
        (options.fat ?? 0) * 9;

    expect(calcCalories({ protein: 30, total: 500 })).toBe(500);
    expect(calcCalories({ protein: 30, carbs: 50, fat: 10 })).toBe(410);
    expect(calcCalories({ protein: 30 })).toBe(120);
  });

  it("should handle --log with no meal as Uncategorized", () => {
    const getMealLabel = (log: string | boolean | undefined) => {
      if (!log) return null;
      return typeof log === "string"
        ? log.charAt(0).toUpperCase() + log.slice(1).toLowerCase()
        : "Uncategorized";
    };

    expect(getMealLabel(true)).toBe("Uncategorized");
    expect(getMealLabel("dinner")).toBe("Dinner");
    expect(getMealLabel("BREAKFAST")).toBe("Breakfast");
    expect(getMealLabel(undefined)).toBe(null);
  });
});
