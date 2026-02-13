import * as p from "@clack/prompts";
import { getKernelClient } from "../kernel/client.js";

export interface LogOptions {
  meal?: string;
  servings?: number;
}

const VALID_MEALS = ["breakfast", "lunch", "dinner", "snacks"];

export async function log(name: string, options: LogOptions): Promise<void> {
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

  // Validate servings if provided
  if (options.servings !== undefined && options.servings <= 0) {
    p.log.error("Servings must be a positive number");
    process.exit(1);
  }

  const mealLabel = options.meal
    ? options.meal.charAt(0).toUpperCase() + options.meal.slice(1).toLowerCase()
    : "Uncategorized";

  p.intro("🍎 crono log");

  const s = p.spinner();
  s.start("Connecting...");

  try {
    const kernel = await getKernelClient();
    await kernel.logFood(
      {
        name,
        meal: options.meal,
        servings: options.servings,
      },
      (msg) => s.message(msg)
    );

    s.stop("Done.");
    p.outro(`Logged: ${name} → ${mealLabel}`);
  } catch (error) {
    s.stop("Failed.");
    p.log.error(`Failed to log food: ${error}`);
    process.exit(1);
  }
}
