# Expo-specific checks (managed / prebuild)

## Identify config source
- Prefer `app.json`
- If using `app.config.js`/`app.config.ts`, treat parsing as best-effort (may be dynamic)

## Minimum config for iOS publishing
- `expo.name`
- `expo.slug`
- `expo.version`
- `expo.ios.bundleIdentifier`
- `expo.ios.buildNumber` (string)
- Icon present (`expo.icon` or `expo.ios.icon`) and file exists

## Common compliance pitfalls
- Missing permission strings when using Expo modules:
  - Expo modules often require you to set usage strings via config plugins or `expo.ios.infoPlist`.
- Tracking:
  - If using tracking/ad SDKs or `expo-tracking-transparency`, ensure `NSUserTrackingUsageDescription` and ATT flow.
- Native modules / prebuild:
  - `expo prebuild` and some config plugins modify `ios/`; treat as MUTATING.

## Build pipeline sanity
- `eas.json` exists with an iOS profile intended for App Store (often `production` or `release`)
- Ensure the profile uses `distribution: app-store` when required
- Confirm credentials + signing strategy (EAS credentials vs manual) before “ready to publish”

## Suggested commands (may download/install)
- `npx expo doctor` (best-effort)
- `npx expo config --type public` (shows resolved config)
