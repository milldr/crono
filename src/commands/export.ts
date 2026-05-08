import * as p from "@clack/prompts";
import { exportData, type ExportType } from "../cronometer/export.js";
import { formatKernelError } from "../kernel/errors.js";
import {
  parseNutrition,
  parseExercises,
  parseBiometrics,
  parseServings,
  type NutritionEntry,
  type ExerciseEntry,
  type BiometricEntry,
  type ServingEntry,
} from "../cronometer/parse.js";
import { parseDate, parseRange, todayStr } from "../utils/date.js";

const VALID_TYPES = [
  "nutrition",
  "exercises",
  "biometrics",
  "servings",
] as const;

export interface ExportOptions {
  date?: string;
  range?: string;
  csv?: boolean;
  json?: boolean;
  meal?: string;
}

export async function exportCmd(
  type: string,
  options: ExportOptions
): Promise<void> {
  // Validate type
  if (!VALID_TYPES.includes(type as ExportType)) {
    p.log.error(
      "Unknown export type. Use: nutrition, exercises, biometrics, servings"
    );
    process.exit(1);
  }

  // Validate mutual exclusivity
  if (options.date && options.range) {
    p.log.error("-d and -r are mutually exclusive");
    process.exit(1);
  }

  if (options.csv && options.json) {
    p.log.error("--csv and --json are mutually exclusive");
    process.exit(1);
  }

  // Resolve date range
  let start: string;
  let end: string;
  let isRange = false;

  try {
    if (options.range) {
      isRange = true;
      const range = parseRange(options.range);
      start = range.start;
      end = range.end;
    } else if (options.date) {
      start = parseDate(options.date);
      end = start;
    } else {
      start = todayStr();
      end = start;
    }
  } catch (error) {
    p.log.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }

  const silent = options.json || options.csv;
  if (!silent) {
    p.intro("🍎 crono export");
  }

  const s = silent ? null : p.spinner();
  s?.start("Connecting...");

  try {
    const csv = await exportData(type as ExportType, start, end, (msg) =>
      s?.message(msg)
    );

    s?.stop("Done.");

    // Raw CSV passthrough
    if (options.csv) {
      console.log(csv);
      return;
    }

    // Parse and output
    const exportType = type as ExportType;
    if (exportType === "servings") {
      let entries = parseServings(csv);
      if (options.meal) {
        const target = options.meal.toLowerCase();
        entries = entries.filter((e) => e.meal.toLowerCase() === target);
      }
      if (entries.length === 0) {
        if (!silent) {
          const suffix = options.meal ? ` for meal "${options.meal}"` : "";
          p.outro(`No servings found${suffix}`);
        }
        return;
      }
      if (options.json) {
        console.log(JSON.stringify(isRange ? entries : entries, null, 2));
      } else {
        formatServings(entries, isRange);
      }
      return;
    }

    if (exportType === "nutrition") {
      const entries = parseNutrition(csv);
      if (entries.length === 0) {
        if (!silent) p.outro("No nutrition data found for the requested dates");
        return;
      }
      if (options.json) {
        console.log(JSON.stringify(isRange ? entries : entries[0], null, 2));
      } else {
        formatNutrition(entries, isRange);
      }
    } else if (exportType === "exercises") {
      const entries = parseExercises(csv);
      if (entries.length === 0) {
        if (!silent) p.outro("No exercises data found for the requested dates");
        return;
      }
      if (options.json) {
        console.log(JSON.stringify(isRange ? entries : entries, null, 2));
      } else {
        formatExercises(entries, isRange);
      }
    } else {
      const entries = parseBiometrics(csv);
      if (entries.length === 0) {
        if (!silent)
          p.outro("No biometrics data found for the requested dates");
        return;
      }
      if (options.json) {
        console.log(JSON.stringify(isRange ? entries : entries, null, 2));
      } else {
        formatBiometrics(entries, isRange);
      }
    }
  } catch (error) {
    s?.stop("Failed.");
    p.log.error(formatKernelError(error));
    process.exit(1);
  }
}

function formatNutrition(entries: NutritionEntry[], isRange: boolean): void {
  if (!isRange) {
    const e = entries[0];
    p.outro(
      `${e.calories} kcal | P: ${e.protein}g | C: ${e.carbs}g | F: ${e.fat}g`
    );
    return;
  }
  for (const e of entries) {
    p.log.info(
      `${e.date}: ${e.calories} kcal | P: ${e.protein}g | C: ${e.carbs}g | F: ${e.fat}g`
    );
  }
}

function formatExercises(entries: ExerciseEntry[], isRange: boolean): void {
  if (!isRange) {
    for (const e of entries) {
      p.outro(`${e.exercise}: ${e.minutes} min, ${e.caloriesBurned} kcal`);
    }
    return;
  }
  for (const e of entries) {
    p.log.info(
      `${e.date}: ${e.exercise}: ${e.minutes} min, ${e.caloriesBurned} kcal`
    );
  }
}

function formatServings(entries: ServingEntry[], isRange: boolean): void {
  const datePrefix = isRange;
  for (const e of entries) {
    const prefix = datePrefix ? `${e.date} ` : "";
    p.log.info(
      `${prefix}${e.time} | ${e.meal} | ${e.food} | ${e.amount} | ${e.calories} kcal | P: ${e.protein}g  C: ${e.carbs}g  F: ${e.fat}g`
    );
  }

  // Totals (useful when filtering by meal or showing one day)
  if (entries.length > 1) {
    const totalCal = entries.reduce((s, e) => s + e.calories, 0);
    const totalP = entries.reduce((s, e) => s + e.protein, 0);
    const totalC = entries.reduce((s, e) => s + e.carbs, 0);
    const totalF = entries.reduce((s, e) => s + e.fat, 0);
    p.log.info("───");
    p.log.info(
      `Total: ${totalCal.toFixed(0)} kcal | P: ${totalP.toFixed(1)}g  C: ${totalC.toFixed(1)}g  F: ${totalF.toFixed(1)}g`
    );
  }
}

function formatBiometrics(entries: BiometricEntry[], isRange: boolean): void {
  if (!isRange) {
    for (const e of entries) {
      p.outro(`${e.metric}: ${e.amount} ${e.unit}`);
    }
    return;
  }
  for (const e of entries) {
    p.log.info(`${e.date}: ${e.metric}: ${e.amount} ${e.unit}`);
  }
}
