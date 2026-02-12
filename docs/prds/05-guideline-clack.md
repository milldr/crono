# Guideline: @clack/prompts CLI UX

## Overview

All commands use `@clack/prompts` for terminal UI. This provides styled output, spinners, cancel handling, and a consistent look across the CLI.

## Patterns

### Command structure

Every command follows the same wrapper pattern:

```typescript
import * as p from "@clack/prompts";

p.intro("crono <command-name>");

// ... validation, prompts, work ...

p.outro("Done message.");
```

### Spinners for long operations

Use a single spinner per command. Update its message via `s.message()` as the operation progresses:

```typescript
const s = p.spinner();
s.start("Connecting...");
// ... work ...
s.message("Logging in...");
// ... work ...
s.stop("Done.");
```

No nested spinners — one command, one spinner.

### Prompts and cancellation

Every `p.text()`, `p.password()`, and `p.confirm()` call must be followed by a `p.isCancel()` check:

```typescript
const input = await p.text({ message: "Your input" });
if (p.isCancel(input)) {
  p.cancel("Cancelled.");
  process.exit(0);
}
```

### Log levels

- `p.log.info()` — Informational messages
- `p.log.warn()` — Warnings (e.g. missing optional config)
- `p.log.error()` — Errors before exit
- `p.log.step()` — Completed sub-steps
- `p.note()` — Boxed content (e.g. URLs, keys)

### Password "keep existing" UX

`p.password()` has no `defaultValue` support. To let users keep an existing password, gate it behind a `p.confirm()`:

```typescript
const change = await p.confirm({
  message: "Change password?",
  initialValue: false,
});
if (change) {
  const pw = await p.password({ message: "New password", mask: "*" });
  // ...
}
```

## Examples

```
┌  crono login
│
◇  Kernel API key
│  sk-abc...
│
◒  Validating API key...
◇  API key valid.
│
└  Updated API key.
```

```
┌  crono quick-add
│
◒  Logging into Cronometer...
◇  Done.
│
└  Added: 30g protein → Dinner
```

```
┌  crono login
│
◇  Kernel API key
│
■  Login cancelled.
```

## Rules

1. No `console.log` / `console.error` — use `p.log.*` or `p.outro()`
2. No `readline` / `process.stdin` — use `p.text()`, `p.password()`, `p.confirm()`
3. One spinner per command, updated via `s.message()`
4. Always handle cancellation with `p.isCancel()`
5. Use clack directly in each command file — no abstraction layer
