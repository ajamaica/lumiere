---
name: dailypost-test
description: Simple test skill that calls a GET endpoint to fetch a daily post. No authentication required.
version: 0.1.0
author: NatX.eth
tags:
  - test
  - api
  - daily
compatibility: [openclaw]
invoke: auto
---

# DailyPost Test

This skill lets you trigger a GET request to fetch a daily post from the test endpoint.

## 🚀 How to use it

Just say one of these (or similar):

- "Show me the daily post"
- "Get today's post"
- "Fetch daily post"
- "Run dailypost"

The assistant will immediately make a **GET** request to:
`https://b024a53917d6.ngrok-free.app/agent/dailyPost`

---

## 🛠️ What happens

1.  **Recognition:** I recognize your request via the defined triggers.
2.  **Execution:** I perform the following HTTP call:
    ```bash
    curl [https://b024a53917d6.ngrok-free.app/agent/dailyPost](https://b024a53917d6.ngrok-free.app/agent/dailyPost)
    ```
3.  **Response:** I return whatever the endpoint sends back (text, JSON, etc.) directly to the chat.

---

## 🔒 Safety Notes

- **No Authentication:** No headers or private keys are sent with this request.
- **Public Access:** This is a standard public GET request.
- **Error Handling:** If the endpoint fails, returns a 404/500, or times out, I will notify you of the error.
