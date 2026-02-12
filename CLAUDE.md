# CLAUDE.md — AI Context for crono

## What Is This?

**crono** is a CLI for automating [Cronometer](https://cronometer.com) (nutrition tracking) via [Kernel.sh](https://kernel.sh) browser automation. Cronometer has no public API, so we automate the web UI.

## Read These First

1. **`docs/prds/overview.md`** — Project goals, architecture, why Kernel.sh
2. **`docs/prds/quick-add.md`** — Detailed spec for the first command

## Architecture

```
src/
├── index.ts              # CLI entry (Commander.js)
├── commands/
│   ├── login.ts          # Credential setup command
│   └── quick-add.ts      # Macro entry command
├── kernel/
│   ├── client.ts         # Kernel.sh SDK orchestration
│   ├── login.ts          # Playwright codegen for login
│   └── quick-add.ts      # Playwright codegen for quick-add
├── config.ts             # ~/.config/crono/ management
└── credentials.ts        # Keychain + encrypted file credential storage
```

## How Kernel.sh Works

Kernel.sh is a browser automation platform. Key concepts:

1. **Browsers** — Ephemeral browser sessions for automation
2. **Playwright** — Remote code execution against browser pages
3. **SDK** — TypeScript API for session and page interaction

Our flow:

```
CLI Command → Kernel Client → Kernel.sh SDK → Browser → Cronometer
```

Each command creates a fresh browser, logs in, performs the action, and tears down.

## Current State

**Implemented:**

- [x] Project scaffolding
- [x] CLI structure with Commander.js
- [x] `quick-add` command (validation, argument parsing, full automation)
- [x] `login` command (credential setup with keychain storage)
- [x] Kernel.sh SDK integration in `src/kernel/client.ts`
- [x] Cronometer login flow (auto with stored creds, manual via live view)
- [x] UI automation with Playwright codegen (smart waits, GWT-compatible)
- [x] Credential storage (OS keychain primary, AES-256-GCM encrypted file fallback)
- [x] Config management (`~/.config/crono/`)
- [x] CI pipeline (GitHub Actions, Ubuntu, Node 18/20/22)
- [x] @clack/prompts CLI UX (spinners, styled output, cancel handling)

**TODO:**

- [ ] Session persistence via Kernel profiles (requires paid plan)
- [ ] Additional commands (`search`, `add`, `summary`, `weight`, `export`)

## Key Implementation Details

### Quick Add Command

```bash
crono quick-add -p 30 -c 100 -f 20 -m Dinner
```

Flags:

- `-p, --protein <g>` — Grams of protein
- `-c, --carbs <g>` — Grams of carbs
- `-f, --fat <g>` — Grams of fat
- `-m, --meal <name>` — Breakfast, Lunch, Dinner, Snacks (default: Uncategorized)

Validation: At least one macro required.

### Cronometer UI Flow (automated)

Each macro (protein, carbs, fat) is added as a separate "Quick Add" food item:

1. Navigate to `cronometer.com/#diary`
2. Right-click the meal category (e.g. "Dinner")
3. Click "Add Food..." in context menu
4. Search for the macro (e.g. "Quick Add, Protein")
5. Click SEARCH, select the result
6. Enter serving size in grams
7. Click "ADD TO DIARY"
8. Repeat for each macro

Uses event-driven Playwright waits (networkidle, waitForSelector) instead of fixed timeouts where possible. GWT-compatible input handling via native setter + event dispatch.

### Config Location

```
~/.config/crono/
└── config.json     # User settings
```

## Development Commands

```bash
npm install          # Install deps
npm run dev -- <cmd> # Run without building
npm run build        # Compile TypeScript
npm test             # Run tests
npm run lint         # ESLint
npm run format       # Prettier
```

## Adding New Commands

1. Create `src/commands/<name>.ts`
2. Export the handler function
3. Register in `src/index.ts` with Commander

## Testing

- `tests/` — Unit tests (Vitest)
- Integration tests require Kernel.sh account + Cronometer login
- Run: `npm test` or `npm run test:watch`

## Links

- [Cronometer](https://cronometer.com)
- [Kernel.sh Docs](https://docs.kernel.sh)
- [Kernel.sh GitHub](https://github.com/anthropics/kernel)
- [Commander.js](https://github.com/tj/commander.js)
