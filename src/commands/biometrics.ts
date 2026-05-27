import * as p from "@clack/prompts";
import { getAutomationClient } from "../automation/client.js";
import { formatKernelError } from "../kernel/errors.js";
import { parseDate, todayStr } from "../utils/date.js";

export interface BiometricsOptions {
  weight?: number;
  bodyFat?: number;
  systolic?: number;
  diastolic?: number;
  date?: string;
  unit?: string;
}

export async function biometrics(options: BiometricsOptions): Promise<void> {
  // Validate at least one biometric is provided
  if (
    options.weight === undefined &&
    options.bodyFat === undefined &&
    (options.systolic === undefined || options.diastolic === undefined)
  ) {
    p.log.error(
      "At least one biometric required: --weight, --body-fat, or both --systolic and --diastolic"
    );
    process.exit(1);
  }

  // Validate blood pressure requires both values
  if (
    (options.systolic !== undefined && options.diastolic === undefined) ||
    (options.systolic === undefined && options.diastolic !== undefined)
  ) {
    p.log.error("Blood pressure requires both --systolic and --diastolic");
    process.exit(1);
  }

  // Validate weight unit
  const unit = options.unit?.toLowerCase() || "kg";
  if (unit !== "kg" && unit !== "lbs") {
    p.log.error('Weight unit must be "kg" or "lbs"');
    process.exit(1);
  }

  // Resolve date
  let targetDate: string;
  try {
    targetDate = options.date ? parseDate(options.date) : todayStr();
  } catch (error) {
    p.log.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }

  p.intro("🍎 crono biometrics");

  const s = p.spinner();
  s.start("Connecting...");

  try {
    const client = await getAutomationClient();

    // Log weight if provided
    if (options.weight !== undefined) {
      await client.logBiometric(
        {
          type: "weight",
          value: options.weight,
          unit,
          date: targetDate,
        },
        (msg) => s.message(msg)
      );
    }

    // Log body fat if provided
    if (options.bodyFat !== undefined) {
      await client.logBiometric(
        {
          type: "bodyfat",
          value: options.bodyFat,
          date: targetDate,
        },
        (msg) => s.message(msg)
      );
    }

    // Log blood pressure if provided
    if (options.systolic !== undefined && options.diastolic !== undefined) {
      await client.logBiometric(
        {
          type: "bloodpressure",
          systolic: options.systolic,
          diastolic: options.diastolic,
          date: targetDate,
        },
        (msg) => s.message(msg)
      );
    }

    s.stop("Done.");

    const logged: string[] = [];
    if (options.weight !== undefined)
      logged.push(`Weight: ${options.weight} ${unit}`);
    if (options.bodyFat !== undefined)
      logged.push(`Body Fat: ${options.bodyFat}%`);
    if (options.systolic !== undefined && options.diastolic !== undefined)
      logged.push(
        `Blood Pressure: ${options.systolic}/${options.diastolic} mmHg`
      );

    p.outro(`Logged biometrics for ${targetDate}:\n  ${logged.join("\n  ")}`);
  } catch (error) {
    s.stop("Failed.");
    p.log.error(`Failed to log biometrics: ${formatKernelError(error)}`);
    process.exit(1);
  }
}
