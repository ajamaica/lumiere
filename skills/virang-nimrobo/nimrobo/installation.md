# Installation & Setup

## 1. Install

To install the Nimrobo CLI globally via npm:

```bash
npm install -g @nimrobo/cli
```

*Note: Ensure you have Node.js installed.*

## 2. Login

After installation, authenticate with your Nimrobo account:

```bash
nimrobo login
```

This will typically open a browser or prompt for an authentication token.

## 3. Onboarding

Once logged in, run the onboarding command to set up your user profile and initial organization context:

```bash
nimrobo onboard
```

Follow the interactive prompts to complete the setup. This step is required before using other commands like `voice` or `net`.
