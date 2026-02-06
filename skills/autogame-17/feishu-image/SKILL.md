# Feishu Image Skill

上传并发送图片到飞书聊天或用户。支持缓存 `image_key`，避免重复上传同一文件。

## 使用方式

```bash
node skills/feishu-image/send.js --target <chat_id_or_user_id> --file <path_to_image>
```

## 参数

- `--target`: 用户 OpenID（`ou_...`）或群 ChatID（`oc_...`）
- `--file`: 本地图片路径

## 配置

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
