# 💡 Automation Examples

Practical, copy-paste examples for common workflows.

## Examples Included

| Example                        | Description                               |
| ------------------------------ | ----------------------------------------- |
| `content-scout-example.js`     | Research trends → Add to Content Pipeline |
| `weekly-priorities-example.js` | Review projects → Flag weekly goals       |
| `shopify-to-crm-example.js`    | Webhook handler: New order → CRM entry    |

## Quick Reference

### Get Database Schema

```bash
node notion-cli.js get-database YOUR_DB_ID
```

### Query with Filters

```bash
node notion-cli.js query-database YOUR_DB_ID \
  --filter '{"property":"Status","select":{"equals":"Idea"}}'
```

### Add Entry

```bash
node notion-cli.js add-entry YOUR_DB_ID \
  --title "My Title" \
  --properties '{"Status":{"select":{"name":"Active"}}}'
```

### Update Entry

```bash
node notion-cli.js update-page PAGE_ID \
  --properties '{"Status":{"select":{"name":"Complete"}}}'
```

## Environment Setup

Add to `~/.openclaw/.env`:

```bash
NOTION_TOKEN=secret_xxxxxxxxxx
CONTENT_DB_ID=abc123...
PROJECT_DB_ID=def456...
```

Then load in scripts:

```javascript
require('dotenv').config({
  path: require('path').join(require('os').homedir(), '.openclaw', '.env'),
})
```
