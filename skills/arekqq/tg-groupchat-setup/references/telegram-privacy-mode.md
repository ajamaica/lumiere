# Telegram Bot Privacy Mode

## What is it?

Privacy mode controls whether a bot receives ALL messages in a group or only specific ones.

- **ON (default):** Bot receives only messages that @mention it, replies to its messages, or commands (/).
- **OFF:** Bot receives all messages in the group.

## Why disable it?

With privacy mode ON, the bot cannot see conversational context. If users mention the bot by name (e.g., "Hey Botname") instead of using @username, the message won't be delivered at all.

With privacy mode OFF + `requireMention: true` in MoltBot config, the bot sees all messages (for context) but only responds when mentioned. Best of both worlds.

## How to disable

1. Open Telegram, message **@BotFather**
2. Send `/mybots`
3. Select your bot
4. Tap **Bot Settings**
5. Tap **Group Privacy**
6. Tap **Turn off**

BotFather confirms: "Privacy mode is **disabled** for [bot]."

## Important notes

- This is a Telegram-side setting — cannot be changed via API
- After changing, you may need to **re-add the bot** to existing groups for the change to take effect
- Privacy mode is per-bot, not per-group
- Disabling privacy mode does NOT make the bot respond to everything — MoltBot's `requireMention` controls that
