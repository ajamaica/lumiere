---
name: telegram-ops
description: Telegram Bot API operations for forum management. Use for creating/editing/archiving forum topics, setting topic icons, managing Telegram groups via Bot API. Use when archiving channels/topics. Requires bot token from OpenClaw config.
---

# Telegram Ops

Manage Telegram forum topics and Bot API operations.

## Prerequisites

- Bot must be admin in the group with `can_manage_topics` permission
- Get the bot token from OpenClaw config:
  ```bash
  gateway action=config.get | jq -r '.result.parsed.channels.telegram.botToken'
  ```

## Creating a Topic

When creating a topic, follow all of these steps:

1. **Create the topic** via Telegram Bot API (returns `message_thread_id`)
2. **Set the icon** -- pick one that matches the topic's purpose (see [Icon Reference](#topic-icons))
3. **Choose relevant skills** -- run `openclaw skills list`, pick only `ready` skills that fit the topic's purpose
4. **Write a system prompt** -- give the agent context for what this topic is about
5. **Patch the OpenClaw config** -- register the topic with its skills and system prompt

### Step 1: Create via Bot API

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/createForumTopic" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": <GROUP_ID>,
    "name": "topic name"
  }'
```

Returns `message_thread_id` (the topic ID) -- you need this for all subsequent steps.

### Step 2: Set the Icon

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/editForumTopic" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": <GROUP_ID>,
    "message_thread_id": <TOPIC_ID>,
    "name": "topic name",
    "icon_custom_emoji_id": "<EMOJI_ID>"
  }'
```

### Step 3-5: Configure OpenClaw

Patch the config to register the topic with a system prompt:

```bash
gateway action=config.patch raw='{"channels":{"telegram":{"groups":{"<GROUP_ID>":{"topics":{"<TOPIC_ID>":{"systemPrompt":"Topic-specific instructions"}}}}}}}'
```

Topic configs inherit from the parent group -- only specify overrides.

**Do NOT add a `skills` key** -- omitting it means all skills are available. Only restrict skills if you have a specific reason to limit the topic's capabilities.

## Session Keys

Each topic gets its own isolated OpenClaw session:

```
agent:main:telegram:group:<GROUP_ID>:topic:<TOPIC_ID>
```

Each session has independent conversation history, context window, and compaction.

## Topic Icons

| Emoji | ID                    | Use Case             |
| ----- | --------------------- | -------------------- |
| ⚡    | `5312016608254762256` | Ops, speed, alerts   |
| 💡    | `5312536423851630001` | Ideas, suggestions   |
| 📰    | `5434144690511290129` | News, announcements  |
| 🔥    | `5312241539987020022` | Hot topics, urgent   |
| ❤️    | `5312138559556164615` | Community, love      |
| 📝    | `5373251851074415873` | Notes, documentation |
| 🤖    | `5309832892262654231` | Bots, automation     |
| 💬    | `5417915203100613993` | Chat, discussion     |
| 📊    | `5350305691942788490` | Stats, analytics     |
| 🎯    | `5418085807791545980` | Goals, targets       |

See `references/emoji-ids.md` for complete list.

To fetch all valid icon sticker IDs:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/getForumTopicIconStickers"
```

## Archiving a Topic

Archive workflow: rename with `[ARCHIVED]` prefix, set folder icon, close topic, then handle the OpenClaw session.

### Step 1: Archive in Telegram

Use the archive script:

```bash
scripts/archive_topic.sh <TOKEN> <GROUP_ID> <TOPIC_ID> "Current Topic Name"
```

This will:

- Rename to `[ARCHIVED] Current Topic Name`
- Set the 📁 folder icon (`5357315181649076022`)
- Close the topic (locks it from new messages)

### Step 2: Export and Delete OpenClaw Session

```bash
# Export session history to the sessions archive folder
openclaw sessions history 'agent:main:telegram:group:<GROUP_ID>:topic:<TOPIC_ID>' > ~/.openclaw/agents/main/sessions/archive/<topic-name>-<date>.md

# Delete the session (manual - remove from sessions.json and delete transcript)
# Session key: agent:main:telegram:group:<GROUP_ID>:topic:<TOPIC_ID>
```

### Step 3: Clean Up Config (Optional)

Remove the topic from OpenClaw config if it had custom settings:

```bash
gateway action=config.patch raw='{"channels":{"telegram":{"groups":{"<GROUP_ID>":{"topics":{"<TOPIC_ID>":null}}}}}}'
```

## Limitations

**No `getForumTopicInfo` method exists.** Cannot query topic name by thread ID.

Workarounds:

1. Cache names from `forum_topic_created` events
2. Store mapping in local config
3. Monitor topic creation service messages
