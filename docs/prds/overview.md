# PRD: crono — Project Overview

## Vision

**crono** is a command-line interface for automating [Cronometer](https://cronometer.com), a nutrition tracking application. It enables programmatic food logging, macro tracking, and data export without manual UI interaction.

## Problem Statement

Cronometer lacks a public API. Users who want to:

- Log food from scripts or automation
- Integrate nutrition tracking with other tools
- Batch-process dietary data

...must manually interact with the web UI. This is time-consuming and error-prone.

## Solution

crono uses [Kernel.sh](https://kernel.sh) for browser automation to:

1. Authenticate with Cronometer (session persisted)
2. Execute actions via the web UI programmatically
3. Expose a clean CLI interface for common tasks

## Why Kernel.sh?

Kernel.sh is a browser automation platform designed for AI agents. Key benefits:

| Feature                     | Benefit for crono                                  |
| --------------------------- | -------------------------------------------------- |
| **Headless + headed modes** | Debug visually via live view, run headless in prod |
| **Stealth mode**            | Avoid bot detection on Cronometer                  |
| **SDK integration**         | Clean TypeScript API for page interaction          |
| **Playwright execution**    | Remote Playwright code execution against browsers  |
| **MCP server**              | Future: expose crono commands to AI assistants     |

### Alternative Considered

Raw Playwright was considered but rejected because:

- Requires local browser installation
- No remote execution or live view debugging
- Kernel provides higher-level abstractions suited for this use case

## Goals

### MVP (v0.1)

- [x] `crono quick-add` — Log raw macros (protein/carbs/fat) to diary
- [x] `crono login` — Store Kernel API key and Cronometer credentials
- [x] Meal assignment — Optionally assign entries to Breakfast/Lunch/Dinner/Snacks

### v0.2

- [ ] `crono search <food>` — Search Cronometer's food database
- [ ] `crono add <food>` — Add a specific food by name
- [ ] `crono summary` — Get today's macro totals

### v0.3+

- [ ] `crono weight <lbs>` — Log body weight
- [ ] `crono export` — Export diary data (CSV/JSON)
- [ ] `crono targets` — View/set nutrition targets
- [ ] Recipe management
- [ ] Batch import from other apps

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLI                               │
│  crono quick-add -p 30 -c 100 -f 20 -m Dinner           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   Command Handler                        │
│  - Validate input                                        │
│  - Parse options                                         │
│  - Call Kernel client                                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   Kernel Client                          │
│  - Manage browser session                                │
│  - Navigate Cronometer UI                                │
│  - Execute page actions                                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Kernel.sh                             │
│  - Browser automation runtime                            │
│  - Session/profile management                            │
│  - Headless Chrome                                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   Cronometer Web                         │
│  - cronometer.com/diary                                  │
│  - Food search, logging, reports                         │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component          | Technology        | Rationale                     |
| ------------------ | ----------------- | ----------------------------- |
| Language           | TypeScript        | Kernel SDK is JS/TS native    |
| CLI Framework      | Commander.js      | Simple, well-documented       |
| Browser Automation | Kernel.sh         | Session persistence, profiles |
| Testing            | Vitest            | Fast, modern, TS-native       |
| Linting            | ESLint + Prettier | Standard tooling              |
| CI                 | GitHub Actions    | Ubuntu runners                |

## User Experience

### Setup

```bash
$ crono login
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

### Usage

```bash
$ crono quick-add -p 30 -c 100 -f 20 -m Dinner
┌  crono quick-add
│
◒  Logging into Cronometer...
◇  Done.
│
└  Added: 30g protein, 100g carbs, 20g fat → Dinner
```

## Configuration

Stored in `~/.config/crono/`:

```
~/.config/crono/
├── config.json         # User preferences
└── credentials.enc     # Encrypted credentials (fallback if no OS keychain)
```

Credentials are stored in the OS keychain via `@napi-rs/keyring`. On headless/CI environments without a keychain, an AES-256-GCM encrypted file is used as fallback.

### config.json

```json
{
  "defaultMeal": "Uncategorized"
}
```

## Open Questions

1. **Kernel.sh pricing** — Need to verify free tier limits for this use case
2. **Cronometer ToS** — Confirm automation is permitted
3. **Package name** — `crono` may be taken on npm; alternatives: `crono-cli`, `cronometer-cli`
4. **Cross-platform** — Focus on macOS initially; Linux/Windows support TBD

## Success Metrics

- Successfully log a quick-add entry via CLI
- Session persists across terminal sessions
- CI passes on Ubuntu with Node 18/20/22

## References

- [Cronometer](https://cronometer.com)
- [Kernel.sh Documentation](https://docs.kernel.sh)
- [Commander.js](https://github.com/tj/commander.js)
