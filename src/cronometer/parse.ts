/**
 * CSV parsing for Cronometer export data.
 *
 * Hand-rolled parser — Cronometer's CSV format is simple and predictable.
 * No external library needed.
 */

export interface NutritionEntry {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  [key: string]: string | number;
}

export interface ExerciseEntry {
  date: string;
  time: string;
  exercise: string;
  minutes: number;
  caloriesBurned: number;
  group: string;
}

export interface BiometricEntry {
  date: string;
  time: string;
  metric: string;
  unit: string;
  amount: number | string;
}

/** Parse a CSV string into rows of string arrays. Handles quoted fields. */
export function parseCSV(csv: string): string[][] {
  const lines = csv.trim().split("\n");
  return lines.map((line) => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields;
  });
}

/** Find the index of a column by name (case-insensitive). */
function colIndex(headers: string[], name: string): number {
  return headers.findIndex(
    (h) => h.trim().toLowerCase() === name.toLowerCase()
  );
}

/** Parse a numeric field, returning 0 if empty or NaN. */
function num(value: string | undefined): number {
  if (!value || value.trim() === "") return 0;
  const n = parseFloat(value.trim());
  return isNaN(n) ? 0 : n;
}

export function parseNutrition(csv: string): NutritionEntry[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const dateIdx = colIndex(headers, "Date");
  const energyIdx = colIndex(headers, "Energy (kcal)");
  const proteinIdx = colIndex(headers, "Protein (g)");
  const carbsIdx = colIndex(headers, "Carbs (g)");
  const fatIdx = colIndex(headers, "Fat (g)");

  if (dateIdx === -1) return [];

  const entries: NutritionEntry[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const date = row[dateIdx]?.trim();
    if (!date) continue;

    const entry: NutritionEntry = {
      date,
      calories: num(row[energyIdx]),
      protein: num(row[proteinIdx]),
      carbs: num(row[carbsIdx]),
      fat: num(row[fatIdx]),
    };

    // Include all columns for JSON/CSV output
    for (let j = 0; j < headers.length; j++) {
      if (j === dateIdx) continue;
      const key = headers[j].trim();
      const val = row[j]?.trim() ?? "";
      if (key && val !== "") {
        const parsed = parseFloat(val);
        entry[key] = isNaN(parsed) ? val : parsed;
      }
    }

    entries.push(entry);
  }

  return entries;
}

export function parseExercises(csv: string): ExerciseEntry[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const dayIdx = colIndex(headers, "Day");
  const timeIdx = colIndex(headers, "Time");
  const exerciseIdx = colIndex(headers, "Exercise");
  const minutesIdx = colIndex(headers, "Minutes");
  const caloriesIdx = colIndex(headers, "Calories Burned");
  const groupIdx = colIndex(headers, "Group");

  if (dayIdx === -1) return [];

  const entries: ExerciseEntry[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const date = row[dayIdx]?.trim();
    if (!date) continue;

    entries.push({
      date,
      time: row[timeIdx]?.trim() ?? "",
      exercise: row[exerciseIdx]?.trim() ?? "",
      minutes: num(row[minutesIdx]),
      caloriesBurned: num(row[caloriesIdx]),
      group: row[groupIdx]?.trim() ?? "",
    });
  }

  return entries;
}

export function parseBiometrics(csv: string): BiometricEntry[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const dayIdx = colIndex(headers, "Day");
  const timeIdx = colIndex(headers, "Time");
  const metricIdx = colIndex(headers, "Metric");
  const unitIdx = colIndex(headers, "Unit");
  const amountIdx = colIndex(headers, "Amount");

  if (dayIdx === -1) return [];

  const entries: BiometricEntry[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const date = row[dayIdx]?.trim();
    if (!date) continue;

    const rawAmount = row[amountIdx]?.trim() ?? "";
    // Keep as string if it contains non-numeric chars (e.g. blood pressure "120/80")
    const isNumeric = rawAmount !== "" && /^-?\d+(\.\d+)?$/.test(rawAmount);
    const amount = isNumeric ? parseFloat(rawAmount) : rawAmount;

    entries.push({
      date,
      time: row[timeIdx]?.trim() ?? "",
      metric: row[metricIdx]?.trim() ?? "",
      unit: row[unitIdx]?.trim() ?? "",
      amount,
    });
  }

  return entries;
}
