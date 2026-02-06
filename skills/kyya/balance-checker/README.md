# Balance Checker Skill

一次查询所有 AI API 服务商的余额。支持 DeepSeek、Moonshot/Kimi、火山引擎。

## 功能

当你对 agent 说「查余额」「余额多少」「还有多少额度」时，自动查询并汇总所有平台的 API 余额。

```
🔍 正在查询 API 余额...

💰 DeepSeek 余额
- 总余额: 304.54 CNY
- 状态: 可用 ✅

🌙 Moonshot/Kimi 余额
- 可用余额: 450.79 CNY

🌋 火山引擎余额
- 可用余额: 86.68 CNY

✅ 余额查询完成
```

## 安装

### 方法 1：ClawdHub（推荐）

```bash
clawdhub install balance-checker
```

> 如果没有安装 ClawdHub CLI：`npm i -g clawdhub`

### 方法 2：从 GitHub 安装

```bash
# 克隆仓库
git clone https://github.com/silicondawn/openclaw-skills.git /tmp/openclaw-skills

# 复制 skill
cp -r /tmp/openclaw-skills/balance-checker ~/.openclaw/skills/
```

### 安装火山引擎依赖（可选）

如果你使用火山引擎，需要安装 Python SDK：

```bash
cd ~/.openclaw/skills/balance-checker && ./setup_volcengine.sh
```

## 配置

在 OpenClaw 配置文件 `~/.openclaw/openclaw.json` 的 `env` 部分添加 API 密钥：

```json
{
  "env": {
    "DEEPSEEK_API_KEY": "sk-xxx",
    "MOONSHOT_API_KEY": "sk-xxx",
    "VOLCENGINE_ACCESS_KEY": "AKLTxxx",
    "VOLCENGINE_SECRET_KEY": "xxx"
  }
}
```

> **说明**：
>
> - DeepSeek 和 Moonshot 只需要 API Key
> - 火山引擎需要 AK/SK（从[控制台](https://console.volcengine.com/iam/keymanage/)获取）
> - 只配置你使用的平台即可，未配置的会跳过

## 支持的平台

| 平台          | 环境变量                                          | 获取密钥                                                                |
| ------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| DeepSeek      | `DEEPSEEK_API_KEY`                                | [platform.deepseek.com](https://platform.deepseek.com/)                 |
| Moonshot/Kimi | `MOONSHOT_API_KEY`                                | [platform.moonshot.cn](https://platform.moonshot.cn/)                   |
| 火山引擎      | `VOLCENGINE_ACCESS_KEY` + `VOLCENGINE_SECRET_KEY` | [console.volcengine.com](https://console.volcengine.com/iam/keymanage/) |

## 文件结构

```
balance-checker/
├── SKILL.md              # OpenClaw skill 描述文件
├── README.md             # 本文档
├── check_balance.sh      # 主入口脚本
├── query_balance.py      # 火山引擎查询模块
├── setup_volcengine.sh   # 火山引擎 SDK 安装脚本
└── venv/                 # Python 虚拟环境（安装后生成）
```

## 常见问题

### Q: 火山引擎查询失败？

运行安装脚本：

```bash
cd ~/.openclaw/skills/balance-checker && ./setup_volcengine.sh
```

### Q: 只想查某一个平台？

直接问 agent 具体平台，比如「DeepSeek 余额多少」。或者只配置你想查的平台的 API Key。

### Q: API Key 安全吗？

密钥存储在本地 OpenClaw 配置文件中，不会上传到任何地方。skill 代码不包含任何硬编码凭证。

## License

MIT
