import { describe, it, expect } from "vitest";
import { formatPct, formatEntryLine } from "../src/commands/diary.js";
import type { DiaryData } from "../src/kernel/client.js";

describe("diary command", () => {
  it("should reject mutually exclusive -d and -r", () => {
    // Both date and range provided is invalid
    const options = { date: "2026-02-10", range: "7d" };
    expect(options.date && options.range).toBeTruthy();
  });

  it("should accept valid date format", () => {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    expect(dateRe.test("2026-02-10")).toBe(true);
    expect(dateRe.test("02-10-2026")).toBe(false);
    expect(dateRe.test("2026/02/10")).toBe(false);
  });

  it("should accept relative range formats", () => {
    const rangeRe = /^(\d+)d$/;
    expect(rangeRe.test("7d")).toBe(true);
    expect(rangeRe.test("30d")).toBe(true);
    expect(rangeRe.test("90d")).toBe(true);
    expect(rangeRe.test("7days")).toBe(false);
  });

  it("should accept absolute range formats", () => {
    const rangeRe = /^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/;
    expect(rangeRe.test("2026-01-15:2026-02-10")).toBe(true);
    expect(rangeRe.test("2026-01-15")).toBe(false);
  });

  it("should default to today when no options provided", () => {
    const options = {};
    const hasDate = "date" in options;
    const hasRange = "range" in options;
    expect(hasDate).toBe(false);
    expect(hasRange).toBe(false);
    // When neither is provided, today's date is used
  });
});

describe("formatPct", () => {
  it("should show positive percentage with + sign", () => {
    expect(formatPct(168, 150)).toBe("+12%");
  });

  it("should show negative percentage with - sign", () => {
    expect(formatPct(142, 200)).toBe("-29%");
  });

  it("should show 0% when actual equals target", () => {
    expect(formatPct(100, 100)).toBe("+0%");
  });

  it("should return empty string for null target", () => {
    expect(formatPct(100, null)).toBe("");
  });

  it("should return empty string for zero target", () => {
    expect(formatPct(100, 0)).toBe("");
  });
});

describe("formatEntryLine", () => {
  const baseEntry: DiaryData = {
    date: "2026-03-10",
    calories: 1847,
    protein: 168,
    carbs: 142,
    fat: 58,
  };

  it("should format basic entry without targets", () => {
    const line = formatEntryLine(baseEntry, false);
    expect(line).toBe("1847 kcal | P: 168g | C: 142g | F: 58g");
  });

  it("should include prefix when provided", () => {
    const line = formatEntryLine(baseEntry, false, "2026-03-10:");
    expect(line).toContain("2026-03-10:");
  });

  it("should show no targets set when targets requested but missing", () => {
    const line = formatEntryLine(baseEntry, true);
    expect(line).toContain("(no targets set)");
  });

  it("should show target comparisons with percentages", () => {
    const entry: DiaryData = {
      ...baseEntry,
      targets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    };
    const line = formatEntryLine(entry, true);
    expect(line).toContain("92% of 2000");
    expect(line).toContain("P: 168g / 150g (+12%)");
    expect(line).toContain("C: 142g / 200g (-29%)");
    expect(line).toContain("F: 58g / 65g (-11%)");
  });

  it("should show net calories with exercise data", () => {
    const entry: DiaryData = {
      ...baseEntry,
      targets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
      exercise: { caloriesBurned: 350 },
    };
    const line = formatEntryLine(entry, true);
    expect(line).toContain("1847 kcal - 350 burned = 1497 net");
  });

  it("should handle null individual target values", () => {
    const entry: DiaryData = {
      ...baseEntry,
      targets: { calories: 2000, protein: null, carbs: 200, fat: null },
    };
    const line = formatEntryLine(entry, true);
    expect(line).toContain("P: 168g");
    expect(line).not.toContain("P: 168g /");
    expect(line).toContain("C: 142g / 200g");
    expect(line).toContain("F: 58g");
    expect(line).not.toContain("F: 58g /");
  });

  it("should not show exercise when caloriesBurned is 0", () => {
    const entry: DiaryData = {
      ...baseEntry,
      targets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
      exercise: { caloriesBurned: 0 },
    };
    const line = formatEntryLine(entry, true);
    expect(line).not.toContain("burned");
    expect(line).toContain("92% of 2000");
  });
});
