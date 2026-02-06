# GLM Coding Agent

Free coding assistant using Claude Code CLI with GLM 4.7 (200k context, $0 cost).

## Quick Start

```bash
# One command setup
bash -c "$(curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw/main/skills/glm-coding-agent/install.sh)"

# Or manual:
mkdir -p ~/clawd/scripts
cat > ~/clawd/scripts/glmcode.sh << 'EOF'
#!/bin/bash
export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
export ANTHROPIC_AUTH_TOKEN="YOUR_TOKEN_HERE"
export API_TIMEOUT_MS=3000000
exec claude --settings ~/.claude/settings-glm.json "$@"
EOF
chmod +x ~/clawd/scripts/glmcode.sh
```

## Usage

```bash
# From OpenClaw
bash pty:true workdir:~/project command:"~/clawd/scripts/glmcode.sh 'Your task'"

# Or via sub-agent
sessions_spawn({ task: "Build todo API", model: "zai/glm-4.7" })
```

See [SKILL.md](SKILL.md) for full docs.

## Why?

- ✅ Free (0 cost)
- ✅ 200k context
- ✅ Fast
- ✅ Works with Claude Code CLI

Perfect for refactoring, bug fixes, docs, and simple features!
