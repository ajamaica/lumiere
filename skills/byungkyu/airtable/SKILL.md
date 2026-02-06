---
name: airtable
description: |
  Airtable API integration with managed OAuth. Manage bases, tables, and records. Use this skill when users want to read, create, update, or delete Airtable records, or query data with filter formulas. For other third party apps, use the api-gateway skill (https://clawhub.ai/byungkyu/api-gateway).
compatibility: Requires network access and valid Maton API key
metadata:
  author: maton
  version: '1.0'
---

# Airtable

Access the Airtable API with managed OAuth authentication. Manage bases, tables, and records with full CRUD operations.

## Quick Start

```bash
# List records from a table
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/airtable/v0/{baseId}/{tableIdOrName}?maxRecords=100')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

## Base URL

```
https://gateway.maton.ai/airtable/{native-api-path}
```

Replace `{native-api-path}` with the actual Airtable API endpoint path. The gateway proxies requests to `api.airtable.com` and automatically injects your OAuth token.

## Authentication

All requests require the Maton API key in the Authorization header:

```
Authorization: Bearer $MATON_API_KEY
```

**Environment Variable:** Set your API key as `MATON_API_KEY`:

```bash
export MATON_API_KEY="YOUR_API_KEY"
```

### Getting Your API Key

1. Sign in or create an account at [maton.ai](https://maton.ai)
2. Go to [maton.ai/settings](https://maton.ai/settings)
3. Copy your API key

## Connection Management

Manage your Airtable OAuth connections at `https://ctrl.maton.ai`.

### List Connections

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections?app=airtable&status=ACTIVE')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Create Connection

```bash
python <<'EOF'
import urllib.request, os, json
data = json.dumps({'app': 'airtable'}).encode()
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
    "url": "https://connect.maton.ai/?session_token=...",
    "app": "airtable",
    "metadata": {}
  }
}
```

Open the returned `url` in a browser to complete OAuth authorization.

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

If you have multiple Airtable connections, specify which one to use with the `Maton-Connection` header:

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/airtable/v0/appXXXXX/TableName')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Maton-Connection', '21fd90f9-5935-43cd-b6c8-bde9d915ca80')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

If omitted, the gateway uses the default (oldest) active connection.

## API Reference

### List Bases

```bash
GET /airtable/v0/meta/bases
```

### Get Base Schema

```bash
GET /airtable/v0/meta/bases/{baseId}/tables
```

### List Records

```bash
GET /airtable/v0/{baseId}/{tableIdOrName}?maxRecords=100
```

With view:

```bash
GET /airtable/v0/{baseId}/{tableIdOrName}?view=Grid%20view&maxRecords=100
```

With filter formula:

```bash
GET /airtable/v0/{baseId}/{tableIdOrName}?filterByFormula={Status}='Active'
```

With field selection:

```bash
GET /airtable/v0/{baseId}/{tableIdOrName}?fields[]=Name&fields[]=Status&fields[]=Email
```

With sorting:

```bash
GET /airtable/v0/{baseId}/{tableIdOrName}?sort[0][field]=Created&sort[0][direction]=desc
```

### Get Record

```bash
GET /airtable/v0/{baseId}/{tableIdOrName}/{recordId}
```

### Create Records

```bash
POST /airtable/v0/{baseId}/{tableIdOrName}
Content-Type: application/json

{
  "records": [
    {
      "fields": {
        "Name": "New Record",
        "Status": "Active",
        "Email": "test@example.com"
      }
    }
  ]
}
```

### Update Records (PATCH - partial update)

```bash
PATCH /airtable/v0/{baseId}/{tableIdOrName}
Content-Type: application/json

{
  "records": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "fields": {
        "Status": "Completed"
      }
    }
  ]
}
```

### Update Records (PUT - full replace)

```bash
PUT /airtable/v0/{baseId}/{tableIdOrName}
Content-Type: application/json

{
  "records": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "fields": {
        "Name": "Updated Name",
        "Status": "Active"
      }
    }
  ]
}
```

### Delete Records

```bash
DELETE /airtable/v0/{baseId}/{tableIdOrName}?records[]=recXXXXX&records[]=recYYYYY
```

## Pagination

Use `pageSize` and `offset` for pagination:

```bash
GET /airtable/v0/{baseId}/{tableIdOrName}?pageSize=50&offset=itrXXXXXXXXXXX
```

Response includes `offset` when more records exist:

```json
{
  "records": [...],
  "offset": "itrXXXXXXXXXXX"
}
```

## Code Examples

### JavaScript

```javascript
const response = await fetch(
  'https://gateway.maton.ai/airtable/v0/appXXXXX/TableName?maxRecords=10',
  {
    headers: {
      Authorization: `Bearer ${process.env.MATON_API_KEY}`,
    },
  },
)
```

### Python

```python
import os
import requests

response = requests.get(
    'https://gateway.maton.ai/airtable/v0/appXXXXX/TableName',
    headers={'Authorization': f'Bearer {os.environ["MATON_API_KEY"]}'},
    params={'maxRecords': 10}
)
```

## Notes

- Base IDs start with `app`
- Table IDs start with `tbl` (can also use table name)
- Record IDs start with `rec`
- Maximum 100 records per request for create/update
- Maximum 10 records per delete request
- Filter formulas use Airtable formula syntax
- IMPORTANT: When using curl commands, use `curl -g` when URLs contain brackets (`fields[]`, `sort[]`, `records[]`) to disable glob parsing
- IMPORTANT: When piping curl output to `jq` or other commands, environment variables like `$MATON_API_KEY` may not expand correctly in some shell environments. You may get "Invalid API key" errors when piping.

## Error Handling

| Status  | Meaning                               |
| ------- | ------------------------------------- |
| 400     | Missing Airtable connection           |
| 401     | Invalid or missing Maton API key      |
| 429     | Rate limited (10 req/sec per account) |
| 4xx/5xx | Passthrough error from Airtable API   |

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

## Resources

- [Airtable API Overview](https://airtable.com/developers/web/api/introduction)
- [List Records](https://airtable.com/developers/web/api/list-records)
- [Create Records](https://airtable.com/developers/web/api/create-records)
- [Update Records](https://airtable.com/developers/web/api/update-record)
- [Delete Records](https://airtable.com/developers/web/api/delete-record)
- [Formula Reference](https://support.airtable.com/docs/formula-field-reference)
