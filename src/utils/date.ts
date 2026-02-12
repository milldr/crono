/**
 * Date validation and range parsing utilities.
 *
 * Shared by `weight` and future `diary` commands.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RELATIVE_RE = /^(\d+)d$/;
const ABSOLUTE_RE = /^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/;

/**
 * Validate a YYYY-MM-DD string and return it.
 * Throws if the format is invalid or the date doesn't exist.
 */
export function parseDate(str: string): string {
  if (!DATE_RE.test(str)) {
    throw new Error(`Invalid date format "${str}". Use YYYY-MM-DD`);
  }
  const d = new Date(str + "T00:00:00");
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date "${str}"`);
  }
  // Verify the parsed date matches the input (catches things like 2026-02-30)
  if (formatDate(d) !== str) {
    throw new Error(`Invalid date "${str}"`);
  }
  return str;
}

/** Format a Date object as YYYY-MM-DD. */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Return today's date as YYYY-MM-DD. */
export function todayStr(): string {
  return formatDate(new Date());
}

/**
 * Parse a range spec into start/end date strings.
 *
 * Supports:
 * - Relative: "7d", "30d" — last N days inclusive of today
 * - Absolute: "2026-01-15:2026-02-10"
 */
export function parseRange(spec: string): { start: string; end: string } {
  const relMatch = spec.match(RELATIVE_RE);
  if (relMatch) {
    const days = parseInt(relMatch[1], 10);
    if (days <= 0) {
      throw new Error(`Invalid range "${spec}". Day count must be positive`);
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    return { start: formatDate(start), end: formatDate(end) };
  }

  const absMatch = spec.match(ABSOLUTE_RE);
  if (absMatch) {
    const start = parseDate(absMatch[1]);
    const end = parseDate(absMatch[2]);
    if (start > end) {
      throw new Error(`Invalid range: start "${start}" is after end "${end}"`);
    }
    return { start, end };
  }

  throw new Error(
    `Invalid range format "${spec}". Use '7d', '30d', or 'YYYY-MM-DD:YYYY-MM-DD'`
  );
}

/**
 * Generate an array of YYYY-MM-DD strings between start and end (inclusive),
 * in descending order (most recent first).
 */
export function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(end + "T00:00:00");
  const startDate = new Date(start + "T00:00:00");

  while (cur >= startDate) {
    dates.push(formatDate(cur));
    cur.setDate(cur.getDate() - 1);
  }

  return dates;
}
