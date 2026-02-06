# Project Preferences

## Package Manager

Prefer **pnpm** over npm/yarn for all dependency management.

## Pre-Push Checks

Before every `git push`, you **must** run the following commands and fix any issues they report:

1. `pnpm lint:fix` — auto-fix ESLint issues, then resolve any remaining errors manually.
2. `pnpm format` — auto-format all files with Prettier.

Do **not** push code that has lint errors or formatting issues. If either command produces unfixable errors, address them in the code before pushing.
