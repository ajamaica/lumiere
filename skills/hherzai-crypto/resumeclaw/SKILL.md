---
name: resumeclaw
description: >
  Manage your ResumeClaw career agent — an AI that represents your professional experience
  to recruiters 24/7. Use when the user wants to: create a career agent from their resume,
  check who's contacted their agent, accept/decline recruiter introductions, search for
  other professionals, chat with candidate agents, manage notifications, or discuss
  anything about ResumeClaw, career agents, or AI-powered recruiting.
---

# ResumeClaw — Career Agent Management

ResumeClaw creates AI agents ("Claws") from resumes that represent candidates to recruiters 24/7. This skill lets you manage your career agent from any chat platform.

**Base URL:** configurable via `RESUMECLAW_URL` env var (default: `https://resumeclaw.com`)
**Script:** `{baseDir}/scripts/resumeclaw.sh`
**API Reference:** `{baseDir}/references/api.md`

## Authentication

Before most commands, the user must be logged in. Auth session is stored at `~/.resumeclaw/session`.

```bash
# Register a new account
bash {baseDir}/scripts/resumeclaw.sh register --email USER_EMAIL --password USER_PASSWORD --name "USER_NAME"

# Login to existing account
bash {baseDir}/scripts/resumeclaw.sh login --email USER_EMAIL --password USER_PASSWORD
```

If the user hasn't logged in yet, prompt them for email/password and run the login command first.

## Commands

### 1. Create Career Agent

Triggers: "Create my career agent", "Set up my ResumeClaw", "Upload my resume"

Read the user's resume from a file in their workspace, then create the agent:

```bash
# From a file
bash {baseDir}/scripts/resumeclaw.sh create --resume-file /path/to/resume.txt

# From stdin (if resume text is in a variable)
echo "$RESUME_TEXT" | bash {baseDir}/scripts/resumeclaw.sh create --resume-stdin
```

After creation, share the agent's public profile link: `https://resumeclaw.com/agents/{slug}`

### 2. Check Inbox

Triggers: "Who's contacted my agent?", "Any new introductions?", "Check my inbox"

```bash
# Get unread notification count
bash {baseDir}/scripts/resumeclaw.sh notifications --unread-count

# Get full inbox for a specific agent
bash {baseDir}/scripts/resumeclaw.sh inbox --slug USER_SLUG
```

Present results showing: pending introductions, recent conversations, and match scores. Highlight anything requiring action (accept/decline).

### 3. Accept or Decline Introductions

Triggers: "Accept Sarah's introduction", "Decline that recruiter", "Accept intro from TechCorp"

```bash
# Accept
bash {baseDir}/scripts/resumeclaw.sh accept --id INTRODUCTION_UUID

# Decline
bash {baseDir}/scripts/resumeclaw.sh decline --id INTRODUCTION_UUID
```

If the user refers to an introduction by name rather than ID, first check the inbox to find the matching introduction UUID, then run accept/decline.

### 4. Search Agents

Triggers: "Find data engineers in Dallas", "Search for cloud architects", "Who's on ResumeClaw?"

```bash
bash {baseDir}/scripts/resumeclaw.sh search --query "senior data engineer" --location "Dallas, TX"
```

Display results with: name, title, location, match score, and profile link. The `--location` flag is optional.

### 5. Chat with an Agent

Triggers: "Talk to yournameClaw about cloud experience", "Ask that candidate about Python"

```bash
bash {baseDir}/scripts/resumeclaw.sh chat --slug AGENT_SLUG --message "Tell me about your cloud experience"
```

The response comes from the agent's AI, grounded in their resume data. Relay the response naturally to the user.

### 6. View Profile / Stats

Triggers: "Show my agent stats", "How's my Claw doing?", "View my profile"

```bash
bash {baseDir}/scripts/resumeclaw.sh profile --slug AGENT_SLUG
```

Display: profile score, trust score, total views, total conversations, skills, experience summary, and the public profile link.

### 7. Notifications

Triggers: "Any notifications?", "What's new?", "Mark all as read"

```bash
# List notifications
bash {baseDir}/scripts/resumeclaw.sh notifications

# Mark all as read
bash {baseDir}/scripts/resumeclaw.sh notifications --mark-all-read

# Just unread count
bash {baseDir}/scripts/resumeclaw.sh notifications --unread-count
```

Show notification type, title, timestamp, and read status. Group by type if there are many.

## Tips

- The user's agent slug is typically their name + "Claw" (e.g., `yournameClaw`). Ask if you don't know it.
- All script output is JSON. Parse it and present results in a friendly, conversational way.
- If a command fails with a 401, the session has expired — prompt the user to log in again.
- For resume creation, the agent reads resume text from files — it supports `.txt`, `.md`, or any plain text format. If the user has a PDF, ask them to paste the text content.
- The web dashboard is always available at `https://resumeclaw.com` for visual management.
