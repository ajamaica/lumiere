# Voice Commands - Detailed Reference

Voice screening platform commands for interviews, screening, and diagnostic conversations.

---

## Authentication

### login

Authenticate with your Nimrobo API key.

```bash
nimrobo login
```

**Interactive prompt:**
```
Enter your Nimrobo API key: api_xxxxxxxxxx
✓ Logged in as John Doe (john@example.com)
```

**Example - scripted login:**
```bash
echo "api_your_key_here" | nimrobo login
```

---

### logout

Remove stored credentials.

```bash
nimrobo logout
```

**Output:**
```
✓ Logged out successfully
```

---

### status

Display authentication status and configuration.

```bash
nimrobo status
```

**Example output:**
```
✓ Authenticated as John Doe (john@example.com)
  Default project: my-interview-project (proj_abc123)
  API: https://app.nimroboai.com/api
```

---

## User Commands

### user profile

Display authenticated user's profile.

```bash
nimrobo voice user profile
```

**Example output:**
```
User ID:            usr_abc123
Name:               John Doe
Email:              john@example.com
Profile Completed:  true
Created At:         2024-01-15
Last Login:         2024-03-20
```

**JSON output:**
```bash
nimrobo voice user profile --json
```

---

## Project Commands

### projects list

List all projects.

```bash
nimrobo voice projects list
```

**Example output:**
```
ID              Name                    Time Limit   Created
proj_abc123     Senior Engineer         30 min       2024-01-15
proj_def456     Customer Research       15 min       2024-02-20
proj_ghi789     Product Manager         45 min       2024-03-01
```

---

### projects get

Get detailed project information.

```bash
nimrobo voice projects get <project-id>
```

**Example:**
```bash
nimrobo voice projects get proj_abc123
```

**Output:**
```
ID:               proj_abc123
Name:             Senior Engineer Interview
Description:      Technical screening for senior backend role
Prompt:           You are conducting a technical interview...
Landing Title:    Welcome to your interview
Landing Info:     Please ensure you have a quiet environment
Time Limit:       30 minutes
Evaluator:        Configured
Created:          2024-01-15
Updated:          2024-02-28
```

---

### projects create

Create a new project.

**Via CLI flags:**
```bash
nimrobo voice projects create \
  -n "Engineering Interview" \
  -p "You are a technical interviewer. Ask about system design..." \
  -d "Backend engineer screening" \
  --landing-title "Technical Interview" \
  --landing-info "This interview will take approximately 30 minutes." \
  -t 30
```

**Via JSON file:**
```bash
nimrobo voice projects create -f project.json
```

**project.json:**
```json
{
  "name": "Senior Engineer Interview",
  "prompt": "You are conducting a technical interview for a senior backend engineer position. Ask about system design, coding practices, and past experience.",
  "description": "Interview for senior engineering role",
  "landingPageTitle": "Welcome to your interview",
  "landingPageInfo": "Please ensure you have a quiet environment and a stable internet connection.",
  "timeLimitMinutes": 30,
  "evaluator": {
    "prompt": "Evaluate the candidate on technical skills, communication, and problem-solving ability.",
    "questions": [
      { "id": "technical", "label": "Technical Skills", "type": "number" },
      { "id": "communication", "label": "Communication", "type": "number" },
      { "id": "problem_solving", "label": "Problem Solving", "type": "number" },
      { "id": "notes", "label": "Additional Notes", "type": "text" }
    ]
  }
}
```

**Interactive mode:**
```bash
nimrobo voice projects create
# Prompts for name and prompt
```

---

### projects update

Update an existing project.

**Example - update name and time limit:**
```bash
nimrobo voice projects update proj_abc123 \
  -n "Senior Backend Engineer Interview" \
  -t 45
```

**Example - update via file:**
```bash
nimrobo voice projects update proj_abc123 -f updates.json
```

---

### projects use

Set or view default project for convenience.

**Set default:**
```bash
nimrobo voice projects use proj_abc123
```

**View current default:**
```bash
nimrobo voice projects use
```

**Clear default:**
```bash
nimrobo voice projects use --clear
```

**Use default in other commands:**
```bash
nimrobo voice links list -p default
nimrobo voice links create -p default -l "Candidate A" -e 1_week
```

---

## Link Commands

### links list

List voice links.

**List project links:**
```bash
nimrobo voice links list -p proj_abc123
nimrobo voice links list -p default
```

**List instant links:**
```bash
nimrobo voice links list
```

**Example output:**
```
ID              Label           Status   Session ID      Expires
link_abc123     Candidate A     used     sess_xyz789     2024-04-15
link_def456     Candidate B     active   —               2024-04-15
link_ghi789     Candidate C     expired  —               2024-03-01
```

---

### links create

Create voice links.

**Create project links:**
```bash
nimrobo voice links create \
  -p proj_abc123 \
  -l "Alice,Bob,Charlie" \
  -e 1_week
```

**Output:**
```
https://app.nimroboai.com/link/abc123
https://app.nimroboai.com/link/def456
https://app.nimroboai.com/link/ghi789
```

**Create instant links (no project):**
```bash
nimrobo voice links create \
  -l "User Research 1,User Research 2" \
  -e 1_day \
  --prompt "You are conducting user research about product features..." \
  --landing-title "User Research Session" \
  --landing-info "Thank you for participating in our research." \
  -t 15
```

**Via JSON file (project links):**
```bash
nimrobo voice links create -p proj_abc123 -f candidates.json
```

**candidates.json:**
```json
{
  "labels": ["Alice Smith", "Bob Jones", "Charlie Brown"],
  "expiryPreset": "1_week"
}
```

**Via JSON file (instant links):**
```bash
nimrobo voice links create -f research.json
```

**research.json:**
```json
{
  "labels": ["Session 1", "Session 2", "Session 3"],
  "expiryPreset": "1_week",
  "prompt": "You are conducting user research interviews...",
  "landingPageTitle": "User Research",
  "landingPageInfo": "This session will take about 15 minutes.",
  "timeLimitMinutes": 15,
  "evaluator": {
    "prompt": "Summarize key insights from this conversation.",
    "questions": [
      { "id": "satisfaction", "label": "User Satisfaction", "type": "number" },
      { "id": "insights", "label": "Key Insights", "type": "text" }
    ]
  }
}
```

**Expiry presets:** `1_day`, `1_week`, `1_month`

---

### links cancel

Cancel an active project link.

```bash
nimrobo voice links cancel link_abc123 -p proj_xyz789
```

**Note:** Only `active` project links can be cancelled. Instant links cannot be cancelled.

---

### links update

Update an instant voice link.

```bash
nimrobo voice links update link_abc123 \
  -l "New Label" \
  -e 1_month \
  -t 20
```

**Via JSON file:**
```bash
nimrobo voice links update link_abc123 -f update.json
```

**Note:** Only `active` instant links can be updated.

---

## Session Commands

Most session commands require `--type` (project or instant), except `summary` and `summary:regenerate` which use `-p <projectId>` for project sessions or `-i` for instant sessions.

### sessions status

Get session status.

**Project session:**
```bash
nimrobo voice sessions status sess_abc123 -t project -p proj_xyz789
```

**Instant session:**
```bash
nimrobo voice sessions status sess_abc123 -t instant
```

**Example output:**
```
Session ID:     sess_abc123
Type:           project
Project ID:     proj_xyz789
Status:         completed
Agent ID:       agent_123
Created At:     2024-03-20 10:30:00
Updated At:     2024-03-20 10:45:00
Completed At:   2024-03-20 10:45:00
```

---

### sessions transcript

Get conversation transcript.

```bash
nimrobo voice sessions transcript sess_abc123 -t project -p proj_xyz789
nimrobo voice sessions transcript sess_abc123 -t instant
```

**Example output (JSON):**
```bash
nimrobo voice sessions transcript sess_abc123 -t instant --json
```

---

### sessions audio

Get signed URL to download audio recording.

```bash
nimrobo voice sessions audio sess_abc123 -t project -p proj_xyz789
```

**Output:**
```
Audio URL (valid for ~1 hour):
https://storage.example.com/audio/sess_abc123.mp3?signature=...
```

---

### sessions evaluation

Get evaluation results.

```bash
nimrobo voice sessions evaluation sess_abc123 -t project -p proj_xyz789
```

**Example output:**
```
Session ID:         sess_abc123
Type:               project
Evaluation Results: { technical: 8, communication: 9, notes: "Strong candidate" }
Evaluated At:       2024-03-20 11:00:00
Has Error:          false
```

**Note:** Only available after session is `completed`.

---

### sessions summary

Get or trigger summary generation.

**Project session:**
```bash
nimrobo voice sessions summary sess_abc123 -p proj_xyz789
```

**Instant session:**
```bash
nimrobo voice sessions summary sess_abc123 -i
```

**Behavior:**
- If summary exists: Returns the summary (200)
- If not: Triggers generation and returns workflow IDs (202)

---

### sessions summary:regenerate

Force regeneration of summary.

```bash
nimrobo voice sessions summary:regenerate sess_abc123 -p proj_xyz789
nimrobo voice sessions summary:regenerate sess_abc123 -i
```

**Output:**
```
Summary regeneration started
Workflow ID: wf_abc123
Run ID: run_xyz789
```
