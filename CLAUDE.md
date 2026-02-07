# Project Preferences

## Package Manager

Prefer **pnpm** over npm/yarn for all dependency management.

## Pre-Push Checks

Before every `git push`, you **must** run the following commands and fix any issues they report:

1. `pnpm lint:fix` — auto-fix ESLint issues, then resolve any remaining errors manually.
2. `pnpm format` — auto-format all files with Prettier.

Do **not** push code that has lint errors or formatting issues. If either command produces unfixable errors, address them in the code before pushing.

## Internationalization (i18n)

The app supports **11 languages**. Every user-facing string must be translated in **all** locales.

| Language               | Code    | Locale File                   |
| ---------------------- | ------- | ----------------------------- |
| English                | `en`    | `src/i18n/locales/en.json`    |
| Spanish                | `es`    | `src/i18n/locales/es.json`    |
| French                 | `fr`    | `src/i18n/locales/fr.json`    |
| German                 | `de`    | `src/i18n/locales/de.json`    |
| Hindi                  | `hi`    | `src/i18n/locales/hi.json`    |
| Japanese               | `ja`    | `src/i18n/locales/ja.json`    |
| Korean                 | `ko`    | `src/i18n/locales/ko.json`    |
| Portuguese (Brazilian) | `pt-BR` | `src/i18n/locales/pt-BR.json` |
| Russian                | `ru`    | `src/i18n/locales/ru.json`    |
| Simplified Chinese     | `zh-CN` | `src/i18n/locales/zh-CN.json` |
| Traditional Chinese    | `zh-TW` | `src/i18n/locales/zh-TW.json` |

### Rules for every new feature or UI change

1. **Never hardcode user-facing strings.** Use `t('key')` from `react-i18next` and add the key to `en.json`.
2. **Add translations to ALL 11 locale files** whenever you add or modify a key in `en.json`.
3. **Keep all locale files in sync** — every key present in `en.json` must exist in every other locale file.
4. **Fastlane metadata** lives under `fastlane/metadata/` (iOS) and `fastlane/metadata/android/` (Play Store). If the app description or feature list changes, update the store metadata for all locales too.
5. **Language config** is in `src/i18n/index.ts` — imports, `resources`, and `languageNames` must stay in sync with the locale files.
