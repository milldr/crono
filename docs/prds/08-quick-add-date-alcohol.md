# PRD: quick-add Date & Alcohol Flags

## Overview

Two new flags for the `quick-add` command: `-d/--date` for retroactive diary logging and `-a/--alcohol` for tracking alcohol grams as a separate macro.

Implements: [#13](https://github.com/milldr/crono/issues/13), [#14](https://github.com/milldr/crono/issues/14)

## User Stories

- As a user, I want to log macros to a past date so I can backfill entries I forgot to track
- As a user, I want to track alcohol grams separately since alcohol has its own caloric density (7 cal/g)

## Command Specification

### New Options

| Flag | Long Form   | Type   | Required | Default | Description               |
| ---- | ----------- | ------ | -------- | ------- | ------------------------- |
| `-d` | `--date`    | string | no       | today   | Target date for the entry |
| `-a` | `--alcohol` | number | no       | -       | Grams of alcohol          |

### Date Formats

The `--date` flag accepts three formats:

| Format       | Example      | Description           |
| ------------ | ------------ | --------------------- |
| `yesterday`  | `yesterday`  | Shorthand for -1d     |
| `-Nd`        | `-1d`, `-7d` | N days ago from today |
| `YYYY-MM-DD` | `2026-02-10` | Absolute ISO date     |

Invalid dates produce an error message and exit.

### Updated Validation

At least one of `-p`, `-c`, `-f`, or `-a` must be provided (alcohol now counts as a valid macro).

## Examples

```bash
# Log to yesterday
crono quick-add -p 30 -d yesterday -m Dinner

# Log to 3 days ago
crono quick-add -p 25 -c 50 -d -3d -m Lunch

# Log to a specific date
crono quick-add -f 15 -d 2026-02-10

# Log alcohol
crono quick-add -a 14 -m Dinner

# Combine all flags
crono quick-add -p 30 -c 50 -f 10 -a 14 -d yesterday -m Dinner
```

## Implementation Notes

### Date Navigation

Cronometer's GWT hash routing does not support `?date=` query parameters. Date navigation uses the prev-day arrow approach (same as `diary` and `weight` commands):

1. Navigate to `cronometer.com/#diary`
2. Wait 2000ms for GWT to fully render
3. Click `i.diary-date-previous` arrow N times (with 2000ms stabilization between clicks)

This is capped at 90 days back to prevent runaway loops.

### Alcohol Macro

Alcohol uses the same "Quick Add" mechanism as protein/carbs/fat:

- Search term: `"Quick Add, Alcohol"` (a built-in Cronometer food item)
- Serving size entered in grams, same as other macros

### Date Resolution

The `resolveDate()` utility in `src/utils/date.ts` handles all three input formats, reusing the existing `parseDate()` and `formatDate()` functions for validation and formatting.

## Success Output

```
✓ Added: 30g protein, 14g alcohol → Dinner on 2026-02-15
```

The date suffix only appears when `--date` is provided.

## Files Changed

| File                             | Changes                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `src/utils/date.ts`              | Added `resolveDate()` function                               |
| `src/kernel/client.ts`           | Added `alcohol` and `date` to `MacroEntry` interface         |
| `src/kernel/quick-add.ts`        | Arrow-based date navigation; alcohol in `MACRO_SEARCH_NAMES` |
| `src/commands/quick-add.ts`      | New options, validation, date resolution, passthrough        |
| `src/index.ts`                   | Registered `-d` and `-a` CLI options                         |
| `tests/utils/date.test.ts`       | `resolveDate()` tests                                        |
| `tests/kernel/quick-add.test.ts` | Date navigation and alcohol macro tests                      |
