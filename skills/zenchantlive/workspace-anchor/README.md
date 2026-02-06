# ⚓ Workspace Anchor

> **Multi-Agent Semantic Orientation & Boundary System**

Workspace Anchor is a lightweight coordination layer designed to prevent AI agents from "drifting" outside of their intended project boundaries. It provides semantic orientation and path validation for autonomous workflows.

## 🌟 Why this exists

When working with autonomous agents, context is everything. Without an anchor, agents can easily:
1. Edit files in the wrong repository.
2. Leak context between unrelated projects.
3. Lose track of where the "Root" of their current task is.

**Workspace Anchor** solves this by establishing a standardized `.project-lock` file that defines boundaries, naming, and ignore rules.

## 🚀 Features

- **Semantic Discovery**: Automatically find all projects in your workspace, regardless of folder depth.
- **Context Guardrails**: Validate every file operation before it happens.
- **Environment Agnostic**: Uses path expansion (`~`, `$HOME`, `$USER`) so configurations work across different machines.
- **Zero-Config Switching**: Jump between projects with a single command, updating the agent's internal "Project Header."

## 📦 Installation

This is an OpenClaw-native skill. To install:
1. Drop the `workspace-anchor` folder into your `skills/` directory.

## 🛠 Usage

### 🔍 Discovery & Status
```bash
# Find all projects on your system
node cli.js discover

# List projects with status and paths
node cli.js list

# Show which project you are currently "anchored" to
node cli.js status
```

### ⚓ Managing Context
```bash
# Switch active project context
node cli.js switch stacean-repo

# Validate if a path is safe to operate on
node cli.js validate /home/user/stacean-repo/src/index.js
```

### 🆕 Onboarding
```bash
# Create a new anchor in a directory
node cli.js create ~/my-new-app
```

## 📄 The `.project-lock` Format

Workspace Anchor uses a simple, human-readable (and agent-readable) format:

```text
# Project Protocol Lock File (Workspace Anchor)
NAME: my-cool-app
ROOT: ~/projects/my-cool-app
IGNORE: node_modules, .git, dist, .env
```

## 🤖 Agent Instructions (Internal)

**CRITICAL:** Agents reading this skill MUST identify the correct absolute paths for the current environment. Do not rely on hardcoded examples. Use `find` or `ls` to locate `.project-lock` files if the environment variables are not yet mapped.

---

*Built for the OpenClaw ecosystem. Ship safely.*
