---
name: captcha-solver
description: 'Safe Captcha handling via Browser Agent or 2Captcha API.'
---

# Captcha Solver Logic

This skill provides a protocol for handling CAPTCHAs encountered during web automation.

## Strategy

1.  **Detection**: If the browser agent sees "I'm not a robot" or similar challenges.
2.  **Manual Intervention**:
    - Pause the browser.
    - Take a screenshot.
    - Ask the user for help OR use an API key if configured.

## Tools to Use

- `browser_subagent`: To interact with the page.
- `hustle_vault` (optional): To check for `2CAPTCHA_API_KEY`.

## Setup

To fully automate, add your 2Captcha key to the vault:

```bash
python3 hustle/engine/vault.py --action store --key 2CAPTCHA_API_KEY --value <your_key>
```
