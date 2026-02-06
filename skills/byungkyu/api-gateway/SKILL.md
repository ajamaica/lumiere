---
name: api-gateway
description: |
  API gateway for calling third-party APIs with managed auth. Use this skill when users want to interact with external services like Slack, HubSpot, Salesforce, Google Workspace, Stripe, and more.
compatibility: Requires network access and valid Maton API key
metadata:
  author: maton
  version: '1.0'
---

# API Gateway

Passthrough proxy for direct access to third-party APIs using managed auth connections. The API gateway lets you call native API endpoints directly.

## Quick Start

```bash
# Native Slack API call
python <<'EOF'
import urllib.request, os, json
data = json.dumps({'channel': 'C0123456', 'text': 'Hello from gateway!'}).encode()
req = urllib.request.Request('https://gateway.maton.ai/slack/api/chat.postMessage', data=data, method='POST')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

> **IMPORTANT: If you receive a 500 Internal Server Error**, this does NOT mean the service is unsupported. The most common cause is an expired OAuth refresh token (connections older than 1 month). See the "Troubleshooting 500 Internal Server Error" section below to create a new connection and retry with the new connection ID.

## Base URL

```
https://gateway.maton.ai/{app}/{native-api-path}
```

Replace `{app}` with the service name and `{native-api-path}` with the actual API endpoint path.

## Authentication

All requests require the Maton API key in the Authorization header:

```
Authorization: Bearer $MATON_API_KEY
```

The API gateway automatically injects the appropriate OAuth token for the target service.

**Environment Variable:** You can set your API key as the `MATON_API_KEY` environment variable:

```bash
export MATON_API_KEY="YOUR_API_KEY"
```

## Getting Your API Key

1. Sign in or create an account at [maton.ai](https://maton.ai)
2. Go to [maton.ai/settings](https://maton.ai/settings)
3. Click the copy button on the right side of API Key section to copy it

## Connection Management

Connection management uses a separate base URL: `https://ctrl.maton.ai`

### List Connections

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections?app=slack&status=ACTIVE')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

**Query Parameters (optional):**

- `app` - Filter by service name (e.g., `slack`, `hubspot`, `salesforce`)
- `status` - Filter by connection status (`ACTIVE`, `PENDING`, `FAILED`)

**Response:**

```json
{
  "connections": [
    {
      "connection_id": "21fd90f9-5935-43cd-b6c8-bde9d915ca80",
      "status": "ACTIVE",
      "creation_time": "2025-12-08T07:20:53.488460Z",
      "last_updated_time": "2026-01-31T20:03:32.593153Z",
      "url": "https://connect.maton.ai/?session_token=5e9...",
      "app": "slack",
      "metadata": {}
    }
  ]
}
```

### Create Connection

```bash
python <<'EOF'
import urllib.request, os, json
data = json.dumps({'app': 'slack'}).encode()
req = urllib.request.Request('https://ctrl.maton.ai/connections', data=data, method='POST')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Get Connection

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections/{connection_id}')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

**Response:**

```json
{
  "connection": {
    "connection_id": "21fd90f9-5935-43cd-b6c8-bde9d915ca80",
    "status": "ACTIVE",
    "creation_time": "2025-12-08T07:20:53.488460Z",
    "last_updated_time": "2026-01-31T20:03:32.593153Z",
    "url": "https://connect.maton.ai/?session_token=5e9...",
    "app": "slack",
    "metadata": {}
  }
}
```

Open the returned URL in a browser to complete OAuth.

### Delete Connection

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections/{connection_id}', method='DELETE')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Specifying Connection

If you have multiple connections for the same app, you can specify which connection to use by adding the `Maton-Connection` header with the connection ID:

```bash
python <<'EOF'
import urllib.request, os, json
data = json.dumps({'channel': 'C0123456', 'text': 'Hello!'}).encode()
req = urllib.request.Request('https://gateway.maton.ai/slack/api/chat.postMessage', data=data, method='POST')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
req.add_header('Maton-Connection', '21fd90f9-5935-43cd-b6c8-bde9d915ca80')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

If omitted, the gateway uses the default (oldest) active connection for that app.

## Supported Services

| Service                | App Name                 | Base URL Proxied                  |
| ---------------------- | ------------------------ | --------------------------------- |
| Airtable               | `airtable`               | `api.airtable.com`                |
| Apollo                 | `apollo`                 | `api.apollo.io`                   |
| Asana                  | `asana`                  | `app.asana.com`                   |
| Attio                  | `attio`                  | `api.attio.com`                   |
| Calendly               | `calendly`               | `api.calendly.com`                |
| Chargebee              | `chargebee`              | `{subdomain}.chargebee.com`       |
| ClickUp                | `clickup`                | `api.clickup.com`                 |
| Fathom                 | `fathom`                 | `api.fathom.ai`                   |
| GitHub                 | `github`                 | `api.github.com`                  |
| Google Ads             | `google-ads`             | `googleads.googleapis.com`        |
| Google Analytics Admin | `google-analytics-admin` | `analyticsadmin.googleapis.com`   |
| Google Analytics Data  | `google-analytics-data`  | `analyticsdata.googleapis.com`    |
| Google Calendar        | `google-calendar`        | `www.googleapis.com`              |
| Google Docs            | `google-docs`            | `docs.googleapis.com`             |
| Google Drive           | `google-drive`           | `www.googleapis.com`              |
| Google Forms           | `google-forms`           | `forms.googleapis.com`            |
| Gmail                  | `google-mail`            | `gmail.googleapis.com`            |
| Google Meet            | `google-meet`            | `meet.googleapis.com`             |
| Google Play            | `google-play`            | `androidpublisher.googleapis.com` |
| Google Search Console  | `google-search-console`  | `www.googleapis.com`              |
| Google Sheets          | `google-sheets`          | `sheets.googleapis.com`           |
| Google Slides          | `google-slides`          | `slides.googleapis.com`           |
| HubSpot                | `hubspot`                | `api.hubapi.com`                  |
| Jira                   | `jira`                   | `api.atlassian.com`               |
| JotForm                | `jotform`                | `api.jotform.com`                 |
| Klaviyo                | `klaviyo`                | `a.klaviyo.com`                   |
| Linear                 | `linear`                 | `api.linear.app`                  |
| Mailchimp              | `mailchimp`              | `{dc}.api.mailchimp.com`          |
| Monday.com             | `monday`                 | `api.monday.com`                  |
| Notion                 | `notion`                 | `api.notion.com`                  |
| Outlook                | `outlook`                | `graph.microsoft.com`             |
| Pipedrive              | `pipedrive`              | `api.pipedrive.com`               |
| QuickBooks             | `quickbooks`             | `quickbooks.api.intuit.com`       |
| Salesforce             | `salesforce`             | `{instance}.salesforce.com`       |
| Slack                  | `slack`                  | `slack.com`                       |
| Stripe                 | `stripe`                 | `api.stripe.com`                  |
| Trello                 | `trello`                 | `api.trello.com`                  |
| Typeform               | `typeform`               | `api.typeform.com`                |
| WhatsApp Business      | `whatsapp-business`      | `graph.facebook.com`              |
| WooCommerce            | `woocommerce`            | `{store-url}/wp-json/wc/v3`       |
| Xero                   | `xero`                   | `api.xero.com`                    |
| YouTube                | `youtube`                | `www.googleapis.com`              |
| Zoho Bigin             | `zoho-bigin`             | `www.zohoapis.com`                |
| Zoho Books             | `zoho-books`             | `www.zohoapis.com`                |
| Zoho Calendar          | `zoho-calendar`          | `calendar.zoho.com`               |
| Zoho CRM               | `zoho-crm`               | `www.zohoapis.com`                |
| Zoho Inventory         | `zoho-inventory`         | `www.zohoapis.com`                |
| Zoho Mail              | `zoho-mail`              | `mail.zoho.com`                   |
| Zoho People            | `zoho-people`            | `people.zoho.com`                 |
| Zoho Recruit           | `zoho-recruit`           | `recruit.zoho.com`                |

See [references/](references/) for detailed routing guides per provider:

- [Airtable](references/airtable.md) - Records, bases, tables
- [Apollo](references/apollo.md) - People search, enrichment, contacts
- [Asana](references/asana.md) - Tasks, projects, workspaces, webhooks
- [Attio](references/attio.md) - People, companies, records, tasks
- [Calendly](references/calendly.md) - Event types, scheduled events, availability, webhooks
- [Chargebee](references/chargebee.md) - Subscriptions, customers, invoices
- [ClickUp](references/clickup.md) - Tasks, lists, folders, spaces, webhooks
- [Fathom](references/fathom.md) - Meeting recordings, transcripts, summaries, webhooks
- [GitHub](references/github.md) - Repositories, issues, pull requests, commits
- [Google Ads](references/google-ads.md) - Campaigns, ad groups, GAQL queries
- [Google Analytics Admin](references/google-analytics-admin.md) - Reports, dimensions, metrics
- [Google Analytics Data](references/google-analytics-data.md) - Reports, dimensions, metrics
- [Google Calendar](references/google-calendar.md) - Events, calendars, free/busy
- [Google Docs](references/google-docs.md) - Document creation, batch updates
- [Google Drive](references/google-drive.md) - Files, folders, permissions
- [Google Forms](references/google-forms.md) - Forms, questions, responses
- [Gmail](references/google-mail.md) - Messages, threads, labels
- [Google Meet](references/google-meet.md) - Spaces, conference records, participants
- [Google Play](references/google-play.md) - In-app products, subscriptions, reviews
- [Google Search Console](references/google-search-console.md) - Search analytics, sitemaps
- [Google Sheets](references/google-sheets.md) - Values, ranges, formatting
- [Google Slides](references/google-slides.md) - Presentations, slides, formatting
- [HubSpot](references/hubspot.md) - Contacts, companies, deals
- [Jira](references/jira.md) - Issues, projects, JQL queries
- [JotForm](references/jotform.md) - Forms, submissions, webhooks
- [Klaviyo](references/klaviyo.md) - Profiles, lists, campaigns, flows, events
- [Linear](references/linear.md) - Issues, projects, teams, cycles (GraphQL)
- [Mailchimp](references/mailchimp.md) - Audiences, campaigns, templates, automations
- [Monday.com](references/monday.md) - Boards, items, columns, groups (GraphQL)
- [Notion](references/notion.md) - Pages, databases, blocks
- [Outlook](references/outlook.md) - Mail, calendar, contacts
- [Pipedrive](references/pipedrive.md) - Deals, persons, organizations, activities
- [QuickBooks](references/quickbooks.md) - Customers, invoices, reports
- [Salesforce](references/salesforce.md) - SOQL, sObjects, CRUD
- [Slack](references/slack.md) - Messages, channels, users
- [Stripe](references/stripe.md) - Customers, subscriptions, payments
- [Trello](references/trello.md) - Boards, lists, cards, checklists
- [Typeform](references/typeform.md) - Forms, responses, insights
- [WhatsApp Business](references/whatsapp-business.md) - Messages, templates, media
- [WooCommerce](references/woocommerce.md) - Products, orders, customers, coupons
- [Xero](references/xero.md) - Contacts, invoices, reports
- [YouTube](references/youtube.md) - Videos, playlists, channels, subscriptions
- [Zoho Bigin](references/zoho-bigin.md) - Contacts, companies, pipelines, products
- [Zoho Books](references/zoho-books.md) - Invoices, contacts, bills, expenses
- [Zoho Calendar](references/zoho-calendar.md) - Calendars, events, attendees, reminders
- [Zoho CRM](references/zoho-crm.md) - Leads, contacts, accounts, deals, search
- [Zoho Inventory](references/zoho-inventory.md) - Items, sales orders, invoices, purchase orders, bills
- [Zoho Mail](references/zoho-mail.md) - Messages, folders, labels, attachments
- [Zoho People](references/zoho-people.md) - Employees, departments, designations, attendance, leave
- [Zoho Recruit](references/zoho-recruit.md) - Candidates, job openings, interviews, applications

## Examples

### Slack - Post Message (Native API)

```bash
# Native Slack API: POST https://slack.com/api/chat.postMessage
python <<'EOF'
import urllib.request, os, json
data = json.dumps({'channel': 'C0123456', 'text': 'Hello!'}).encode()
req = urllib.request.Request('https://gateway.maton.ai/slack/api/chat.postMessage', data=data, method='POST')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Content-Type', 'application/json; charset=utf-8')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### HubSpot - Create Contact (Native API)

```bash
# Native HubSpot API: POST https://api.hubapi.com/crm/v3/objects/contacts
python <<'EOF'
import urllib.request, os, json
data = json.dumps({'properties': {'email': 'john@example.com', 'firstname': 'John', 'lastname': 'Doe'}}).encode()
req = urllib.request.Request('https://gateway.maton.ai/hubspot/crm/v3/objects/contacts', data=data, method='POST')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Google Sheets - Get Spreadsheet Values (Native API)

```bash
# Native Sheets API: GET https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/google-sheets/v4/spreadsheets/122BS1sFN2RKL8AOUQjkLdubzOwgqzPT64KfZ2rvYI4M/values/Sheet1!A1:B2')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Salesforce - SOQL Query (Native API)

```bash
# Native Salesforce API: GET https://{instance}.salesforce.com/services/data/v64.0/query?q=...
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/salesforce/services/data/v64.0/query?q=SELECT+Id,Name+FROM+Contact+LIMIT+10')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Airtable - List Tables (Native API)

```bash
# Native Airtable API: GET https://api.airtable.com/v0/meta/bases/{id}/tables
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/airtable/v0/meta/bases/appgqan2NzWGP5sBK/tables')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Notion - Query Database (Native API)

```bash
# Native Notion API: POST https://api.notion.com/v1/data_sources/{id}/query
python <<'EOF'
import urllib.request, os, json
data = json.dumps({}).encode()
req = urllib.request.Request('https://gateway.maton.ai/notion/v1/data_sources/23702dc5-9a3b-8001-9e1c-000b5af0a980/query', data=data, method='POST')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
req.add_header('Notion-Version', '2025-09-03')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Stripe - List Customers (Native API)

```bash
# Native Stripe API: GET https://api.stripe.com/v1/customers
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/stripe/v1/customers?limit=10')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

## Code Examples

### JavaScript (Node.js)

```javascript
const response = await fetch('https://gateway.maton.ai/slack/api/chat.postMessage', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.MATON_API_KEY}`,
  },
  body: JSON.stringify({ channel: 'C0123456', text: 'Hello!' }),
})
```

### Python

```python
import os
import requests

response = requests.post(
    'https://gateway.maton.ai/slack/api/chat.postMessage',
    headers={'Authorization': f'Bearer {os.environ["MATON_API_KEY"]}'},
    json={'channel': 'C0123456', 'text': 'Hello!'}
)
```

## Error Handling

| Status  | Meaning                                           |
| ------- | ------------------------------------------------- |
| 400     | Missing connection for the requested app          |
| 401     | Invalid or missing Maton API key                  |
| 429     | Rate limited (10 requests/second per account)     |
| 500     | Internal Server Error (see troubleshooting below) |
| 4xx/5xx | Passthrough error from the target API             |

Errors from the target API are passed through with their original status codes and response bodies.

### Troubleshooting: Invalid API Key

**When you receive a "Invalid API key" error, ALWAYS follow these steps before concluding there is an issue:**

1. Check that the `MATON_API_KEY` environment variable is set:

```bash
echo $MATON_API_KEY
```

2. Verify the API key is valid by listing connections:

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Troubleshooting 500 Internal Server Error

**IMPORTANT:** A 500 Internal Server Error does NOT mean the service is unsupported. If the app is listed in the Supported Services table above, the error is likely due to an expired OAuth refresh token.

**When you receive a 500 Internal Server Error, ALWAYS follow these steps before concluding there is an issue:**

Connections that have been active for more than 1 month may have expired OAuth refresh tokens. To resolve:

1. Create a new connection for the app:

```bash
python <<'EOF'
import urllib.request, os, json
data = json.dumps({'app': 'APP_NAME'}).encode()
req = urllib.request.Request('https://ctrl.maton.ai/connections', data=data, method='POST')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

2. Get the OAuth URL by calling the GET connection endpoint with the new connection ID from step 1:

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections/NEW_CONNECTION_ID')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

3. Share the returned `url` with the user and ask them to complete the OAuth flow in their browser.

4. After the user completes OAuth, retry the original request using the new connection ID via the `Maton-Connection` header:

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/APP_NAME/...')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Maton-Connection', 'NEW_CONNECTION_ID')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

5. Once the new connection status is `ACTIVE` and working, ask the user if they want to delete the old connection:

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections/OLD_CONNECTION_ID', method='DELETE')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

## Rate Limits

- 10 requests per second per account
- Target API rate limits also apply

## Notes

- IMPORTANT: When using curl commands, use `curl -g` when URLs contain brackets (`fields[]`, `sort[]`, `records[]`) to disable glob parsing
- IMPORTANT: When piping curl output to `jq` or other commands, environment variables like `$MATON_API_KEY` may not expand correctly in some shell environments. You may get "Invalid API key" errors when piping.

## Tips

1. **Use native API docs**: Refer to each service's official API documentation for endpoint paths and parameters.

2. **Headers are forwarded**: Custom headers (except `Host` and `Authorization`) are forwarded to the target API.

3. **Query params work**: URL query parameters are passed through to the target API.

4. **All HTTP methods supported**: GET, POST, PUT, PATCH, DELETE are all supported.

5. **QuickBooks special case**: Use `:realmId` in the path and it will be replaced with the connected realm ID.

## Optional

- [Github](https://github.com/maton-ai/api-gateway-skill)
- [Documentation](https://www.maton.ai/docs/api-reference)
- [Community](https://discord.com/invite/dBfFAcefs2)
