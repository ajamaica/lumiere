# Claw Conductor - Setup Guide

This guide walks you through setting up Claw Conductor for your environment.

## Prerequisites

- OpenClaw server installed
- Python 3.8+
- Git configured
- GitHub CLI (`gh`) installed (optional, for automatic GitHub repo creation)

---

## Installation

### 1. Clone the Repository

```bash
cd ~/.openclaw/skills
git clone https://github.com/johnsonfarmsus/claw-conductor.git
cd claw-conductor
```

### 2. Run Setup Wizard

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup wizard will:

- Detect your configured OpenClaw models
- Ask about cost structure (free vs paid tiers)
- Create your personalized `config/agent-registry.json`
- Set routing preferences

### 3. Configure GitHub User (REQUIRED)

Edit `config/agent-registry.json` and set your GitHub username:

```json
{
  "user_config": {
    "github_user": "YOUR_GITHUB_USERNAME",
    "cost_tracking_enabled": true,
    "prefer_free_when_equal": true,
    "max_parallel_tasks": 5,
    ...
  }
}
```

**Important:** Replace `"YOUR_GITHUB_USERNAME"` with your actual GitHub username. This is where created projects will be pushed.

---

## Configuration Reference

### Required Settings

| Setting              | Description                       | Example           |
| -------------------- | --------------------------------- | ----------------- |
| `github_user`        | GitHub username for project repos | `"your-username"` |
| `max_parallel_tasks` | Maximum concurrent tasks (1-5)    | `5`               |

### Optional Settings

| Setting                         | Description                                               | Default |
| ------------------------------- | --------------------------------------------------------- | ------- |
| `decomposition_model`           | AI model for task decomposition (null = auto-select best) | `null`  |
| `cost_tracking_enabled`         | Track API costs                                           | `true`  |
| `prefer_free_when_equal`        | Prefer free models when capabilities equal                | `true`  |
| `default_complexity_if_unknown` | Default task complexity (1-5)                             | `3`     |

**About `decomposition_model`:**

- Set to `null` (recommended): Automatically selects the highest-rated model from your registry
- Set to specific model ID (e.g., `"mistral-devstral-2512"`): Forces that model for decomposition
- Auto-selection scores models based on code-generation, codebase-exploration, and documentation capabilities
- Falls back to second-best model on failure

### Fallback Configuration

```json
"fallback": {
  "enabled": true,
  "retry_delay_seconds": 2,
  "track_failures": true,
  "penalize_failures": true,
  "failure_penalty_points": 5
}
```

---

## Model Configuration

### Adding Models

Use the capability management script:

```bash
python3 scripts/update-capability.py \
  --agent your-model-id \
  --category frontend-development \
  --rating 5 \
  --max-complexity 5
```

### Model Profiles

Pre-configured profiles available in `config/defaults/`:

- `mistral-devstral-2512.json` - Multi-file refactoring, frontend
- `llama-3.3-70b.json` - Unit tests, algorithms
- `perplexity-sonar.json` - Research, documentation
- `claude-sonnet-4.5.json` - Complex architecture
- `gpt-4-turbo.json` - General purpose

### Example Model Configuration

```json
{
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
        }
      }
    }
  }
}
```

---

## Project Workspace Configuration

By default, projects are created in `/root/projects/{project-name}/`.

To customize the workspace root, modify the `ProjectManager` initialization in `scripts/orchestrator.py`:

```python
self.project_manager = ProjectManager(projects_root="/your/custom/path")
```

---

## GitHub Integration

### Option 1: GitHub CLI (Recommended)

Install and authenticate GitHub CLI:

```bash
# Install gh CLI
# macOS
brew install gh

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Authenticate
gh auth login
```

### Option 2: Manual Git Setup

If not using `gh` CLI, projects will still be created with git initialization. You can manually:

```bash
cd /root/projects/your-project
git remote add origin https://github.com/{your-user}/{project-name}.git
git push -u origin main
```

---

## Verification

### Test Task Decomposition

```bash
cd scripts
python3 -c "
from decomposer import Decomposer

decomposer = Decomposer('../config/agent-registry.json')
tasks = decomposer.decompose('Build a calculator app')

for task in tasks:
    print(f'{task[\"task_id\"]}: {task[\"description\"]}')
"
```

### Test Routing

```bash
python3 -c "
from router import Router, Task

router = Router('../config/agent-registry.json')
task = Task('Build frontend UI', 'frontend-development', 3)
model_id, details = router.route_task(task)

print(f'Assigned to: {model_id}')
"
```

### Test Full Orchestration

```bash
python3 orchestrator.py
```

This runs a test calculator app build.

---

## Security Best Practices

### 1. Protect Your Configuration

Add `config/agent-registry.json` to `.gitignore` (already done):

```gitignore
# User-specific configuration
config/agent-registry.json
```

### 2. Never Commit Sensitive Data

The following should NEVER be committed to version control:

- API keys or tokens
- Personal GitHub usernames in examples
- Server IP addresses
- Private workspace paths

### 3. Use Environment Variables

For additional security, consider using environment variables:

```bash
export GITHUB_USER="your-username"
```

Then reference in code:

```python
import os
github_user = os.environ.get('GITHUB_USER', orchestrator.config.get('github_user'))
```

---

## Troubleshooting

### "GitHub CLI not found"

Install `gh` CLI or set `github_user=None` in execute_request() calls to skip GitHub repo creation.

### "No module named 'router'"

Ensure you're running scripts from the `scripts/` directory or adjust `sys.path`.

### "Permission denied" on git push

Verify GitHub authentication:

```bash
gh auth status
ssh -T git@github.com  # For SSH
```

### Tasks failing with "No capable model"

Check your `agent-registry.json`:

1. Verify models are `"enabled": true`
2. Check capability ratings match task categories
3. Ensure `max_complexity` allows the task complexity

---

## Next Steps

1. **Customize Models:** Add your AI models to `config/agent-registry.json`
2. **Test Locally:** Run `python3 scripts/orchestrator.py`
3. **Integrate with OpenClaw:** Skill is auto-discovered via `SKILL.md`
4. **Test from Discord:** Post `@OpenClaw use claw-conductor to build a test app`

---

## Support

- **Issues:** [GitHub Issues](https://github.com/johnsonfarmsus/claw-conductor/issues)
- **Documentation:** [README.md](README.md)
- **Examples:** [examples/](examples/)

---

**Setup complete!** 🎉

Run your first project:

```
@OpenClaw use claw-conductor to build a simple calculator
```
