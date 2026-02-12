# PRD: login Command

## Overview

The `login` command prompts for Kernel API key and Cronometer credentials, validates them, and stores them securely.

## Command Specification

```bash
crono login
```

No flags. Interactive prompts only.

## Flow

1. Prompt for Kernel API key (validates against Kernel API)
2. Prompt for Cronometer email
3. Prompt for Cronometer password
4. Store all three in OS keychain (or encrypted file fallback)

If credentials already exist, pressing Enter keeps the current value. Password change requires explicit confirmation.

## Example

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
└  Updated API key, email, password.
```

## Implementation Notes

### Credential Storage

- Primary: OS keychain via `@napi-rs/keyring`
- Fallback: AES-256-GCM encrypted file at `~/.config/crono/credentials.enc` (for headless/CI environments)

### Stored Keys

| Key                   | Description                 |
| --------------------- | --------------------------- |
| `kernel-api-key`      | Kernel.sh API key           |
| `cronometer-username` | Cronometer account email    |
| `cronometer-password` | Cronometer account password |

### Error Handling

| Error           | User Message                                           |
| --------------- | ------------------------------------------------------ |
| Empty API key   | "API key cannot be empty."                             |
| Invalid API key | "Invalid API key. Check your key at https://kernel.sh" |
| Invalid email   | "Must be a valid email"                                |
| Empty password  | "Password cannot be empty."                            |
| Ctrl+C          | "Login cancelled."                                     |
