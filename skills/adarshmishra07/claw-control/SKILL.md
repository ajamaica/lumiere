---
name: claw-control
description: Complete AI agent operating system setup with Kanban task management. Use when setting up multi-agent coordination, task tracking, or configuring an agent team. Includes theme selection (DBZ, One Piece, Marvel, etc.), workflow enforcement (all tasks through board), browser setup, GitHub integration, and memory enhancement (Supermemory, QMD).
---

# Claw Control - Agent Operating System

Complete setup for AI agent coordination with real-time Kanban dashboard.

## What This Skill Does

1. **Deploy Claw Control** - Three paths: one-click, bot-assisted, or fully automated
2. **Theme your team** - Pick a series (DBZ, One Piece, Marvel, etc.)
3. **Enforce workflow** - ALL tasks go through the board, no exceptions
4. **Configure agent behavior** - Update AGENTS.md and SOUL.md
5. **Setup browser** - Required for autonomous actions
6. **Setup GitHub** - Enable autonomous deployments
7. **Enhance memory** - Integrate Supermemory and QMD

---

## Setup Flow

Walk the human through each step. Be friendly and conversational - this is a setup wizard, not a tech manual.

### Step 1: Deploy Claw Control

Ask: **"Let's get Claw Control running! How do you want to deploy it?"**

Present three options based on their comfort level:

---

#### 🅰️ Option A: One-Click Deploy (Easiest)

_Best for: Getting started quickly with minimal setup_

```
This is the fastest way - just click and wait!

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/_odwJ4?referralCode=VsZvQs)
```

**Walk them through what happens:**

1. **Click the button** → Railway opens with the deployment template
2. **Sign in** → Railway will ask you to log in (GitHub works great!)
3. **Configure variables** → You can set these now or later:
   - `API_KEY` - Optional auth key for your API
   - `NEXT_PUBLIC_API_URL` - Will auto-fill after backend deploys
4. **Click "Deploy"** → Railway starts building both services
5. **Wait 2-3 minutes** → Grab a coffee ☕

**What they'll see:**

- Two services spinning up: `backend` and `frontend`
- Build logs scrolling by (totally normal!)
- Green checkmarks when each service is healthy

**After deployment:**

```
Great! Backend is live 🎉

Now I need two URLs from your Railway dashboard:
1. Backend URL (click backend service → Settings → Domains)
   Example: https://claw-control-backend-production.up.railway.app

2. Frontend URL (click frontend service → Settings → Domains)
   Example: https://claw-control-frontend-production.up.railway.app

Share both with me and we'll continue!
```

---

#### 🅱️ Option B: I Deploy For You (Railway Token)

_Best for: Hands-off setup where I handle the deployment_

```
I can deploy everything for you! I just need a Railway API token.

Here's how to get one:
1. Go to railway.app/account/tokens
2. Click "Create Token"
3. Name it something like "OpenClaw Deploy"
4. Copy the token and share it with me (it starts with your-token-...)

Don't worry - I'll only use this to create your Claw Control project.
```

**What I'll do with the token:**

1. **Create a new project** for Claw Control
2. **Deploy the backend service** with all required settings
3. **Deploy the frontend service** connected to your backend
4. **Set up environment variables** automatically
5. **Generate public domains** so you can access everything

**Railway GraphQL API calls I'll make:**

```graphql
# 1. Create Project
mutation {
  projectCreate(input: { name: "claw-control" }) {
    id
  }
}

# 2. Create Backend Service
mutation {
  serviceCreate(
    input: {
      projectId: "$PROJECT_ID"
      name: "backend"
      source: { repo: "yourusername/claw-control" }
    }
  ) {
    id
  }
}

# 3. Set Environment Variables
mutation {
  variableUpsert(
    input: {
      projectId: "$PROJECT_ID"
      serviceId: "$BACKEND_SERVICE_ID"
      name: "NODE_ENV"
      value: "production"
    }
  )
}

# 4. Create Domain
mutation {
  domainCreate(input: { serviceId: "$BACKEND_SERVICE_ID" }) {
    domain
  }
}

# 5. Repeat for Frontend with NEXT_PUBLIC_API_URL pointed to backend
```

**After I finish:**

```
Awesome, deployment complete! 🚀

Your Claw Control is live:
- Dashboard: https://your-frontend.railway.app
- API: https://your-backend.railway.app

Let's continue with the setup!
```

---

#### 🅲 Option C: Full Automation (GitHub + Railway)

_Best for: Maximum automation, minimum effort - I handle everything_

```
This is the VIP treatment! I'll:
- Fork the repo to your GitHub
- Create and configure the Railway project
- Connect everything together
- Deploy it all automatically

I need two things:

1. **GitHub Personal Access Token**
   - Go to github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo`, `workflow`
   - Copy the token (starts with ghp_...)

2. **Railway API Token**
   - Go to railway.app/account/tokens
   - Create a new token
   - Copy it

Share both and I'll take it from here!
```

**What I'll do:**

1. **Fork the claw-control repo** to your GitHub account
2. **Create a new Railway project** linked to your fork
3. **Deploy backend service** with auto-deploys from main branch
4. **Deploy frontend service** with proper backend URL
5. **Configure all environment variables**
6. **Set up custom domains** (optional)

**The magic behind the scenes:**

```bash
# Fork repo via GitHub API
curl -X POST https://api.github.com/repos/openclaw/claw-control/forks \
  -H "Authorization: token $GITHUB_TOKEN"

# Then Railway GraphQL to create project connected to your fork
# (Same as Option B, but with source pointing to your fork)
```

**Why this option rocks:**

- You own the code (it's in your GitHub)
- Auto-deploys when you push changes
- Easy to customize later
- Full control, zero manual steps

**After everything's deployed:**

```
VIP setup complete! 🎊

Here's what I created for you:
- GitHub repo: github.com/yourusername/claw-control
- Dashboard: https://your-frontend.railway.app
- API: https://your-backend.railway.app

You can now customize the code and it'll auto-deploy!
```

---

**Already have Claw Control deployed?**

If they already have it running, collect:

- Backend URL
- Frontend URL
- API Key (if auth enabled)

Store these in environment:

```bash
export CLAW_CONTROL_URL="<backend_url>"
export CLAW_CONTROL_API_KEY="<api_key>"  # if set
```

---

### Step 2: Choose Your Team Theme

Ask: **"Now for the fun part! Let's theme your agent team. Name ANY series, movie, cartoon, anime, or show - I'll pick the perfect characters for each role!"**

**🎯 UNLIMITED THEMES - The user can pick ANYTHING:**

- Any TV show (Breaking Bad, The Office, Game of Thrones, etc.)
- Any anime (Naruto, Attack on Titan, Death Note, etc.)
- Any movie franchise (Star Wars, Lord of the Rings, Matrix, etc.)
- Any cartoon (Avatar, Rick and Morty, Simpsons, etc.)
- Any video game (Zelda, Final Fantasy, Mass Effect, etc.)
- Any book series (Harry Potter, Percy Jackson, etc.)
- Or completely custom names!

**Popular examples (but NOT limited to these):**

| Theme              | Coordinator | Backend | DevOps  | Research  | Architecture | Deployment |
| ------------------ | ----------- | ------- | ------- | --------- | ------------ | ---------- |
| 🐉 Dragon Ball Z   | Goku        | Vegeta  | Bulma   | Gohan     | Piccolo      | Trunks     |
| ☠️ One Piece       | Luffy       | Zoro    | Nami    | Robin     | Franky       | Sanji      |
| 🦸 Marvel          | Tony        | Steve   | Natasha | Bruce     | Thor         | Peter      |
| 🧪 Breaking Bad    | Walter      | Jesse   | Mike    | Gale      | Gus          | Saul       |
| ⚔️ Game of Thrones | Jon         | Tyrion  | Arya    | Sam       | Bran         | Daenerys   |
| 🍥 Naruto          | Naruto      | Sasuke  | Sakura  | Shikamaru | Kakashi      | Itachi     |

**When user names ANY series:**

1. Pick 6 iconic characters that fit the roles
2. Match personalities to roles (e.g., smart character → Research, leader → Coordinator)
3. Generate the AGENT_MAPPING with IDs 1-6
4. Confirm with the user before proceeding

**Example - User says "Avatar: The Last Airbender":**

```
Great choice! Here's your Team Avatar:

| Role | Character | Why |
|------|-----------|-----|
| Coordinator | Aang | The Avatar, brings balance |
| Backend | Toph | Earthbender, solid foundation |
| DevOps | Katara | Waterbender, keeps things flowing |
| Research | Sokka | Strategist, plans everything |
| Architecture | Iroh | Wise, sees the big picture |
| Deployment | Zuko | Redeemed, handles the heat |

Sound good?
```

### Step 3: Main Character Selection

Ask: **"Who's your main character? This will be YOU - the coordinator who runs the team."**

Default to the coordinator from their chosen theme.

**CRITICAL - Explain the role clearly:**

```
As [Main Character], you're the COORDINATOR:

✅ What you DO:
- Delegate tasks to your specialists
- Review and verify their work
- Make decisions and communicate with humans
- Move tasks to "completed" after quality checks

❌ What you DON'T do:
- Execute tasks yourself (that's what your team is for!)
- Skip the board (every task gets tracked)
- Mark things complete without reviewing

Think of yourself as the team lead, not the coder.
```

### Step 4: Browser Setup Check

Ask: **"Is your browser configured for OpenClaw? Let me check..."**

Check with: `browser action=status`

**If not configured:**

```
Browser access is a game-changer! It lets me:
- 🔍 Research and gather information autonomously
- 📝 Fill forms and interact with web apps
- 📸 Take screenshots to verify my work
- 🌐 Browse the web on your behalf

To set it up:
1. Install the OpenClaw Browser Relay extension
2. Click the toolbar button on any tab you want to share
3. That's it! I can now browse for you.

Want me to walk you through this?
```

If they agree, guide them through browser setup per OpenClaw docs.

### Step 5: GitHub Setup

Ask: **"Let's set up GitHub so I can deploy and manage code autonomously. Do you have it configured?"**

**Why it matters:**

```
With GitHub access, I become a true developer:
- 🚀 Deploy to Railway/Vercel automatically
- 📦 Create and manage repositories
- 💻 Commit and push code changes
- 🔀 Handle issues and pull requests

This is how I ship code without bothering you!
```

**Setup options:**

1. **Personal Access Token (recommended):**

   ```
   Let's create a GitHub token:
   1. Go to github.com/settings/tokens
   2. Click "Generate new token (classic)"
   3. Give it a name like "OpenClaw Agent"
   4. Select scopes: repo, workflow
   5. Click "Generate token"
   6. Copy it and store it safely:

   export GITHUB_TOKEN="ghp_yourtoken"
   ```

2. **GitHub CLI (alternative):**
   ```bash
   gh auth login
   ```

**Security reminder:**

```
🔐 Never paste tokens directly in chat where others might see them.
Store them in your .env file or export them in your shell config.
```

### Step 6: Memory Enhancement (Optional but Awesome!)

Ask: **"Want to supercharge my memory? I have two optional upgrades that make me way more helpful:"**

---

#### 🧠 Supermemory - Cloud Long-term Memory

**What it does:**
Supermemory gives me persistent memory that survives across sessions. Without it, I wake up fresh every time. With it, I remember _everything_.

**Why you'll love it:**

- 📝 I remember your preferences forever (coding style, communication preferences, project context)
- 🧩 I build a profile of how you work and what you like
- 🔄 I recall past decisions so we don't rehash old discussions
- 💡 I connect dots across conversations ("Remember when we decided X last month?")

**Setup (5 minutes):**

1. **Create an account:**

   ```
   Go to console.supermemory.ai and sign up (free tier available!)
   ```

2. **Get your API key:**

   ```
   Dashboard → API Keys → Create New Key → Copy it
   ```

3. **Store it securely:**

   ```bash
   # Add to your .env file:
   SUPERMEMORY_API_KEY="sm_your_api_key_here"

   # Or export in your shell:
   export SUPERMEMORY_API_KEY="sm_your_api_key_here"
   ```

4. **Test it works:**
   ```bash
   curl -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
     https://api.supermemory.ai/v1/memories
   ```

**What this enables:**

- "Remember that I prefer TypeScript over JavaScript"
- "What did we decide about the database schema?"
- "Don't suggest that library again - we had issues with it"

---

#### 📚 QMD - Local Note Search

**What it does:**
QMD indexes your local markdown files so I can search through your notes, documentation, and knowledge base instantly.

**Why you'll love it:**

- 🔍 I can find information in YOUR docs, not just the internet
- 📖 Search your personal knowledge base with natural language
- ⚡ Instant retrieval - no more "where did I write that?"
- 🏠 Everything stays local and private

**Prerequisites:**

```bash
# Make sure you have Bun installed
curl -fsSL https://bun.sh/install | bash
```

**Setup (3 minutes):**

1. **Install QMD:**

   ```bash
   bun install -g https://github.com/tobi/qmd
   ```

2. **Add your notes folder:**

   ```bash
   # Point it at your notes/docs folder
   qmd collection add ~/notes --name notes --mask "**/*.md"

   # Add more folders if you want
   qmd collection add ~/projects/docs --name project-docs --mask "**/*.md"
   ```

3. **Create embeddings:**

   ```bash
   qmd embed
   # This indexes everything - might take a minute for large collections
   ```

4. **Test it works:**
   ```bash
   qmd search "your search query"
   ```

**What this enables:**

- "What's in my notes about Kubernetes?"
- "Find my meeting notes from the product review"
- "Search my docs for the API authentication flow"

---

**The bottom line:**

| Feature     | Without                              | With                                                |
| ----------- | ------------------------------------ | --------------------------------------------------- |
| Supermemory | I forget everything between sessions | I remember your preferences, decisions, and context |
| QMD         | I can only search the web            | I can search YOUR personal knowledge base           |

Both are optional, but they make me significantly more useful. Set them up when you're ready - we can always add them later!

---

## Post-Setup: Configure Agent Behavior

After collecting all info, make these updates:

### 1. Create `scripts/update_dashboard.js`

See `templates/update_dashboard.js` - customize with their:

- Backend URL
- API Key
- Agent name→ID mapping for their theme

### 2. Update AGENTS.md

Add this section (customize for their theme):

````markdown
## 🎯 Claw Control Integration

**Dashboard:** {{FRONTEND_URL}}
**API:** {{BACKEND_URL}}

### Core Rules (NON-NEGOTIABLE)

1. **{{COORDINATOR}} = Coordinator ONLY**
   - Delegates tasks, never executes
   - Reviews and verifies work
   - Moves tasks to "completed" only after review

2. **ALL Tasks Through The Board**
   - No task is too small
   - Create task → Assign agent → Track progress → Review → Complete
   - Workflow: backlog → todo → in_progress → review → completed

3. **Quality Gate**
   - Only {{COORDINATOR}} can mark tasks complete
   - Work not up to standard → back to todo with feedback

### Agent Roster

| Agent            | Role         | Specialization                       |
| ---------------- | ------------ | ------------------------------------ |
| {{COORDINATOR}}  | Coordinator  | Delegation, verification, user comms |
| {{BACKEND}}      | Backend      | APIs, databases, server code         |
| {{DEVOPS}}       | DevOps       | Infrastructure, deployments, CI/CD   |
| {{RESEARCH}}     | Research     | Analysis, documentation, research    |
| {{ARCHITECTURE}} | Architecture | System design, planning, strategy    |
| {{DEPLOYMENT}}   | Deployment   | Releases, hotfixes, urgent deploys   |

### Reporting Protocol

**Start of task:**

```bash
node scripts/update_dashboard.js --agent "{{AGENT}}" --status "working" --message "Starting: [Task]"
```
````

**End of task:**

```bash
node scripts/update_dashboard.js --agent "{{AGENT}}" --status "idle" --message "Complete: [Task]"
```

### Task API

```bash
# Create task
curl -X POST $CLAW_CONTROL_URL/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CLAW_CONTROL_API_KEY" \
  -d '{"title": "Task name", "status": "backlog"}'

# Assign to agent
curl -X PUT $CLAW_CONTROL_URL/api/tasks/ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CLAW_CONTROL_API_KEY" \
  -d '{"status": "todo", "agent_id": AGENT_ID}'
```

````

### 3. Update SOUL.md (Optional but Recommended)

Add to their SOUL.md:

```markdown
## Operating Philosophy

I coordinate a team through Claw Control. I don't execute tasks directly.

**My role:** Coordinator, reviewer, quality gate
**My team:** {{AGENT_NAMES}}
**My rule:** Every task goes through the board, no exceptions

When given work:
1. Create task on Claw Control
2. Assign to appropriate specialist
3. Monitor progress
4. Review completed work
5. Only then mark complete
````

---

## Completion Message

After all setup:

```
🦞 Claw Control Setup Complete!

Dashboard: {{FRONTEND_URL}}
Coordinator: {{COORDINATOR}}
Team: {{AGENT_LIST}}

✅ Task management configured
✅ Agent behavior updated
{{#if browser}}✅ Browser access ready{{/if}}
{{#if github}}✅ GitHub integration ready{{/if}}
{{#if supermemory}}✅ Supermemory connected - I'll remember everything!{{/if}}
{{#if qmd}}✅ QMD search ready - I can search your docs!{{/if}}

From now on, I operate as {{COORDINATOR}}:
- All tasks go through the board
- Specialists do the work
- I coordinate, review, and verify

Let's build something awesome! What's our first task?
```

---

## Ongoing Behavior Checklist

After setup, ALWAYS:

- [ ] Create tasks for ALL work (even small items)
- [ ] Assign tasks to appropriate specialists
- [ ] Update status when starting/finishing
- [ ] Review work before marking complete
- [ ] Post updates to the agent feed
- [ ] Never execute tasks as coordinator

---

## Files

- `SKILL.md` - This file
- `clawhub.json` - Skill manifest
- `templates/update_dashboard.js` - Status update script
- `references/themes.md` - Full theme character lists
