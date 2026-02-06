---
name: github-mentions
description: Monitor and track GitHub mentions for your username across your orgs. Queries for new mentions, tracks status (pending/in_progress/completed) to avoid redundant work. Use to check for new mentions or mark mentions as being addressed.
version: 1.0.0
metadata:
  clawdhub:
    emoji: '🔔'
    requires:
      bins: ['gh', 'jq']
    dependencies:
      - github
---

# GitHub Mentions Monitor

Track and manage GitHub mentions for your username across your organizations. Prevents redundant queries and duplicate work by maintaining state.

## Prerequisites

- `gh` CLI authenticated (`gh auth login`)
- `jq` for JSON processing
- The `github` skill (dependency)

## Configuration

### Config File

Runtime configuration is stored in `config.json` (default: `skills/github-mentions/config.json`):

```json
{
  "orgOnly": true, // Only track mentions from within your orgs
  "orgMembersOnly": true, // Only track mentions from org members (not external users)
  "memberCacheHours": 1, // Refresh org member list every N hours
  "checkIntervalMinutes": 5 // Intended check frequency (for reference)
}
```

**Configuration options:**

- `orgOnly=true` (default): Only track mentions from repos within your orgs
- `orgOnly=false`: Track all mentions (including from repos outside your orgs)
- `orgMembersOnly=true` (default): Only track mentions from org members
- `orgMembersOnly=false`: Track mentions from anyone (including external contributors, bots)
- `memberCacheHours`: How often to refresh the org member list (default: 1 hour)

**Set config via CLI:**

```bash
github-mentions config orgOnly false           # Track all mentions
github-mentions config orgMembersOnly false    # Include non-org-members
github-mentions config memberCacheHours 2      # Refresh members every 2 hours
```

### Environment Variables (optional)

- `GITHUB_MENTIONS_STATE` - Path to state file (default: `~/.openclaw/workspace/memory/github-mentions-state.json`)
- `GITHUB_MENTIONS_CONFIG` - Path to config file (default: `skills/github-mentions/config.json`)

## State File

The skill maintains state in a JSON file:

```json
{
  "lastChecked": "2026-02-02T00:00:00Z",
  "username": "gigi-trifle",
  "orgs": ["trifle-labs"],
  "mentions": {
    "trifle-labs/repo#123": {
      "type": "issue",
      "status": "pending",
      "title": "Issue title",
      "url": "https://github.com/...",
      "mentionedAt": "2026-02-02T00:00:00Z",
      "mentionedBy": "okwme"
    }
  }
}
```

## Commands

### Check for new mentions

```bash
github-mentions check
```

Queries GitHub for new mentions since last check. Adds new mentions as "pending". Returns a summary of new and pending mentions.

**Query strategy:**

1. Search issues/PRs in each org where you're mentioned
2. Filter to mentions from other org members (not self-mentions)
3. Compare against state to find new ones

### List current mentions

```bash
github-mentions list [--status <pending|in_progress|completed>]
```

Shows all tracked mentions, optionally filtered by status.

### Start working on a mention

```bash
github-mentions start <mention-id>
```

Marks a mention as "in_progress". The mention-id is the format `owner/repo#number`.

### Complete a mention

```bash
github-mentions done <mention-id>
```

Marks a mention as "completed".

### View mention details

```bash
github-mentions view <mention-id>
```

Shows full details of a mention including the issue/PR body and recent comments.

## Workflow

1. **Check for mentions**: `github-mentions check`
2. **Review pending**: `github-mentions list --status pending`
3. **Start work**: `github-mentions start trifle-labs/repo#123`
4. **Address the mention** (reply, fix issue, etc.)
5. **Mark done**: `github-mentions done trifle-labs/repo#123`

## Example Usage

```bash
# Check for new mentions across your orgs
github-mentions check

# Output:
# Last checked: 2026-02-01T23:00:00Z
# Found 2 new mentions:
#   - trifle-labs/clawdbot#456 (issue) by @okwme: "Need help with..."
#   - trifle-labs/webapp#789 (pr) by @teammate: "Review requested..."
#
# Pending mentions: 3
# In progress: 1

# Start working on one
github-mentions start trifle-labs/clawdbot#456

# View full context
github-mentions view trifle-labs/clawdbot#456

# Mark as done after addressing
github-mentions done trifle-labs/clawdbot#456
```

## Implementation Notes

**Detecting mentions:**

```bash
# Search for issues/PRs mentioning you in an org
gh search issues "org:<org> mentions:<username>" --json number,repository,title,author,createdAt,url --limit 50

# Search for PR review requests
gh search prs "org:<org> review-requested:<username>" --json number,repository,title,author,createdAt,url --limit 50
```

**Filtering org members only:**

```bash
# Get org members
gh api orgs/<org>/members --jq '.[].login'
```

Only track mentions from users in this list (excluding self).

**Avoiding redundant queries:**

- Store `lastChecked` timestamp
- Use `created:>YYYY-MM-DD` in search to limit results
- Skip mentions already in state file
