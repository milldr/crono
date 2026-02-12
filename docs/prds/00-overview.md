# crono — Project Overview

**crono** is a CLI for automating [Cronometer](https://cronometer.com) via [Kernel.sh](https://kernel.sh) browser automation. Cronometer has no public API, so we automate the web UI.

## Commands

| Command           | Status  | Description                                     |
| ----------------- | ------- | ----------------------------------------------- |
| `crono login`     | Done    | Store Kernel API key and Cronometer credentials |
| `crono quick-add` | Done    | Log raw macros (protein/carbs/fat) to diary     |
| `crono weight`    | Planned | Read weight data from diary/trends              |
| `crono diary`     | Planned | Read nutrition totals from diary                |

## Tech Stack

| Component          | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| Language           | TypeScript                                              |
| CLI Framework      | Commander.js                                            |
| CLI UX             | @clack/prompts                                          |
| Browser Automation | Kernel.sh (Playwright)                                  |
| Credential Storage | @napi-rs/keyring (keychain) + AES-256-GCM file fallback |
| Testing            | Vitest                                                  |
| Linting            | ESLint + Prettier                                       |
| CI                 | GitHub Actions                                          |

## How It Works

```
CLI Command → Command Handler → Kernel Client → Kernel.sh SDK → Browser → Cronometer
```

Each command creates a fresh browser, logs in with stored credentials, performs the action via Playwright codegen, and tears down. Cronometer is a GWT app, so automation uses GWT-compatible input handling (keyboard.type, native setters, event dispatch).

## Configuration

```
~/.config/crono/
└── config.json
```

Credentials are stored in the OS keychain. On headless environments without a keychain, an encrypted file (`~/.config/crono/credentials.enc`) is used as fallback.
