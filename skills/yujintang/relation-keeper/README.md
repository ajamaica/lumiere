# 关系维护 Relation Keeper Skill

OpenClaw 技能，用于维护、记忆、提醒你的社交关系。

## 功能

- **肖像维护**：随时间累积人物信息（年龄、手机、喜好、共同经历等）
- **未来提醒**：记录生日、纪念日、约会，通过定时扫描分级提醒
- **过去归档**：记录过去的饭局、约会、出游等，便于日后回忆与查询

## 安装

1. 将本 skill 目录复制到 `~/.openclaw/skills/relation-keeper/` 或你的工作区
2. 在 skill 目录下执行 `npm install`，会自动：
   - **创建数据目录** `data/`（skill 目录下）或 `$RELATION_KEEPER_DATA` 及空数据文件
   - **配置定时任务**（每 15 分钟扫描）
3. 确保已安装 OpenClaw，且 `openclaw` 在 PATH 中
4. （可选）在 `~/.openclaw/.env` 中设置环境变量：

```bash
export RELATION_KEEPER_DATA="$HOME/.openclaw/relation-keeper"
export RELATION_KEEPER_TZ="Asia/Shanghai"
export RELATION_KEEPER_CHANNEL="telegram:YOUR_CHAT_ID"  # 配置则推送至该渠道，未配置则推送到当前聊天
```

## 提醒规则

单一**扫描任务**每 15 分钟运行一次，不创建一次性 cron。

| 事件类型 | 提醒时机 |
|----------|----------|
| 生日 / 纪念日 | 7 天前、3 天前、当天（每年按 MM-DD 匹配） |
| 约会 | 事件前 2 小时、事件当刻 |

## 定时任务

安装时执行 `npm install` 会自动运行 `node scripts/install.js` 配置定时任务。若失败，可手动执行：

```bash
npm run install:cron
```

## 脚本

从 skill 根目录运行（需 Node.js 16+）：

```bash
# 人物肖像
node scripts/portrait.js get 张三
node scripts/portrait.js list
node scripts/portrait.js upsert 张三 --birthday 03-15 --gender 男 --birthYear 1990 --address "北京市朝阳区xx路" --fact-key 喜好 --fact-value 钓鱼

# 事件
node scripts/events.js past-add --persons "张三,李四" --type 吃饭 --date 2026-01-18 --summary "海底捞聚餐"
node scripts/events.js future-add --persons 张三 --type 生日 --date 2026-03-15 --summary "张三生日" --rule birthday
node scripts/events.js past-query 张三
node scripts/events.js future-query --days 14

# 扫描（通常由定时任务调用，也可手动测试）
node scripts/scan.js

# 初始化数据目录（单独执行时）
npm run init
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| RELATION_KEEPER_DATA | 数据存储目录（未设置时使用 skill/data/） | skill 目录下的 data/ |
| RELATION_KEEPER_TZ | 时区 | Asia/Shanghai |
| RELATION_KEEPER_CHANNEL | 提醒推送渠道（如 telegram:xxx），未配置则推送到当前聊天 | 无 |
