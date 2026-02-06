# Hooks Configuration Reference

Detailed configuration options for hooks automation.

## Basic Configuration

Edit `.claude/settings.json` to configure hooks:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook pre-edit --file '${tool.params.file_path}'"
          }
        ]
      },
      {
        "matcher": "^Bash$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook pre-bash --command '${tool.params.command}'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook post-edit --file '${tool.params.file_path}' --auto-format --train-patterns"
          }
        ]
      },
      {
        "matcher": "^Bash$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook post-bash --command '${tool.params.command}' --update-metrics"
          }
        ]
      }
    ]
  }
}
```

## Advanced Configuration

Complete hook configuration with all features:

```json
{
  "hooks": {
    "enabled": true,
    "debug": false,
    "timeout": 5000,

    "PreToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook pre-edit --file '${tool.params.file_path}' --auto-assign-agent --validate-syntax",
            "timeout": 3000,
            "continueOnError": true
          }
        ]
      },
      {
        "matcher": "^Task$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook pre-task --description '${tool.params.task}' --auto-spawn-agents --load-memory",
            "async": true
          }
        ]
      },
      {
        "matcher": "^Grep$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook pre-search --query '${tool.params.pattern}' --check-cache"
          }
        ]
      }
    ],

    "PostToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook post-edit --file '${tool.params.file_path}' --memory-key 'edits/${tool.params.file_path}' --auto-format --train-patterns",
            "async": true
          }
        ]
      },
      {
        "matcher": "^Task$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook post-task --task-id '${result.task_id}' --analyze-performance --store-decisions",
            "async": true
          }
        ]
      },
      {
        "matcher": "^Grep$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook post-search --query '${tool.params.pattern}' --cache-results --train-patterns"
          }
        ]
      }
    ],

    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook session-start --session-id '${session.id}' --load-context"
          }
        ]
      }
    ],

    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook session-end --session-id '${session.id}' --export-metrics --generate-summary"
          }
        ]
      }
    ]
  }
}
```

## Protected File Patterns

Add protection for sensitive files:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook check-protected --file '${tool.params.file_path}'"
          }
        ]
      }
    ]
  }
}
```

## Automatic Testing

Run tests after file modifications:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "^Write$",
        "hooks": [
          {
            "type": "command",
            "command": "test -f '${tool.params.file_path%.js}.test.js' && npm test '${tool.params.file_path%.js}.test.js'",
            "continueOnError": true
          }
        ]
      }
    ]
  }
}
```

## Hook Response Formats

### Continue Response

```json
{
  "continue": true,
  "reason": "All validations passed",
  "metadata": {
    "agent_assigned": "backend-dev",
    "syntax_valid": true,
    "file": "src/auth.js"
  }
}
```

### Block Response

```json
{
  "continue": false,
  "reason": "Protected file - manual review required",
  "metadata": {
    "file": ".env.production",
    "protection_level": "high",
    "requires": "manual_approval"
  }
}
```

### Warning Response

```json
{
  "continue": true,
  "reason": "Syntax valid but complexity high",
  "warnings": [
    "Cyclomatic complexity: 15 (threshold: 10)",
    "Consider refactoring for better maintainability"
  ],
  "metadata": {
    "complexity": 15,
    "threshold": 10
  }
}
```

## Memory Coordination Protocol

All hooks follow a three-phase memory protocol:

### Phase 1: STATUS - Hook starts

```javascript
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/hooks/pre-edit/status",
  namespace: "coordination",
  value: JSON.stringify({
    status: "running",
    hook: "pre-edit",
    file: "src/auth.js",
    timestamp: Date.now()
  })
}
```

### Phase 2: PROGRESS - Hook processes

```javascript
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/hooks/pre-edit/progress",
  namespace: "coordination",
  value: JSON.stringify({
    progress: 50,
    action: "validating syntax",
    file: "src/auth.js"
  })
}
```

### Phase 3: COMPLETE - Hook finishes

```javascript
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/hooks/pre-edit/complete",
  namespace: "coordination",
  value: JSON.stringify({
    status: "complete",
    result: "success",
    agent_assigned: "backend-dev",
    syntax_valid: true
  })
}
```

## MCP Tool Integration

### Pre-Task Hook with Agent Spawning

```javascript
// Hook command
npx claude-flow hook pre-task --description "Build REST API"

// Internally calls MCP tools:
mcp__claude-flow__agent_spawn {
  type: "backend-dev",
  capabilities: ["api", "database", "testing"]
}

mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/task/api-build/context",
  namespace: "coordination",
  value: JSON.stringify({
    description: "Build REST API",
    agents: ["backend-dev"],
    started: Date.now()
  })
}
```

### Post-Edit Hook with Memory Storage

```javascript
// Hook command
npx claude-flow hook post-edit --file "api/auth.js"

// Internally calls MCP tools:
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/edits/api/auth.js",
  namespace: "coordination",
  value: JSON.stringify({
    file: "api/auth.js",
    timestamp: Date.now(),
    changes: { added: 45, removed: 12 },
    formatted: true
  })
}

mcp__claude-flow__neural_train {
  pattern_type: "coordination",
  training_data: { /* edit patterns */ }
}
```

## Performance Tips

1. **Keep Hooks Lightweight** - Target < 100ms execution time
2. **Use Async for Heavy Operations** - Don't block the main flow
3. **Cache Aggressively** - Store frequently accessed data
4. **Batch Related Operations** - Combine multiple actions
5. **Use Memory Wisely** - Set appropriate TTLs
6. **Monitor Hook Performance** - Track execution times
7. **Parallelize When Possible** - Run independent hooks concurrently

## Debugging

```bash
# Enable debug output
export CLAUDE_FLOW_DEBUG=true

# Test specific hook with verbose output
npx claude-flow hook pre-edit --file "test.js" --debug

# Check hook execution logs
cat .claude-flow/logs/hooks-$(date +%Y-%m-%d).log

# Validate configuration
npx claude-flow hook validate-config
```

## Troubleshooting

### Hooks Not Executing

- Verify `.claude/settings.json` syntax
- Check hook matcher patterns
- Enable debug mode
- Review permission settings
- Ensure claude-flow CLI is in PATH

### Hook Timeouts

- Increase timeout values in configuration
- Make hooks asynchronous for heavy operations
- Optimize hook logic
- Check network connectivity for MCP tools

### Memory Issues

- Set appropriate TTLs for memory keys
- Clean up old memory entries
- Use memory namespaces effectively
- Monitor memory usage

### Performance Problems

- Profile hook execution times
- Use caching for repeated operations
- Batch operations when possible
- Reduce hook complexity
