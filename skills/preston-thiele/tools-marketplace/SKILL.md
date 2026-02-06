---
name: tools-marketplace
description: Use Danube's 100+ API tools (Gmail, GitHub, Notion, etc.) through MCP. Search for tools, check authentication, execute with parameters, and handle errors gracefully.
license: MIT
compatibility: openclaw
metadata:
  author: danube
  version: '1.0.0'
  tags: [danube, mcp, apis, tools]
---

# Using Danube Tools

Access 100+ API tools for Gmail, GitHub, Notion, Google Calendar, and more through Danube's MCP integration.

**Setup:** If not configured yet, run `bash scripts/setup.sh` to add Danube MCP to OpenClaw.

## When to Use

Use Danube when users want to:

- Send emails, create issues, manage calendars
- Interact with cloud services (GitHub, Notion, Google Drive)
- Execute any external API action

**Don't use for:** Local file operations, calculations, or non-API tasks.

## Core Workflow

Every tool interaction follows this pattern:

### 1. Search for Tools

Use `search_tools()` with natural language:

```python
search_tools("send email")        # → Gmail, Outlook
search_tools("create github issue") # → GitHub - Create Issue
search_tools("calendar events")   # → Google Calendar
```

### 2. Check Authentication

If tool requires credentials, guide user to connect:

```
"To use Gmail, you need to connect your account first.

Visit: https://danubeai.com/dashboard
1. Go to Tools section
2. Find Gmail and click 'Connect'
3. Follow the OAuth flow

Let me know when you're ready!"
```

**Always check auth BEFORE attempting execution.**

### 3. Gather Parameters

Ask for missing required parameters:

```
User: "Send an email"
You: "I can help! I need:
     - Who should I send it to?
     - What's the subject?
     - What should the message say?"
```

### 4. Execute Tool

```python
execute_tool(
  tool_id="gmail-send-email-uuid",
  parameters={
    "to": "user@example.com",
    "subject": "Meeting",
    "body": "Confirming our 2pm meeting."
  }
)
```

### 5. Handle Response

**Success:**

```
"✅ Email sent successfully to user@example.com!"
```

**Auth Error:**

```
"🔐 Authentication failed. Reconnect Gmail at:
https://danubeai.com/dashboard → Tools → Gmail"
```

**Other Error:**

```
"⚠️ Failed: [error]. Let me help troubleshoot..."
```

## Common Patterns

### Email Tools

```
User: "Email john@example.com about the project"

1. search_tools("send email") → Find Gmail
2. Check Gmail authentication
3. Extract: to="john@example.com", subject="Project"
4. Ask: "What should the message say?"
5. Confirm: "I'll send email to john@example.com. Proceed?"
6. execute_tool()
7. Report: "✅ Email sent!"
```

### GitHub Tools

```
User: "Create issue about the login bug"

1. search_tools("github create issue")
2. Check GitHub authentication
3. Ask: "Which repository?"
4. Ask: "Describe the bug?"
5. execute_tool()
6. Report: "✅ Issue created: [link]"
```

### Calendar Tools

```
User: "What's on my calendar today?"

1. search_tools("calendar events")
2. Check authentication
3. execute_tool(date=today)
4. Format results:
   "Here's your schedule:
   • 9:00 AM - Team standup
   • 2:00 PM - Client meeting"
```

## Best Practices

### ✅ Do:

- **Search first** - Always use `search_tools()`, don't assume tool IDs
- **Check auth** - Verify credentials before execution
- **Confirm actions** - Get user approval for emails, issues, etc.
- **Be specific** - "Email sent to john@example.com" not just "Done"
- **Handle errors** - Provide solutions, not just error messages

### ❌ Don't:

- Assume tool IDs without searching
- Auto-execute without confirmation
- Give vague responses like "Error" or "Done"
- Skip authentication checks

## Available Tools

| Tool                | Purpose                   |
| ------------------- | ------------------------- |
| `list_services`     | Browse available services |
| `search_tools`      | Find tools by query       |
| `get_service_tools` | List tools for a service  |
| `execute_tool`      | Run tool with parameters  |
| `search_contacts`   | Find user's contacts      |

## Error Handling

**Authentication (401):**

```
"🔐 [Service] requires authentication.
Visit https://danubeai.com/dashboard → Tools → [Service] → Connect"
```

**Missing Parameters:**

```
"I need:
• [param1]: [description]
• [param2]: [description]"
```

**Rate Limit:**

```
"⚠️ Hit rate limit for [Service].
• Try again in a few minutes
• Use alternative service
• Break into smaller batches"
```

## Multi-Step Workflows

Some tasks need multiple tools:

```
User: "Email me a summary of today's GitHub commits"

1. search_tools("github commits") → Get tool
2. execute_tool() → Fetch commits
3. Format into summary
4. search_tools("send email") → Get Gmail
5. execute_tool() → Send email
6. Report: "✅ Sent summary of 5 commits!"
```

## Communication Templates

**Request Auth:**

```
"To use [Service], connect your account:
1. Visit https://danubeai.com/dashboard
2. Tools → [Service] → Connect
3. Come back when ready!"
```

**Confirm Execution:**

```
"I'll [action] using [Tool].
Parameters: [list]
Proceed?"
```

**Report Success:**

```
"✅ Done!
[Specific result]
[Link if applicable]"
```

## Quick Reference

**Workflow:**

```
1. User requests action
2. search_tools() → Find tool
3. Check authentication → Guide if needed
4. Gather parameters → Ask for missing info
5. Confirm → Get approval
6. execute_tool() → Run it
7. Report → Success or error
```

**Key URLs:**

- **MCP Server:** https://mcp.danubeai.com/mcp
- **Dashboard:** https://danubeai.com/dashboard
- **Connect Services:** https://danubeai.com/dashboard → Tools

**Debug:**

- Check API key: `cat ~/.openclaw/.env | grep DANUBE`
- Restart: `openclaw gateway restart`
- Check errors: `openclaw doctor`
