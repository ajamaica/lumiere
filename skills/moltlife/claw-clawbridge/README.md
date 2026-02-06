# claw-clawbridge

> OpenClaw skill for discovering warm introduction opportunities

Nightly connection briefs for agencies: discover 3–10 warm intros worth pursuing, with evidence, message drafts, and a human approval workflow.

## What It Does

Given a project profile defining what you offer and who you're looking for, this skill will:

1. **Scout** the web for potential connection opportunities
2. **Filter** candidates based on hard requirements
3. **Rank** by relevance, intent, credibility, and engagement potential
4. **Draft** personalized outreach messages
5. **Output** structured Connection Briefs for human review

## Prerequisites

- **Node.js ≥22** (required for OpenClaw)
- **OpenClaw** installed and configured ([Getting Started](https://docs.openclaw.ai/start/getting-started))
- A running OpenClaw gateway (`openclaw gateway` or `openclaw onboard --install-daemon`)

## Installation

### Via ClawHub (Recommended)

[ClawHub](https://clawhub.com) is the public skill registry for OpenClaw. Install the CLI and add this skill:

```bash
# Install the ClawHub CLI (once)
npm install -g clawhub

# Install this skill
clawhub install claw-clawbridge
```

The skill will be installed to your `./skills` directory (or your OpenClaw workspace).

### Via OpenClaw CLI (Legacy clawdbot)

If you're using the legacy `clawdbot` CLI (now renamed to `openclaw`):

```bash
# From the skill registry
clawdbot skills install claw-clawbridge

# Or from GitHub directly
clawdbot skills install github:YOUR_USERNAME/clawbridge-skill

# Or from a local path
clawdbot skills install ./path/to/clawbridge-skill
```

### Via npm/pnpm (New OpenClaw)

```bash
# Install OpenClaw globally (Node ≥22 required)
npm install -g openclaw@latest

# Run the onboarding wizard (recommended for first-time setup)
openclaw onboard --install-daemon

# List available skills
openclaw skills list

# Check skill info
openclaw skills info claw-clawbridge
```

### Manual Installation

```bash
# Clone this repository
git clone https://github.com/YOUR_USERNAME/clawbridge-skill.git

# Copy to your OpenClaw workspace skills directory
cp -r clawbridge-skill ~/.openclaw/workspace/skills/

# Or symlink for development
ln -s $(pwd)/clawbridge-skill ~/.openclaw/workspace/skills/claw-clawbridge
```

Then restart your OpenClaw gateway to pick up the new skill:

```bash
openclaw gateway restart
```

### Verify Installation

```bash
# Check if the skill is loaded
openclaw skills list

# Get detailed skill info
openclaw skills info claw-clawbridge

# Check skill readiness
openclaw skills check
```

## Quick Start

1. **Create a Project Profile**

Create a file called `profile.yaml` in your workspace:

```yaml
offer: 'We help B2B SaaS companies automate their content operations'
ask: 'Marketing partners, agency relationships, content-focused companies'
ideal_persona: 'VP Marketing or Head of Content at Series A-C startups'
verticals:
  - 'B2B SaaS'
  - 'content marketing'
  - 'marketing automation'
tone: 'friendly, professional'
```

2. **Run the Skill**

```bash
# Via OpenClaw agent (interactive)
openclaw agent --message "Run the clawbridge skill with profile ./profile.yaml"

# Or via the clawbridge-runner (for scheduled runs)
# See: https://github.com/YOUR_USERNAME/clawbridge-runner

# Output will be saved to:
# - ./output/run.json (structured data)
# - ./output/run.md (human-readable report)
```

3. **Review the Connection Brief**

Open `run.md` to see your top candidates with:

- Why they match
- Evidence links
- Draft messages
- Recommended actions

## Project Structure

```
clawbridge-skill/
├── SKILL.md                 # OpenClaw skill entry point
├── prompts/
│   ├── discovery.md         # Web search strategy
│   ├── filtering.md         # Candidate filtering rules
│   ├── ranking.md           # Scoring heuristics
│   └── drafting.md          # Message drafting guidelines
├── schema/
│   └── connection_brief.json # JSON schema for output
├── examples/
│   ├── sample_run.json      # Example JSON output
│   └── sample_run.md        # Example human-readable report
├── venues/
│   ├── moltbook.md          # Moltbook search strategy
│   ├── web.md               # General web search
│   └── communities.md       # Community/forum discovery
└── README.md                # This file
```

## Configuration

### Project Profile Fields

| Field           | Required | Description                                       |
| --------------- | -------- | ------------------------------------------------- |
| `offer`         | Yes      | What your company/agency offers                   |
| `ask`           | Yes      | What you're looking for (partners, clients, etc.) |
| `ideal_persona` | Yes      | Description of target personas                    |
| `verticals`     | Yes      | 3-8 industry keywords                             |
| `geo_timezone`  | No       | Geographic preferences                            |
| `disallowed`    | No       | Do-not-contact list                               |
| `tone`          | No       | Style guidance for draft messages                 |

### Run Budget

Control resource usage per run:

```yaml
run_budget:
  max_searches: 20 # Maximum web searches
  max_fetches: 50 # Maximum page fetches
  max_minutes: 10 # Maximum run duration
```

### Environment Variables

```bash
CLAWBRIDGE_TOP_K=3              # Candidates to return (default: 3)
CLAWBRIDGE_RECENCY_DAYS=30      # Activity threshold (default: 30)
```

## Output

### JSON Schema

See [`schema/connection_brief.json`](./schema/connection_brief.json) for the full schema.

Key fields:

- `workspace_id` - Your workspace identifier
- `run_id` - Timestamp of the run
- `candidates` - Array of top-K candidates with evidence and drafts
- `next_actions` - Recommended actions per candidate

### Markdown Report

Human-readable format with:

- Summary and key insights
- Candidate profiles with scores
- Evidence links
- Draft messages
- Decision log template

## Security

This skill follows OpenClaw security best practices:

- ✅ No secrets in prompts (use env/config)
- ✅ Strict tool allowlists (only `web_search`, `web_fetch`, `browser`)
- ✅ Human-in-the-loop (never auto-send outreach)
- ✅ Rate limiting (respects run budgets)
- ✅ Avoid list enforcement

## Candidate Selection

### Hard Requirements

Candidates are discarded if missing:

- At least 2 evidence URLs
- Clear mapping to your `ask`
- Activity within recency threshold

### Ranking Factors

| Factor      | Weight | Description                                |
| ----------- | ------ | ------------------------------------------ |
| Relevance   | 30%    | Match to keywords and ask                  |
| Intent      | 25%    | Active signals (hiring, seeking, building) |
| Credibility | 20%    | Consistent presence across sources         |
| Recency     | 15%    | Recent activity                            |
| Engagement  | 10%    | Shared interests/communities               |

## Examples

See the [`examples/`](./examples/) directory for sample outputs.

## Contributing

Contributions welcome! Please ensure changes:

1. Maintain deterministic output schema
2. Keep secrets out of prompts
3. Preserve human-in-the-loop requirement
4. Include evidence-based selection

## License

MIT License - see LICENSE for details.

## Related Projects

- [**clawbridge-runner**](https://github.com/YOUR_USERNAME/clawbridge-runner) - CLI to run this skill on a schedule
- [**clawbridge-web**](https://github.com/YOUR_USERNAME/clawbridge-web) - Web UI for workspace management and vault review
- [**OpenClaw**](https://github.com/openclaw/openclaw) - The personal AI assistant platform
- [**ClawHub**](https://clawhub.com) - Public skill registry for OpenClaw
- [**awesome-openclaw-skills**](https://github.com/VoltAgent/awesome-openclaw-skills) - Community skill collection
