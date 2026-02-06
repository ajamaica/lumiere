# Package SEO Skill

> SEO best practices for npm packages, GitHub repos, and AI agent skills. Maximize discoverability.

**Author:** Next Frontier  
**Version:** 1.0.0  
**Tags:** seo, npm, github, publishing, marketing, discoverability, packages

---

## When to Use

Use this skill when:

- Publishing a new npm package
- Creating a GitHub repo
- Submitting a skill to ClawdHub
- Updating descriptions/READMEs for better discoverability
- Auditing existing packages for SEO improvements

---

## Hot Keywords (2026)

Always include relevant terms from this list:

```
AI, automation, vibe coding, cursor, claude, gpt, copilot, agent,
autonomous, mcp, langchain, llm, testing, devtools, cli, typescript,
python, react, nextjs, api, sdk, tool, framework, openai, anthropic,
coding agent, ai assistant, developer tools, productivity
```

**Pro tip:** Check X/Twitter trending in tech before publishing for fresh terms.

---

## npm Packages

### package.json

```json
{
  "name": "descriptive-seo-friendly-name",
  "description": "Clear value prop with keywords. AI-powered X for Y. Works with Cursor, Claude, GPT.",
  "keywords": [
    "ai",
    "automation",
    "claude",
    "gpt",
    "cursor",
    "vibe-coding",
    "agent",
    "cli",
    "devtools",
    "mcp",
    "langchain",
    "copilot",
    "testing",
    "typescript",
    "openai",
    "anthropic"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/org/repo"
  },
  "homepage": "https://github.com/org/repo#readme",
  "bugs": {
    "url": "https://github.com/org/repo/issues"
  }
}
```

**Rules:**

- 10-15 keywords minimum
- Description under 200 chars but keyword-rich
- Include repository, homepage, bugs URLs
- Name should be searchable (avoid obscure names)

### README.md Structure

```markdown
# package-name

[![npm version](https://img.shields.io/npm/v/package-name.svg)](https://npmjs.com/package/package-name)
[![npm downloads](https://img.shields.io/npm/dm/package-name.svg)](https://npmjs.com/package/package-name)
[![license](https://img.shields.io/npm/l/package-name.svg)](LICENSE)

> One-line description with keywords. AI-powered X for Y.

## Works With

- 🤖 Claude / Claude Code
- 🔵 Cursor
- 💚 GPT / ChatGPT
- ⚡ Copilot
- 🧩 MCP servers

## Install

\`\`\`bash
npm install package-name
\`\`\`

## Quick Start

\`\`\`typescript
// Minimal working example
\`\`\`

## Features

- ✅ Feature 1 with keyword
- ✅ Feature 2 with keyword
- ✅ Feature 3 with keyword

## API / Usage

[Details...]

## License

MIT
```

**Key elements:**

- Badges at very top
- Hero tagline with keywords
- "Works With" section (shows compatibility)
- Install command above fold
- Quick start code example
- Feature list with checkmarks

---

## GitHub Repos

### Description (Under 350 chars)

Format:

```
[What it does]. [Key benefit]. [Compatibility]. [Call to action].
```

Examples:

```
AI-powered PDF generator for legal docs and pitch decks. Creates SAFEs, NDAs, term sheets from prompts. Works with Claude, Cursor, GPT. No templates needed.

Real-time financial data API for AI agents. Stocks, crypto, forex, ETFs in one unified feed. 120+ endpoints. Alternative to Alpha Vantage.

Automated QA for web apps using AI. Smoke tests, accessibility, visual regression. Drop-in CI/CD testing. Works with Playwright.
```

### Topics (GitHub Tags)

Add 10-20 relevant topics:

```
ai, automation, claude, gpt, cursor, typescript, cli, devtools,
agent, testing, api, sdk, mcp, langchain, openai, anthropic,
developer-tools, productivity, automation-tools
```

### README

Same as npm README — keep them identical!

---

## ClawdHub Skills

### SKILL.md Description

```markdown
# Skill Name

> One-line with keywords. [What it does] for AI agents. Works with Clawdbot, Claude, Cursor.

**Author:** Your Name
**Version:** X.Y.Z
**Tags:** tag1, tag2, tag3, ai, agent, automation
```

### Tags

Include 5-10 tags:

```
ai, agent, automation, claude, cursor, mcp, cli, [domain-specific tags]
```

---

## Sync Checklist

**All three must match:**

| Field       | npm                        | GitHub           | ClawdHub             |
| ----------- | -------------------------- | ---------------- | -------------------- |
| Name        | package.json `name`        | Repo name        | Skill folder name    |
| Description | package.json `description` | Repo description | SKILL.md description |
| Keywords    | package.json `keywords`    | Topics           | Tags                 |
| README      | README.md                  | README.md        | SKILL.md             |

---

## Publishing Checklist

Before every publish:

- [ ] Name is descriptive + searchable
- [ ] Description has value prop + 3-5 keywords
- [ ] 10-15 keywords in package.json
- [ ] README has badges (version, downloads, license)
- [ ] README has "Works With" section
- [ ] README has install command above fold
- [ ] README has quick start code example
- [ ] GitHub topics added (10-20)
- [ ] GitHub description matches npm
- [ ] Checked X/Twitter trending for fresh terms
- [ ] All descriptions synced across platforms

---

## Badge Generator

Use shields.io:

```markdown
[![npm version](https://img.shields.io/npm/v/PACKAGE.svg)](https://npmjs.com/package/PACKAGE)
[![npm downloads](https://img.shields.io/npm/dm/PACKAGE.svg)](https://npmjs.com/package/PACKAGE)
[![license](https://img.shields.io/npm/l/PACKAGE.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/ORG/REPO.svg)](https://github.com/ORG/REPO)
```

---

## Anti-Patterns (Avoid)

❌ Obscure/clever names that aren't searchable  
❌ Descriptions without keywords  
❌ Empty or minimal keywords array  
❌ README without badges  
❌ No "Works With" section  
❌ Mismatched npm/GitHub/ClawdHub descriptions  
❌ No quick start example  
❌ Walls of text before install command

---

## Examples (Good)

**ai-pdf-builder:**

```
AI-powered PDF generator for legal docs, pitch decks, and reports.
Creates SAFEs, NDAs, term sheets, whitepapers from prompts.
Works with Claude, GPT, Cursor, and AI coding agents. YC-style docs in seconds.
```

**web-qa-bot:**

```
Automated QA for web apps using AI. Smoke tests, accessibility checks,
visual regression. Drop-in replacement for manual QA.
Works with Playwright, Cursor, Claude. QA without the QA team.
```

---

## Quick Reference

| Element         | Target        |
| --------------- | ------------- |
| Keywords        | 10-15         |
| Description     | 100-200 chars |
| Topics          | 10-20         |
| Badges          | 3-5           |
| README sections | 5-7           |
