import * as p from "@clack/prompts";
import { getKernelClient } from "../kernel/client.js";

export interface AddCustomFoodOptions {
  protein?: number;
  carbs?: number;
  fat?: number;
  total?: number;
  log?: string | boolean;
}

const VALID_MEALS = ["breakfast", "lunch", "dinner", "snacks"];

export async function addCustomFood(
  name: string,
  options: AddCustomFoodOptions
): Promise<void> {
  // Validate at least one macro is provided
  if (!options.protein && !options.carbs && !options.fat) {
    p.log.error("At least one macro (-p, -c, or -f) is required");
    process.exit(1);
  }

  // Validate --log meal if specified as a string
  if (typeof options.log === "string") {
    const normalizedMeal = options.log.toLowerCase();
    if (!VALID_MEALS.includes(normalizedMeal)) {
      p.log.error(
        `Invalid meal "${options.log}". Use: Breakfast, Lunch, Dinner, or Snacks`
      );
      process.exit(1);
    }
  }

  // Calculate total calories
  const calories =
    options.total ??
    (options.protein ?? 0) * 4 +
      (options.carbs ?? 0) * 4 +
      (options.fat ?? 0) * 9;

  // Build macro display
  const macroParts: string[] = [];
  macroParts.push(`${calories} cal`);
  if (options.protein) macroParts.push(`P: ${options.protein}g`);
  if (options.carbs) macroParts.push(`C: ${options.carbs}g`);
  if (options.fat) macroParts.push(`F: ${options.fat}g`);
  const macroDisplay = macroParts.join(" | ");

  const logMeal = options.log
    ? typeof options.log === "string"
      ? options.log.charAt(0).toUpperCase() + options.log.slice(1).toLowerCase()
      : "Uncategorized"
    : null;

  p.intro("🍎 crono add");

  const s = p.spinner();
  s.start("Connecting...");

  try {
    const kernel = await getKernelClient();
    await kernel.addCustomFood(
      {
        name,
        protein: options.protein,
        carbs: options.carbs,
        fat: options.fat,
        calories,
        log: options.log,
      },
      (msg) => s.message(msg)
    );

    s.stop("Done.");

    if (logMeal) {
      p.outro(`Created and logged: ${name} (${macroDisplay}) → ${logMeal}`);
    } else {
      p.outro(`Created custom food: ${name} (${macroDisplay})`);
    }
  } catch (error) {
    s.stop("Failed.");
    p.log.error(`Failed to create custom food: ${error}`);
    process.exit(1);
  }
}
