# PRD: export Command

## Overview

The `export` command fetches data from Cronometer's HTTP export API — no browser automation required. It supports three export types: daily nutrition summaries, exercises, and biometrics. This is the first command that bypasses Kernel.sh entirely, hitting Cronometer's backend directly for faster, lighter read operations.

Long-term, this API path will replace the Kernel-based `diary` and `weight` commands.

## User Stories

- As a user, I want to export my daily nutrition totals from the terminal without waiting for a browser to spin up
- As a user, I want to pull my biometric history (weight, blood pressure, etc.) for a date range
- As a user, I want to export my exercise log as CSV or JSON so I can analyze it in a spreadsheet or script
- As a user, I want consistent date/range options across all crono commands

## Command Specification

```bash
crono export <type> [options]
```

### Types

| Type         | Cronometer `generate` param | Description                                 |
| ------------ | --------------------------- | ------------------------------------------- |
| `nutrition`  | `dailySummary`              | Aggregated daily nutrition totals           |
| `exercises`  | `exercises`                 | Exercise entries with duration and calories |
| `biometrics` | `biometrics`                | Biometric measurements (weight, BP, etc.)   |

### Options

| Flag | Long Form | Type   | Required | Default | Description                                                         |
| ---- | --------- | ------ | -------- | ------- | ------------------------------------------------------------------- |
| `-d` | `--date`  | string | no       | today   | Export for a specific date (YYYY-MM-DD)                             |
| `-r` | `--range` | string | no       | -       | Export for a date range (e.g. "7d", "30d", "2026-01-15:2026-02-10") |
|      | `--csv`   | flag   | no       | false   | Output as raw CSV                                                   |
|      | `--json`  | flag   | no       | false   | Output as JSON                                                      |

`-d` and `-r` are mutually exclusive. If neither is provided, today's date is used for both start and end.

`--csv` and `--json` are mutually exclusive. If neither is provided, output is plain text.

## Examples

### Nutrition

```bash
# Today's nutrition summary
crono export nutrition
# → 1847 kcal | P: 168g | C: 142g | F: 58g

# Last 7 days
crono export nutrition -r 7d
# → 2026-02-11: 1847 kcal | P: 168g | C: 142g | F: 58g
# → 2026-02-10: 2103 kcal | P: 155g | C: 200g | F: 72g
# → ...

# JSON for scripting
crono export nutrition -r 7d --json
# → [{"date":"2026-02-11","calories":1847,"protein":168,"carbs":142,"fat":58}, ...]

# Raw CSV
crono export nutrition -r 30d --csv
# → Date,Energy (kcal),Protein (g),Carbs (g),Fat (g),...
```

### Exercises

```bash
# Today's exercises
crono export exercises
# → Running: 30 min, 350 kcal

# Range as JSON
crono export exercises -r 7d --json
# → [{"date":"2026-02-11","time":"07:30 AM","exercise":"Running","minutes":30,"calories_burned":350}, ...]
```

### Biometrics

```bash
# Today's biometrics
crono export biometrics
# → Weight: 212.5 lbs

# Range
crono export biometrics -r 30d
# → 2026-02-11: Weight: 212.5 lbs
# → 2026-02-10: Weight: 212.7 lbs
# → 2026-02-09: Blood Pressure: 120/80 mmHg
# → ...

# JSON
crono export biometrics --json
# → {"date":"2026-02-11","time":"08:00 AM","metric":"Weight","unit":"lbs","amount":212.5}
```

## Architecture

### New Module: `src/cronometer/`

This command introduces a direct HTTP client for Cronometer, separate from the Kernel automation layer.

```
src/cronometer/
├── auth.ts       # HTTP login flow (anticsrf → form login → GWT authenticate)
├── export.ts     # Nonce generation + export fetching
└── parse.ts      # CSV parsing for each export type
```

### Data Flow

```
CLI Command → Cronometer Auth → GWT Nonce → HTTP Export → CSV → Parse → Output
```

No Kernel.sh, no browser, no Playwright. Pure HTTP requests using stored Cronometer credentials.

### Authentication Flow

Cronometer uses a multi-step cookie-based authentication:

1. **GET `/login/`** — Fetch the login page HTML, parse the `anticsrf` hidden input value. Establishes `JSESSIONID` cookie.
2. **POST `/login`** — Form submit with `username`, `password`, `anticsrf`. Returns JSON `{"success": true}` and sets `sesnonce` cookie.
3. **POST `/cronometer/app`** — GWT RPC `authenticate` call. Returns the numeric user ID. Requires GWT headers and serialized RPC body.

All three steps share a cookie jar (`JSESSIONID` + `sesnonce`).

### Export Flow

For each export request:

1. **POST `/cronometer/app`** — GWT RPC `generateAuthorizationToken` call. Returns a single-use 32-char hex nonce. Requires the `sesnonce` and user ID from auth.
2. **GET `/export?nonce={nonce}&generate={type}&start={start}&end={end}`** — Returns CSV data.

Nonces are single-use — a new one must be generated per export request.

### GWT RPC Details

Cronometer is a GWT (Google Web Toolkit) app. GWT RPC calls require specific headers and a serialized body format.

**Headers (all GWT POST requests):**

```
Content-Type: text/x-gwt-rpc; charset=UTF-8
X-GWT-Module-Base: https://cronometer.com/cronometer/
X-GWT-Permutation: <GWT_PERMUTATION>
```

**GWT magic values:**

| Value            | Description                          | Changes on deploy? |
| ---------------- | ------------------------------------ | ------------------ |
| `GWTPermutation` | App permutation hash (header)        | Yes                |
| `GWTHeader`      | Service interface hash (body prefix) | Yes                |

These values are extracted from the live Cronometer web app and break when Cronometer deploys updates.

**Defaults are hardcoded.** Users can override via config or environment variables when they break:

Config (`~/.config/crono/config.json`):

```json
{
  "gwtPermutation": "7B121DC5483BF272B1BC1916DA9FA963",
  "gwtHeader": "2D6A926E3729946302DC68073CB0D550"
}
```

Environment variables (take precedence over config):

```bash
export CRONO_GWT_PERMUTATION=<new-value>
export CRONO_GWT_HEADER=<new-value>
```

### GWT RPC Bodies

**Authenticate:**

```
7|0|5|https://cronometer.com/cronometer/|{GWTHeader}|com.cronometer.shared.rpc.CronometerService|authenticate|java.lang.Integer/3438268394|1|2|3|4|1|5|5|{tzOffset}|
```

Where `{tzOffset}` is the local timezone offset in minutes (e.g. `-300` for US Eastern).

**Generate Authorization Token:**

```
7|0|8|https://cronometer.com/cronometer/|{GWTHeader}|com.cronometer.shared.rpc.CronometerService|generateAuthorizationToken|java.lang.String/2004016611|I|com.cronometer.shared.user.AuthScope/2065601159|{sesnonce}|1|2|3|4|4|5|6|6|7|8|{userid}|3600|7|2|
```

Where `{sesnonce}` is the session nonce cookie value and `{userid}` is the numeric user ID from authentication.

## CSV Response Formats

### Nutrition (`dailySummary`)

Columns include Date, Energy (kcal), Protein (g), Carbs (g), Fat (g), and dozens of micronutrient columns.

For plain text output, display only the key macros: calories, protein, carbs, fat. Full data available via `--csv` and `--json`.

### Exercises

| Column          | Example        |
| --------------- | -------------- |
| Day             | 2026-02-11     |
| Time            | 07:30 AM       |
| Exercise        | Running        |
| Minutes         | 30             |
| Calories Burned | 350            |
| Group           | Cardiovascular |

### Biometrics

| Column | Example    |
| ------ | ---------- |
| Day    | 2026-02-11 |
| Time   | 08:00 AM   |
| Metric | Weight     |
| Unit   | lbs        |
| Amount | 212.5      |

Note: Blood pressure `Amount` may contain `/` (e.g. `120/80`). Handle as a string, not a number.

## Error Handling

| Error                       | User Message                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Invalid type                | "Unknown export type. Use: nutrition, exercises, biometrics"                            |
| Invalid date format         | "Invalid date format. Use YYYY-MM-DD"                                                   |
| Invalid range format        | "Invalid range format. Use '7d', '30d', or 'YYYY-MM-DD:YYYY-MM-DD'"                     |
| Both -d and -r given        | "-d and -r are mutually exclusive"                                                      |
| Both --csv and --json given | "--csv and --json are mutually exclusive"                                               |
| Missing credentials         | "No Cronometer credentials found. Run: crono login"                                     |
| Login failed                | "Cronometer login failed. Check your credentials with: crono login"                     |
| GWT auth failed             | "Cronometer API error. GWT values may be outdated. See docs for override instructions." |
| Export request failed       | "Export failed: \<HTTP status>"                                                         |
| No data for date range      | "No \<type> data found for the requested dates"                                         |

## Implementation Notes

### Dependencies

- Node.js built-in `fetch` (Node 18+) or `undici` — no new HTTP dependency needed
- CSV parsing — minimal, can use a lightweight parser or hand-roll since the format is predictable

### Cookie Jar

Node's native `fetch` does not manage cookies automatically. The auth flow requires a cookie jar that persists `JSESSIONID` and `sesnonce` across requests. Options:

- Manual cookie extraction from `set-cookie` response headers
- `undici` cookie jar
- `tough-cookie` library

Prefer the lightest option that works. Manual extraction is fine given the small number of requests.

### Session Reuse

For a single `crono export` invocation, the session flow is:

1. Authenticate once (3 HTTP requests)
2. Generate nonce + export (2 HTTP requests per type)

If we later support exporting multiple types in one invocation, the auth session can be reused — just generate a new nonce per export.

## Migration Path

Once the export API is proven stable:

1. **`crono weight`** → Migrate to use `biometrics` export, filter for `Metric == "Weight"`
2. **`crono diary`** → Migrate to use `dailySummary` export
3. Kernel dependency becomes optional (only needed for write commands like `quick-add`)

This reduces startup time from ~10-15s (browser spin-up) to <1s (HTTP requests).

## Future Enhancements

- `crono export servings` — Individual food entries with full nutrient breakdown
- `crono export notes` — Daily notes
- `crono export --all` — Export all types at once
- Auto-detection of GWT magic values by scraping the Cronometer app HTML
- Session caching — persist the `sesnonce` cookie between invocations (14-day expiry) to skip re-authentication
