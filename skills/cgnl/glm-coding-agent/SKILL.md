---
name: glm-coding-agent
description: Run Claude Code CLI with GLM 4.7 (via Z.AI) with automatic git safety net - checkpoint, experiment branch, review workflow. Cheap 200k context.
metadata: { 'openclaw': { 'emoji': '🤖', 'requires': { 'bins': ['claude'] } } }
---

# GLM Coding Agent

Use **Claude Code CLI** with **GLM 4.7** via Z.AI's Anthropic-compatible API, wrapped in **automatic git protection**:

- ✅ Git checkpoint before every run
- ✅ Experiment branch isolation
- ✅ Interactive review workflow
- ✅ One-click rollback
- 💰 Cheap, 200k context

## Quick Start

### From Command Line

#### macOS/Linux

```bash
cd ~/my-project
~/clawd/scripts/safe-glm.sh "Add error handling to the API"
```

#### Windows

```powershell
cd C:\Users\you\my-project
& "$env:USERPROFILE\clawd\scripts\safe-glm.ps1" "Add error handling to the API"
```

### From OpenClaw (all platforms)

```bash
# macOS/Linux
bash pty:true workdir:~/project command:"~/clawd/scripts/safe-glm.sh 'Add error handling'"

# Windows
pwsh pty:true workdir:C:\project command:"$env:USERPROFILE\clawd\scripts\safe-glm.ps1 'Add error handling'"

# After completion → interactive review:
#   1️⃣ ACCEPT - Merge to main
#   2️⃣ REVIEW - Selective staging
#   3️⃣ REJECT - Discard all
#   4️⃣ KEEP   - Manual fixes

# Background mode
bash pty:true workdir:~/project background:true command:"~/clawd/scripts/safe-glm.sh 'Refactor auth module'"

# Monitor
process action:log sessionId:XXX
```

## Setup (one-time)

### Platform-specific setup

**macOS/Linux:** Use bash scripts (`.sh`)  
**Windows:** Use PowerShell scripts (`.ps1`)

---

### 1. Create glmcode wrapper script (internal)

**Note:** This script is called internally by safe-glm. You don't need to use it directly.

#### macOS/Linux (Bash)

```bash
cat > ~/clawd/scripts/glmcode.sh << 'EOF'
#!/bin/bash
# GLM Code - Claude Code with GLM 4.7 via Z.AI
# Reads API key from OpenClaw config automatically

# Read Z.AI API key from OpenClaw config
CONFIG_FILE="${HOME}/.openclaw/openclaw.json"
if [ -f "$CONFIG_FILE" ]; then
  API_KEY=$(jq -r '.models.providers.zai.apiKey // empty' "$CONFIG_FILE" 2>/dev/null)
  if [ -n "$API_KEY" ]; then
    export ANTHROPIC_AUTH_TOKEN="$API_KEY"
  else
    echo "Error: Z.AI API key not found in OpenClaw config" >&2
    exit 1
  fi
else
  echo "Error: OpenClaw config not found at $CONFIG_FILE" >&2
  exit 1
fi

export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export API_TIMEOUT_MS=3000000

# Use GLM-specific settings if they exist, otherwise default
SETTINGS_FILE="${HOME}/.claude/settings-glm.json"
if [ -f "$SETTINGS_FILE" ]; then
  exec claude --settings "$SETTINGS_FILE" "$@"
else
  exec claude "$@"
fi
EOF

chmod +x ~/clawd/scripts/glmcode.sh
```

#### Windows (PowerShell)

The PowerShell scripts are already created at:

- `%USERPROFILE%\clawd\scripts\glmcode.ps1`
- `%USERPROFILE%\clawd\scripts\safe-glm.ps1`

No additional setup needed! Just make sure OpenClaw config exists at:

```
%USERPROFILE%\.openclaw\openclaw.json
```

### 2. Create GLM settings file

#### macOS/Linux

```bash
mkdir -p ~/.claude
cat > ~/.claude/settings-glm.json << 'EOF'
{
  "model": "glm-4.7",
  "max_tokens": 8192
}
EOF
```

#### Windows

```powershell
# Create settings directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude"

# Create settings file
@"
{
  "model": "glm-4.7",
  "max_tokens": 8192
}
"@ | Out-File -FilePath "$env:USERPROFILE\.claude\settings-glm.json" -Encoding utf8
```

### 3. Load convenience aliases (recommended)

#### macOS/Linux

```bash
# Add to ~/.zshrc or ~/.bashrc
source ~/clawd/scripts/glm-alias.sh

# Provides: glm, glm-review, glm-diff, glm-log, glm-undo, glm-branches, glm-clean
```

#### Windows

```powershell
# Add to PowerShell profile
notepad $PROFILE

# Add this function:
function glm { & "$env:USERPROFILE\clawd\scripts\safe-glm.ps1" @args }

# Reload profile
. $PROFILE
```

**Note:** Windows doesn't have all the bash aliases (glm-review, glm-diff, etc.). Use git commands directly:

```powershell
git status              # = glm-review
git diff HEAD~1         # = glm-diff
git log --oneline -10   # = glm-log
git reset --hard HEAD~1 # = glm-undo
```

---

## 🛡️ Safe GLM Wrapper (Recommended!)

The **safe-glm wrapper** (`~/clawd/scripts/safe-glm.sh`) provides automatic git-based safety:

### What It Does

1. ✅ **Git checkpoint** - Creates backup commit before GLM runs
2. ✅ **Experiment branch** - Isolates changes from main
3. ✅ **Stash uncommitted** - Preserves your WIP
4. ✅ **Change review** - Shows diff + file stats after completion
5. ✅ **Interactive menu** - Choose: Accept / Review / Reject / Keep

### How It Works

```bash
# Run in any git repo
cd ~/projects/myapp
~/clawd/scripts/safe-glm.sh "Fix auth bug"

# After GLM finishes:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Changed files (3):
 auth.js      | 12 ++++++++++--
 utils.js     |  5 +++++
 tests/auth.js| 24 ++++++++++++++++++++++++

Choose [1/2/3/4]:
  1️⃣  ACCEPT - Merge to main
  2️⃣  REVIEW - Selective staging (git add -p)
  3️⃣  REJECT - Discard all changes
  4️⃣  KEEP   - Stay on branch for manual fixes
```

### From OpenClaw

```bash
# Safe mode (recommended!)
bash pty:true workdir:~/project command:"~/clawd/scripts/safe-glm.sh 'Add error handling'"

# With background (interactive menu after completion)
bash pty:true workdir:~/project background:true command:"~/clawd/scripts/safe-glm.sh 'Refactor auth module'"
```

### Convenience Aliases

Add to `~/.zshrc`:

```bash
source ~/clawd/scripts/glm-alias.sh
```

Now you have:

```bash
glm "task"          # Run safe session
glm-review          # Show repo status
glm-diff            # Diff since last checkpoint
glm-log             # GLM commit history
glm-undo            # Rollback last commit
glm-branches        # List experiment branches
glm-clean           # Delete old branches
```

### Safety Features

| Feature            | Protection                           |
| ------------------ | ------------------------------------ |
| Git checkpoint     | Rollback possible with `glm-undo`    |
| Experiment branch  | Main branch stays intact until merge |
| Stash uncommitted  | No data loss                         |
| Review enforcement | Must explicitly accept/reject        |
| Diff preview       | See all changes before merging       |
| Selective staging  | Cherry-pick good parts only          |

**When to use:**

- ✅ Any coding task (default choice!)
- ✅ Refactors that touch many files
- ✅ Uncertain about GLM's output
- ✅ Learning/testing GLM capabilities

**Documentation:** `/Users/sander/clawd/docs/SAFE-GLM-GUIDE.md`

**Requirements:**

- ✅ Git repository (run `git init` if needed)
- ✅ No uncommitted changes (will auto-stash with confirmation)

---

## Safety & Sandboxing

Claude Code has **built-in OS-level sandboxing** to protect against destructive commands!

### Native Sandbox Protection

**What it blocks:**

- ✅ Cannot modify files outside project directory
- ✅ Cannot access ~/.ssh/, sensitive configs
- ✅ Cannot delete system files
- ✅ Network access restricted to allowed domains
- ✅ Protects against prompt injection attacks

**How it works:**

- **macOS:** Uses Seatbelt (built-in)
- **Linux/WSL2:** Uses bubblewrap + socat

**Enable sandbox:**

```bash
# One-time setup (inside Claude Code session)
/sandbox
# Choose "Auto-allow mode" for automation
```

**Configure in ~/.claude/settings.json:**

```json
{
  "sandbox": {
    "mode": "auto-allow",
    "filesystem": {
      "allow": ["/Users/sander/Projects"],
      "deny": ["~/.ssh", "~/.aws"]
    },
    "network": {
      "allowedDomains": ["github.com", "npmjs.org"]
    }
  }
}
```

### How safe-glm Uses These Features

**safe-glm.sh uses `--dangerously-skip-permissions` internally**, but the git safety net provides protection:

1. **Git checkpoint** - Every change can be rolled back
2. **Experiment branch** - Main stays untouched until you approve
3. **Interactive review** - See all changes before merging
4. **Sandbox (optional)** - Extra OS-level protection

**Combined safety:**

- Git protects your code history
- Sandbox protects your filesystem
- Review menu protects your judgment

## Usage from OpenClaw

```bash
# One-shot task
bash pty:true workdir:~/project command:"~/clawd/scripts/safe-glm.sh 'Fix the typo in README.md'"

# Background mode (interactive menu after completion)
bash pty:true workdir:~/project background:true command:"~/clawd/scripts/safe-glm.sh 'Refactor auth module'"

# Monitor background tasks
process action:log sessionId:XXX
process action:poll sessionId:XXX
```

### Auto-Notify on Completion

For long background tasks, add a wake trigger:

```bash
bash pty:true workdir:~/project background:true command:"~/clawd/scripts/safe-glm.sh 'Build a REST API for todos.

When completely finished, run:
openclaw gateway wake --text \"Done: Built todos REST API\" --mode now'"
```

## Why GLM 4.7?

| Feature     | Value                         |
| ----------- | ----------------------------- |
| **Cost**    | Cheap! (via Z.AI)             |
| **Context** | 200k tokens                   |
| **Speed**   | Fast responses                |
| **Quality** | Decent for coding tasks       |
| **API**     | Anthropic-compatible via Z.AI |

**Trade-off:** Not as smart as Claude Opus, but good enough for:

- Refactoring
- Bug fixes
- Documentation
- Simple feature additions
- Code reviews

For complex architecture decisions, use Claude Opus instead.

## Examples

### Fix a Bug

```bash
bash pty:true workdir:~/myapp command:"~/clawd/scripts/safe-glm.sh 'Fix the 500 error in /api/users endpoint'"
```

### Add Tests

```bash
bash pty:true workdir:~/myapp command:"~/clawd/scripts/safe-glm.sh 'Add unit tests for the User model'"
```

### Refactor (Background)

```bash
bash pty:true workdir:~/myapp background:true command:"~/clawd/scripts/safe-glm.sh 'Refactor auth.js to use async/await instead of callbacks'"

# Monitor progress
process action:log sessionId:XXX
```

### Review Code

```bash
bash pty:true workdir:~/myapp command:"~/clawd/scripts/safe-glm.sh 'Review the auth module and suggest improvements'"

# If GLM doesn't change files → no git checkpoint needed
# If GLM suggests code changes → safe review workflow
```

## Tips

1. **Git first** - Always work in a git repo (`git init` if needed)
2. **Commit before GLM** - Clean state = easier review (safe-glm will auto-stash if needed)
3. **Use pty:true** - Claude Code is an interactive terminal app
4. **Set workdir** - Agent stays focused on the project
5. **Be specific** - GLM works best with clear, concrete tasks
6. **Background for >2min tasks** - Don't block OpenClaw waiting
7. **Monitor with process:log** - Check progress without killing
8. **Keep it simple** - For complex tasks, consider Claude Opus
9. **Load aliases** - `source ~/clawd/scripts/glm-alias.sh` for convenience commands
10. **Review selectively** - Option 2 (git add -p) lets you cherry-pick good parts

## Troubleshooting

**"claude: command not found"**
→ Install Claude Code: `npm install -g @anthropic-ai/claude-code`

**Sandbox not available (Linux/WSL2)**
→ Install dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install bubblewrap socat

# Fedora
sudo dnf install bubblewrap socat
```

**Timeout errors**
→ API_TIMEOUT_MS is already set to 50 minutes in the wrapper

**Model not found**
→ Check if Z.AI endpoint is up: `curl https://api.z.ai/api/anthropic/v1/models`

**GLM gives weird responses**
→ Try being more specific in your prompt, or switch to Claude Opus for that task

**Sandbox blocks legitimate operations**
→ Update allowed paths/domains in `~/.claude/settings.json`:

```json
{
  "sandbox": {
    "filesystem": {
      "allow": ["/path/to/your/project"]
    },
    "network": {
      "allowedDomains": ["yourapi.com"]
    }
  }
}
```

## Cost Comparison

| Model         | Input  | Output | 200k context |
| ------------- | ------ | ------ | ------------ |
| **GLM 4.7**   | Cheap  | Cheap  | Cheap        |
| Claude Opus   | $15/1M | $75/1M | ~$3          |
| Claude Sonnet | $3/1M  | $15/1M | ~$0.60       |
| GPT-4         | $30/1M | $60/1M | ~$6          |

For coding tasks that don't need top-tier reasoning: GLM is much cheaper! 💰

## Parallel Issue Fixing with git worktrees

Fix multiple issues in parallel with cheap GLM agents! Perfect for batch work.

### Setup

```bash
# 1. Create worktrees for each issue
git worktree add -b fix/issue-42 /tmp/issue-42 main
git worktree add -b fix/issue-55 /tmp/issue-55 main
git worktree add -b fix/issue-67 /tmp/issue-67 main

# 2. Launch safe-glm in each (background + PTY!)
bash pty:true workdir:/tmp/issue-42 background:true command:"~/clawd/scripts/safe-glm.sh 'Fix issue #42: Button color bug'"

bash pty:true workdir:/tmp/issue-55 background:true command:"~/clawd/scripts/safe-glm.sh 'Fix issue #55: API timeout'"

bash pty:true workdir:/tmp/issue-67 background:true command:"~/clawd/scripts/safe-glm.sh 'Fix issue #67: Typo in docs'"

# 3. Monitor all at once
process action:list

# 4. Check individual logs
process action:log sessionId:XXX

# 5. After fixes complete, review each worktree
cd /tmp/issue-42
git log -1 --stat  # Review the commit
git push -u origin fix/issue-42
gh pr create --title "fix: button color (#42)" --body "Fixes #42"

cd /tmp/issue-55
git log -1 --stat
git push -u origin fix/issue-55
gh pr create --title "fix: increase API timeout (#55)" --body "Fixes #55"

# 6. Cleanup worktrees
git worktree remove /tmp/issue-42
git worktree remove /tmp/issue-55
git worktree remove /tmp/issue-67
```

### Why This Works

**Isolation:** Each worktree is a separate checkout, so agents don't conflict.

**Cost:** With GLM = cheap, you can run 10+ agents in parallel at low cost!

**Speed:** All issues get fixed simultaneously instead of sequentially.

**Safety:** Worktrees keep your main repo clean. Mistakes stay in `/tmp/`.

### Tips

1. **Pick simple issues** - GLM works best on focused tasks (typos, small bugs, docs)
2. **Clear commits** - Tell GLM exactly what commit message to use
3. **Monitor with process:list** - Keep track of which agents finished
4. **Cleanup is important** - Always `git worktree remove` when done
5. **Use labels** - Add `openclaw gateway wake` to each prompt for auto-notify

### Example: Fix 5 Issues at Once

```bash
# Issues: 42, 55, 67, 71, 89
for i in 42 55 67 71 89; do
  git worktree add -b fix/issue-$i /tmp/issue-$i main
  bash pty:true workdir:/tmp/issue-$i background:true command:"~/clawd/scripts/safe-glm.sh 'Fix issue #$i from GitHub. When done, run: openclaw gateway wake --text \"Fixed issue #$i\" --mode now'"
done

# Monitor
process action:list

# After all finish, bulk create PRs
for i in 42 55 67 71 89; do
  cd /tmp/issue-$i
  git push -u origin fix/issue-$i
  gh pr create --title "fix: issue #$i" --body "Fixes #$i" --assignee @me
done

# Cleanup
for i in 42 55 67 71 89; do
  git worktree remove /tmp/issue-$i
done
```

**Result:** 5 issues fixed in parallel, 5 PRs created, all at low cost. That's the GLM advantage! 💰

## Integration with sessions_spawn

You can also spawn GLM coding tasks as sub-agents:

```javascript
sessions_spawn({
  task: 'Build a todo API in ~/projects/todos using Express.js',
  model: 'zai/glm-4.7',
  label: 'glm-todo-api',
})
```

This runs GLM in an isolated session and pings you when done. Even cleaner than bash+background!

---

## See Also

- **Safe GLM Guide:** `/Users/sander/clawd/docs/SAFE-GLM-GUIDE.md` - Complete wrapper documentation (macOS/Linux)
- **Windows Guide:** `/Users/sander/clawd/docs/SAFE-GLM-WINDOWS.md` - Windows PowerShell setup
- **Scripts (macOS/Linux):**
  - `~/clawd/scripts/safe-glm.sh` - Main safety wrapper (bash)
  - `~/clawd/scripts/glm-alias.sh` - Convenience aliases (bash)
  - `~/clawd/scripts/glmcode.sh` - Internal Z.AI wrapper (bash)
- **Scripts (Windows):**
  - `%USERPROFILE%\clawd\scripts\safe-glm.ps1` - Main safety wrapper (PowerShell)
  - `%USERPROFILE%\clawd\scripts\glmcode.ps1` - Internal Z.AI wrapper (PowerShell)
- **Skill:** `glm-coding-agent` (this file)

---

Last updated: 2026-02-02 (Added safe-glm wrapper)
