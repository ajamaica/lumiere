---
name: claw-conductor
description: Always-on autonomous development orchestrator with intelligent triage. Auto-detects Discord channels, routes to project workspaces, triages simple vs development requests, decomposes complex tasks, routes to optimal AI models, executes in parallel, and consolidates results.
version: 2.1.0
---

# Claw Conductor v2.1

**Your always-on development assistant - handles everything from quick questions to full project builds.**

Claw Conductor is an intelligent orchestration layer that:

- 🎯 **Always-On**: Handles every message automatically (no need to invoke)
- 🤖 **Smart Triage**: Detects simple questions vs development tasks
- 💬 **Discord-Aware**: Auto-maps channels to project workspaces
- 🔀 **Multi-Model**: Routes tasks to optimal AI based on capabilities
- ⚡ **Parallel Execution**: Builds complete projects efficiently

## 🚀 How It Works

**Automatic Flow:**

1. Message arrives in Discord channel (e.g., #scientific-calculator)
2. Claw-conductor detects channel → maps to `/root/projects/scientific-calculator`
3. Triages request: Simple question or development task?
4. **If Simple**: Quick response from fast model with project context
5. **If Development**: Full orchestration - decompose, route, execute, consolidate

**You never need to explicitly invoke it** - it handles everything automatically!

## 🎯 Usage Examples

**Simple Questions** (fast response):

```
User: What files are in this project?
Conductor: 📋 Simple response mode
          [Lists files from /root/projects/scientific-calculator]

User: How does the calculator work?
Conductor: 📋 Simple response mode
          [Explains architecture with project context]
```

**Development Tasks** (full orchestration):

```
User: Build a scientific calculator with trig functions
Conductor: 🔧 Development mode - full orchestration
          [Decomposes into tasks, routes to models, executes in parallel]

User: Fix the bug in the calculation logic
Conductor: 🔧 Development mode - full orchestration
          [Analyzes code, creates fix, tests, commits]
```

**User Overrides**:

```
User: !simple Build a calculator
Conductor: 📋 Simple response mode
          [Gives advice/explanation instead of building]

User: !dev What files exist?
Conductor: 🔧 Development mode - full orchestration
          [Treats as development task - maybe creates file listing tool]
```

## 🚀 Skill Invocation (For OpenClaw Agent)

**NEW: Always-On Mode (Recommended)**

Configure this skill as the default handler for Discord channels in "Active Projects" category:

```python
# In OpenClaw agent configuration
from orchestrator import Orchestrator

orchestrator = Orchestrator()

# Handle ALL messages through conductor
result = orchestrator.handle_message(
    request=user_message,
    channel_id=discord_channel_id,
    channel_name=discord_channel_name
)
```

**Legacy: Explicit Invocation**

When this skill is invoked with a development request, execute the following:

1. **Extract the request** from the user's message (everything after "use claw-conductor to")

2. **Determine project name** from the request or generate one from keywords

3. **Execute the orchestrator** using Python:

   ```bash
   cd ~/.openclaw/skills/claw-conductor/scripts
   python3 -c "
   from orchestrator import Orchestrator
   import sys

   orchestrator = Orchestrator()

   request = '''[USER'S REQUEST HERE]'''
   project_name = '[PROJECT-NAME]'  # e.g., 'calculator-app', 'todo-app', 'blog-site'

   # Get GitHub user from config
   github_user = orchestrator.config.get('github_user')

   result = orchestrator.execute_request(
       request=request,
       project_name=project_name,
       github_user=github_user
   )

   # Report results back to Discord
   if result['success']:
       print(f\"✅ Project '{project_name}' completed successfully!\")
       print(f\"📦 {result['tasks_completed']} tasks completed\")
       if github_user:
           print(f\"🔗 GitHub: https://github.com/{github_user}/{project_name}\")
       print(f\"📁 Workspace: {result.get('workspace', '/root/projects/' + project_name)}\")
   else:
       print(f\"❌ Project failed: {result.get('error', 'Unknown error')}\")
       sys.exit(1)
   "
   ```

4. **Report progress** to Discord during execution:
   - Announce task decomposition results
   - Report task routing decisions
   - Update on parallel execution progress
   - Share final results with GitHub link

**Example Invocation:**
User says: `@OpenClaw use claw-conductor to build a calculator app`

You execute:

- Request: "build a calculator app"
- Project name: "calculator-app"
- Run orchestrator with these parameters

---

## What's New in v2.1

🤖 **AI-Powered Decomposition**: Intelligently analyzes complex requests using your best AI model (auto-selected or configured)
🎯 **Full Orchestration**: Decomposes complex requests → Routes subtasks → Executes in parallel → Consolidates results
⚡ **Parallel Execution**: Up to 5 tasks running concurrently across multiple projects
📁 **Project Management**: Automatic workspace creation, git initialization, and GitHub integration
🔗 **Dependency-Aware**: Respects task dependencies and file conflicts
📦 **Auto-Consolidation**: Merges results, runs tests, commits to git, pushes to GitHub

---

## Quick Start

### Installation

In OpenClaw:

```bash
cd ~/.openclaw/skills
git clone https://github.com/johnsonfarmsus/claw-conductor.git
cd claw-conductor
./scripts/setup.sh
```

### First-Time Setup

```bash
./scripts/setup.sh
```

This creates your personalized agent-registry.json with:

- Your AI model configurations
- Cost tracking (free vs paid)
- Capability ratings per model
- Routing preferences

### Usage

**Simple request:**

```
@OpenClaw use claw-conductor to build a calculator app
```

**Complex request:**

```
@OpenClaw use claw-conductor to build a towing dispatch system with:
- Customer portal for requesting service
- Driver dashboard for accepting jobs
- Admin panel for managing users
- Real-time location tracking
- Payment integration
```

---

## How It Works

### Complete Workflow

```
Discord Request
    ↓
1. Task Decomposition
   • Analyzes request complexity
   • Breaks into independent subtasks
   • Assigns category & complexity to each
   • Builds dependency graph
    ↓
2. Intelligent Routing
   • Scores each model for each task (0-100)
   • Routes to best match based on capabilities
   • Considers cost optimization
    ↓
3. Project Initialization
   • Creates /root/projects/{name}/
   • Initializes git repository
   • Creates GitHub repo (if configured)
   • Sets up workspace
    ↓
4. Parallel Execution
   • Spawns up to 5 tasks simultaneously
   • Respects dependencies (database before auth)
   • Avoids file conflicts (same files sequential)
   • Reports progress to Discord
    ↓
5. Result Consolidation
   • Merges all task outputs
   • Resolves file conflicts
   • Runs tests (if present)
   • Commits to git
   • Pushes to GitHub
    ↓
Discord Completion Report
```

### Example: Dispatch System

**Request:**

```
Build a towing dispatch system with customer portal,
driver dashboard, admin panel, and real-time tracking
```

**Decomposition:**

```
Task 1: Database schema (database-operations, complexity: 4)
Task 2: Authentication system (security-fixes, complexity: 4)
Task 3: Customer portal UI (frontend-development, complexity: 3)
Task 4: Driver dashboard UI (frontend-development, complexity: 3)
Task 5: Admin panel UI (frontend-development, complexity: 3)
Task 6: REST API endpoints (api-development, complexity: 3)
Task 7: Real-time tracking (performance-optimization, complexity: 5)
Task 8: Unit tests (unit-test-generation, complexity: 2)
```

**Routing:**

```
Task 1 → Mistral Devstral (score: 92, best for database)
Task 2 → Mistral Devstral (score: 88, security expert)
Task 3 → Mistral Devstral (score: 95, frontend expert)
Task 4 → Mistral Devstral (score: 95, frontend expert)
Task 5 → Mistral Devstral (score: 95, frontend expert)
Task 6 → Llama 3.3 70B (score: 87, API specialist)
Task 7 → Mistral Devstral (score: 78, fallback - needs Claude ideally)
Task 8 → Llama 3.3 70B (score: 95, test generation expert)
```

**Execution:**

```
Parallel execution plan:
Worker 1: Task 1 (Database) → Mistral
Worker 2: Task 3 (Customer UI) → Devstral
Worker 3: Task 4 (Driver UI) → Devstral
Worker 4: Task 5 (Admin UI) → Devstral
Worker 5: Task 6 (API) → Llama

After Task 1 completes:
Worker 1: Task 2 (Auth - depends on DB) → Mistral

After all code complete:
Worker 1: Task 8 (Tests) → Llama
```

**Result:**

```
✅ All 8 tasks completed in 47 minutes
📦 Committed to git with 8 changes
🔗 Pushed to GitHub repository
🎉 Project ready for deployment
```

---

## Scoring Algorithm

Each model is scored 0-100 for each task:

```python
score = (
    (rating / 5.0) * 50 +              # Model capability (0-50 pts)
    (1 - complexity/5.0) * 40 +        # Complexity fit (0-40 pts)
    (experience / 100) * 10 +          # Experience (0-10 pts)
    cost_factor * 10                   # Cost (0-10 pts)
)
```

**Hard Ceiling:** Models cannot handle tasks above their `max_complexity` rating.

### Scoring Example

**Task:** Backend API development (complexity: 4)

| Model            | Capability | Complexity Fit        | Experience     | Cost         | Total         |
| ---------------- | ---------- | --------------------- | -------------- | ------------ | ------------- |
| Mistral Devstral | 4★ (40pts) | Can handle 4 (40pts)  | 0 (0pts)       | Free (10pts) | **90/100**    |
| Llama 3.3 70B    | 4★ (40pts) | Can handle 4 (40pts)  | 2 tasks (2pts) | Free (10pts) | **92/100** ✅ |
| Perplexity       | N/A        | Cannot handle backend | -              | -            | **0/100**     |

Winner: **Llama 3.3 70B** (higher experience)

---

## Configuration

### Agent Registry Structure

`config/agent-registry.json`:

```json
{
  "version": "1.0.0",
  "user_config": {
    "cost_tracking_enabled": true,
    "prefer_free_when_equal": true,
    "max_parallel_tasks": 5,
    "default_complexity_if_unknown": 3,
    "fallback": {
      "enabled": true,
      "retry_delay_seconds": 2,
      "track_failures": true,
      "penalize_failures": true,
      "failure_penalty_points": 5
    }
  },
  "agents": {
    "mistral-devstral-2512": {
      "model_id": "mistral/devstral-2512",
      "provider": "mistral",
      "context_window": 256000,
      "enabled": true,
      "user_cost": {
        "type": "free-tier",
        "input_cost_per_million": 0,
        "output_cost_per_million": 0
      },
      "capabilities": {
        "frontend-development": {
          "rating": 5,
          "max_complexity": 5,
          "notes": "Expert - near-parity with Claude"
        },
        "multi-file-refactoring": {
          "rating": 5,
          "max_complexity": 5,
          "notes": "Expert - designed for 50+ file changes"
        }
      }
    }
  }
}
```

### Fallback Strategy

Conservative fallback (user-configurable):

1. Try primary model (attempt 1)
2. Try primary model (attempt 2)
3. If both fail → Try first runner-up (attempt 3)
4. Try first runner-up (attempt 4)
5. If all fail → Give up, report to Discord

**Why conservative?**
Prevents cascading through irrelevant models that may not have capability for the task.

---

## Task Categories (23 Standard)

- code-generation-new-features
- bug-detection-fixes
- multi-file-refactoring
- unit-test-generation
- debugging-complex-issues
- api-development
- security-vulnerability-detection
- security-fixes
- documentation-generation
- code-review
- frontend-development
- backend-development
- database-operations
- codebase-exploration
- dependency-management
- legacy-modernization
- error-correction
- performance-optimization
- test-coverage-analysis
- algorithm-implementation
- boilerplate-generation

---

## Advanced Features

### Multi-Project Support

Handle concurrent requests across different projects:

```
Project A: Dispatch System (3 tasks running)
Project B: Calculator App (2 tasks running)
────────────────────────────────────────────
Total: 5 concurrent tasks (at global limit)
```

### File Conflict Detection

Tasks touching the same files run sequentially:

```
Task 1: Modify src/api/users.js → Running
Task 2: Modify src/api/users.js → Queued (waits for Task 1)
Task 3: Modify src/ui/dashboard.js → Running (independent)
```

### Dependency-Aware Scheduling

```
Task 1: Database schema → No deps, starts immediately
Task 2: Auth system → Depends on Task 1, waits
Task 3: Frontend UI → Depends on Task 2, waits
Task 4: Tests → Depends on all, runs last
```

### Auto-Consolidation

After all tasks complete:

1. Check git status for conflicts
2. Run tests (pytest, npm test, etc.)
3. Commit with conventional commit message
4. Push to GitHub (if configured)
5. Report to Discord

---

## Examples

### Simple Calculator

```
@OpenClaw use claw-conductor to build a calculator with:
- Basic operations (add, subtract, multiply, divide)
- Clean UI
- Unit tests
```

**Result:**

- 3 tasks (UI, logic, tests)
- Completed in ~8 minutes
- Pushed to GitHub

### Towing Dispatch System

```
@OpenClaw use claw-conductor to build a dispatch system with:
- Customer portal
- Driver dashboard
- Admin panel
- Real-time tracking
- Payment integration
```

**Result:**

- 8 tasks across 3 models
- Completed in ~45 minutes
- Full working application

### API with Documentation

```
@OpenClaw use claw-conductor to create a REST API for a blog with:
- CRUD operations for posts
- Authentication
- Swagger documentation
- Integration tests
```

**Result:**

- 5 tasks (schema, auth, endpoints, docs, tests)
- Completed in ~20 minutes
- API-first design

---

## Troubleshooting

### Task Decomposition Issues

**Problem:** Request not decomposed correctly
**Solution:** Be specific in request. Include keywords: "database", "API", "frontend", "tests"

### Model Selection Issues

**Problem:** Wrong model chosen for task
**Solution:** Adjust capability ratings in `agent-registry.json`

### Execution Failures

**Problem:** Task fails with error
**Solution:** Fallback tries primary 2x, runner-up 2x. Check error logs in `.claw-conductor/execution-log.json`

### Git Conflicts

**Problem:** Consolidation fails due to conflicts
**Solution:** Currently requires manual resolution. Future: AI-powered conflict resolution

---

## Roadmap

- [x] Task decomposition (v2.0)
- [x] Parallel execution (v2.0)
- [x] Multi-project support (v2.0)
- [x] Auto-consolidation (v2.0)
- [ ] AI-powered decomposition (v2.1)
- [ ] Discord progress updates (v2.1)
- [ ] Conflict resolution with AI (v2.2)
- [ ] Real-time task streaming (v2.2)
- [ ] Web dashboard (v3.0)

---

## License

GNU AGPL v3 - See LICENSE file

Copyleft license requiring server-side source availability.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Published on ClawHub.ai: https://clawhub.ai/skills/claw-conductor

---

_Built with ❤️ by the Claw Conductor team_
