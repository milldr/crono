import { describe, it, expect } from "vitest";
import {
  parseDate,
  formatDate,
  parseRange,
  todayStr,
  dateRange,
  resolveDate,
} from "../../src/utils/date.js";

describe("parseDate", () => {
  it("should accept valid YYYY-MM-DD dates", () => {
    expect(parseDate("2026-01-15")).toBe("2026-01-15");
    expect(parseDate("2026-12-31")).toBe("2026-12-31");
  });

  it("should reject invalid format", () => {
    expect(() => parseDate("01-15-2026")).toThrow("Invalid date format");
    expect(() => parseDate("2026/01/15")).toThrow("Invalid date format");
    expect(() => parseDate("not-a-date")).toThrow("Invalid date format");
    expect(() => parseDate("20260115")).toThrow("Invalid date format");
  });

  it("should reject non-existent dates", () => {
    expect(() => parseDate("2026-02-30")).toThrow("Invalid date");
    expect(() => parseDate("2026-13-01")).toThrow("Invalid date");
  });
});

describe("formatDate", () => {
  it("should format Date objects as YYYY-MM-DD", () => {
    expect(formatDate(new Date(2026, 0, 15))).toBe("2026-01-15");
    expect(formatDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("should pad single-digit months and days", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatDate(new Date(2026, 8, 9))).toBe("2026-09-09");
  });
});

describe("todayStr", () => {
  it("should return a valid YYYY-MM-DD string", () => {
    const today = todayStr();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseRange", () => {
  it("should parse relative ranges like 7d", () => {
    const { start, end } = parseRange("7d");
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 7 days inclusive means 6 days between start and end
    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(6);
  });

  it("should parse 1d as today only", () => {
    const { start, end } = parseRange("1d");
    expect(start).toBe(end);
    expect(start).toBe(todayStr());
  });

  it("should parse absolute ranges", () => {
    const { start, end } = parseRange("2026-01-15:2026-02-10");
    expect(start).toBe("2026-01-15");
    expect(end).toBe("2026-02-10");
  });

  it("should reject invalid range formats", () => {
    expect(() => parseRange("abc")).toThrow("Invalid range format");
    expect(() => parseRange("7")).toThrow("Invalid range format");
    expect(() => parseRange("7days")).toThrow("Invalid range format");
  });

  it("should reject ranges where start is after end", () => {
    expect(() => parseRange("2026-02-10:2026-01-15")).toThrow("start");
  });

  it("should reject zero-day relative ranges", () => {
    expect(() => parseRange("0d")).toThrow("positive");
  });
});

describe("resolveDate", () => {
  it("should resolve 'yesterday' to yesterday's date", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(resolveDate("yesterday")).toBe(expected);
  });

  it("should resolve '-1d' to yesterday's date", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const expected = formatDate(d);
    expect(resolveDate("-1d")).toBe(expected);
  });

  it("should resolve '-7d' to 7 days ago", () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const expected = formatDate(d);
    expect(resolveDate("-7d")).toBe(expected);
  });

  it("should pass through valid YYYY-MM-DD dates", () => {
    expect(resolveDate("2026-02-10")).toBe("2026-02-10");
  });

  it("should throw on invalid input", () => {
    expect(() => resolveDate("not-a-date")).toThrow("Invalid date format");
    expect(() => resolveDate("2026-13-01")).toThrow("Invalid date");
  });
});

describe("dateRange", () => {
  it("should return dates in descending order", () => {
    const dates = dateRange("2026-02-08", "2026-02-10");
    expect(dates).toEqual(["2026-02-10", "2026-02-09", "2026-02-08"]);
  });

  it("should return a single date for same start and end", () => {
    const dates = dateRange("2026-02-10", "2026-02-10");
    expect(dates).toEqual(["2026-02-10"]);
  });

  it("should handle month boundaries", () => {
    const dates = dateRange("2026-01-30", "2026-02-02");
    expect(dates).toEqual([
      "2026-02-02",
      "2026-02-01",
      "2026-01-31",
      "2026-01-30",
    ]);
  });
});
