# crono

CLI for Cronometer automation via [Kernel.sh](https://kernel.sh).

Cronometer has no public API, so crono automates the web UI through Kernel.sh browser automation. Log macros from your terminal in seconds.

![crono quick-add demo](demo.gif)

## Quickstart

### 1. Install

```bash
npm install -g crono
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

# Run tests
npm test

# Build
npm run build
```

## License

MIT
