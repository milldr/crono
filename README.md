# 🍎 crono

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/milldr)

CLI for Cronometer automation via [Kernel.sh](https://kernel.sh).

Cronometer has no public API, so crono automates the web UI through Kernel.sh browser automation. Log macros from your terminal in seconds.

![crono quick-add demo](demo.gif)

## Quickstart

### 1. Install

```bash
npm install -g @milldr/crono
```

### 2. Log in

```bash
crono login
```

You'll be prompted for three things:

- **Kernel API key** — get one at [kernel.sh](https://kernel.sh)
- **Cronometer email** — your Cronometer account email
- **Cronometer password** — stored securely in your system keychain

```
┌  crono login
│
◇  Kernel API key
│  sk-abc...
│
◒  Validating API key...
◇  API key valid.
│
◇  Cronometer email
│  you@example.com
│
◇  Cronometer password
│  ****
│
└  Credentials saved.
```

### 3. Log a meal

```bash
crono quick-add -p 30 -c 100 -f 20 -m Dinner
```

```
┌  crono quick-add
│
◒  Logging into Cronometer...
◇  Done.
│
└  Added: 30g protein, 100g carbs, 20g fat → Dinner
```

## Commands

### `crono login`

Set up or update your Kernel API key and Cronometer credentials. If credentials already exist, pressing Enter keeps the current value.

```bash
crono login
```

### `crono quick-add`

Add a quick macro entry to your Cronometer diary.

```bash
crono quick-add [options]
```

**Options:**

| Flag | Long            | Description                                      |
| ---- | --------------- | ------------------------------------------------ |
| `-p` | `--protein <g>` | Grams of protein                                 |
| `-c` | `--carbs <g>`   | Grams of carbohydrates                           |
| `-f` | `--fat <g>`     | Grams of fat                                     |
| `-m` | `--meal <name>` | Meal category (Breakfast, Lunch, Dinner, Snacks) |

At least one macro flag (`-p`, `-c`, or `-f`) is required.

**Examples:**

```bash
# Log 30g protein
crono quick-add -p 30

# Log full meal macros
crono quick-add -p 30 -c 100 -f 20

# Log to Dinner category
crono quick-add -p 30 -c 50 -f 15 --meal Dinner
```

### `crono add custom-food`

Create a custom food in Cronometer with specified macros.

```bash
crono add custom-food <name> [options]
```

**Options:**

| Flag | Long            | Description                                 |
| ---- | --------------- | ------------------------------------------- |
| `-p` | `--protein <g>` | Grams of protein                            |
| `-c` | `--carbs <g>`   | Grams of carbohydrates                      |
| `-f` | `--fat <g>`     | Grams of fat                                |
|      | `--log [meal]`  | Also log to diary (optionally specify meal) |

At least one macro flag (`-p`, `-c`, or `-f`) is required.

**Examples:**

```bash
# Create a custom food with all macros
crono add custom-food "Wendy's Chicken Sandwich" -p 50 -c 100 -f 50

# Just protein and carbs
crono add custom-food "Post-Workout Shake" -p 40 -c 60

# Create and immediately log to Uncategorized
crono add custom-food "Wendy's Chicken Sandwich" -p 50 -c 100 -f 50 --log

# Create and immediately log to Dinner
crono add custom-food "Wendy's Chicken Sandwich" -p 50 -c 100 -f 50 --log Dinner
```

### `crono log`

Log a saved food to your diary by name. Works with custom foods, custom recipes, and database items.

```bash
crono log <name> [options]
```

**Options:**

| Flag | Long                 | Description                                      |
| ---- | -------------------- | ------------------------------------------------ |
| `-m` | `--meal <name>`      | Meal category (Breakfast, Lunch, Dinner, Snacks) |
| `-s` | `--servings <count>` | Number of servings (default: 1)                  |

**Examples:**

```bash
# Log a custom food
crono log "Wendy's Chicken Sandwich"

# Log to a specific meal
crono log "Wendy's Chicken Sandwich" -m Dinner

# Log multiple servings
crono log "Post-Workout Shake" -s 2 -m Snacks
```

### `crono weight`

Check your weight from Cronometer. Defaults to today if no date or range is specified.

```bash
crono weight [options]
```

**Options:**

| Flag | Long              | Description                               |
| ---- | ----------------- | ----------------------------------------- |
| `-d` | `--date <date>`   | Date (YYYY-MM-DD)                         |
| `-r` | `--range <range>` | Range (7d, 30d, or YYYY-MM-DD:YYYY-MM-DD) |
|      | `--json`          | Output as JSON                            |

`-d` and `-r` are mutually exclusive.

**Examples:**

```bash
# Today's weight
crono weight
# → 212.5 lbs

# Specific date
crono weight -d 2026-02-05

# Last 7 days
crono weight -r 7d
# → 2026-02-11: 212.5
# → 2026-02-10: 212.7
# → 2026-02-09: 215.5
# → ...

# JSON output for scripting
crono weight --json
# → {"date":"2026-02-11","weight":212.5,"unit":"lbs"}

# Range as JSON
crono weight -r 7d --json
# → [{"date":"2026-02-11","weight":212.5,"unit":"lbs"}, ...]
```

### `crono diary`

View daily nutrition totals (calories, protein, carbs, fat) from Cronometer. Defaults to today if no date or range is specified.

```bash
crono diary [options]
```

**Options:**

| Flag | Long              | Description                               |
| ---- | ----------------- | ----------------------------------------- |
| `-d` | `--date <date>`   | Date (YYYY-MM-DD)                         |
| `-r` | `--range <range>` | Range (7d, 30d, or YYYY-MM-DD:YYYY-MM-DD) |
|      | `--json`          | Output as JSON                            |

`-d` and `-r` are mutually exclusive.

**Examples:**

```bash
# Today's nutrition
crono diary
# → 1847 kcal | P: 168g | C: 142g | F: 58g

# Specific date
crono diary -d 2026-02-05

# Last 7 days
crono diary -r 7d
# → 2026-02-11: 1847 kcal | P: 168g | C: 142g | F: 58g
# → 2026-02-10: 2103 kcal | P: 155g | C: 200g | F: 72g
# → ...

# JSON output for scripting
crono diary --json
# → {"date":"2026-02-11","calories":1847,"protein":168,"carbs":142,"fat":58}

# Range as JSON
crono diary -r 7d --json
# → [{"date":"2026-02-11","calories":1847,"protein":168,"carbs":142,"fat":58}, ...]
```

### `crono export`

Export data directly from Cronometer's API — no browser automation, much faster than `diary` or `weight`.

```bash
crono export <type> [options]
```

**Types:**

| Type         | Description                         |
| ------------ | ----------------------------------- |
| `nutrition`  | Daily nutrition totals (macros)     |
| `exercises`  | Exercise entries with duration/cals |
| `biometrics` | Biometric measurements (weight, BP) |

**Options:**

| Flag | Long              | Description                               |
| ---- | ----------------- | ----------------------------------------- |
| `-d` | `--date <date>`   | Date (YYYY-MM-DD)                         |
| `-r` | `--range <range>` | Range (7d, 30d, or YYYY-MM-DD:YYYY-MM-DD) |
|      | `--csv`           | Output as raw CSV                         |
|      | `--json`          | Output as JSON                            |

`-d` and `-r` are mutually exclusive. `--csv` and `--json` are mutually exclusive.

**Examples:**

```bash
# Today's nutrition
crono export nutrition
# → 1847 kcal | P: 168g | C: 142g | F: 58g

# Last 7 days of nutrition as JSON
crono export nutrition -r 7d --json

# Today's exercises
crono export exercises
# → Running: 30 min, 350 kcal

# Biometrics for last 30 days
crono export biometrics -r 30d
# → 2026-02-11: Weight: 212.5 lbs
# → 2026-02-09: Blood Pressure: 120/80 mmHg

# Raw CSV export
crono export nutrition -r 30d --csv
```

**GWT overrides:** If Cronometer updates break the export, override GWT values in `~/.config/crono/config.json` or via environment variables:

```bash
export CRONO_GWT_PERMUTATION=<new-value>
export CRONO_GWT_HEADER=<new-value>
```

## Requirements

- Node.js 18+
- [Kernel.sh](https://kernel.sh) account (for browser automation)
- [Cronometer](https://cronometer.com) account

## Development

```bash
git clone https://github.com/milldr/crono.git
cd crono
npm install

# Run in dev mode
npm run dev -- login
npm run dev -- quick-add -p 30
npm run dev -- weight -r 7d
npm run dev -- diary

# Run tests
npm test

# Build
npm run build
```

## Support

I build and maintain projects like crono in my free time as personal hobbies. They're completely free and always will be. If you find this useful and want to show some support, feel free to buy me a coffee:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/milldr)

## License

MIT
