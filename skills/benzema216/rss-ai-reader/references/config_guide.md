# 配置指南

## 完整配置示例

```yaml
# ===== RSS 订阅 =====
feeds:
  - name: 'Hacker News'
    url: 'https://hnrss.org/frontpage'
    category: 'tech'

  - name: '阮一峰周刊'
    url: 'https://www.ruanyifeng.com/blog/atom.xml'
    category: 'tech'

  - name: 'V2EX'
    url: 'https://www.v2ex.com/feed/tab/tech.xml'
    category: 'tech'

# ===== LLM 配置 =====
llm:
  # Claude (推荐)
  provider: 'claude'
  model: 'claude-sonnet-4-20250514'
  api_key: '${ANTHROPIC_API_KEY}'

  # 或 OpenAI
  # provider: "openai"
  # openai_model: "gpt-4o-mini"
  # openai_api_key: "${OPENAI_API_KEY}"

# ===== 推送配置 =====
notify:
  # 飞书
  feishu:
    enabled: true
    webhook_url: '${FEISHU_WEBHOOK}'

  # Telegram
  telegram:
    enabled: false
    bot_token: '${TELEGRAM_BOT_TOKEN}'
    chat_id: '${TELEGRAM_CHAT_ID}'

  # Email
  email:
    enabled: false
    smtp_host: 'smtp.gmail.com'
    smtp_port: 587
    username: 'your@gmail.com'
    password: '${EMAIL_PASSWORD}'
    to: 'receiver@example.com'

# ===== 调度配置 =====
schedule:
  interval_minutes: 60 # 抓取间隔
  max_age_hours: 24 # 只处理最近N小时的文章
  max_articles_per_run: 10 # 每次最多处理N篇
```

## 环境变量

```bash
# LLM
export ANTHROPIC_API_KEY="sk-ant-xxx"
export OPENAI_API_KEY="sk-xxx"

# 飞书
export FEISHU_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"

# Telegram
export TELEGRAM_BOT_TOKEN="123456:ABC-xxx"
export TELEGRAM_CHAT_ID="-1001234567890"

# Email
export EMAIL_PASSWORD="app-password"
```

## 获取飞书 Webhook

1. 打开飞书群 → 设置 → 群机器人
2. 添加自定义机器人
3. 复制 Webhook 地址

## 获取 Telegram Bot

1. 找 @BotFather，发送 `/newbot`
2. 获取 Bot Token
3. 把 Bot 加入群/频道
4. 获取 Chat ID（可用 @userinfobot）

## 热门 RSS 源

```yaml
# 技术
- https://hnrss.org/frontpage # Hacker News
- https://www.ruanyifeng.com/blog/atom.xml # 阮一峰
- https://www.v2ex.com/feed/tab/tech.xml # V2EX
- https://rsshub.app/36kr/newsflash # 36氪快讯

# AI
- https://openai.com/blog/rss.xml # OpenAI Blog
- https://www.anthropic.com/feed # Anthropic
- https://rsshub.app/papers-with-code/hot # Papers with Code

# 财经
- https://rsshub.app/cls/telegraph # 财联社电报
- https://rsshub.app/wallstreetcn/news/global # 华尔街见闻
```
