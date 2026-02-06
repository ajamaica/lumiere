# Wreckit Skill (jmanhype Fork)

> **First time?** Read [SETUP.md](./SETUP.md) first to install the Wreckit CLI from the jmanhype fork.

Connects Clawdbot to the **jmanhype fork of Wreckit**, the Autonomic Software Factory. This version is optimized for **Cattle Architecture** (Ephemeral Sprite VMs) and high-concurrency loops.

**Script:** `skills/wreckit/scripts/run-wreckit.mjs`
**Engine:** `wreckit` (Global CLI from jmanhype/wreckit)

---

## Trigger Phrases

When human says:

| Phrase                          | Action                                                   |
| ------------------------------- | -------------------------------------------------------- |
| **"Wreckit status"**            | List all items and their current states                  |
| **"Wreckit run [ID]"**          | Start the autonomous loop (Default: Cattle Mode)         |
| **"Wreckit run [ID] mode pet"** | Run locally without Sprites (Faster, less secure)        |
| **"Wreckit dream"**             | Autonomous ideation (Self-Roadmapping)                   |
| **"Wreckit doctor"**            | Self-healing diagnostics and repair                      |
| **"Wreckit rollback [ID]"**     | Rollback a direct-merge item to its pre-merge state      |
| **"Wreckit next"**              | Process the next incomplete item in sequence             |
| **"Wreckit learn"**             | Extract patterns from completed items and compile skills |
| **"Wreckit summarize"**         | Generate visualization videos for completed items        |
| **"Wreckit geneticist"**        | Analyze failure patterns and optimize system prompts     |

---

## The "Cattle" Advantage (Default)

Unlike standard agent loops, this version of Wreckit uses **Ephemeral Sprite VMs**. Every task spins up a fresh Firecracker microVM, executes code in isolation, and vanishes. No state contamination, maximum security.

## The "Pet" Mode (Local)

If you need raw speed or are debugging locally, say **"mode pet"**. This runs the RLM agent directly on the host machine.

---

## Usage Guide

### 1. Checking Status

> **User:** "Wreckit status"
> **Bot:** Lists all active items (Idea, Planned, In Progress, Done).

### 2. Running a Task

> **User:** "Wreckit run 096"
> **Bot:** "Starting Wreckit run for item 096... [Streams logs] ... Done."

### 3. Dreaming (Autonomy)

> **User:** "Wreckit dream"
> **Bot:** Scans your codebase for technical debt and creates new items automatically.

### 4. Rollback

> **User:** "Wreckit rollback 096"
> **Bot:** Reverts item 096 to its pre-merge state using git operations.
>
> **With force:** "Wreckit rollback 096 force" - Forces rollback even if item is not in 'done' state.

### 5. Next Item

> **User:** "Wreckit next"
> **Bot:** Processes the single next runnable item with dependency satisfaction.

### 6. Learn (Pattern Extraction)

> **User:** "Wreckit learn all"
> **Bot:** Extracts patterns from all completed items and compiles them into skills.
>
> **Specific item:** "Wreckit learn item 096"
> **By phase:** "Wreckit learn phase done"

### 7. Summarize (Video Generation)

> **User:** "Wreckit summarize all"
> **Bot:** Generates 30-second feature visualization videos for all completed items.
>
> **Specific item:** "Wreckit summarize item 096"
> **By phase:** "Wreckit summarize phase done"

### 8. Geneticist (Prompt Optimization)

> **User:** "Wreckit geneticist"
> **Bot:** Analyzes healing logs from the last 48 hours to identify and fix recurrent error patterns.
>
> **Custom window:** "Wreckit geneticist time-window 24 min-errors 5"

---

## Advanced Flags

### Global Flags (apply to all commands)

- **`--cwd <path>`** - Override the working directory
- **`--parallel <n>`** - Process N items in parallel (default: 1)
- **`--verbose`** - Enable verbose output
- **`--dry-run`** - Show what would be done without making changes

### Mode Selection

- **`--mode cattle`** (default) - Use ephemeral Sprite VMs
- **`--mode pet`** - Run locally without Sprites

### Command-Specific Flags

#### Rollback

- **`--force`** - Force rollback even if item is not in 'done' state

#### Learn

- **`--item <id>`** - Extract patterns from specific item
- **`--phase <state>`** - Extract patterns from items in specific phase state
- **`--all`** - Extract patterns from all completed items
- **`--output <path>`** - Output path for skills.json (default: .wreckit/skills.json)
- **`--merge <strategy>`** - Merge strategy: append|replace|ask (default: append)
- **`--review`** - Review extracted skills before saving

#### Summarize

- **`--item <id>`** - Generate video for specific item
- **`--phase <state>`** - Generate videos for items in specific state
- **`--all`** - Generate videos for all completed items

#### Geneticist

- **`--auto-merge`** - Automatically submit PRs for optimized prompts
- **`--time-window <hours>`** - Analyze healing logs from last N hours (default: 48)
- **`--min-errors <count>`** - Threshold for recurrent pattern detection (default: 3)

---

## Configuration

This skill assumes `wreckit` is installed globally or available in the path.
If running in Docker, ensure the container has access to the project directory.

### Parallel Processing

When using `--parallel` flag with commands that process multiple items (like `learn --all` or `summarize --all`), the wrapper will process N items concurrently. For bot safety, default is 1 (sequential processing).

### Working Directory Override

Use `--cwd` to specify a different project directory than the current working directory. This is useful for managing multiple projects or operating in a containerized environment.
