---
name: balance-checker
description: 查询 AI API 服务商的余额（DeepSeek、Moonshot/Kimi、火山引擎）。当用户说"查余额"、"还有多少额度"、"余额多少"时自动触发。
---

# Balance Checker Skill

一次查询所有 AI API 服务商的余额。

## 支持的服务商

| 服务商        | 查询方式   | 环境变量                                          |
| ------------- | ---------- | ------------------------------------------------- |
| DeepSeek      | REST API   | `DEEPSEEK_API_KEY`                                |
| Moonshot/Kimi | REST API   | `MOONSHOT_API_KEY`                                |
| 火山引擎      | Python SDK | `VOLCENGINE_ACCESS_KEY` + `VOLCENGINE_SECRET_KEY` |

## 触发关键词

- "查余额"
- "还有多少额度"
- "余额多少"
- "看看余额"
- "API 余额"

## 安装

火山引擎查询需要 Python SDK，首次使用请运行：

```bash
cd ~/.openclaw/skills/balance-checker
./setup_volcengine.sh
```

## 配置

### 环境变量（推荐）

```bash
export DEEPSEEK_API_KEY=sk-xxx
export MOONSHOT_API_KEY=sk-xxx
export VOLCENGINE_ACCESS_KEY=AKLTxxx
export VOLCENGINE_SECRET_KEY=xxx
```

### OpenClaw 配置

在 `~/.openclaw/openclaw.json` 的 `env` 部分添加上述环境变量。

## 输出示例

```
🔍 正在查询 API 余额...

💰 DeepSeek 余额
- 总余额: 304.54 CNY
- 赠金余额: 0.00 CNY
- 充值余额: 304.54 CNY
- 状态: 可用 ✅

🌙 Moonshot/Kimi 余额
- 可用余额: 450.79 CNY
- 现金余额: 450.79 CNY
- 代金券余额: 0 CNY

🌋 火山引擎余额
- 可用余额: 86.68 CNY
- 现金余额: 86.68 CNY

✅ 余额查询完成
```

## 文件结构

```
balance-checker/
├── SKILL.md              # Skill 描述
├── check_balance.sh      # 主入口脚本
├── query_balance.py      # 火山引擎查询（Python）
├── setup_volcengine.sh   # 火山引擎 SDK 安装脚本
└── venv/                 # Python 虚拟环境（自动创建）
```

## API 文档

- DeepSeek: https://api-docs.deepseek.com/zh-cn/api/get-user-balance
- Moonshot: https://platform.moonshot.cn/docs/api-reference#user-balance
- 火山引擎: https://www.volcengine.com/docs/6269/1593138
