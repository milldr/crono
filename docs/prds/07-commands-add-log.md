# PRD: add & log Commands

## Overview

Two new commands for working with named food items in Cronometer:

- **`crono add custom-food`** — Create a custom food in Cronometer with specified macros
- **`crono log`** — Search for a saved food (custom food, recipe, or database item) and log it to the diary

These complement `quick-add` (anonymous macros) by letting users work with real, named food entries. The primary use case is automation: users who eat the same meals repeatedly can script logging them by name instead of re-entering macros each time.

## User Stories

- As a user, I want to create a custom food from the CLI so I don't have to open the Cronometer web app
- As a user, I want to log a saved food by name so I can script my daily meal logging
- As a user, I want to log a food to a specific meal category (Breakfast, Lunch, Dinner, Snacks)
- As a user, I want to specify the number of servings when logging a food

## Command Specifications

### `crono add custom-food`

```bash
crono add custom-food <name> [options]
```

Creates a new custom food in Cronometer's "Custom Foods" section.

#### Options

| Flag | Long Form   | Type   | Required    | Default | Description            |
| ---- | ----------- | ------ | ----------- | ------- | ---------------------- |
| `-p` | `--protein` | number | conditional | -       | Grams of protein       |
| `-c` | `--carbs`   | number | conditional | -       | Grams of carbohydrates |
| `-f` | `--fat`     | number | conditional | -       | Grams of fat           |

**Validation:** At least one macro is required. Name is required (positional).

#### Examples

```bash
# Create a custom food with all macros
crono add custom-food "Wendy's Chicken Sandwich" -p 50 -c 100 -f 50

# Just protein and carbs
crono add custom-food "Post-Workout Shake" -p 40 -c 60
```

#### Success Output

```
┌  🍎 crono add
│
◇  Done.
│
└  Created custom food: Wendy's Chicken Sandwich (P: 50g | C: 100g | F: 50g)
```

### `crono log`

```bash
crono log <name> [options]
```

Searches for a food by name in the diary's "Add Food" dialog and logs it. Works with custom foods, custom recipes, and database items.

#### Options

| Flag | Long Form    | Type   | Required | Default       | Description        |
| ---- | ------------ | ------ | -------- | ------------- | ------------------ |
| `-m` | `--meal`     | string | no       | uncategorized | Meal category      |
| `-s` | `--servings` | number | no       | 1             | Number of servings |

#### Meal Categories

Same as `quick-add`: Breakfast, Lunch, Dinner, Snacks (case-insensitive).

#### Examples

```bash
# Log a custom food
crono log "Wendy's Chicken Sandwich"

# Log to a specific meal
crono log "Wendy's Chicken Sandwich" -m Dinner

# Log multiple servings
crono log "Post-Workout Shake" -s 2 -m Snacks
```

#### Success Output

```
┌  🍎 crono log
│
◇  Done.
│
└  Logged: Wendy's Chicken Sandwich → Dinner
```

## Architecture

Both commands use Kernel.sh browser automation, same as `quick-add`.

```
src/
├── commands/
│   ├── add.ts            # `crono add` command handler (dispatches to subcommands)
│   └── log.ts            # `crono log` command handler
├── kernel/
│   ├── add-custom-food.ts  # Playwright codegen for custom food creation
│   └── log-food.ts         # Playwright codegen for food search + diary add
```

### Kernel Client Extensions

Add two new methods to `KernelClient` in `src/kernel/client.ts`:

```typescript
interface KernelClient {
  // existing...
  addCustomFood(
    entry: CustomFoodEntry,
    onStatus?: (msg: string) => void
  ): Promise<void>;
  logFood(entry: LogFoodEntry, onStatus?: (msg: string) => void): Promise<void>;
}
```

## Cronometer UI Flows

### Custom Food Creation

URL: `https://cronometer.com/#foods`

The Custom Foods page (visible in the sidebar under Foods → Custom Foods) has a "CREATE FOOD" button and a list of existing custom foods.

1. Navigate to `cronometer.com/#foods` (Custom Foods page)
2. Click "+ CREATE FOOD" button
3. Fill in the food name field
4. Enter macro values in the nutrition facts form:
   - Find the "Protein" row → enter grams
   - Find the "Carbs" / "Total Carbs" row → enter grams
   - Find the "Fat" / "Total Fat" row → enter grams
5. Click "Save" / "Save Food" button
6. Verify the food appears in the list

**Notes:**

- The create food form is a nutrition label editor — it has fields for many nutrients, but we only fill in the macros the user provides
- Serving size defaults to 1 serving — we use that default
- GWT-compatible input handling is required (same as quick-add: native setter + event dispatch)

### Food Logging (Diary Add)

URL: `https://cronometer.com/#diary`

This reuses the same "Add Food to Diary" flow as `quick-add`, but instead of searching for "Quick Add, Protein", it searches for the user-specified food name.

1. Navigate to `cronometer.com/#diary`
2. Right-click the meal category (e.g. "Dinner")
3. Click "Add Food..." in context menu
4. Type the food name in the search bar
5. Click SEARCH
6. Select the first matching result
7. If servings != 1, update the serving size input
8. Click "ADD TO DIARY"

**Notes:**

- The search matches custom foods, custom recipes, and Cronometer's database
- If no result is found, the command should fail with a clear error message
- Serving size handling: for custom foods, 1 serving = the full food as defined. The `-s` flag multiplies this.

## Registration in `src/index.ts`

`add` is a command group with subcommands:

```typescript
const addCmd = program
  .command("add")
  .description("Add items to Cronometer");

addCmd
  .command("custom-food <name>")
  .description("Create a custom food with macros")
  .option("-p, --protein <grams>", "Grams of protein", parseFloat)
  .option("-c, --carbs <grams>", "Grams of carbohydrates", parseFloat)
  .option("-f, --fat <grams>", "Grams of fat", parseFloat)
  .action(async (name, options) => { ... });

program
  .command("log <name>")
  .description("Log a food to your diary by name")
  .option("-m, --meal <name>", "Meal category (Breakfast, Lunch, Dinner, Snacks)")
  .option("-s, --servings <count>", "Number of servings", parseFloat)
  .action(async (name, options) => { ... });
```

## Error Handling

| Error                           | User Message                                             |
| ------------------------------- | -------------------------------------------------------- |
| No name provided                | Commander handles this (required positional arg)         |
| No macros provided (add)        | "At least one macro (-p, -c, or -f) is required"         |
| Invalid meal (log)              | "Invalid meal. Use: Breakfast, Lunch, Dinner, or Snacks" |
| Food not found in search (log)  | "No food found matching \"<name>\""                      |
| Invalid servings (log)          | "Servings must be a positive number"                     |
| Not logged in                   | "Please log in first. Run: crono login"                  |
| Custom food name already exists | Let Cronometer handle it (it allows duplicates)          |

## Future Enhancements

- `crono add custom-recipe` — Create a custom recipe (multi-ingredient)
- `crono add custom-meal` — Create a custom meal
- `crono log --fuzzy` — Fuzzy search with interactive selection when multiple results match
- `crono log --date` — Log to a specific date
- Micronutrient support for `add custom-food` (fiber, sodium, etc.)
- `crono foods list` — List all custom foods from the CLI
