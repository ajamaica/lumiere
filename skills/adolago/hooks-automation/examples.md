# Hooks Automation Examples

Practical workflow examples for hooks automation.

## Basic Hook Usage

```bash
# Pre-task hook (auto-spawns agents)
npx claude-flow hook pre-task --description "Implement authentication"

# Post-edit hook (auto-formats and stores in memory)
npx claude-flow hook post-edit --file "src/auth.js" --memory-key "auth/login"

# Session end hook (saves state and metrics)
npx claude-flow hook session-end --session-id "dev-session" --export-metrics
```

## Full-Stack Development Workflow

```bash
# Session start - initialize coordination
npx claude-flow hook session-start --session-id "fullstack-feature"

# Pre-task planning
npx claude-flow hook pre-task \
  --description "Build user profile feature - frontend + backend + tests" \
  --auto-spawn-agents \
  --optimize-topology

# Backend work
npx claude-flow hook pre-edit --file "api/profile.js"
# ... implement backend ...
npx claude-flow hook post-edit \
  --file "api/profile.js" \
  --memory-key "profile/backend" \
  --train-patterns

# Frontend work (reads backend details from memory)
npx claude-flow hook pre-edit --file "components/Profile.jsx"
# ... implement frontend ...
npx claude-flow hook post-edit \
  --file "components/Profile.jsx" \
  --memory-key "profile/frontend" \
  --train-patterns

# Testing (reads both backend and frontend from memory)
npx claude-flow hook pre-task \
  --description "Test profile feature" \
  --load-memory

# Session end - export everything
npx claude-flow hook session-end \
  --session-id "fullstack-feature" \
  --export-metrics \
  --generate-summary
```

## Debugging with Hooks

```bash
# Start debugging session
npx claude-flow hook session-start --session-id "debug-memory-leak"

# Pre-task: analyze issue
npx claude-flow hook pre-task \
  --description "Debug memory leak in event handlers" \
  --load-memory \
  --estimate-complexity

# Search for event emitters
npx claude-flow hook pre-search --query "EventEmitter"
# ... search executes ...
npx claude-flow hook post-search \
  --query "EventEmitter" \
  --cache-results

# Fix the issue
npx claude-flow hook pre-edit \
  --file "services/events.js" \
  --backup-file
# ... fix code ...
npx claude-flow hook post-edit \
  --file "services/events.js" \
  --memory-key "debug/memory-leak-fix" \
  --validate-output

# Verify fix
npx claude-flow hook post-task \
  --task-id "memory-leak-fix" \
  --analyze-performance \
  --generate-report

# End session
npx claude-flow hook session-end \
  --session-id "debug-memory-leak" \
  --export-metrics
```

## Multi-Agent Refactoring

```bash
# Initialize swarm for refactoring
npx claude-flow hook pre-task \
  --description "Refactor legacy codebase to modern patterns" \
  --auto-spawn-agents \
  --optimize-topology

# Agent 1: Code Analyzer
npx claude-flow hook pre-task --description "Analyze code complexity"
# ... analysis ...
npx claude-flow hook post-task \
  --task-id "analysis" \
  --store-decisions

# Agent 2: Refactoring (reads analysis from memory)
npx claude-flow hook session-restore \
  --session-id "swarm-refactor" \
  --restore-memory

for file in src/**/*.js; do
  npx claude-flow hook pre-edit --file "$file" --backup-file
  # ... refactor ...
  npx claude-flow hook post-edit \
    --file "$file" \
    --memory-key "refactor/$file" \
    --auto-format \
    --train-patterns
done

# Agent 3: Testing (reads refactored code from memory)
npx claude-flow hook pre-task \
  --description "Generate tests for refactored code" \
  --load-memory

# Broadcast completion
npx claude-flow hook notify \
  --message "Refactoring complete - all tests passing" \
  --broadcast
```

## Agent Coordination Workflow

### Agent 1: Backend Developer

```bash
# STEP 1: Pre-task preparation
npx claude-flow hook pre-task \
  --description "Implement user authentication API" \
  --auto-spawn-agents \
  --load-memory

# STEP 2: Work begins - pre-edit validation
npx claude-flow hook pre-edit \
  --file "api/auth.js" \
  --auto-assign-agent \
  --validate-syntax

# STEP 3: Edit file (via Claude Code Edit tool)
# ... code changes ...

# STEP 4: Post-edit processing
npx claude-flow hook post-edit \
  --file "api/auth.js" \
  --memory-key "swarm/backend/auth-api" \
  --auto-format \
  --train-patterns

# STEP 5: Notify coordination system
npx claude-flow hook notify \
  --message "Auth API implementation complete" \
  --swarm-status \
  --broadcast

# STEP 6: Task completion
npx claude-flow hook post-task \
  --task-id "auth-api" \
  --analyze-performance \
  --store-decisions \
  --export-learnings
```

### Agent 2: Test Engineer (receives notification)

```bash
# STEP 1: Check memory for API details
npx claude-flow hook session-restore \
  --session-id "swarm-current" \
  --restore-memory

# Memory contains: swarm/backend/auth-api with implementation details

# STEP 2: Generate tests
npx claude-flow hook pre-task \
  --description "Write tests for auth API" \
  --load-memory

# STEP 3: Create test file
npx claude-flow hook post-edit \
  --file "api/auth.test.js" \
  --memory-key "swarm/testing/auth-api-tests" \
  --train-patterns

# STEP 4: Share test results
npx claude-flow hook notify \
  --message "Auth API tests complete - 100% coverage" \
  --broadcast
```

## Git Integration

### Pre-Commit Hook

```bash
#!/bin/bash
# Add to .git/hooks/pre-commit or use husky

# Get staged files
FILES=$(git diff --cached --name-only --diff-filter=ACM)

for FILE in $FILES; do
  # Run pre-edit hook for validation
  npx claude-flow hook pre-edit --file "$FILE" --validate-syntax

  if [ $? -ne 0 ]; then
    echo "Validation failed for $FILE"
    exit 1
  fi

  # Run post-edit hook for formatting
  npx claude-flow hook post-edit --file "$FILE" --auto-format
done

# Run tests
npm test

exit $?
```

### Post-Commit Hook

```bash
#!/bin/bash
# Add to .git/hooks/post-commit

COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)

npx claude-flow hook notify \
  --message "Commit completed: $COMMIT_MSG" \
  --level info \
  --swarm-status
```

### Pre-Push Hook

```bash
#!/bin/bash
# Add to .git/hooks/pre-push

# Run full test suite
npm run test:all

# Run quality checks
npx claude-flow hook session-end \
  --generate-report \
  --export-metrics

# Verify quality thresholds
TRUTH_SCORE=$(npx claude-flow metrics score --format json | jq -r '.truth_score')

if (( $(echo "$TRUTH_SCORE < 0.95" | bc -l) )); then
  echo "Truth score below threshold: $TRUTH_SCORE < 0.95"
  exit 1
fi

exit 0
```

## Custom Hook Creation

### Custom Hook Template

```javascript
// .claude/hooks/custom-quality-check.js

module.exports = {
  name: 'custom-quality-check',
  type: 'pre',
  matcher: /\.(ts|js)$/,

  async execute(context) {
    const { file, content } = context

    // Custom validation logic
    const complexity = await analyzeComplexity(content)
    const securityIssues = await scanSecurity(content)

    // Store in memory
    await storeInMemory({
      key: `quality/${file}`,
      value: { complexity, securityIssues },
    })

    // Return decision
    if (complexity > 15 || securityIssues.length > 0) {
      return {
        continue: false,
        reason: 'Quality checks failed',
        warnings: [
          `Complexity: ${complexity} (max: 15)`,
          `Security issues: ${securityIssues.length}`,
        ],
      }
    }

    return {
      continue: true,
      reason: 'Quality checks passed',
      metadata: { complexity, securityIssues: 0 },
    }
  },
}
```

### Register Custom Hook

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Write|Edit)$",
        "hooks": [
          {
            "type": "script",
            "script": ".claude/hooks/custom-quality-check.js"
          }
        ]
      }
    ]
  }
}
```
