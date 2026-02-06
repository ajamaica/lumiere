---
name: book-math-tutor
description: Book math-tutor services through Lokuli MCP. Use when user needs to find and book math-tutor. Triggers on requests like "book a math-tutor", "find math-tutor near me", or any math-tutor service request.
---

# uook math tutor

Book math-tutor services through Lokuli's MCP server.

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
      "query": "math-tutor",
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
