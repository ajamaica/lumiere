# PhoenixClaw Integration Guide

This document defines how Founder Coach integrates with PhoenixClaw to leverage passive journaling data for deeper entrepreneurial coaching.

## Integration Philosophy

Founder Coach treats PhoenixClaw as a **Primary Context Source**. By reading the user's daily reflections and moments, Founder Coach can provide highly contextualized advice without requiring the user to repeat themselves.

### Data Flow: One-Way (Read-Only)

- **Founder Coach -> PhoenixClaw**: Read access only.
- **Founder Coach -> User**: Insights derived from PhoenixClaw data.
- **Strict Rule**: Founder Coach MUST NOT modify PhoenixClaw core data files (daily journals, profile.md, growth-map.md).

## Detection Logic

Founder Coach should check for PhoenixClaw's existence during initialization.

### Detection Method

Check for the existence of the configuration file:
`~/.phoenixclaw/config.yaml`

```bash
# Verification snippet
if [ -f "$HOME/.phoenixclaw/config.yaml" ]; then
    # PhoenixClaw is installed
else
    # Fallback mode
fi
```

## Integration Workflow

### 1. Configuration Access

If installed, parse `~/.phoenixclaw/config.yaml` to locate the journal repository:

- `journal_path`: The root directory of the Obsidian vault.

### 2. Data Access Points

- **Daily Journals**: `{{journal_path}}/daily/YYYY-MM-DD.md`
  - Extract `mood`, `energy`, and `moments`.
- **User Profile**: `{{journal_path}}/profile.md`
  - Understand evolving personality and long-term habits.
- **Growth Map**: `{{journal_path}}/growth-map.md`
  - Identify recurring patterns that might affect business decisions.

### 3. Graceful Degradation (Fallback)

If PhoenixClaw is **not detected**:

- Founder Coach operates in **Standalone Mode**.
- It relies entirely on current session memory and direct user input.
- It should NOT prompt the user to install PhoenixClaw unless a clear pattern of "journaling fatigue" is detected over multiple sessions.

## Entrepreneurial Insights (Optional)

While Founder Coach does not modify PhoenixClaw core data, it can provide summaries that the user may _manually_ choose to include in their journal, or if acting as a PhoenixClaw plugin:

- Generate a "Founder's Weekly Insight" summary.
- Format as an Obsidian callout: `> [!insight] 💡 Founder Coach Insight`.

## Privacy & Security

- Never cache PhoenixClaw data outside of the active session memory.
- Respect the "Sacred" `user_notes` section in PhoenixClaw profile - never use it to store AI-generated coaching notes.
