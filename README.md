# crono

CLI for Cronometer automation via [Kernel.sh](https://kernel.sh).

## Installation

```bash
npm install -g crono
```

## Quick Start

```bash
# Add a quick macro entry
crono quick-add -p 30 -c 100 -f 20

# Add to a specific meal
crono quick-add -p 30 -m Dinner
```

## Commands

### `quick-add`

Add a quick macro entry to your Cronometer diary.

```bash
crono quick-add [options]
```

**Options:**

| Flag | Long | Description |
|------|------|-------------|
| `-p` | `--protein <g>` | Grams of protein |
| `-c` | `--carbs <g>` | Grams of carbohydrates |
| `-f` | `--fat <g>` | Grams of fat |
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

## Configuration

On first run, crono will prompt for your Cronometer credentials. These are stored securely in `~/.config/crono/`.

## Requirements

- Node.js 18+
- Kernel.sh account (for browser automation)

## Development

```bash
# Clone and install
git clone https://github.com/milldr/crono.git
cd crono
npm install

# Run in dev mode
npm run dev -- quick-add -p 30

# Run tests
npm test

# Build
npm run build
```

## License

MIT
