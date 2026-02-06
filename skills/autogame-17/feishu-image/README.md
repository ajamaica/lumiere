# Feishu Image Skill

Upload and send images to Feishu chats or users.
Features caching of `image_key` to avoid repeated uploads of the same file.

## Usage

```bash
node skills/feishu-image/send.js --target <chat_id_or_user_id> --file <path_to_image>
```

## Options

- `--target`: The OpenID (`ou_...`) or ChatID (`oc_...`) to send to.
- `--file`: Local path to the image file.

## Configuration

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
