---
name: feishu-native-emoji
description: Provides access to Feishu's native emoji set (e.g. [Smile], [Like]) for more authentic interactions.
tags: [feishu, emoji, ui]
---

# 🎭 Feishu Native Emoji

This skill manages the mapping and usage of Feishu's native emoji codes (e.g., `[微笑]`, `[捂脸]`) instead of standard unicode emojis.

## Usage

This is primarily a passive resource for the Agent to "inject" personality into messages.

### Resources

- `emoji_list.txt`: Raw list of supported codes.

## Integration

When constructing messages for Feishu, prefer using codes from `emoji_list.txt`.
