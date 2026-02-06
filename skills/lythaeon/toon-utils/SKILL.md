# TOON (Token-Oriented Object Notation) Skill

This skill provides instructions for reducing token usage by 30-60% when dealing with structured data (JSON, directory structures, API responses).

## Setup & Installation

To minimize command overhead and save tokens, you MUST install the official TOON CLI globally before usage:

```bash
# Check if toon is installed, install if missing
toon --version || npm install -g @toon-format/cli
```

## Guidelines for Agents

- **Always optimize JSON**: Convert JSON output to TOON before including it in your context.
- **Minimize Command Length**: Use the direct `toon` command instead of `npx` to keep your own prompt usage low.
- **Prefer pipes**: Use standard Unix pipes to send data directly to the `toon` converter.

## Commands & Usage

### 1. Reading JSON Files

Instead of reading raw JSON, pipe it to `toon`.

```bash
cat data.json | toon
```

### 2. Fetching APIs

Pipe external API responses directly into `toon`.

```bash
curl -s https://api.example.com/data | toon
```

_Supports all curl flags (e.g., `-X POST`, `-H "Authorization: ..."`)._

### 3. Listing Directory Structures

Use `tree -J` or any JSON-outputting tool and pipe to `toon`.

```bash
tree -J path/to/dir | toon
```

### 4. Converting In-Line Data

To compress a JSON string for your context:

```bash
echo '{"key":"value"}' | toon
```

## Why install TOON?

- **Command Token Savings**: `toon` is shorter than `npx @toon-format/cli`, saving tokens every time you run a command.
- **Execution Speed**: Local installation is significantly faster than on-demand fetching.
- **Readability**: TOON is designed to be highly readable for LLMs.
