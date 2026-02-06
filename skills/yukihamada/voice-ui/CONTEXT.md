# Voice UI Context

このファイルはvoice-uiから呼ばれた時のコンテキスト情報です。

## 重要

ユーザーが「voice-uiから:」で始まるメッセージを送ってきた場合、
それは音声UIアプリからのリクエストです。

## UI改善リクエストについて

ユーザーが以下のようなリクエストをした場合：
- 「背景を変えて」
- 「色を変えて」
- 「ボタンを大きくして」
- 「UIを改善して」

→ `/Users/yuki/.openclaw/workspace/voice-ui/index.html` を編集してください！

## ⚠️ 変更後は必ずGitコミット！

UIやコードを編集したら、必ず以下を実行：
```bash
cd /Users/yuki/.openclaw/workspace/voice-ui && git add -A && git commit -m "変更内容の説明"
```

## ファイル構成

- `index.html` - メインのUI（HTML/CSS/JS）
- `server.cjs` - バックエンドサーバー
- `package.json` - Node.js設定
- `CONTEXT.md` - このファイル（コンテキスト情報）

## 現在のUI

- パステルグラデーション背景（または白）
- ロボットキャラクター（表情が変わる）
- 音声認識 + TTS
- OpenClaw統合（自己改善可能）
