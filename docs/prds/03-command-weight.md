# PRD: weight Command

## Overview

The `weight` command reads weight data from the user's Cronometer diary or trends page. It supports fetching today's weight, a specific date, or a date range.

## User Stories

- As a user, I want to check my current weight from the terminal without opening Cronometer
- As a user, I want to view my weight trend over the past week or month
- As a user, I want JSON output so I can pipe weight data into scripts or other tools

## Command Specification

```bash
crono weight [options]
```

### Options

| Flag | Long Form | Type   | Required | Default | Description                                                    |
| ---- | --------- | ------ | -------- | ------- | -------------------------------------------------------------- |
| `-d` | `--date`  | string | no       | today   | Get weight for a specific date (YYYY-MM-DD)                    |
| `-r` | `--range` | string | no       | -       | Get weight history (e.g. "7d", "30d", "2026-01-15:2026-02-10") |
|      | `--json`  | flag   | no       | false   | Output as JSON instead of plain text                           |

`-d` and `-r` are mutually exclusive. If neither is provided, today's weight is shown.

### Range Format

- **Relative:** `7d`, `30d`, `90d` — last N days from today
- **Absolute:** `2026-01-15:2026-02-10` — inclusive start:end date range

## Examples

```bash
# Today's weight
crono weight
# → 212.7 lbs

# Specific date
crono weight -d 2026-02-05
# → 214.4 lbs

# Last 7 days
crono weight -r 7d
# →
# 2026-02-10: 212.7
# 2026-02-09: 215.7
# 2026-02-08: 214.1
# ...

# JSON output for scripting
crono weight -r 7d --json
# → [{"date":"2026-02-10","weight":212.7}, ...]
```

## Implementation Notes

### Data Source

Two potential approaches for scraping weight data:

1. **Trends > Charts** — The weight chart may have data in `img` alt text or rendered in a canvas/SVG element
2. **Diary biometrics section** — Each diary date has a biometrics panel showing the day's weigh-in

Approach 2 (diary biometrics) is likely more reliable for per-date lookups. For ranges, iterate over dates or use the trends page if it exposes structured data.

### Edge Cases

- **Missing days:** Some days may not have weigh-ins. Output should skip those days (plain text) or include `null` weight values (JSON).
- **Weight unit:** Should match the user's Cronometer settings (lbs or kg). Do not hardcode a unit — read it from the page.
- **No weight data at all:** Show a clear message (e.g. "No weight recorded for 2026-02-05").

### Error Handling

| Error                | User Message                                                        |
| -------------------- | ------------------------------------------------------------------- |
| Invalid date format  | "Invalid date format. Use YYYY-MM-DD"                               |
| Invalid range format | "Invalid range format. Use '7d', '30d', or 'YYYY-MM-DD:YYYY-MM-DD'" |
| Both -d and -r given | "-d and -r are mutually exclusive"                                  |
| Not logged in        | "Please log in first. Run: crono login"                             |
| No data for date     | "No weight recorded for \<date>"                                    |

### Output Format

**Plain text (default):**

Single date:

```
212.7 lbs
```

Range:

```
2026-02-10: 212.7
2026-02-09: 215.7
2026-02-08: 214.1
2026-02-07: —
2026-02-06: 213.5
```

**JSON (`--json`):**

Single date:

```json
{ "date": "2026-02-10", "weight": 212.7, "unit": "lbs" }
```

Range:

```json
[
  { "date": "2026-02-10", "weight": 212.7, "unit": "lbs" },
  { "date": "2026-02-09", "weight": 215.7, "unit": "lbs" },
  { "date": "2026-02-08", "weight": 214.1, "unit": "lbs" },
  { "date": "2026-02-07", "weight": null, "unit": "lbs" },
  { "date": "2026-02-06", "weight": 213.5, "unit": "lbs" }
]
```

## Future Enhancements

- `crono weight --set <value>` — Log a weight entry for today
- `crono weight --graph` — ASCII chart of weight trend in the terminal
- `crono weight --csv` — CSV output format
