import { getKernelClient } from "../kernel/client.js";

export interface QuickAddOptions {
  protein?: number;
  carbs?: number;
  fat?: number;
  meal?: string;
}

const VALID_MEALS = ["breakfast", "lunch", "dinner", "snacks"];

export async function quickAdd(options: QuickAddOptions): Promise<void> {
  // Validate at least one macro is provided
  if (!options.protein && !options.carbs && !options.fat) {
    console.error("Error: At least one macro (-p, -c, or -f) is required");
    process.exit(1);
  }

  // Validate meal if provided
  if (options.meal) {
    const normalizedMeal = options.meal.toLowerCase();
    if (!VALID_MEALS.includes(normalizedMeal)) {
      console.error(
        `Error: Invalid meal "${options.meal}". Use: Breakfast, Lunch, Dinner, or Snacks`
      );
      process.exit(1);
    }
  }

  // Build entry description
  const parts: string[] = [];
  if (options.protein) parts.push(`${options.protein}g protein`);
  if (options.carbs) parts.push(`${options.carbs}g carbs`);
  if (options.fat) parts.push(`${options.fat}g fat`);

  const mealLabel = options.meal
    ? options.meal.charAt(0).toUpperCase() + options.meal.slice(1).toLowerCase()
    : "Uncategorized";

  console.log(`Adding quick entry: ${parts.join(", ")} → ${mealLabel}`);

  try {
    const kernel = await getKernelClient();
    await kernel.addQuickEntry({
      protein: options.protein,
      carbs: options.carbs,
      fat: options.fat,
      meal: options.meal,
    });

    console.log(`✓ Added: ${parts.join(", ")} → ${mealLabel}`);
  } catch (error) {
    console.error("Failed to add entry:", error);
    process.exit(1);
  }
}
