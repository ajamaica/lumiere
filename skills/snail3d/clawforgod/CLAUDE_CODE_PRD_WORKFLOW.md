# Claude Code + PRD Workflow (RALPH BUILD LOOP)

## Setup

Always start Claude Code with:

```bash
claude --dangerously-skip-permissions exec "..."
```

This skips permission prompts and allows full automation.

## PRD Legend (Decode Before Reading)

```
KEYS:
  pn=project_name
  pd=project_description
  sp=starter_prompt
  ts=tech_stack
  gh=github
  fs=file_structure
  p=prds
  n=name
  d=description
  t=tasks
  ti=title
  f=file
  pr=priority
  ac=acceptance_criteria
  pfc=prompt_for_claude
  cmd=commands
  ccs=claude_code_setup
  ifc=instructions_for_claude

PHRASES:
  C=Create
  I=Install
  R=Run
  T=Test
  V=Verify
  Py=Python
  JS=JavaScript
  env=environment
  var=variable
  cfg=config
  db=database
  api=API
  req=required
  opt=optional
  impl=implement
  dep=dependencies
  auth=authentication
  sec=security
  fn=function
  cls=class
```

## RALPH BUILD LOOP

Follow this process for every project:

### 1. START

- Run setup command
- Create `.gitignore` + `.env.example` FIRST (security!)

### 2. LOOP

- Pick highest priority incomplete task from `prds` sections
- Read the `f` (file) field - read existing code if file exists

### 3. BUILD

- Implement the task per description + acceptance_criteria

### 4. TEST

- Run test command
- Verify it works

### 5. COMMIT

- If tests pass → `git add + commit` with task id (e.g., "SEC-001: Add .gitignore")

### 6. MARK

- Update task status to "complete" in tracking

### 7. REPEAT

- Go to step 2, pick next task

### 8. DONE

- When all tasks complete, run full test suite

### Task Priority Order

```
00_security → 01_setup → 02_core → 03_api → 04_test
```

## PRD Template

```json
{
  "pn": "Project Name",
  "pd": "Project description",
  "sp": "Starter prompt for Claude Code",
  "gh": true,
  "ts": {
    "language": "Python/JavaScript/etc"
  },
  "fs": ["src/", "tests/", ".gitignore"],
  "p": {
    "00_security": {
      "n": "Security",
      "t": [
        {
          "id": "SEC-001",
          "ti": "C .gitignore",
          "d": "Create .gitignore with secrets, env vars, dependencies",
          "f": ".gitignore",
          "pr": "high",
          "ac": "[x] .gitignore created, [ ] .env.example created"
        },
        {
          "id": "SEC-002",
          "ti": "C .env.example",
          "d": "Create .env.example with required variables (no secrets)",
          "f": ".env.example",
          "pr": "high",
          "ac": "[x] Template created, [ ] Documented"
        }
      ]
    },
    "01_setup": {
      "n": "Setup",
      "t": [
        {
          "id": "GH-001",
          "ti": "I Git repository",
          "d": "Initialize git repo and first commit",
          "f": "terminal",
          "pr": "high",
          "ac": "[x] Repo init, [ ] README, [ ] First commit"
        },
        {
          "id": "GH-002",
          "ti": "C GitHub repo",
          "d": "Set up GitHub with README and .gitignore",
          "f": "github.com",
          "pr": "high",
          "ac": "[x] Repo created, [ ] Protected main branch"
        },
        {
          "id": "GH-003",
          "ti": "Configure CI/CD",
          "d": "Set up GitHub Actions for automated testing",
          "f": ".github/workflows/",
          "pr": "medium",
          "ac": "[x] Workflow created, [ ] Tests run on push"
        }
      ]
    },
    "02_core": {
      "n": "Core",
      "t": []
    },
    "03_api": {
      "n": "API",
      "t": []
    },
    "04_test": {
      "n": "Testing",
      "t": []
    }
  }
}
```

## Usage Example

When starting a new project:

```bash
# 1. Create PRD for your project
cat > PRD.json << 'EOF'
{
  "pn": "My Project",
  "pd": "Description",
  ...
}
EOF

# 2. Start Claude Code with PRD
claude --dangerously-skip-permissions exec "
Follow the RALPH BUILD LOOP workflow.

Here's the PRD:
$(cat PRD.json)

Start with 00_security tasks, then work through in order.
For each task:
1. Read the file if it exists
2. Implement per acceptance_criteria
3. Test
4. Commit with task ID
5. Mark complete

When done, run full test suite.
"
```

## Key Commands for Claude Code

```bash
# Start with permissions skipped
claude --dangerously-skip-permissions exec "prompt"

# Run in background with monitoring
cd /path/to/project && claude --dangerously-skip-permissions exec "..." &

# Common git commands (Claude Code will use these)
git init
git add .
git commit -m "TASK-ID: Description"
git push origin main

# Test commands (vary by project)
pytest                 # Python
npm test               # Node.js
cargo test             # Rust
go test ./...          # Go
```

## Security Best Practices

1. **Always create .gitignore first** - before any code
2. **Use .env.example** - template with no real secrets
3. **Commit frequently** - with meaningful messages including task IDs
4. **Review before merging** - even if automated

## Tracking Status

As Claude Code works, update the PRD to mark tasks complete:

```json
"ac": "[x] Task 1 done, [x] Task 2 done, [ ] Task 3 pending"
```

The `[x]` indicates completion. Update this as you go.

## Tips

- **Restart if stuck**: If Claude Code gets confused, kill it and restart with a clearer prompt
- **Watch for uploads**: Monitor file creation in the working directory
- **Check git log**: Run `git log` to verify commits were made correctly
- **Run tests often**: Test after each task, not just at the end
