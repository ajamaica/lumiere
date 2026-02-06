# Feishu Message Skill

General utilities for Feishu Message operations that go beyond simple sending.

## Tools

### 1. Get/Read Message (Recursive)

Fetch message content, including handling merge-forward messages recursively.

```bash
node skills/feishu-message/get.js --message-id "om_..." --recursive
```

### 2. Send Audio (Voice Bubble)

Send an audio file as a native Feishu voice bubble.

- Automatically calculates duration (requires `music-metadata`).
- Uploads as `opus` (compatible with Feishu voice).

```bash
node skills/feishu-message/send-audio.js --target "ou_..." --file "path/to/audio.mp3"
```

**Options:**

- `--target <id>`: User OpenID (`ou_`) or ChatID (`oc_`).
- `--file <path>`: Path to audio file.
- `--duration <ms>`: (Optional) Manually specify duration in milliseconds.

## Dependencies

- axios
- form-data
- music-metadata
