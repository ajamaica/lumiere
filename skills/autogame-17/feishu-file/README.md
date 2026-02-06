# Feishu File Skill

Manage file uploads and downloads via Feishu API.

## Commands

### Send File

Upload a local file and send it to a chat or user.

```bash
node skills/feishu-file/send.js --target <chat_id_or_user_id> --file <local_path>
```

### Download File

Download a file resource from a message.

```bash
node skills/feishu-file/download.js --message-id <msg_id> --file-key <file_key> --output <local_path>
```

**Note:** The bot must have access to the message (be in the chat). For files sent by others, the `im:resource:read` scope is required.
