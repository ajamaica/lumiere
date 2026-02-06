# Punchclock (WPS Time / NetTime) — Runbook

## Goal

A user can ask Steward to:

- Clock In
- Clock Out
- Start Break
- End Break
- Start Lunch
- End Lunch
- Check status

Steward should:

1. Open an OpenClaw-managed **isolated browser** (profile `openclaw`).
2. Navigate to WPS Time / NetTime.
3. Login using **macOS Keychain** credentials (do not prompt user).
4. Perform the requested action (select the Action dropdown + click Punch).
5. Read resulting status/time from page.
6. Take screenshot.
7. Reply with screenshot + brief summary.
8. Close the browser/tab.

## Site

- Login URL: http://www.wpstime.com/NetTime/Login.asp

## Known page actions

Action dropdown options observed:

- Clock In
- Clock Out
- Start Break
- Start Lunch
- Transfer

(Punch button submits the selected action.)

## Credentials

Stored in macOS Keychain.

Preferred services:

- `wpstime-punchclock`
- `wpstime-punchclock.company`

Backward-compat services (older OpenClaw setups):

- `openclaw.wpstime`
- `openclaw.wpstime.company`

## Browser popups to avoid

In the isolated browser, disable password prompts/warnings:

- `chrome://settings/security` → disable "Warn you if a password was compromised…"
- `chrome://password-manager/settings` → disable "Offer to save passwords…" and "Sign in automatically"

## Operational requirements

- Mac must be awake and online.
- If the site introduces CAPTCHA/2FA, fully unattended flow will break.

## Suggested phrases

- setup punchclock / configure punchclock
- clock in / clock out
- start break / end break
- start lunch / end lunch
- status / check status
