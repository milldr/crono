# PRD: @clack/prompts CLI UX Migration

## Overview

Replace hand-rolled `readline`/`process.stdin` prompts and raw `console.log`/`console.error` calls with `@clack/prompts` for a consistent, polished terminal UI across all commands.

## Motivation

- Manual `readline` prompts have no styling, no spinners, no cancel handling
- Password input required 40 lines of raw mode TTY management
- No visual feedback during long operations (API validation, browser automation)
- `@clack/prompts` provides all of this with a minimal API surface

## User Stories

- As a user, I want clear visual feedback (spinners) during long operations like API key validation and browser automation
- As a user, I want to cancel any prompt gracefully with Ctrl+C instead of an ugly stack trace
- As a user, I want styled, consistent output across all commands (intro/outro banners, log levels)

## Changes

| File                        | What changed                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`              | Added `@clack/prompts` dependency                                                                                                                                        |
| `src/commands/login.ts`     | Replaced `prompt()`, `promptPassword()`, `readline` with `p.text()`, `p.password()`, `p.confirm()`, `p.spinner()`. Added `p.intro()`/`p.outro()`, `p.isCancel()` checks. |
| `src/commands/quick-add.ts` | Replaced `console.log`/`console.error` with `p.intro()`, `p.log.*`, `p.spinner()`, `p.outro()`                                                                           |
| `src/kernel/client.ts`      | Replaced `console.log`, `waitForEnter()`, `readline` with `p.log.step()`, `p.log.warn()`, `p.log.info()`, `p.note()`, `p.text()`                                         |

## Before / After

### Login — API key validation

**Before:**

```
Kernel API key: sk-abc123
Validating API key...
API key is valid.
```

**After:**

```
┌  crono login
│
◇  Kernel API key
│  sk-abc123
│
◒  Validating API key...
│
◇  API key valid.
```

### Quick-add — success

**Before:**

```
Adding quick entry: 30g protein → Dinner
✓ Added: 30g protein → Dinner
```

**After:**

```
┌  crono quick-add
│
●  Adding: 30g protein → Dinner
│
◒  Logging to Cronometer...
◇  Logged to Cronometer.
│
└  Added: 30g protein → Dinner
```

### Cancellation

**Before:**

```
Kernel API key: ^C
(process exits with no message, or raw error)
```

**After:**

```
┌  crono login
│
◇  Kernel API key
│
■  Login cancelled.
```

## Implementation Notes

- **No nested spinners**: `quick-add` owns the spinner for the full automation flow. `autoLogin`/`manualLogin` in `client.ts` use `p.log.*` only.
- **Cancel handling**: Every `p.text()` / `p.password()` / `p.confirm()` call is followed by `p.isCancel()` check, then `p.cancel()` + `process.exit(0)`.
- **Password "keep existing" UX**: `p.password()` has no `defaultValue`, so a `p.confirm()` gate is used: "Change Cronometer password? [y/N]". If no, keep existing.
- **No abstraction layer**: Small CLI — clack is used directly in each command file.
