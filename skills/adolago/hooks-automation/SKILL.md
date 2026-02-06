---
name: Hooks Automation
description: Automated coordination, formatting, and learning from Claude Code operations using intelligent hooks with MCP integration. Includes pre/post task hooks, session management, Git integration, memory coordination, and neural pattern training for enhanced development workflows.
version: 1.0.0
author: Artur
tags: [automation, hooks, development, johny]
---

# Hooks Automation

Intelligent automation system that coordinates, validates, and learns from Claude Code operations through hooks integrated with MCP tools and neural pattern training.

## References

- `configuration.md` - Detailed configuration options and settings
- `examples.md` - Workflow examples (full-stack, debugging, multi-agent)

## Quick Start

```bash
# Initialize hooks system
npx claude-flow init --hooks

# Pre-task hook (auto-spawns agents)
npx claude-flow hook pre-task --description "Implement authentication"

# Post-edit hook (auto-formats and stores in memory)
npx claude-flow hook post-edit --file "src/auth.js" --memory-key "auth/login"

# Session end hook (saves state and metrics)
npx claude-flow hook session-end --session-id "dev-session" --export-metrics
```

## Prerequisites

**Required:**

- Claude Flow CLI (`npm install -g claude-flow@alpha`)
- Claude Code with hooks enabled
- `.claude/settings.json` with hook configurations

**Optional:**

- MCP servers (claude-flow, ruv-swarm, flow-nexus)
- Git repository
- Testing framework

## Available Hooks

### Pre-Operation Hooks

| Hook         | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| `pre-edit`   | Validate and assign agents before file modifications |
| `pre-bash`   | Check command safety and resource requirements       |
| `pre-task`   | Auto-spawn agents and prepare for complex tasks      |
| `pre-search` | Prepare and optimize search operations               |

**Options:**

- `--auto-assign-agent` - Assign best agent based on file type
- `--validate-syntax` - Pre-validate syntax
- `--backup-file` - Create backup before editing
- `--check-conflicts` - Check for merge conflicts

### Post-Operation Hooks

| Hook          | Purpose                                   |
| ------------- | ----------------------------------------- |
| `post-edit`   | Auto-format, validate, and update memory  |
| `post-bash`   | Log execution and update metrics          |
| `post-task`   | Performance analysis and decision storage |
| `post-search` | Cache results and improve patterns        |

**Options:**

- `--auto-format` - Language-specific formatting
- `--memory-key <key>` - Store context in memory
- `--train-patterns` - Train neural patterns
- `--analyze-performance` - Generate metrics

### Session Hooks

| Hook              | Purpose                                |
| ----------------- | -------------------------------------- |
| `session-start`   | Initialize new session                 |
| `session-restore` | Load previous session state            |
| `session-end`     | Cleanup and persist state              |
| `notify`          | Custom notifications with swarm status |

### MCP Integration Hooks

| Hook                | Purpose                        |
| ------------------- | ------------------------------ |
| `mcp-initialized`   | Persist swarm configuration    |
| `agent-spawned`     | Update agent roster and memory |
| `task-orchestrated` | Monitor task progress          |
| `neural-trained`    | Save pattern improvements      |

### Memory Coordination Hooks

| Hook           | Purpose                                |
| -------------- | -------------------------------------- |
| `memory-write` | Triggered when agents write to memory  |
| `memory-read`  | Triggered when agents read from memory |
| `memory-sync`  | Synchronize memory across agents       |

## Key Capabilities

- **Pre-Operation Hooks**: Validate, prepare, auto-assign agents
- **Post-Operation Hooks**: Format, analyze, train patterns
- **Session Management**: Persist state, restore context
- **Memory Coordination**: Sync knowledge across agents
- **Git Integration**: Automated commit hooks with verification
- **Neural Training**: Learn from successful patterns

## Benefits

- Automatic agent assignment for file types
- Consistent code formatting (Prettier, Black, gofmt)
- Continuous learning via neural patterns
- Cross-session memory persistence
- Performance tracking and metrics
- Smart agent spawning based on task analysis
- Quality gates for pre-commit validation

## Best Practices

1. Configure hooks during project initialization
2. Use clear memory key namespaces
3. Enable auto-formatting for consistency
4. Train patterns continuously
5. Monitor hook execution times
6. Set appropriate timeouts
7. Handle errors gracefully with `continueOnError`

## Related Commands

```bash
npx claude-flow init --hooks        # Initialize hooks
npx claude-flow hook --list         # List available hooks
npx claude-flow hook --test <hook>  # Test specific hook
npx claude-flow memory usage        # Manage memory
npx claude-flow agent spawn         # Spawn agents
```

## Integration

Works with:

- SPARC Methodology
- Pair Programming
- Verification Quality
- GitHub Workflows
- Performance Analysis
- Swarm Advanced
