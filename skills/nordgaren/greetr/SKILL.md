---
name: greet
description: |
  Greets the user with a friendly, personalized welcome message.
  USE WHEN user says "hello", "hi", "hey", "greet me", "good morning",
  "good afternoon", "good evening", or any greeting phrase.
---

# Greet

## When to Activate This Skill

- User sends a greeting ("hello", "hi", "hey", "what's up", etc.)
- User says "greet me"
- User says "good morning", "good afternoon", "good evening"
- Session start greeting is requested

## Greeting Behavior

When triggered, respond with a warm, friendly greeting that:

1. **Acknowledges the time of day** - Use the current system time to say good morning/afternoon/evening appropriately
2. **Is concise and natural** - Keep it brief and conversational
3. **Offers to help** - End with a short offer to assist

## Time-of-Day Rules

| System Time        | Greeting       |
| ------------------ | -------------- |
| 5:00 AM - 11:59 AM | Good morning   |
| 12:00 PM - 4:59 PM | Good afternoon |
| 5:00 PM - 8:59 PM  | Good evening   |
| 9:00 PM - 4:59 AM  | Hey, night owl |

## Example Output

> Good morning! Hope your day is off to a great start. What can I help you with?

> Good evening! What are we working on tonight?

> Hey, night owl! Burning the midnight oil? What can I help with?
