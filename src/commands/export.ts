import * as p from "@clack/prompts";
import { exportData, type ExportType } from "../cronometer/export.js";
import {
  parseNutrition,
  parseExercises,
  parseBiometrics,
  type NutritionEntry,
  type ExerciseEntry,
  type BiometricEntry,
} from "../cronometer/parse.js";
import { parseDate, parseRange, todayStr } from "../utils/date.js";

const VALID_TYPES = ["nutrition", "exercises", "biometrics"] as const;

export interface ExportOptions {
  date?: string;
  range?: string;
  csv?: boolean;
  json?: boolean;
}

export async function exportCmd(
  type: string,
  options: ExportOptions
): Promise<void> {
  // Validate type
  if (!VALID_TYPES.includes(type as ExportType)) {
    p.log.error("Unknown export type. Use: nutrition, exercises, biometrics");
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
    p.log.error(`${error instanceof Error ? error.message : error}`);
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
