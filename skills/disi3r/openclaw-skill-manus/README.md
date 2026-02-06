# Manus AI Skill for Clawdbot

🧠 **Autonomous AI agent skill with web access, research, development, and automation capabilities**

[![Clawdbot Skill](https://img.shields.io/badge/Clawdbot-Skill-blue)](https://clawhub.com/skills/manus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Manus AI is an autonomous AI agent capable of executing complex tasks, researching, developing software, automating workflows, and generating multimedia content.

This skill provides full integration with Manus API for Clawdbot/OpenClaw agents.

## Features

- 🧠 **Autonomous Tasks** - Complex task execution with progress tracking
- 🔍 **Research** - Web search, data analysis, and information synthesis
- 💻 **Development** - Build websites, apps, and software solutions
- 🎨 **Media Generation** - Images, videos, audio from text descriptions
- 🔄 **Workflow Automation** - Bookings, data collection, scheduled tasks
- 📊 **Data Integrations** - Similarweb, premium data sources
- 🔗 **Connectors** - Gmail, Notion, Google Calendar, Slack

## Installation

### Via Clawdbot (recommended)

```bash
clawdbot skills install manus
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/disier/clawdbot-skill-manus.git
cd clawdbot-skill-manus

# Install dependencies
npm install
```

## Configuration

### API Key

Set your Manus API key:

```bash
export MANUS_API_KEY="sk-..."
```

Or in `~/.clawdbot/clawdbot.json`:

```json
{
  "skills": {
    "manus": {
      "apiKey": "sk-..."
    }
  }
}
```

Get your API key at: [manus.im/app](https://manus.im/app)

## Usage

### Basic Task

```bash
cd scripts
python3 run_task.py "Research the latest AI regulations in the EU"
```

### With Connectors

```bash
# Gmail
python3 run_task.py "Read my recent emails and summarize"

# Notion
python3 run_task.py "Create a project page in Notion"

# Google Calendar
python3 run_task.py "Schedule a meeting for tomorrow at 3pm"

# Slack
python3 run_task.py "Post an update to #announcements"
```

### File Upload

```bash
# Upload context file
python3 upload_file.py context.md

# Use with task
python3 run_task.py "Analyze this data and create a report"
```

### Check Status

```bash
python3 check_status.py TASK_ID
```

### Get Results

```bash
python3 get_result.py TASK_ID
```

### Webhook Server

```bash
# Start webhook server on port 8080
python3 webhook_server.py 8080

# Register webhook with Manus
python3 webhook_server.py 8080 --register --url https://your-domain.com/webhook/manus
```

## Scripts

| Script              | Description                           |
| ------------------- | ------------------------------------- |
| `run_task.py`       | Execute a task with progress tracking |
| `create_project.py` | Create a project                      |
| `upload_file.py`    | Upload files for context              |
| `check_status.py`   | Check task status                     |
| `get_result.py`     | Get task result                       |
| `webhook_server.py` | Real-time notifications server        |

## Integration with Clawdbot

### In an Agent

```markdown
When deep research or development is needed:

1. Use the run_task.py script from manus skill
2. Provide clear prompt
3. Wait for completion
4. Integrate results
```

### Example

```bash
# Research and create content
python3 run_task.py "Research 5 tech trends for 2026 and write a 1000-word article"

# With context
python3 upload_file.py data.csv
python3 run_task.py "Analyze this CSV and generate a sales report"
```

## OpenAI Compatibility

Manus is compatible with the OpenAI SDK:

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-...",  # Your Manus API key
    base_url="https://api.manus.ai/v1"
)

response = client.chat.completions.create(
    model="manus-1.6-adaptive",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## API Reference

### Endpoints

| Endpoint             | Description            |
| -------------------- | ---------------------- |
| `POST /v1/tasks`     | Create a new task      |
| `GET /v1/tasks/{id}` | Get task status/result |
| `POST /v1/projects`  | Create a project       |
| `POST /v1/files`     | Upload files           |
| `POST /v1/webhooks`  | Register webhooks      |

### Models

- `manus-1.6-adaptive` (default)
- `manus-1.5-pro`

## Best Practices

### Effective Prompts

**✅ Good:**

- "Research AI regulations in the EU and summarize key points"
- "Create a weather web app with React and OpenWeatherMap"
- "Analyze the last 10 tweets from an account"

**❌ Avoid:**

- "Do something useful" (too vague)
- "Improve this" (no context)

### Large Tasks

For long-running tasks:

```bash
python3 run_task.py "Deep research on AI market" --timeout 300
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [GitHub Issues](https://github.com/disier/clawdbot-skill-manus/issues)
- [ClawHub](https://clawhub.com/skills/manus)
- [Discord Community](https://discord.com/invite/clawd)

---

**Built with ❤️ by [DisierTECH](https://disier.tech)**
