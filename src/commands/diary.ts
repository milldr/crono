import * as p from "@clack/prompts";
import { getKernelClient, type DiaryData } from "../kernel/client.js";
import { formatKernelError } from "../kernel/errors.js";
import { parseDate, parseRange, dateRange, todayStr } from "../utils/date.js";
import { exportData } from "../cronometer/export.js";
import { parseExercises } from "../cronometer/parse.js";

export interface DiaryOptions {
  date?: string;
  range?: string;
  json?: boolean;
  targets?: boolean;
}

export async function diary(options: DiaryOptions): Promise<void> {
  // Validate mutual exclusivity
  if (options.date && options.range) {
    p.log.error("-d and -r are mutually exclusive");
    process.exit(1);
  }

  // Resolve dates to fetch
  let dates: string[];
  let isRange = false;

  try {
    if (options.range) {
      isRange = true;
      const { start, end } = parseRange(options.range);
      dates = dateRange(start, end);
    } else if (options.date) {
      dates = [parseDate(options.date)];
    } else {
      dates = [todayStr()];
    }
  } catch (error) {
    p.log.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }

  if (!options.json) {
    p.intro("🍎 crono diary");
  }

  const s = options.json ? null : p.spinner();
  s?.start("Connecting...");

  try {
    const kernel = await getKernelClient();

    // When --targets is used, fetch exercise data concurrently with diary scraping
    const diaryPromise = kernel.getDiary(
      dates,
      (msg) => s?.message(msg),
      options.targets
    );

    let exerciseMap: Map<string, number> | null = null;
    if (options.targets) {
      // Determine date range for exercise export
      const sortedDates = [...dates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      const exercisePromise = exportData("exercises", startDate, endDate)
        .then((csv) => {
          const exercises = parseExercises(csv);
          const map = new Map<string, number>();
          for (const ex of exercises) {
            map.set(ex.date, (map.get(ex.date) ?? 0) + ex.caloriesBurned);
          }
          return map;
        })
        .catch(() => null); // Gracefully degrade if export API fails

      const [entries, exMap] = await Promise.all([
        diaryPromise,
        exercisePromise,
      ]);
      exerciseMap = exMap;

      // Merge exercise data into entries
      for (const entry of entries) {
        const burned = exerciseMap?.get(entry.date) ?? 0;
        entry.exercise = burned > 0 ? { caloriesBurned: burned } : null;
      }

      s?.stop("Done.");

      if (options.json) {
        outputJson(entries, dates, isRange);
      } else {
        formatPlainText(entries, isRange, true);
      }
    } else {
      const entries = await diaryPromise;

      s?.stop("Done.");

      if (options.json) {
        outputJson(entries, dates, isRange);
      } else {
        formatPlainText(entries, isRange, false);
      }
    }
  } catch (error) {
    s?.stop("Failed.");
    p.log.error(`Failed to read diary: ${formatKernelError(error)}`);
    process.exit(1);
  }
}

function outputJson(
  entries: DiaryData[],
  dates: string[],
  isRange: boolean
): void {
  if (isRange) {
    console.log(JSON.stringify(entries, null, 2));
  } else {
    console.log(
      JSON.stringify(
        entries[0] ?? {
          date: dates[0],
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          targets: null,
          exercise: null,
        },
        null,
        2
      )
    );
  }
}

export function formatPct(actual: number, target: number | null): string {
  if (target === null || target === 0) return "";
  const pct = Math.round(((actual - target) / target) * 100);
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct}%`;
}

export function formatEntryLine(
  entry: DiaryData,
  showTargets: boolean,
  prefix?: string
): string {
  const parts: string[] = [];
  if (prefix) parts.push(prefix);

  const hasTargets = showTargets && entry.targets;
  const hasExercise =
    showTargets && entry.exercise && entry.exercise.caloriesBurned > 0;

  // Calories portion
  if (hasExercise) {
    const burned = entry.exercise!.caloriesBurned;
    const net = entry.calories - burned;
    let calStr = `${entry.calories} kcal - ${burned} burned = ${net} net`;
    if (hasTargets && entry.targets!.calories !== null) {
      const pct = formatPct(net, entry.targets!.calories);
      calStr += ` (${pct.replace(/[+-]/, "")}% of ${entry.targets!.calories})`;
      // Use the net-based percentage for compact display
    }
    parts.push(calStr);
  } else if (hasTargets && entry.targets!.calories !== null) {
    const pct = Math.round((entry.calories / entry.targets!.calories!) * 100);
    parts.push(
      `${entry.calories} kcal (${pct}% of ${entry.targets!.calories})`
    );
  } else {
    parts.push(`${entry.calories} kcal`);
  }

  // Macro portions
  if (hasTargets) {
    const t = entry.targets!;
    const protPct = formatPct(entry.protein, t.protein);
    const carbPct = formatPct(entry.carbs, t.carbs);
    const fatPct = formatPct(entry.fat, t.fat);

    parts.push(
      `P: ${entry.protein}g${t.protein !== null ? ` / ${t.protein}g (${protPct})` : ""}`
    );
    parts.push(
      `C: ${entry.carbs}g${t.carbs !== null ? ` / ${t.carbs}g (${carbPct})` : ""}`
    );
    parts.push(
      `F: ${entry.fat}g${t.fat !== null ? ` / ${t.fat}g (${fatPct})` : ""}`
    );
  } else {
    parts.push(`P: ${entry.protein}g`);
    parts.push(`C: ${entry.carbs}g`);
    parts.push(`F: ${entry.fat}g`);
  }

  // If targets were requested but none found
  if (showTargets && !entry.targets) {
    return parts.join(" | ") + "  (no targets set)";
  }

  return parts.join(" | ");
}

export function formatPlainText(
  entries: DiaryData[],
  isRange: boolean,
  showTargets: boolean
): void {
  if (!isRange) {
    const entry = entries[0];
    if (!entry) {
      p.outro("No diary data found");
    } else {
      p.outro(formatEntryLine(entry, showTargets));
    }
    return;
  }

  // Range output
  for (const entry of entries) {
    p.log.info(formatEntryLine(entry, showTargets, `${entry.date}:`));
  }

  // Averages
  if (entries.length > 1) {
    const count = entries.length;
    const avgCal = Math.round(
      entries.reduce((s, e) => s + e.calories, 0) / count
    );
    const avgProt = Math.round(
      entries.reduce((s, e) => s + e.protein, 0) / count
    );
    const avgCarbs = Math.round(
      entries.reduce((s, e) => s + e.carbs, 0) / count
    );
    const avgFat = Math.round(entries.reduce((s, e) => s + e.fat, 0) / count);

    const avgEntry: DiaryData = {
      date: "Average",
      calories: avgCal,
      protein: avgProt,
      carbs: avgCarbs,
      fat: avgFat,
    };

    // Average targets (use first entry's targets as representative)
    if (showTargets && entries.some((e) => e.targets)) {
      // Average the targets across entries that have them
      const withTargets = entries.filter((e) => e.targets);
      if (withTargets.length > 0) {
        const avgTargetCal = averageNullable(
          withTargets.map((e) => e.targets!.calories)
        );
        const avgTargetProt = averageNullable(
          withTargets.map((e) => e.targets!.protein)
        );
        const avgTargetCarbs = averageNullable(
          withTargets.map((e) => e.targets!.carbs)
        );
        const avgTargetFat = averageNullable(
          withTargets.map((e) => e.targets!.fat)
        );
        avgEntry.targets = {
          calories: avgTargetCal,
          protein: avgTargetProt,
          carbs: avgTargetCarbs,
          fat: avgTargetFat,
        };
      }

      // Average exercise
      const totalBurned = entries.reduce(
        (s, e) => s + (e.exercise?.caloriesBurned ?? 0),
        0
      );
      const avgBurned = Math.round(totalBurned / count);
      avgEntry.exercise = avgBurned > 0 ? { caloriesBurned: avgBurned } : null;
    }

    p.log.info("───");
    p.log.info(formatEntryLine(avgEntry, showTargets, "Average:   "));
  }
}

function averageNullable(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((s, v) => s + v, 0) / nums.length);
}
