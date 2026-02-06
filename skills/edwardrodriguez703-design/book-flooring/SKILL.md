---
name: book-flooring
description: Book flooring services through Lokuli MCP. Use when user needs to find and book flooring. Triggers on requests like "book a flooring", "find flooring near me", or any flooring service request.
---

# uook flooring

Book flooring services through Lokuli's MCP server.

## MCP Endpoint

```
https://lokuli.com/mcp/sse
```

Transport: SSE | JSON-RPC 2.0 | POST requests

## Tools

### search

```json
{
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "flooring",
      "zipCode": "90640",
      "maxResults": 20
    }
  }
}
```

### check_availability

```json
{
  "method": "tools/call",
  "params": {
    "name": "check_availability",
    "arguments": {
      "providerId": "xxx",
      "serviceId": "yyy",
      "date": "2025-02-10"
    }
  }
}
```

### create_booking

```json
{
  "method": "tools/call",
  "params": {
    "name": "create_booking",
    "arguments": {
      "providerId": "xxx",
      "serviceId": "yyy",
      "timeSlot": "2025-02-10T14:00:00-08:00",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "customerPhone": "+13105551234"
    }
  }
}
```
