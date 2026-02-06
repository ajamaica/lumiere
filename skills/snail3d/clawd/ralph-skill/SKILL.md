---
name: ralph
description: Create PRDs and automate the RALPH BUILD LOOP workflow with Claude Code. Use when starting a new project and want Claude Code to follow structured PRD-based development with automatic task tracking, testing, and git commits.
---

# Ralph Skill - PRD-Driven Development

Automate project development using Product Requirements Documents (PRDs) and the RALPH BUILD LOOP.

## Quick Start

```bash
# Create a PRD file
ralph init --name "My Project" --language python

# Start Claude Code with the PRD
ralph build

# Check progress
ralph status

# Clean up when done
ralph cleanup
```

## What Ralph Does

1. **Initializes PRD** - Creates structured project requirements
2. **Starts Claude Code** - With `--dangerously-skip-permissions` flag
3. **Manages RALPH Loop** - Tracks task priority, completion, testing
4. **Handles Commits** - Auto-commits with task IDs (e.g., "SEC-001: Add .gitignore")
5. **Monitors Progress** - Updates PRD as tasks complete
6. **Runs Tests** - Verifies each task works before moving on

## RALPH BUILD LOOP

Ralph follows this 8-step workflow automatically:

```
1. START      → Create .gitignore + .env.example (security first!)
2. LOOP       → Pick highest priority incomplete task
3. READ       → Check if file exists, read existing code
4. BUILD      → Implement task per acceptance_criteria
5. TEST       → Run test command, verify it works
6. COMMIT     → git add + commit with task ID
7. MARK       → Update task status to "complete"
8. REPEAT     → Go to step 2 until all tasks done
9. DONE       → Run full test suite
```

## Monitoring

Ralph automatically monitors Claude Code builds in the background:

```bash
# Monitor a running build
ralph monitor --session <session_id> --dir <project_dir>

# With custom check interval (default 30s)
ralph monitor --session <session_id> --dir <project_dir> --interval 60
```

**What monitoring does:**

- Checks session status every 30 seconds (configurable)
- Reports file changes (what's being created/modified)
- Shows recent activity snippets
- Alerts if session stops unexpectedly
- Continues for max duration (default 1 hour)

**Output example:**

```
📊 BUILD STATUS CHECK
⏱️  Session: fast-slug...
🟢 RUNNING
📝 Recent files (5):
   - package.json
   - src/App.jsx
   - Dockerfile
   - ...and 2 more
💬 Recent activity: CORE-001: Implementing chess logic...
```

The monitor runs continuously and reports status every interval, so you don't have to manually check!

## Commands

### ralph init

Initialize a new PRD-based project.

```bash
ralph init --name "Project Name" --language python
ralph init --name "Web App" --language javascript --github
```

Options:

- `--name` (required) - Project name
- `--language` (optional) - Programming language (python, javascript, go, rust, etc.)
- `--github` (optional) - Create GitHub repo on initialization
- `--path` (optional) - Project directory (default: current)

Creates:

- `PRD.json` - Project requirements document
- `.gitignore` - Security baseline
- `.env.example` - Environment template
- `ralph.config.json` - Ralph configuration

### ralph build

Start Claude Code with the PRD and begin the RALPH BUILD LOOP.

```bash
ralph build                          # Use PRD.json in current dir
ralph build --prd custom-prd.json   # Use custom PRD
ralph build --auto-commit           # Auto-commit after each task
```

Options:

- `--prd` (optional) - Path to PRD file
- `--auto-commit` (optional) - Automatically commit after each task
- `--section` (optional) - Start from specific section (00_security, 01_setup, etc.)

### ralph status

Show current project status and task progress.

```bash
ralph status
```

Shows:

- Tasks complete / total
- Current section
- Next task to work on
- Recent commits
- Test results

### ralph update

Update PRD task status after manual changes.

```bash
ralph update --task SEC-001 --status complete
ralph update --task SEC-001 --comment "Security baseline added"
```

### ralph test

Run project test suite (language-specific).

```bash
ralph test                    # Run all tests
ralph test --task SEC-001     # Test specific task
```

### ralph commit

Create a commit with task ID (called automatically by ralph build).

```bash
ralph commit --task SEC-001 --message "Add .gitignore"
```

### ralph cleanup

Clean up after project completion.

```bash
ralph cleanup                 # Archive PRD and config
ralph cleanup --full         # Remove entire project
```

## PRD Structure

Ralph creates PRDs with this structure:

```json
{
  "pn": "Project Name",
  "pd": "Project description",
  "sp": "Starter prompt for Claude Code",
  "gh": true,
  "ts": {
    "language": "Python",
    "framework": "Flask"
  },
  "p": {
    "00_security": {
      "n": "Security",
      "t": [
        {
          "id": "SEC-001",
          "ti": "Create .gitignore",
          "d": "Add .gitignore with secrets and dependencies",
          "f": ".gitignore",
          "pr": "high",
          "st": "pending",
          "ac": "[x] .gitignore created, [x] .env.example created"
        }
      ]
    },
    "01_setup": {...},
    "02_core": {...},
    "03_api": {...},
    "04_test": {...}
  }
}
```

Fields:

- `id` - Task identifier (e.g., SEC-001)
- `ti` - Task title
- `d` - Task description
- `f` - File(s) involved
- `pr` - Priority (high, medium, low)
- `st` - Status (pending, in_progress, complete, blocked)
- `ac` - Acceptance criteria (checklist form)

## Configuration

Ralph stores config in `ralph.config.json`:

```json
{
  "project_name": "My Project",
  "language": "python",
  "prd_path": "PRD.json",
  "test_command": "pytest",
  "auto_commit": false,
  "claude_code_flags": ["--dangerously-skip-permissions"],
  "git_user": "name",
  "git_email": "email@example.com"
}
```

## Task Priority Order

Ralph always works in this order:

1. **00_security** - .gitignore, .env.example, secrets management
2. **01_setup** - Git repo, GitHub, CI/CD, dependencies
3. **02_core** - Main application logic and features
4. **03_api** - API endpoints, integrations
5. **04_test** - Full test suite, coverage

## Usage Example

```bash
# 1. Initialize new Python project
ralph init --name "Todo API" --language python

# 2. Edit PRD.json with your specific tasks
# (Ralph adds defaults; customize as needed)

# 3. Start Claude Code with RALPH loop
ralph build --auto-commit

# 4. Monitor progress
ralph status

# 5. When done, review and clean up
ralph cleanup
```

## Advanced Features

### Custom Test Commands

Ralph auto-detects test commands by language:

```
Python  → pytest
Node.js → npm test
Go      → go test ./...
Rust    → cargo test
```

Override in `ralph.config.json`:

```json
{
  "test_command": "python -m pytest --cov"
}
```

### GitHub Integration

Ralph can create GitHub repos and set up CI/CD:

```bash
ralph init --name "Project" --github
```

This creates:

- Remote GitHub repository
- `.github/workflows/test.yml` for CI/CD
- Protected main branch rules

### Task Dependencies

Mark tasks that depend on others:

```json
{
  "id": "CORE-005",
  "ti": "Setup database",
  "depends_on": ["CORE-001", "CORE-002"],
  "st": "pending"
}
```

Ralph won't start CORE-005 until CORE-001 and CORE-002 are complete.

## How to Start a Build

```bash
# Initialize a new project
ralph init --name "My Project" --language python

# Edit PRD.json with your specific tasks

# Start Claude Code (WITHOUT --dangerously-skip-permissions)
cd ~/Desktop/my-project
claude exec "Follow the RALPH BUILD LOOP. Here's the PRD: $(cat PRD.json)"

# Approve the security prompt when Claude Code asks
# Then let it work through each task
```

**Important:** Don't use `--dangerously-skip-permissions` - it causes Claude Code to get confused. Let it ask for permission normally when needed.

## Permissions & Safety Philosophy

**I (Clawd) am in charge of granting permissions during builds.** You've indicated you're very tolerant of most operations as long as they:

- Don't blow up the machine
- Don't expose you to scammers
- Don't nuke your files

**Philosophy (from you):**

> "I take safety seriously. I want you to have an eye out for security AND balance good UX/good UI. I don't like security to the point of making user experiences unusable. Security is mostly theater. But the security that isn't theater—like .gitignore and envelopes—that is non-negotiable."

**Translation:** Optimize for user experience, but NEVER skip the fundamentals:

- ✅ .gitignore is mandatory (no credentials in repos)
- ✅ .env files are mandatory (secrets never committed)
- ✅ No security theater (don't ask for permission on safe, standard operations)
- ✅ UX/DX matters (make builds smooth and fast)

**I will auto-approve safe operations:**

- ✅ npm install, npm run, package management
- ✅ Creating/editing files in the project directory
- ✅ Running build/test commands (npm build, cargo test, etc.)
- ✅ Docker commands (docker build, docker compose up, etc.)
- ✅ Git operations (git init, git add, git commit, git push)
- ✅ Standard development tools and operations
- ✅ Adding proper .gitignore and .env.example files

**I will ask or refuse:**

- ❌ Commands that delete important directories
- ❌ Operations that modify system-level settings
- ❌ Running unvetted third-party scripts
- ❌ Anything accessing/exposing sensitive data or credentials
- ❌ Network operations that seem suspicious
- ❌ Skipping .gitignore or .env security (non-negotiable)

**During builds:** When Claude Code asks for permission, I'll handle it automatically if it's safe. You focus on the bigger picture while I manage the operational details AND ensure the fundamentals are solid.

## Bundled Resources

- **scripts/init_prd.py** - Create new PRD
- **scripts/run_ralph_loop.py** - Execute RALPH workflow
- **scripts/monitor_build.py** - Monitor Claude Code session and report progress
- **references/prd_templates.md** - PRD templates by language
- **assets/prd_schema.json** - PRD JSON schema

## Common Issues

**Claude Code won't start**

- Ensure `claude` CLI is installed
- Check `--dangerously-skip-permissions` is supported in your version

**Tasks aren't committing**

- Verify git is initialized: `git init`
- Check git config: `git config user.email`

**Tests failing**

- Ralph pauses and reports failures
- Review test output and fix, then resume with `ralph build --section 04_test`

## Tips

1. **Start with security** - Ralph always does .gitignore + .env.example first
2. **Read the PRD carefully** - Good PRD = good project
3. **Test often** - Ralph tests after each task
4. **Commit messages** - Task IDs make history clear
5. **Review PRD regularly** - Update acceptance_criteria as you learn
