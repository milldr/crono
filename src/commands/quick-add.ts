import * as p from "@clack/prompts";
import { getKernelClient } from "../kernel/client.js";
import { resolveDate } from "../utils/date.js";

export interface QuickAddOptions {
  protein?: number;
  carbs?: number;
  fat?: number;
  alcohol?: number;
  meal?: string;
  date?: string;
}

const VALID_MEALS = ["breakfast", "lunch", "dinner", "snacks"];

export async function quickAdd(options: QuickAddOptions): Promise<void> {
  // Validate at least one macro is provided
  if (!options.protein && !options.carbs && !options.fat && !options.alcohol) {
    p.log.error("At least one macro (-p, -c, -f, or -a) is required");
    process.exit(1);
  }

  // Validate meal if provided
  if (options.meal) {
    const normalizedMeal = options.meal.toLowerCase();
    if (!VALID_MEALS.includes(normalizedMeal)) {
      p.log.error(
        `Invalid meal "${options.meal}". Use: Breakfast, Lunch, Dinner, or Snacks`
      );
      process.exit(1);
    }
  }

  // Resolve date if provided
  let resolvedDate: string | undefined;
  if (options.date) {
    try {
      resolvedDate = resolveDate(options.date);
    } catch (err) {
      p.log.error(`${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  }

  // Build entry description
  const parts: string[] = [];
  if (options.protein) parts.push(`${options.protein}g protein`);
  if (options.carbs) parts.push(`${options.carbs}g carbs`);
  if (options.fat) parts.push(`${options.fat}g fat`);
  if (options.alcohol) parts.push(`${options.alcohol}g alcohol`);

  const mealLabel = options.meal
    ? options.meal.charAt(0).toUpperCase() + options.meal.slice(1).toLowerCase()
    : "Uncategorized";

  p.intro("🍎 crono quick-add");

  const s = p.spinner();
  s.start("Connecting...");

  try {
    const kernel = await getKernelClient();
    await kernel.addQuickEntry(
      {
        protein: options.protein,
        carbs: options.carbs,
        fat: options.fat,
        alcohol: options.alcohol,
        meal: options.meal,
        date: resolvedDate,
      },
      (msg) => s.message(msg)
    );

    s.stop("Done.");
    const dateInfo = resolvedDate ? ` on ${resolvedDate}` : "";
    p.outro(`Added: ${parts.join(", ")} → ${mealLabel}${dateInfo}`);
  } catch (error) {
    s.stop("Failed.");
    p.log.error(`Failed to add entry: ${error}`);
    process.exit(1);
  }
}
