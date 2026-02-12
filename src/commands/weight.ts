import * as p from "@clack/prompts";
import { getKernelClient, type WeightData } from "../kernel/client.js";
import { parseDate, parseRange, dateRange, todayStr } from "../utils/date.js";

export interface WeightOptions {
  date?: string;
  range?: string;
  json?: boolean;
}

export async function weight(options: WeightOptions): Promise<void> {
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
    p.intro("crono weight");
  }

  const s = options.json ? null : p.spinner();
  s?.start("Connecting...");

  try {
    const kernel = await getKernelClient();
    const entries = await kernel.getWeight(dates, (msg) => s?.message(msg));

    s?.stop("Done.");

    if (options.json) {
      if (isRange) {
        console.log(JSON.stringify(entries, null, 2));
      } else {
        console.log(
          JSON.stringify(
            entries[0] ?? { date: dates[0], weight: null, unit: "lbs" },
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
    p.log.error(`Failed to read weight: ${error}`);
    process.exit(1);
  }
}

function formatPlainText(entries: WeightData[], isRange: boolean): void {
  if (!isRange) {
    const entry = entries[0];
    if (!entry || entry.weight === null) {
      p.outro(`No weight recorded for ${entry?.date ?? "today"}`);
    } else {
      p.outro(`${entry.weight} ${entry.unit}`);
    }
    return;
  }

  // Range output
  for (const entry of entries) {
    if (entry.weight === null) {
      p.log.info(`${entry.date}: \u2014`);
    } else {
      p.log.info(`${entry.date}: ${entry.weight}`);
    }
  }
}
