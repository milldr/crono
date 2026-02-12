# PRD: diary Command

## Overview

The `diary` command reads nutrition totals from the user's Cronometer diary. It supports fetching a single day's summary or a range of days.

## User Stories

- As a user, I want to check today's macro totals from the terminal without opening Cronometer
- As a user, I want to review my nutrition over the past week to spot trends
- As a user, I want JSON output so I can feed nutrition data into spreadsheets or scripts

## Command Specification

```bash
crono diary [options]
```

### Options

| Flag | Long Form | Type   | Required | Default | Description                                            |
| ---- | --------- | ------ | -------- | ------- | ------------------------------------------------------ |
| `-d` | `--date`  | string | no       | today   | Date to fetch (YYYY-MM-DD)                             |
| `-r` | `--range` | string | no       | -       | Date range (e.g. "7d", "30d", "2026-01-15:2026-02-10") |
|      | `--json`  | flag   | no       | false   | Output as JSON instead of plain text                   |

`-d` and `-r` are mutually exclusive. If neither is provided, today's totals are shown.

### Range Format

- **Relative:** `7d`, `30d`, `90d` — last N days from today
- **Absolute:** `2026-01-15:2026-02-10` — inclusive start:end date range

## Examples

```bash
# Today's totals
crono diary
# → Consumed: 1847 kcal | P: 168g | C: 142g | F: 58g

# Specific date
crono diary -d 2026-02-05
# → Consumed: 2340 kcal | P: 195g | C: 220g | F: 72g

# Last 7 days
crono diary -r 7d
# →
# 2026-02-11: 1847 kcal | P: 168g | C: 142g | F: 58g
# 2026-02-10: 2210 kcal | P: 185g | C: 198g | F: 65g
# 2026-02-09: 2450 kcal | P: 201g | C: 225g | F: 78g
# ...

# JSON for scripting
crono diary -r 7d --json
# → [{"date":"2026-02-11","calories":1847,"protein":168,"carbs":142,"fat":58}, ...]
```

## Implementation Notes

### Data Source

Scrape from the diary page's Energy Summary section. This panel shows daily totals for calories, protein, carbs, and fat.

### Date Navigation

- Navigate dates using the calendar picker or URL hash on the diary page
- For ranges, iterate through each date and collect the summary

### Edge Cases

- **Empty diary day:** Some days may have no logged food. Show zeros (plain text) or `0` values (JSON).
- **Partial day:** If the user hasn't finished logging, totals reflect what's been logged so far. No special handling needed.
- **Units:** Calories are always kcal. Macros are always grams. These are consistent across Cronometer settings.

### Error Handling

| Error                | User Message                                                        |
| -------------------- | ------------------------------------------------------------------- |
| Invalid date format  | "Invalid date format. Use YYYY-MM-DD"                               |
| Invalid range format | "Invalid range format. Use '7d', '30d', or 'YYYY-MM-DD:YYYY-MM-DD'" |
| Both -d and -r given | "-d and -r are mutually exclusive"                                  |
| Not logged in        | "Please log in first. Run: crono login"                             |

### Output Format

**Plain text (default):**

Single date:

```
Consumed: 1847 kcal | P: 168g | C: 142g | F: 58g
```

Range:

```
2026-02-11: 1847 kcal | P: 168g | C: 142g | F: 58g
2026-02-10: 2210 kcal | P: 185g | C: 198g | F: 65g
2026-02-09: 2450 kcal | P: 201g | C: 225g | F: 78g
```

**JSON (`--json`):**

Single date:

```json
{
  "date": "2026-02-11",
  "calories": 1847,
  "protein": 168,
  "carbs": 142,
  "fat": 58
}
```

Range:

```json
[
  {
    "date": "2026-02-11",
    "calories": 1847,
    "protein": 168,
    "carbs": 142,
    "fat": 58
  },
  {
    "date": "2026-02-10",
    "calories": 2210,
    "protein": 185,
    "carbs": 198,
    "fat": 65
  },
  {
    "date": "2026-02-09",
    "calories": 2450,
    "protein": 201,
    "carbs": 225,
    "fat": 78
  }
]
```

## Future Enhancements

- `--detailed` flag to show per-meal breakdown (Breakfast, Lunch, Dinner, Snacks)
- `--nutrients` flag to include micronutrients (fiber, sodium, vitamins, etc.)
- `--targets` flag to show consumed vs. target with percentage
- `--csv` output format
