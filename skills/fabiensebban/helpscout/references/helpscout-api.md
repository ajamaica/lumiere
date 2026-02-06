# HelpScout API Documentation Reference

This file contains quick-reference details for interacting with the HelpScout API.

## Authentication

- **Bearer Token**
- Base URL: `https://api.helpscout.net`

Headers:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## Endpoints

### 1. List Conversations

- **Endpoint:** `/v2/conversations`
- **Method:** GET
- **Description:** Fetch a list of all conversations.

### 2. Create Conversation

- **Endpoint:** `/v2/conversations`
- **Method:** POST
- **Body:**

```json
{
  "subject": "Test Conversation",
  "status": "active",
  "type": "email"
}
```

- **Description:** Create a new conversation.

### 3. Update Conversation

- **Endpoint:** `/v2/conversations/{id}`
- **Method:** PATCH
- **Description:** Update an existing conversation using its ID.

## Best Practices

- Use pagination when fetching large datasets.
- Handle rate-limiting errors (HTTP 429) by retrying after a delay.

## References

- Full API Documentation: [HelpScout API Docs](https://developer.helpscout.com/)
