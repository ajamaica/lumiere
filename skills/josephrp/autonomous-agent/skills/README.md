# Skills (MoltBook / OpenClaw)

This folder follows the **AgentSkills** layout expected by MoltBook and OpenClaw. Each subfolder is one skill with a `SKILL.md` (YAML frontmatter + instructions).

| Skill                                         | Description                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [autonomous-agent](autonomous-agent/SKILL.md) | x402 MCP agent: stock prediction, backtest, link_bank_account, agent/borrower scores (Aptos + Base). Wallet attestation (signing) for onboarding. |

**Loading:** Add this repo path to `skills.load.extraDirs` in `~/.openclaw/openclaw.json` (MoltBook/OpenClaw will load `autonomous-agent` from `skills/autonomous-agent/`), or copy `autonomous-agent` into `~/.openclaw/skills/`, or use the repo as your OpenClaw workspace. See the main [README](../README.md#moltbook--openclaw).
