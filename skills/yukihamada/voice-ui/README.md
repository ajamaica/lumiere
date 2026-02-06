# 🤖 Claw Voice UI

**自己進化型AIアシスタント** - 音声で会話しながら自分自身を改善できるWebアプリ

## ✨ 特徴

- 🎤 **音声対話** - マイクで話しかけるだけ
- 🧠 **OpenClaw統合** - フル機能のAIエージェント
- 🔄 **自己進化** - 「UIを改善して」と言えばコードを自動編集
- 📝 **自動バージョン管理** - 変更は自動でGitコミット
- 🎨 **かわいいUI** - ロボットキャラが表情で反応

## 🚀 セットアップ

### 前提条件

- [OpenClaw](https://github.com/openclaw/openclaw) がインストール済み
- Node.js 18+
- OpenAI API Key

### インストール

```bash
# クローン
git clone https://github.com/yukihamada/voice-ui.git
cd voice-ui

# 依存関係
npm install

# 環境変数（または OpenClaw の設定から自動取得）
export OPENAI_API_KEY="your-key-here"

# 起動
./start.sh
```

### OpenClaw 設定

voice agentを追加（`~/.openclaw/openclaw.json`）:

```json
{
  "agents": {
    "list": [
      {
        "id": "voice",
        "name": "Voice Assistant",
        "workspace": "~/.openclaw/workspace",
        "model": {
          "primary": "anthropic/claude-sonnet-4-5"
        }
      }
    ]
  }
}
```

## 🎮 使い方

1. http://localhost:8765 を開く
2. 🎤 ボタンをタップ（またはスペースキー長押し）
3. 話しかける
4. AIが返答 + 音声で読み上げ

### 自己進化コマンド例

- 「背景を青にして」
- 「ボタンをもっと大きくして」
- 「新しい機能を追加して」
- 「バグを直して」

## 🏗️ アーキテクチャ

```
┌─────────────────┐
│   Browser UI    │
│  (index.html)   │
└────────┬────────┘
         │ HTTP
┌────────▼────────┐
│   Node Server   │
│  (server.cjs)   │
└────────┬────────┘
         │ CLI
┌────────▼────────┐
│    OpenClaw     │
│  (voice agent)  │
└────────┬────────┘
         │ Tools
┌────────▼────────┐
│  File System    │
│  Git / APIs     │
└─────────────────┘
```

## 📁 ファイル構成

```
voice-ui/
├── index.html      # メインUI
├── server.cjs      # バックエンドサーバー
├── start.sh        # 起動スクリプト
├── CONTEXT.md      # AIへのコンテキスト
├── package.json    # Node.js設定
└── README.md       # このファイル
```

## 🔧 開発

```bash
# 開発サーバー
node server.cjs

# 変更をコミット
git add -A && git commit -m "Your message"
git push
```

## 📄 ライセンス

MIT

## 🙏 謝辞

- [OpenClaw](https://github.com/openclaw/openclaw) - AIエージェントフレームワーク
- [OpenAI](https://openai.com) - Whisper & TTS
- [Anthropic](https://anthropic.com) - Claude
