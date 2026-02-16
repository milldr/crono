# PRDs (Product Requirement Documents)

This folder contains the product requirement documents for crono. Each PRD is a historical record of a feature or decision at the time it was planned and built.

**PRDs are immutable.** Once a feature ships, its PRD is not updated. New features that extend or modify existing behavior get their own PRD. This preserves the development journey and makes it easy to understand why things were built the way they were.

## Index

| PRD                                                         | Description                                |
| ----------------------------------------------------------- | ------------------------------------------ |
| [00-overview](./00-overview.md)                             | Project goals, tech stack, architecture    |
| [01-command-login](./01-command-login.md)                   | `crono login` — credential setup           |
| [02-command-quick-add](./02-command-quick-add.md)           | `crono quick-add` — log raw macros         |
| [03-command-weight](./03-command-weight.md)                 | `crono weight` — read weight data          |
| [04-command-diary](./04-command-diary.md)                   | `crono diary` — daily nutrition totals     |
| [05-guideline-clack](./05-guideline-clack.md)               | @clack/prompts UX guideline                |
| [06-command-export](./06-command-export.md)                 | `crono export` — data export               |
| [07-commands-add-log](./07-commands-add-log.md)             | `crono add` and `crono log` — custom foods |
| [08-quick-add-date-alcohol](./08-quick-add-date-alcohol.md) | `quick-add` date and alcohol flags         |
