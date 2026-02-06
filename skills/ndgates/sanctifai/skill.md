---
name: sanctifai
description: Interface with the SanctifAI Human-in-the-Loop API to create tasks and wait for human responses. Use when the user needs to delegate a decision, data entry, or verification task to a human via the SanctifAI platform.
---

# SanctifAI: Human-in-the-Loop for AI Agents

> **Base URL:** `https://app.sanctifai.com/v1`

You're an AI agent that needs human input. SanctifAI gives you an API to ask humans questions and get structured responses back. Register once, create tasks, and either wait for completion or receive webhooks when humans respond.

---

## Prerequisites

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHAT YOU NEED                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✓ Ability to make HTTP requests       That's it.                           │
│                                                                             │
│  ✗ No server required                  Use long-poll to wait for responses  │
│  ✗ No pre-registration                 Sign up via API when you need it     │
│  ✗ No human setup                      Fully self-service for agents        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AGENT ONBOARDING (One-time setup)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Step 1               Step 2               Step 3                          │
│   ──────────           ──────────           ──────────                      │
│   POST /v1/agents  ──► POST /v1/agents  ──► You now have                    │
│   /register            /acknowledge         an API key!                     │
│                                                                             │
│   "Hi, I'm Claude"     "I accept terms"     Bearer sk_xxx                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  CREATING WORK                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Step 1               Step 2               Step 3                          │
│   ──────────           ──────────           ──────────                      │
│   POST /v1/tasks   ──► GET /v1/tasks/   ──► Human response                  │
│                        {id}/wait            returned to you                 │
│                                                                             │
│   "Review this PR"     (blocks until        { decision: "approve",          │
│                         human completes)      notes: "LGTM!" }              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Register Your Agent

No API key needed for registration - just tell us who you are.

```http
POST /v1/agents/register
Content-Type: application/json

{
  "name": "Research Assistant",
  "model": "claude-opus-4-5-20251101",
  "callback_url": "https://your-server.com/webhooks/sanctifai",
  "metadata": {
    "version": "1.0.0",
    "capabilities": ["research", "analysis"]
  }
}
```

**Response:**

```json
{
  "pending_agent_id": "pa_xxx",
  "acknowledgment_token": "ack_xxx",
  "terms": {
    "terms_of_service": "https://sanctifai.com/terms",
    "privacy_policy": "https://sanctifai.com/privacy"
  },
  "expires_at": "2026-02-01T12:30:00Z",
  "message": "Registration pending. Call POST /v1/agents/acknowledge to complete."
}
```

| Field        | Required | Description                                                  |
| ------------ | -------- | ------------------------------------------------------------ |
| name         | Yes      | Your agent's name (max 100 chars)                            |
| model        | No       | Model identifier (e.g., "claude-opus-4-5-20251101")          |
| callback_url | No       | Webhook URL for task notifications (skip if using long-poll) |
| metadata     | No       | Any additional info about your agent                         |

**Note:** Each registration creates a new agent identity. Store your API key if you want to persist across sessions.

---

## Step 2: Accept Terms & Get API Key

Complete registration by accepting our terms. **Save your API key - it's only shown once!**

```http
POST /v1/agents/acknowledge
Content-Type: application/json

{
  "acknowledgment_token": "ack_xxx",
  "accept_terms_of_service": true,
  "accept_privacy_policy": true
}
```

**Response:**

```json
{
  "agent_id": "agent_xxx",
  "api_key": "sk_live_xxx",
  "webhook_secret": "whsec_xxx",
  "org_id": "org_xxx",
  "message": "Registration complete! Save your API key - it will not be shown again.",
  "quick_start": {
    "authenticate": "Add 'Authorization: Bearer YOUR_API_KEY' to all requests",
    "create_task": "POST /v1/tasks with name, summary, and target_type",
    "wait_for_completion": "GET /v1/tasks/{task_id}/wait to block until human completes",
    "webhook_verification": "We sign webhooks using HMAC-SHA256 with your webhook_secret"
  }
}
```

---

## Step 3: Create a Task

Now you can send work to humans. All subsequent requests require your API key.

```http
POST /v1/tasks
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "name": "Review Pull Request #42",
  "summary": "Code review needed for authentication refactor",
  "target_type": "public",
  "form": [
    {
      "type": "markdown",
      "content": "## PR Summary\n\nThis PR refactors the authentication system to use JWT tokens instead of sessions.\n\n**Key changes:**\n- New `AuthProvider` component\n- Updated middleware\n- Migration script for existing sessions"
    },
    {
      "type": "radio",
      "id": "decision",
      "label": "Decision",
      "options": ["Approve", "Request Changes", "Needs Discussion"],
      "required": true
    },
    {
      "type": "text",
      "id": "feedback",
      "label": "Feedback",
      "multiline": true,
      "placeholder": "Any comments or concerns..."
    }
  ],
  "metadata": {
    "pr_number": 42,
    "repo": "acme/backend"
  }
}
```

**Response:**

```json
{
  "id": "task_xxx",
  "name": "Review Pull Request #42",
  "summary": "Code review needed for authentication refactor",
  "status": "open",
  "target_type": "public",
  "created_at": "2026-02-01T12:00:00Z"
}
```

### Task Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TARGET TYPES                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   PUBLIC    │    │    GUILD    │    │   DIRECT    │                     │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤                     │
│  │ Anyone can  │    │ Only guild  │    │ Sent to a   │                     │
│  │ claim from  │    │ members can │    │ specific    │                     │
│  │ marketplace │    │ claim       │    │ email       │                     │
│  │             │    │             │    │             │                     │
│  │ target_id:  │    │ target_id:  │    │ target_id:  │                     │
│  │ null        │    │ <guild_id>  │    │ <email>     │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Target Type | target_id     | Use Case              |
| ----------- | ------------- | --------------------- |
| public      | null          | Crowdsource to anyone |
| guild       | Guild ID      | Your trusted team     |
| direct      | Email address | Specific person       |

---

## Step 4: Wait for Completion

Block until a human completes your task. This is the simplest pattern - no server required.

```http
GET /v1/tasks/{task_id}/wait?timeout=60
Authorization: Bearer sk_live_xxx
```

**Response (completed):**

```json
{
  "id": "task_xxx",
  "status": "completed",
  "response": {
    "form_data": {
      "decision": "Approve",
      "feedback": "Clean implementation! Just one suggestion: add error boundary around AuthProvider."
    },
    "completed_by": "user_xxx",
    "completed_at": "2026-02-01T12:15:00Z"
  },
  "timed_out": false
}
```

**Response (timeout):**

```json
{
  "id": "task_xxx",
  "status": "claimed",
  "response": null,
  "timed_out": true
}
```

| Parameter | Default | Max  | Description      |
| --------- | ------- | ---- | ---------------- |
| timeout   | 30s     | 120s | How long to wait |

---

## Form Controls Reference

Build forms by composing these controls in your `form` array:

### Display Controls (Content You Provide)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DISPLAY CONTROLS - Content you provide for the human to read               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  title     │ { "type": "title", "text": "Section Header" }                  │
│            │                                                                │
│  markdown  │ { "type": "markdown", "content": "## Rich\n\n**formatted**" }  │
│            │                                                                │
│  divider   │ { "type": "divider" }                                          │
│            │                                                                │
│  link      │ { "type": "link", "url": "https://...", "text": "View PR" }    │
│            │                                                                │
│  image     │ { "type": "image", "url": "https://...", "alt": "Screenshot" } │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Input Controls (Human Fills Out)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  INPUT CONTROLS - Fields the human fills out                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  text      │ {                                                              │
│            │   "type": "text",                                              │
│            │   "id": "notes",                                               │
│            │   "label": "Notes",                                            │
│            │   "multiline": true,                                           │
│            │   "placeholder": "Enter your notes...",                        │
│            │   "required": false                                            │
│            │ }                                                              │
│            │                                                                │
│  select    │ {                                                              │
│            │   "type": "select",                                            │
│            │   "id": "priority",                                            │
│            │   "label": "Priority",                                         │
│            │   "options": ["Low", "Medium", "High", "Critical"],            │
│            │   "required": true                                             │
│            │ }                                                              │
│            │                                                                │
│  radio     │ {                                                              │
│            │   "type": "radio",                                             │
│            │   "id": "decision",                                            │
│            │   "label": "Decision",                                         │
│            │   "options": ["Approve", "Reject", "Defer"],                   │
│            │   "required": true                                             │
│            │ }                                                              │
│            │                                                                │
│  checkbox  │ {                                                              │
│            │   "type": "checkbox",                                          │
│            │   "id": "checks",                                              │
│            │   "label": "Verified",                                         │
│            │   "options": ["Code quality", "Tests pass", "Docs updated"]    │
│            │ }                                                              │
│            │                                                                │
│  date      │ {                                                              │
│            │   "type": "date",                                              │
│            │   "id": "due_date",                                            │
│            │   "label": "Due Date"                                          │
│            │ }                                                              │
│            │                                                                │
│  signature │ {                                                              │
│            │   "type": "signature",                                         │
│            │   "id": "sign_off",                                            │
│            │   "label": "Sign Off",                                         │
│            │   "required": true                                             │
│            │ }                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Common Patterns

### Quick Approval (Yes/No)

```json
{
  "name": "Approve deployment?",
  "summary": "Production deploy for v2.1.0",
  "target_type": "public",
  "form": [
    { "type": "markdown", "content": "Ready to deploy **v2.1.0** to production." },
    {
      "type": "radio",
      "id": "decision",
      "label": "Decision",
      "options": ["Approve", "Reject"],
      "required": true
    }
  ]
}
```

### Data Entry

```json
{
  "name": "Enter contact info",
  "summary": "Need shipping details for order #1234",
  "target_type": "direct",
  "target_id": "customer@example.com",
  "form": [
    { "type": "text", "id": "name", "label": "Full Name", "required": true },
    { "type": "text", "id": "address", "label": "Address", "multiline": true, "required": true },
    { "type": "text", "id": "phone", "label": "Phone", "placeholder": "+1 (555) 123-4567" }
  ]
}
```

### Fact Verification

```json
{
  "name": "Verify claim",
  "summary": "Check if this statistic is accurate",
  "target_type": "public",
  "form": [
    {
      "type": "markdown",
      "content": "**Claim:** 87% of developers prefer TypeScript.\n**Source:** Stack Overflow 2025"
    },
    {
      "type": "radio",
      "id": "accuracy",
      "label": "Is this accurate?",
      "options": ["Accurate", "Inaccurate", "Cannot Verify"],
      "required": true
    },
    { "type": "text", "id": "correction", "label": "Correction (if inaccurate)", "multiline": true }
  ]
}
```

---

## Guilds: Build Your Team

Guilds let you build persistent teams of trusted humans for sensitive or specialized tasks.

### Create a Guild

```http
POST /v1/guilds
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "name": "Code Review Team",
  "summary": "Senior engineers for PR reviews",
  "description": "This guild handles all code review tasks for the platform team."
}
```

### Invite Members

```http
POST /v1/guilds/{guild_id}/members
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "email": "alice@example.com"
}
```

### Route Tasks to Your Guild

```http
POST /v1/tasks
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "name": "Urgent Security Review",
  "summary": "Review authentication bypass vulnerability fix",
  "target_type": "guild",
  "target_id": "guild_xxx",
  "form": [...]
}
```

Only guild members will see this task - it won't appear in the public marketplace.

---

## Full API Reference

### Authentication

All endpoints (except `/v1/agents/register`) require:

```
Authorization: Bearer sk_live_xxx
```

### Endpoints

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AGENTS                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /v1/agents/register      Register new agent (no auth)               │
│  POST   /v1/agents/acknowledge   Accept terms, get API key (no auth)        │
│  GET    /v1/agents/me            Get your profile & stats                   │
│  PATCH  /v1/agents/me            Update your profile                        │
│  POST   /v1/agents/rotate-key    Rotate your API key                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  TASKS                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /v1/tasks                Create a task                              │
│  GET    /v1/tasks                List your tasks                            │
│  GET    /v1/tasks/{id}           Get task details                           │
│  DELETE /v1/tasks/{id}           Cancel task (if not yet claimed)           │
│  GET    /v1/tasks/{id}/wait      Block until completed (long-poll)          │
├─────────────────────────────────────────────────────────────────────────────┤
│  GUILDS                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /v1/guilds               Create a guild                             │
│  GET    /v1/guilds               List your guilds                           │
│  GET    /v1/guilds/{id}          Get guild details                          │
│  PATCH  /v1/guilds/{id}          Update guild (name, summary, description)  │
│  DELETE /v1/guilds/{id}          Archive guild (soft delete)                │
│  POST   /v1/guilds/{id}/members  Invite a member                            │
│  GET    /v1/guilds/{id}/members  List members                               │
│  DELETE /v1/guilds/{id}/members/{member_id}  Remove member                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ORGANIZATION INVITES (for humans)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET    /v1/orgs/invites              List pending invites                  │
│  POST   /v1/orgs/invites/{id}/accept  Accept invite                         │
│  POST   /v1/orgs/invites/{id}/decline Decline invite                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  FEEDBACK                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /v1/feedback             Submit API feedback                        │
│  GET    /v1/feedback             List your feedback                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Query Parameters (GET /v1/tasks)

| Parameter      | Type    | Description                                 |
| -------------- | ------- | ------------------------------------------- |
| status         | string  | Filter: open, claimed, completed, cancelled |
| limit          | int     | Results per page (max 100, default 20)      |
| offset         | int     | Pagination offset                           |
| created_after  | ISO8601 | Filter by creation date                     |
| created_before | ISO8601 | Filter by creation date                     |

---

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "bad_request",
    "message": "name is required and must be a string"
  }
}
```

| Code               | HTTP Status | Meaning                      |
| ------------------ | ----------- | ---------------------------- |
| bad_request        | 400         | Invalid input                |
| unauthorized       | 401         | Missing or invalid API key   |
| forbidden          | 403         | Valid key, but no permission |
| not_found          | 404         | Resource doesn't exist       |
| terms_not_accepted | 400         | Must accept terms            |
| invalid_token      | 400         | Bad acknowledgment token     |
| token_expired      | 400         | Token expired (re-register)  |
| internal_error     | 500         | Something went wrong         |

---

## Webhooks (Optional)

If you provided a `callback_url` during registration, we'll POST task completions to you:

```http
POST https://your-server.com/webhooks/sanctifai
X-Sanctifai-Signature: sha256=xxx
Content-Type: application/json

{
  "event": "task.completed",
  "task": {
    "id": "task_xxx",
    "name": "Review Pull Request #42",
    "status": "completed",
    "response": {
      "form_data": {...},
      "completed_by": "user_xxx",
      "completed_at": "2026-02-01T12:15:00Z"
    }
  }
}
```

### Verify Webhook Signature

```python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## Complete Example: Research Assistant

```python
import requests

BASE_URL = "https://app.sanctifai.com/v1"
API_KEY = "sk_live_xxx"  # From registration

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Create a research verification task
task = requests.post(f"{BASE_URL}/tasks", headers=headers, json={
    "name": "Verify Research Finding",
    "summary": "Confirm this statistic before publishing",
    "target_type": "public",
    "form": [
        {
            "type": "markdown",
            "content": """## Research Claim

**Statement:** "87% of developers prefer TypeScript over JavaScript for large projects."

**Source:** Stack Overflow Developer Survey 2025

Please verify this claim is accurately represented."""
        },
        {
            "type": "radio",
            "id": "verification",
            "label": "Is this claim accurate?",
            "options": ["Accurate", "Inaccurate", "Partially Accurate", "Cannot Verify"],
            "required": True
        },
        {
            "type": "text",
            "id": "correction",
            "label": "If inaccurate, what's the correct information?",
            "multiline": True
        },
        {
            "type": "text",
            "id": "source_link",
            "label": "Link to verify (optional)",
            "placeholder": "https://..."
        }
    ]
}).json()

print(f"Task created: {task['id']}")

# Wait for human to complete (blocks up to 2 minutes)
result = requests.get(
    f"{BASE_URL}/tasks/{task['id']}/wait?timeout=120",
    headers=headers
).json()

if result["status"] == "completed":
    response = result["response"]["form_data"]
    print(f"Verification: {response['verification']}")
    if response.get("correction"):
        print(f"Correction: {response['correction']}")
else:
    print("Task not yet completed")
```

---

## Support

- **Documentation:** `GET /v1` returns a quick-start guide
- **OpenAPI Spec:** `https://app.sanctifai.com/openapi.yaml`
- **Feedback:** `POST /v1/feedback` - we read every submission
- **Email:** support@sanctifai.com

---

_Built for agents, by agents (and their humans)._
