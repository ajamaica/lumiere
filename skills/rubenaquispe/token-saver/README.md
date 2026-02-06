# 🚀 Token Saver

> **💡 Did you know?** Every time you send a prompt, your workspace files (SOUL.md, USER.md, MEMORY.md, AGENTS.md, and more) are sent along with it — every single time. These files count toward your context window, slowing down responses and costing you real money on every message. Token Saver compresses these files using AI-efficient notation that preserves all your data while making everything lighter, faster, and cheaper.

**Cut your OpenClaw AI costs by 40-90% with one command.**

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Quick Start

```
/optimize
```

That's it. You'll see a dashboard with your savings options.

## What It Does

| Feature                 | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| **🗜️ File Compression** | Scans ALL .md workspace files and compresses them using AI-efficient notation |
| **🤖 Model Audit**      | Detects your current AI models and suggests cheaper alternatives              |
| **📊 Cost Dashboard**   | Shows weekly/monthly/annual savings with clear before & after                 |
| **🛡️ Safe Rollback**    | Auto-backups + one-command revert                                             |

## Example

**Before** (500+ tokens):

> When Ruben greets me in the morning with phrases like "good morning" or "what's on today", I should proactively review our task list, mention pending items, and check for urgent issues...

**After** (30 tokens):

```
MORNING: greeting → review(todos+pending+urgent)
```

Same meaning. 90% fewer tokens. Real dollar savings.

## Commands

| Command            | What It Does                           |
| ------------------ | -------------------------------------- |
| `/optimize`        | Show savings dashboard                 |
| `/optimize tokens` | Compress workspace files (auto-backup) |
| `/optimize models` | Detailed model cost comparison         |
| `/optimize revert` | Restore all files from backups         |

## Dashboard Preview

```
🚀 Token Optimizer Dashboard

💾 Current Context: 12,169 tokens across 10 files
💰 Est. Monthly Cost: $158.08

┌─────────────────────────────────────────────┐
│  🗜️  WORKSPACE FILES OPTIMIZATION           │
└─────────────────────────────────────────────┘
🔴 MEMORY.md:  2,640 → 215 tokens (92% possible saving)
🔴 USER.md:      563 → 103 tokens (82% possible saving)
🟢 AGENTS.md:  2,063 → 2,063 tokens (0% possible saving)

┌─────────────────────────────────────────────┐
│  🤖  AI MODEL AUDIT                         │
└─────────────────────────────────────────────┘
• Default: claude-sonnet-4 (~$14.40/month)
• Cron jobs: gemini-pro (free)
💡 Subagents: Switch Opus → Sonnet — ~$14.40/month possible saving

┌─────────────────────────────────────────────┐
│  📊 COMBINED POSSIBLE SAVINGS               │
└─────────────────────────────────────────────┘
File compression: ~$37.40/month
Model switching:  ~$17.57/month
Total:            ~$54.97/month possible saving
```

## Install

```bash
# From ClawHub
clawhub install token-saver

# Or clone directly
git clone https://github.com/RubenAQuispe/token-saver.git
```

## ✨ Persistent Mode — One-and-Done

When you run `/optimize tokens`, Token Saver also enables **Persistent Mode** — your AI will continue writing in compressed notation going forward. No need to re-optimize!

- **Automatic** — Enabled when you optimize, disabled when you revert
- **Smart** — AI maintains compressed format in all workspace files
- **Reversible** — `/optimize revert` turns it off and restores everything

## Safety First

- ✅ **Auto-backup** before any file changes
- ✅ **"Possible savings"** shown until you actually apply
- ✅ **One-command revert** — `/optimize revert` restores everything + turns off persistent mode
- ✅ Only compresses files where real savings exist

## How It Works

AI models understand compressed notation perfectly. The optimizer converts verbose instructions into dense, structured formats that preserve 100% of the meaning while using 40-90% fewer tokens.

Every token saved = money saved on every single API call.

## License

MIT — Use it, modify it, share it.
