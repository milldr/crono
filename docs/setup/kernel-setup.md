# Kernel.sh Setup

crono uses [Kernel.sh](https://kernel.sh) for browser automation. This guide covers initial setup.

## 1. Install Kernel CLI

```bash
# Via Homebrew
brew install anthropic/tap/kernel

# Or via npm
npm install -g @anthropic-ai/kernel
```

## 2. Authenticate

```bash
kernel auth
```

This opens a browser for authentication. Once complete, your session is stored locally.

## 3. Verify Setup

```bash
kernel status
```

You should see your account info and available browser sessions.

## 4. First Run

When you run a crono command for the first time:

1. Kernel launches a browser session
2. You'll be prompted to log into Cronometer
3. The session is saved for future use

Subsequent runs reuse the authenticated session automatically.

## Troubleshooting

### "Kernel not found"

Ensure Kernel is installed and in your PATH:

```bash
which kernel
```

### "Session expired"

Re-authenticate with Kernel:

```bash
kernel auth --refresh
```

### Cronometer login required every time

Check that session persistence is enabled:

```bash
# Sessions stored in ~/.kernel/sessions/
ls ~/.kernel/sessions/
```

## Advanced: Custom Browser Profile

To use a specific browser profile:

```bash
export KERNEL_PROFILE=crono
kernel session create --name crono
```

Then crono will use this dedicated profile.
