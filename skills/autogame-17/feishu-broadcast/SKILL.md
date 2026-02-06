# Feishu Broadcast Skill

Broadcast messages (Post/Rich Text) and Images/Stickers to ALL users in the Feishu tenant.

## Features

- **Dynamic User List**: Fetches all users from Feishu API (no hardcoded IDs).
- **Rich Text**: Supports Markdown via `feishu-post`.
- **Media**: Supports Stickers/GIFs via `feishu-sticker`.
- **Safety**: Rate limiting and Dry Run mode.

## Usage

```bash
# Send text
node skills/feishu-broadcast/index.js --title "Announcement" --text "Hello Everyone!"

# Send text from file (recommended for long messages)
node skills/feishu-broadcast/index.js --title "Weekly Report" --text-file "report.md"

# Send sticker
node skills/feishu-broadcast/index.js --image "media/sticker.webp"

# Combined
node skills/feishu-broadcast/index.js --title "Hi" --text "Check this out" --image "media/cool.gif"
```

## Dependencies

- `feishu-post` skill (must be installed)
- `feishu-sticker` skill (must be installed)
