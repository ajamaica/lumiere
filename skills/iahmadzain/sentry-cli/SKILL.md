---
name: sentry-cli
description: Sentry.io error monitoring via sentry-cli. Use when working with Sentry releases, source maps, dSYMs, events, or issue management. Covers authentication, release workflows, deploy tracking, and debug file uploads.
---

# Sentry CLI

Interact with Sentry.io for error monitoring, release management, and debug artifact uploads.

## Installation

```bash
# macOS
brew install sentry-cli

# npm (cross-platform)
npm install -g @sentry/cli

# Direct download
curl -sL https://sentry.io/get-cli/ | bash
```

## Authentication

```bash
# Interactive login (opens browser)
sentry-cli login

# Or set token directly
export SENTRY_AUTH_TOKEN="sntrys_..."

# Verify
sentry-cli info
```

Store tokens in `.sentryclirc` or environment:

```ini
[auth]
token=sntrys_...

[defaults]
org=my-org
project=my-project
```

## Releases

### Create & Finalize

```bash
# Create release (usually git SHA or version)
sentry-cli releases new "$VERSION"

# Associate commits (links errors to commits)
sentry-cli releases set-commits "$VERSION" --auto

# Finalize when deployed
sentry-cli releases finalize "$VERSION"

# One-liner for CI
sentry-cli releases new "$VERSION" --finalize
```

### Deploys

```bash
# Mark release as deployed to an environment
sentry-cli releases deploys "$VERSION" new -e production
sentry-cli releases deploys "$VERSION" new -e staging
```

### List Releases

```bash
sentry-cli releases list
sentry-cli releases info "$VERSION"
```

## Source Maps

Upload source maps for JavaScript error deobfuscation:

```bash
# Upload all .js and .map files
sentry-cli sourcemaps upload ./dist --release="$VERSION"

# With URL prefix (match your deployed paths)
sentry-cli sourcemaps upload ./dist \
  --release="$VERSION" \
  --url-prefix="~/static/js"

# Validate before upload
sentry-cli sourcemaps explain ./dist/main.js.map
```

### Inject Debug IDs (Recommended)

```bash
# Inject debug IDs into source files (modern approach)
sentry-cli sourcemaps inject ./dist
sentry-cli sourcemaps upload ./dist --release="$VERSION"
```

## Debug Files (iOS/Android)

### dSYMs (iOS)

```bash
# Upload dSYMs from Xcode archive
sentry-cli debug-files upload --include-sources path/to/dSYMs

# From derived data
sentry-cli debug-files upload ~/Library/Developer/Xcode/DerivedData/*/Build/Products/*/*.app.dSYM
```

### ProGuard (Android)

```bash
sentry-cli upload-proguard mapping.txt --uuid="$UUID"
```

### Check Debug Files

```bash
sentry-cli debug-files check path/to/file
sentry-cli debug-files list
```

## Events & Issues

### Send Test Event

```bash
sentry-cli send-event -m "Test error message"
sentry-cli send-event -m "Error" --logfile /var/log/app.log
```

### Query Issues

```bash
# List unresolved issues
sentry-cli issues list

# Resolve an issue
sentry-cli issues resolve ISSUE_ID

# Mute/ignore
sentry-cli issues mute ISSUE_ID
```

## Monitors (Cron)

```bash
# Wrap a cron job
sentry-cli monitors run my-cron-monitor -- /path/to/script.sh

# Manual check-ins
sentry-cli monitors check-in my-monitor --status ok
sentry-cli monitors check-in my-monitor --status error
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Create Sentry Release
  uses: getsentry/action-release@v1
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: my-org
    SENTRY_PROJECT: my-project
  with:
    environment: production
    sourcemaps: ./dist
```

### Generic CI

```bash
export SENTRY_AUTH_TOKEN="$SENTRY_TOKEN"
export SENTRY_ORG="my-org"
export SENTRY_PROJECT="my-project"
VERSION=$(sentry-cli releases propose-version)

sentry-cli releases new "$VERSION" --finalize
sentry-cli releases set-commits "$VERSION" --auto
sentry-cli sourcemaps upload ./dist --release="$VERSION"
sentry-cli releases deploys "$VERSION" new -e production
```

## Common Flags

| Flag            | Description           |
| --------------- | --------------------- |
| `-o, --org`     | Organization slug     |
| `-p, --project` | Project slug          |
| `--auth-token`  | Override auth token   |
| `--log-level`   | debug/info/warn/error |
| `--quiet`       | Suppress output       |

## Troubleshooting

```bash
# Check configuration
sentry-cli info

# Debug upload issues
sentry-cli --log-level=debug sourcemaps upload ./dist

# Validate source map
sentry-cli sourcemaps explain ./dist/main.js.map

# Check connectivity
sentry-cli send-event -m "test" --log-level=debug
```
