---
name: rss-ai-reader
description: |
  📰 RSS AI 阅读器 — 自动抓取订阅、LLM生成摘要、多渠道推送！
  支持 Claude/OpenAI 生成中文摘要，推送到飞书/Telegram/Email。
  触发条件: 用户要求订阅RSS、监控博客、抓取新闻、生成摘要、设置定时抓取、
  "帮我订阅"、"监控这个网站"、"每天推送新闻"、RSS/Atom feed 相关。
---

# 📰 RSS AI Reader

自动抓取 RSS 订阅 → LLM 生成中文摘要 → 推送到 IM

## ✨ 核心功能

- 📡 自动抓取 RSS/Atom feeds
- 🤖 Claude/OpenAI 生成中文摘要
- 📬 多渠道推送：飞书、Telegram、Email
- 💾 SQLite 去重，不重复推送
- ⏰ 支持定时任务

## 🚀 快速开始

```bash
# 安装
git clone https://github.com/BENZEMA216/rss-reader.git ~/rss-reader
cd ~/rss-reader && pip install -r requirements.txt

# 配置（编辑 config.yaml）
cp config.yaml my_config.yaml
# 设置 feeds、LLM key、推送渠道

# 运行
python main.py --once              # 单次执行
python main.py                     # 启动定时任务
python main.py --stats             # 查看统计
```

## 📝 配置示例

```yaml
# RSS 订阅
feeds:
  - name: 'Hacker News'
    url: 'https://hnrss.org/frontpage'
    category: 'tech'
  - name: '阮一峰周刊'
    url: 'https://www.ruanyifeng.com/blog/atom.xml'
    category: 'tech'

# LLM 配置
llm:
  provider: 'claude' # 或 "openai"
  model: 'claude-sonnet-4-20250514'
  api_key: '${ANTHROPIC_API_KEY}'

# 推送到飞书
notify:
  feishu:
    enabled: true
    webhook_url: '${FEISHU_WEBHOOK}'
```

## 📬 支持的推送渠道

| 渠道         | 配置项                  | 说明             |
| ------------ | ----------------------- | ---------------- |
| **飞书**     | `webhook_url`           | 群机器人 Webhook |
| **Telegram** | `bot_token` + `chat_id` | Bot API          |
| **Email**    | SMTP 配置               | 支持 Gmail 等    |

## 🔧 命令行参数

```bash
python main.py [options]

--config, -c  配置文件路径 (默认: config.yaml)
--once        只执行一次
--stats       显示统计信息
--db          数据库路径 (默认: rss_reader.db)
```

## 💡 使用场景

1. **技术博客监控** — 订阅 HN、阮一峰、V2EX 等
2. **新闻早报** — 每天定时推送摘要到飞书群
3. **竞品监控** — 订阅竞品博客，自动摘要
4. **论文追踪** — 订阅 arXiv，AI 帮你筛选

## 📊 输出效果

飞书消息示例：

```
📰 Hacker News

**Why SQLite is Taking Over**

📝 SQLite 正在从嵌入式数据库扩展到更多应用场景。
文章分析了其在边缘计算、移动应用中的优势...

[🔗 阅读原文]
```

---

## ☕ 支持作者

- **GitHub Sponsors**: [@BENZEMA216](https://github.com/sponsors/BENZEMA216)
- **Buy Me a Coffee**: [buymeacoffee.com/benzema216](https://buymeacoffee.com/benzema216)
