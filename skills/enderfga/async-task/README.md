# OpenClaw Async Task

> Execute long-running tasks without HTTP timeouts

When AI agents execute commands that take more than a few seconds, HTTP connections often timeout, resulting in `empty response from server` errors. This tool solves that problem.

## How It Works

```
User: "Analyze this large codebase"

AI Agent:
  1. async-task start "Analyzing codebase..."  → Returns immediately ✓
  2. <runs actual analysis>
  3. async-task done "Found 150 issues"        → Pushes to user ✓
```

## Installation

```bash
npm install -g openclaw-async-task
```

Or manually:

```bash
git clone https://github.com/Enderfga/openclaw-async-task.git
chmod +x openclaw-async-task/async-task.js
ln -s $(pwd)/openclaw-async-task/async-task.js /usr/local/bin/async-task
```

## Usage

```bash
# Start a task (returns immediately)
async-task start "Processing data..."

# Complete with result (pushes to active session)
async-task done "Processed 1,234 records successfully"

# Or report failure
async-task fail "Connection timeout after 3 retries"

# Direct push (no start needed)
async-task push "Quick update: 50% complete"

# Check status
async-task status
```

## Zero Configuration

Works out of the box with OpenClaw/Clawdbot:

- Automatically detects CLI (`openclaw` or `clawdbot`)
- Automatically finds active session
- Uses native `sessions send` to push messages

## Advanced: Custom Endpoint

For custom webchat implementations:

```bash
export ASYNC_TASK_PUSH_URL="https://your-server.com/api/push"
export ASYNC_TASK_AUTH_TOKEN="your-auth-token"
```

Expected endpoint interface:

```http
POST /api/push
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "abc123",
  "content": "Your message",
  "role": "assistant"
}
```

## As a Clawdbot/OpenClaw Skill

This package includes `SKILL.md` for automatic skill discovery. The AI learns when and how to use async tasks.

## License

MIT
