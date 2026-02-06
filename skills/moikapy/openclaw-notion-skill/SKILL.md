---
name: notion
version: 0.1.0
description: Integrate with Notion workspaces to read pages, query databases, create entries, and manage content. Perfect for knowledge bases, project tracking, content calendars, CRMs, and collaborative documentation. Works with any Notion page or database you explicitly share with the integration.
---

# Notion Integration

Connect your Notion workspace to OpenClaw for seamless knowledge management and project tracking.

## When to Use This Skill

Use Notion when the user wants to:

- **Add items to a database** (backlog, todos, tracking)
- **Create new pages** in a database or as children of existing pages
- **Query/search** their Notion workspace for information
- **Update existing pages** (status, notes, properties)
- **Read page content** or database entries

## Setup

### 1. Create Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name it (e.g., "OpenClaw")
4. Select your workspace
5. Copy the **Internal Integration Token** (starts with `secret_`)
6. Save this token securely in OpenClaw config or environment: `NOTION_TOKEN=secret_...`

### 2. Share Pages with Integration

**Important:** Notion integrations have NO access by default. You must explicitly share:

1. Go to any page or database in Notion
2. Click **Share** → **Add connections**
3. Select your "OpenClaw" integration
4. The skill can now read/write to that specific page/database

### 3. Get Database/Page IDs

**From URL:**

- Database: `https://www.notion.so/workspace/XXXXXXXX?v=...` → ID is `XXXXXXXX` (32 chars)
- Page: `https://www.notion.so/workspace/XXXXXXXX` → ID is `XXXXXXXX`

**Note:** Remove hyphens when using IDs. Use the 32-character string.

## Core Operations

### Query Database

Retrieve entries from any database you've shared.

```typescript
// Using the Notion skill via exec
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js query-database ${databaseId}`,
})

// With filters (example: status = "In Progress")
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js query-database ${databaseId} --filter '{"property":"Status","select":{"equals":"In Progress"}}'`,
})
```

**Returns:** Array of pages with properties as configured in your database.

### Add Database Entry

Create a new row in a database.

```typescript
// Add entry with multiple properties
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js add-entry ${databaseId} \
    --title "My New Content Idea" \
    --properties '${JSON.stringify({
      Status: { select: { name: 'Idea' } },
      Platform: { multi_select: [{ name: 'X/Twitter' }] },
      Tags: { multi_select: [{ name: '3D Printing' }, { name: 'AI' }] },
      Priority: { select: { name: 'High' } },
    })}'`,
})
```

### Get Page Content

Read the content of any page (including database entries).

```typescript
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js get-page ${pageId}`,
})
```

**Returns:** Page title, properties, and block content (text, headings, lists, etc.).

### Update Page

Modify properties or append content to an existing page.

```typescript
// Update properties
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js update-page ${pageId} \
    --properties '${JSON.stringify({
      Status: { select: { name: 'In Progress' } },
    })}'`,
})

// Append content blocks
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js append-body ${pageId} \
    --text "Research Notes" --type h2`,
})
```

### Search Notion

Find pages across your shared workspace.

```typescript
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js search "content ideas"`,
})
```

## Common Use Cases

### Content Pipeline (Content Creator Workflow)

**Database Structure:**

- Title (title)
- Status (select: Idea → Draft → Scheduled → Posted)
- Platform (multi_select: X/Twitter, YouTube, MakerWorld, Blog)
- Publish Date (date)
- Tags (multi_select)
- Draft Content (rich_text)

**OpenClaw Integration:**

```typescript
// Research scout adds findings to Notion
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js add-entry ${contentDbId} \
    --title "New 3D Print Technique" \
    --properties '${JSON.stringify({
      Status: { select: { name: 'Idea' } },
      Platform: { multi_select: [{ name: 'YouTube' }] },
      Tags: { multi_select: [{ name: '3D Printing' }] },
    })}'`,
})

// Later: Update when drafting
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js update-page ${entryId} \
    --properties '${JSON.stringify({
      Status: { select: { name: 'Draft' } },
      'Draft Content': { rich_text: [{ text: { content: 'Draft text here...' } }] },
    })}'`,
})
```

### Project Management (Solo Entrepreneur)

**Database Structure:**

- Name (title)
- Status (select: Not Started → In Progress → Blocked → Done)
- Priority (select: Low → Medium → High → Critical)
- Due Date (date)
- Estimated Hours (number)
- Actual Hours (number)
- Links (url)
- Notes (rich_text)

**Weekly Review Integration:**

```typescript
// Query all "In Progress" projects
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js query-database ${projectsDbId} --filter '{"property":"Status","select":{"equals":"In Progress"}}'`,
})
```

### Customer/Quote CRM (3D Printing Business)

**Database Structure:**

- Customer Name (title)
- Status (select: Lead → Quote Sent → Ordered → Printing → Shipped)
- Email (email)
- Quote Value (number)
- Filament Type (select)
- Due Date (date)
- Shopify Order ID (rich_text)

**Shopify Integration:**

```typescript
// New order → create CRM entry
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js add-entry ${crmDbId} \
    --title "${customerName}" \
    --properties '${JSON.stringify({
      Status: { select: { name: 'Ordered' } },
      Email: { email: customerEmail },
      'Shopify Order ID': { rich_text: [{ text: { content: orderId } }] },
    })}'`,
})
```

### Knowledge Base (Wiki Replacement for MEMORY.md)

**Structure:** Hub page with nested pages:

- 🏠 Home (shared with integration)
  - SOPs
  - Troubleshooting
  - Design Patterns
  - Resource Links

**Query for quick reference:**

```typescript
// Search for "stringing" to find 3D print troubleshooting
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js search "stringing"`,
})
```

## Property Types Reference

When creating/updating database entries, use these property value formats:

```typescript
// Title (always required for new pages)
{ "title": [{ "text": { "content": "Page Title" } }] }

// Select (single choice)
{ "select": { "name": "Option Name" } }

// Multi-select (multiple choices)
{ "multi_select": [{ "name": "Tag 1" }, { "name": "Tag 2" }] }

// Status (for new Status property type)
{ "status": { "name": "In progress" } }

// Text / Rich text
{ "rich_text": [{ "text": { "content": "Your text here" } }] }

// Number
{ "number": 42 }

// Date
{ "date": { "start": "2026-02-15" } }
{ "date": { "start": "2026-02-15T10:00:00", "end": "2026-02-15T12:00:00" } }

// Checkbox
{ "checkbox": true }

// Email
{ "email": "user@example.com" }

// URL
{ "url": "https://example.com" }

// Phone
{ "phone_number": "+1-555-123-4567" }

// Relation (link to another database entry)
{ "relation": [{ "id": "related-page-id-32chars" }] }
```

## Security & Permissions

**Critical Security Model:**

- ✅ Integration ONLY sees pages you explicitly share
- ✅ You control access per page/database
- ✅ Token stored securely in `~/.openclaw/.env` (never in code)
- ❌ Never commit `NOTION_TOKEN` to git
- ❌ Integration cannot access private teamspaces or other users' private pages

**Best Practices:**

1. Use a dedicated integration (don't reuse personal integrations)
2. Share minimum necessary pages (granular > broad)
3. Rotate token if compromised via Notion integration settings
4. Review shared connections periodically

## Environment Setup

Add to `~/.openclaw/.env`:

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or set per-command:

```bash
NOTION_TOKEN=secret_xxx node notion-cli.js ...
```

## Error Handling

Common errors and fixes:

| Error                  | Cause                              | Fix                                      |
| ---------------------- | ---------------------------------- | ---------------------------------------- |
| "API token is invalid" | Wrong token or integration deleted | Check token at notion.so/my-integrations |
| "object_not_found"     | Page not shared with integration   | Share page: Share → Add connections      |
| "validation_error"     | Property format incorrect          | Check property type in database          |
| "rate_limited"         | Too many requests                  | Add delay between requests               |

## Quick Install (One Command)

```bash
cd ~/.agents/skills/notion
./install.sh
```

**Manual install (if above fails):**

```bash
cd ~/.agents/skills/notion
npm install
```

That's it! No build step required for the standalone version.

## Quick Test

```bash
# After setting NOTION_TOKEN in ~/.openclaw/.env
node notion-cli.js test
```

## Smart ID Resolution

Reference entries by **Notion auto-ID** (e.g., `#3`) or **direct UUID**.

### By Notion ID (Recommended for Manual Use)

Use the number you see in your database's ID column:

```bash
# Get entry #3
node notion-cli.js get-page '#3' DATABASE_ID

# Add content to entry #3
node notion-cli.js append-body '#3' --database DATABASE_ID \
  --text "Research notes" --type h2

# Add bullet to entry #3
node notion-cli.js append-body '#3' --database DATABASE_ID \
  --text "Key finding" --type bullet
```

### By Direct UUID (For Automation)

```bash
# Using full UUID from Notion URL
node notion-cli.js get-page 2fb3e4ac...
node notion-cli.js append-body 2fb3e4ac... \
  --text "Content" --type paragraph
```

**Auto-detection:** Starts with `#` = Notion ID lookup. 32-char hex = Direct UUID.

**Pro Tip:** Add an `ID` property (type: unique ID) to auto-number entries as #1, #2, #3...

## Page Body Editing

Add rich content to page bodies, not just properties.

### Append Content Blocks

```bash
# Add heading
node notion-cli.js append-body PAGE_ID --text "Research Summary" --type h2

# Add paragraph (default)
node notion-cli.js append-body PAGE_ID --text "Detailed findings go here..."

# Add bullet list item
node notion-cli.js append-body PAGE_ID --text "First key finding" --type bullet

# Add numbered list item
node notion-cli.js append-body PAGE_ID --text "Step one description" --type numbered

# Add TODO checkbox
node notion-cli.js append-body PAGE_ID --text "Create video script" --type todo

# Add quote
node notion-cli.js append-body PAGE_ID --text "Important quote from source" --type quote

# Add code block
node notion-cli.js append-body PAGE_ID --text "const result = optimizeSupports();" --type code --lang javascript
```

### Supported Block Types

| Type             | Description            | Example Use                |
| ---------------- | ---------------------- | -------------------------- |
| `paragraph`      | Regular text (default) | Descriptions, explanations |
| `h1`, `h2`, `h3` | Headings               | Section organization       |
| `bullet`         | Bulleted list          | Key findings, features     |
| `numbered`       | Numbered list          | Step-by-step instructions  |
| `todo`           | Checkbox item          | Action items, tasks        |
| `quote`          | Blockquote             | Source citations           |
| `code`           | Code block             | Snippets, commands         |
| `divider`        | Horizontal line        | Section separation         |

### Get Page with Body Content

```bash
# Get full page including formatted body
node notion-cli.js get-page PAGE_ID
```

Returns:

- Page properties
- Formatted body blocks (type + content preview)
- Block count

### Advanced: Raw JSON Blocks

For complex layouts, use raw Notion block JSON:

```bash
node notion-cli.js append-body PAGE_ID --blocks '[
  {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"Research Notes"}}]}},
  {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Finding 1"}}]}},
  {"object":"block","type":"code","code":{"rich_text":[{"text":{"content":"console.log(1)"}}],"language":"javascript"}}
]'
```

## Advanced: Webhook Sync

For bidirectional sync (Notion changes → OpenClaw):

1. Set up Notion webhook integration (requires Notion partner account)
2. Configure webhook endpoint to your OpenClaw Gateway
3. Skill processes incoming webhooks and updates memory files

See [references/webhooks.md](references/webhooks.md) for implementation details.

---

**Need help?** Check your Notion integration settings at https://www.notion.so/my-integrations

## Using in OpenClaw

### Quick Setup

```bash
# 1. Install
cd ~/.agents/skills/notion
npm install

# 2. Configure token
echo "NOTION_TOKEN=secret_xxxxxxxxxx" >> ~/.openclaw/.env

# 3. Test connection
node notion-cli.js test
```

### From OpenClaw Agent

```typescript
// Query database
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js query-database YOUR_DB_ID`,
})

// Add entry
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js add-entry YOUR_DB_ID \\
    --title "New Content Idea" \\
    --properties '{"Status":{"select":{"name":"Idea"}}}'`,
})

// Search
await exec({
  command: `node ~/.agents/skills/notion/notion-cli.js search "tree support"`,
})
```

### Cron Job Usage

Update your Research Topic Scout to push to Notion:

```typescript
"message": "Research trends and add to Notion:
  node ~/.agents/skills/notion/notion-cli.js add-entry DB_ID
    --title '<title>'
    --properties '{...,\"Platform\":{\"multi_select\":[{\"name\":\"X\"}]}}'"
```
