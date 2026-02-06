# EchoDecks External API Documentation (v1.0)

## Overview

The EchoDecks External API allows third-party integrations to manage flashcards, generate AI content, and handle study sessions using a service-level API key.

## Authentication

All requests must include the following header:
`X-API-KEY: sk_echo_...`

## Endpoints

### 1. User Profile

- **Endpoint**: `GET ?resource=user`
- **Description**: Returns user ID, email, credit balance, and aggregate study stats.

### 2. Decks

- **List All**: `GET ?resource=decks`
- **Create**: `POST ?resource=decks` (Body: `name`, `description`)
- **Detail**: `GET ?resource=decks&id={id}`

### 3. Flashcards

- **List in Deck**: `GET ?resource=cards&deck_id={deck_id}`
- **Detail**: `GET ?resource=cards&id={id}`

### 4. AI Flashcard Generation

- **Endpoint**: `POST ?resource=generate&action=cards`
- **Body**: `deck_id`, `topic` (string) OR `text` (long string)
- **Cost**: 10 Credits

### 5. Podcast Generation

- **Start Generation**: `POST ?resource=podcasts&action=generate`
- **Body**: `deck_id`, `style` ("summary" | "conversation")
- **Poll Status**: `GET ?resource=podcasts&action=status&id={podcast_id}`
- **Cost**: 50 Credits

### 6. Study & Reviews

- **Submit Review**: `POST ?resource=study&action=submit`
- **Body**: `card_id`, `quality` (0-3)
- **Study Link**: `GET ?resource=study&action=link&deck_id={deck_id}`
- **Sync Session**: `POST ?resource=study&action=session` (Body: `deck_id`, `cards_studied`, `cards_correct`)

## Errors

- `401 Unauthorized`: Invalid API Key.
- `402 Payment Required`: Insufficient Credits.
- `404 Not Found`: Resource or Deck missing.
- `500 Server Error`: Internal issues.
