---
name: quickbooks
description: |
  QuickBooks API integration with managed OAuth. Manage customers, invoices, payments, bills, and run financial reports. Use this skill when users want to interact with QuickBooks accounting data. For other third party apps, use the api-gateway skill (https://clawhub.ai/byungkyu/api-gateway).
compatibility: Requires network access and valid Maton API key
metadata:
  author: maton
  version: '1.0'
---

# QuickBooks

Access the QuickBooks Online API with managed OAuth authentication. Manage customers, vendors, invoices, payments, and run financial reports.

## Quick Start

```bash
# Query customers
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/quickbooks/v3/company/:realmId/query?query=SELECT%20*%20FROM%20Customer%20MAXRESULTS%20100')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

## Base URL

```
https://gateway.maton.ai/quickbooks/{native-api-path}
```

Replace `{native-api-path}` with the actual QuickBooks API endpoint path. The gateway proxies requests to `quickbooks.api.intuit.com`. The `:realmId` placeholder is automatically replaced with your company's realm ID from connection config.

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

Manage your QuickBooks OAuth connections at `https://ctrl.maton.ai`.

### List Connections

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections?app=quickbooks&status=ACTIVE')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

### Create Connection

```bash
python <<'EOF'
import urllib.request, os, json
data = json.dumps({'app': 'quickbooks'}).encode()
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
    "app": "quickbooks",
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

If you have multiple QuickBooks connections, specify which one to use with the `Maton-Connection` header:

```bash
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://gateway.maton.ai/quickbooks/v3/company/:realmId/companyinfo/:realmId')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
req.add_header('Maton-Connection', '21fd90f9-5935-43cd-b6c8-bde9d915ca80')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

If omitted, the gateway uses the default (oldest) active connection.

## API Reference

### Company Info

```bash
GET /quickbooks/v3/company/:realmId/companyinfo/:realmId
```

### Customers

#### Query Customers

```bash
GET /quickbooks/v3/company/:realmId/query?query=SELECT%20*%20FROM%20Customer%20MAXRESULTS%20100
```

#### Get Customer

```bash
GET /quickbooks/v3/company/:realmId/customer/{customerId}
```

#### Create Customer

```bash
POST /quickbooks/v3/company/:realmId/customer
Content-Type: application/json

{
  "DisplayName": "John Doe",
  "PrimaryEmailAddr": {"Address": "john@example.com"},
  "PrimaryPhone": {"FreeFormNumber": "555-1234"}
}
```

#### Update Customer

Requires `Id` and `SyncToken` from previous GET:

```bash
POST /quickbooks/v3/company/:realmId/customer
Content-Type: application/json

{
  "Id": "123",
  "SyncToken": "0",
  "DisplayName": "John Doe Updated"
}
```

### Invoices

#### Query Invoices

```bash
GET /quickbooks/v3/company/:realmId/query?query=SELECT%20*%20FROM%20Invoice%20MAXRESULTS%20100
```

#### Create Invoice

```bash
POST /quickbooks/v3/company/:realmId/invoice
Content-Type: application/json

{
  "CustomerRef": {"value": "123"},
  "Line": [
    {
      "Amount": 100.00,
      "DetailType": "SalesItemLineDetail",
      "SalesItemLineDetail": {
        "ItemRef": {"value": "1"},
        "Qty": 1
      }
    }
  ]
}
```

#### Delete Invoice

```bash
POST /quickbooks/v3/company/:realmId/invoice?operation=delete
Content-Type: application/json

{
  "Id": "123",
  "SyncToken": "0"
}
```

### Payments

#### Create Payment

```bash
POST /quickbooks/v3/company/:realmId/payment
Content-Type: application/json

{
  "CustomerRef": {"value": "123"},
  "TotalAmt": 100.00,
  "Line": [
    {
      "Amount": 100.00,
      "LinkedTxn": [{"TxnId": "456", "TxnType": "Invoice"}]
    }
  ]
}
```

### Reports

#### Profit and Loss

```bash
GET /quickbooks/v3/company/:realmId/reports/ProfitAndLoss?start_date=2024-01-01&end_date=2024-12-31
```

#### Balance Sheet

```bash
GET /quickbooks/v3/company/:realmId/reports/BalanceSheet?date=2024-12-31
```

### Batch Operations

```bash
POST /quickbooks/v3/company/:realmId/batch
Content-Type: application/json

{
  "BatchItemRequest": [
    {"bId": "1", "Query": "SELECT * FROM Customer MAXRESULTS 2"},
    {"bId": "2", "Query": "SELECT * FROM Vendor MAXRESULTS 2"}
  ]
}
```

## Query Language

QuickBooks uses SQL-like queries:

```sql
SELECT * FROM Customer WHERE DisplayName LIKE 'John%' MAXRESULTS 100
```

Operators: `=`, `LIKE`, `<`, `>`, `<=`, `>=`, `IN`

## SyncToken

All updates require the current `SyncToken`:

1. GET the entity to get current `SyncToken`
2. Include `Id` and `SyncToken` in POST body
3. If SyncToken doesn't match, update fails

## Code Examples

### JavaScript

```javascript
const response = await fetch(
  'https://gateway.maton.ai/quickbooks/v3/company/:realmId/query?query=SELECT%20*%20FROM%20Customer',
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
    'https://gateway.maton.ai/quickbooks/v3/company/:realmId/query',
    headers={'Authorization': f'Bearer {os.environ["MATON_API_KEY"]}'},
    params={'query': 'SELECT * FROM Customer MAXRESULTS 10'}
)
```

## Notes

- `:realmId` is automatically replaced by the router
- All queries must be URL-encoded
- Use `MAXRESULTS` to limit query results
- Dates are in `YYYY-MM-DD` format
- Soft delete entities by setting `Active: false`
- IMPORTANT: When using curl commands, use `curl -g` when URLs contain brackets (`fields[]`, `sort[]`, `records[]`) to disable glob parsing
- IMPORTANT: When piping curl output to `jq` or other commands, environment variables like `$MATON_API_KEY` may not expand correctly in some shell environments. You may get "Invalid API key" errors when piping.

## Error Handling

| Status  | Meaning                               |
| ------- | ------------------------------------- |
| 400     | Missing QuickBooks connection         |
| 401     | Invalid or missing Maton API key      |
| 429     | Rate limited (10 req/sec per account) |
| 4xx/5xx | Passthrough error from QuickBooks API |

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

- [QuickBooks API Overview](https://developer.intuit.com/app/developer/qbo/docs/get-started)
- [Customers](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer)
- [Invoices](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice)
- [Payments](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment)
- [Reports](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/report-entities/profitandloss)
