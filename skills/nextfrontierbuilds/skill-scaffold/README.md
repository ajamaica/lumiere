# skill-scaffold

> AI agent skill scaffolding CLI. Create Clawdbot, Moltbot, Claude, and MCP skills instantly.

[![npm version](https://img.shields.io/npm/v/skill-scaffold.svg)](https://www.npmjs.com/package/skill-scaffold)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Stop copy-pasting skill templates. Generate production-ready AI agent skills in seconds.

## Install

```bash
npm install -g skill-scaffold
```

## Usage

```bash
# Create a Clawdbot/Moltbot skill
skill-scaffold my-awesome-skill

# Create an MCP server
skill-scaffold my-api --template mcp

# Create with CLI binary included
skill-scaffold cli-tool --cli
```

## Templates

| Template   | Use Case                                                  |
| ---------- | --------------------------------------------------------- |
| `clawdbot` | Clawdbot/Moltbot skills with SKILL.md, triggers, examples |
| `mcp`      | Model Context Protocol servers for Claude/Cursor          |
| `generic`  | Minimal skill structure                                   |

## Options

```
--template <type>    clawdbot (default), mcp, generic
--author <name>      Author name for package
--description <text> Skill description
--dir <path>         Output directory
--cli                Include CLI binary scaffold
--no-scripts         Skip scripts folder
```

## Output

```
my-skill/
├── SKILL.md       # Agent documentation
├── README.md      # npm/GitHub readme
├── scripts/       # Helper scripts
└── bin/           # CLI (if --cli)
```

## Examples

```bash
# Weather alerts skill
skill-scaffold weather-alerts --description "Real-time weather notifications"

# GitHub MCP server
skill-scaffold github-mcp --template mcp --author "MyName"

# Full CLI tool in custom directory
skill-scaffold super-tool --cli --dir ~/projects
```

## Works With

- 🤖 **Clawdbot** / **Moltbot** - AI agent framework
- 🧠 **Claude** - Anthropic's AI assistant
- ✨ **Cursor** - AI-powered code editor
- 🔌 **MCP** - Model Context Protocol servers
- 🎯 **Any agent** that reads SKILL.md

## Keywords

AI, agent, skill, scaffold, generator, Clawdbot, Moltbot, Claude, Cursor, MCP, vibe coding, automation, LLM, GPT, Copilot, devtools, CLI

## Author

[tytaninc7](https://github.com/tytaninc7) / [NextFrontierBuilds](https://github.com/NextFrontierBuilds)

## License

MIT
