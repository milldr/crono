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

| Flag | Long Form   | Type   | Required    | Default       | Description            |
| ---- | ----------- | ------ | ----------- | ------------- | ---------------------- |
| `-p` | `--protein` | number | conditional | -             | Grams of protein       |
| `-c` | `--carbs`   | number | conditional | -             | Grams of carbohydrates |
| `-f` | `--fat`     | number | conditional | -             | Grams of fat           |
| `-m` | `--meal`    | string | no          | uncategorized | Meal category          |

**Validation:** At least one of `-p`, `-c`, or `-f` must be provided.

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
```

## Implementation Notes

### Cronometer UI Flow

1. Navigate to diary page
2. Click "+ Add Food" button
3. Click "Quick Add" tab
4. Fill in macro fields
5. Select meal from dropdown (if specified)
6. Click "Add" button

### Error Handling

| Error              | User Message                                             |
| ------------------ | -------------------------------------------------------- |
| No macros provided | "At least one macro (-p, -c, or -f) is required"         |
| Invalid meal       | "Invalid meal. Use: Breakfast, Lunch, Dinner, or Snacks" |
| Not logged in      | "Please log in first. Run: crono login"                  |
| Kernel unavailable | "Could not connect to Kernel. Ensure it's running."      |

## Success Output

```
✓ Added quick entry: 30g protein, 100g carbs, 20g fat → Dinner
```

## Future Enhancements

- `-cal` / `--calories` flag for manual calorie override
- `--date` flag to add to a different day
- `--note` flag for entry notes
