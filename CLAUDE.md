# CLAUDE.md — AI Context for crono

## What Is This?

**crono** is a CLI for automating [Cronometer](https://cronometer.com) (nutrition tracking) via [Kernel.sh](https://kernel.sh) browser automation. Cronometer has no public API, so we automate the web UI.

## Read These First

1. **`docs/PRDs/overview.md`** — Project goals, architecture, why Kernel.sh
2. **`docs/PRDs/quick-add.md`** — Detailed spec for the first command

## Architecture

```
src/
├── index.ts              # CLI entry (Commander.js)
├── commands/
│   └── quick-add.ts      # Macro entry command
├── kernel/
│   └── client.ts         # Kernel.sh browser integration (TODO)
└── config.ts             # ~/.config/crono/ management
```

## How Kernel.sh Works

Kernel.sh is a browser automation platform. Key concepts:

1. **Sessions** — Persistent browser state (cookies, localStorage)
2. **Profiles** — Isolated browser contexts (we use a "crono" profile)
3. **SDK** — TypeScript API for page interaction

Our flow:
```
CLI Command → Kernel Client → Kernel.sh SDK → Browser → Cronometer
```

On first run: browser opens, user logs into Cronometer, session saved.
On subsequent runs: session reused, no login needed.

## Current State

**Implemented:**
- [x] Project scaffolding
- [x] CLI structure with Commander.js
- [x] `quick-add` command (validation, argument parsing)
- [x] Config management (`~/.config/crono/`)
- [x] CI pipeline (GitHub Actions, Ubuntu, Node 18/20/22)

**TODO:**
- [ ] Kernel.sh SDK integration in `src/kernel/client.ts`
- [ ] Cronometer login flow
- [ ] Session persistence
- [ ] Actual UI automation (fill forms, click buttons)
- [ ] DOM selectors for Cronometer UI

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

### Cronometer UI Flow (for automation)

To add a quick entry in Cronometer's web UI:
1. Navigate to `cronometer.com/diary`
2. Click "+ Add Food" button
3. Click "Quick Add" tab
4. Fill protein/carbs/fat fields
5. Select meal from dropdown
6. Click "Add" button

Selectors need to be discovered by inspecting the actual Cronometer DOM.

### Config Location

```
~/.config/crono/
├── config.json     # User settings
└── sessions/       # Kernel browser state
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
