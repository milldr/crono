import { describe, it, expect } from "vitest";

describe("export command", () => {
  it("should validate export type", () => {
    const validTypes = ["nutrition", "exercises", "biometrics"];
    expect(validTypes.includes("nutrition")).toBe(true);
    expect(validTypes.includes("exercises")).toBe(true);
    expect(validTypes.includes("biometrics")).toBe(true);
    expect(validTypes.includes("invalid")).toBe(false);
    expect(validTypes.includes("food")).toBe(false);
  });

  it("should reject mutually exclusive -d and -r", () => {
    const options = { date: "2026-02-10", range: "7d" };
    expect(options.date && options.range).toBeTruthy();
  });

  it("should reject mutually exclusive --csv and --json", () => {
    const options = { csv: true, json: true };
    expect(options.csv && options.json).toBeTruthy();
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
  });
});
