# Wreckit Skill — Setup Guide

Turn your Clawdbot into a Project Manager for the **jmanhype** Wreckit Factory.

---

## Requirements

| Requirement            | Check               | Notes                           |
| ---------------------- | ------------------- | ------------------------------- |
| **Node.js** v18+       | `node --version`    |                                 |
| **Wreckit (jmanhype)** | `wreckit --version` | Must be installed from the fork |
| **Sprites.dev Token**  | `env`               | Required for Cattle Mode        |

---

## Installation

### 1. Install Wreckit from the Fork

This skill requires the specialized `jmanhype` fork.

```bash
# Clone the fork
git clone https://github.com/jmanhype/wreckit.git
cd wreckit

# Install dependencies and link
bun install
npm link
```

### 2. Verify Fork Capabilities

```bash
wreckit --version
# Ensure 'sprite' command is available
wreckit sprite list
```

### 2. Verify Access

Ensure Clawdbot can run the command:

```bash
wreckit --version
```

### 3. Initialize Your Project

Go to the folder you want Clawdbot to manage:

```bash
cd /path/to/my/project
wreckit init
```

---

## Configuration

In your Clawdbot/Moltbot config, map this skill folder to `skills/wreckit`.

**Environment Variables:**
If Wreckit needs API keys (Anthropic, OpenAI, Z.ai), ensure they are exported in Clawdbot's environment.

```bash
export ANTHROPIC_API_KEY=sk-...
export ZAI_API_KEY=...
```
