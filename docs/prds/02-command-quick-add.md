# PRD: quick-add Command

## Overview

The `quick-add` command allows users to log raw macro entries to Cronometer without selecting a specific food item.

## User Stories

- As a user, I want to quickly log macros when I know the nutritional values but don't want to search for a specific food
- As a user, I want to assign my quick-add entry to a meal category

## Command Specification

```bash
crono quick-add [options]
```

### Options

| Flag | Long Form   | Type   | Required    | Default       | Description                       |
| ---- | ----------- | ------ | ----------- | ------------- | --------------------------------- |
| `-p` | `--protein` | number | conditional | -             | Grams of protein                  |
| `-c` | `--carbs`   | number | conditional | -             | Grams of carbohydrates            |
| `-f` | `--fat`     | number | conditional | -             | Grams of fat                      |
| `-a` | `--alcohol` | number | conditional | -             | Grams of alcohol                  |
| `-m` | `--meal`    | string | no          | uncategorized | Meal category                     |
| `-d` | `--date`    | string | no          | today         | Date (YYYY-MM-DD, yesterday, -1d) |

**Validation:** At least one of `-p`, `-c`, `-f`, or `-a` must be provided.

### Meal Categories

Valid values for `--meal`:

- `Breakfast`
- `Lunch`
- `Dinner`
- `Snacks`

Case-insensitive matching (e.g., `dinner` → `Dinner`).

## Examples

```bash
# Minimal: just protein
crono quick-add -p 30

# All macros
crono quick-add -p 30 -c 100 -f 20

# With meal assignment
crono quick-add -p 30 -c 50 -f 15 -m Dinner

# Long form
crono quick-add --protein 25 --carbs 40 --fat 10 --meal Lunch

# Log to yesterday
crono quick-add -p 30 -d yesterday -m Dinner

# Log alcohol
crono quick-add -a 14 -m Dinner

# Combine date and alcohol
crono quick-add -p 30 -a 14 -d -3d -m Dinner
```

## Implementation Notes

### Cronometer UI Flow

Each macro (protein, carbs, fat, alcohol) is added as a separate "Quick Add" food item. For each macro:

1. Navigate to `cronometer.com/#diary` (with optional prev-day arrow navigation for `--date`)
2. Right-click the meal category (e.g. "Dinner")
3. Click "Add Food..." in the context menu
4. Search for the macro's food item (e.g. "Quick Add, Protein")
5. Click SEARCH, select the matching result
6. Enter serving size in grams via the "Serving Size" input
7. Click "ADD TO DIARY"

Cronometer is a GWT app, so automation uses keyboard.type() instead of fill() for search, and native input setter + event dispatch for the serving size field to trigger GWT's change detection.

### Error Handling

| Error              | User Message                                             |
| ------------------ | -------------------------------------------------------- |
| No macros provided | "At least one macro (-p, -c, -f, or -a) is required"     |
| Invalid meal       | "Invalid meal. Use: Breakfast, Lunch, Dinner, or Snacks" |
| Not logged in      | "Please log in first. Run: crono login"                  |
| Kernel unavailable | "Could not connect to Kernel. Ensure it's running."      |

## Success Output

```
✓ Added quick entry: 30g protein, 100g carbs, 20g fat → Dinner
```

## Future Enhancements

- `-cal` / `--calories` flag for manual calorie override
- `--note` flag for entry notes
