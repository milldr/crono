import * as p from "@clack/prompts";
import { getKernelClient, type DiaryData } from "../kernel/client.js";
import { parseDate, parseRange, dateRange, todayStr } from "../utils/date.js";

export interface DiaryOptions {
  date?: string;
  range?: string;
  json?: boolean;
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
    p.intro("crono diary");
  }

  const s = options.json ? null : p.spinner();
  s?.start("Connecting...");

  try {
    const kernel = await getKernelClient();
    const entries = await kernel.getDiary(dates, (msg) => s?.message(msg));

    s?.stop("Done.");

    if (options.json) {
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
            },
            null,
            2
          )
        );
      }
    } else {
      formatPlainText(entries, isRange);
    }
  } catch (error) {
    s?.stop("Failed.");
    p.log.error(`Failed to read diary: ${error}`);
    process.exit(1);
  }
}

function formatPlainText(entries: DiaryData[], isRange: boolean): void {
  if (!isRange) {
    const entry = entries[0];
    if (!entry) {
      p.outro("No diary data found");
    } else {
      p.outro(
        `${entry.calories} kcal | P: ${entry.protein}g | C: ${entry.carbs}g | F: ${entry.fat}g`
      );
    }
    return;
  }

  // Range output
  for (const entry of entries) {
    p.log.info(
      `${entry.date}: ${entry.calories} kcal | P: ${entry.protein}g | C: ${entry.carbs}g | F: ${entry.fat}g`
    );
  }
}
