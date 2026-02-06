---
name: tg-checkin
description: Generic Telegram Web automation for group check-ins. Supports multiple groups via configuration.
metadata: { 'openclaw': { 'requires': { 'plugins': ['browser'] } } }
---

# tg-checkin Skill

自动化 Telegram 网页端群组签到工具。

## 核心机制 (串行执行流程)

为了确保操作的准确性和安全性，必须严格遵守以下“串行执行流程”：

1. **导航与等待 (Navigate & Wait)**:
   - 在搜索栏输入群名并点击进入。
   - 强制等待 2 秒以确保页面切换完成。
2. **标题核验 (Verify Title)**:
   - 读取页面顶部 `.ChatInfo .title` 的文字。
   - **严禁模糊匹配**：必须与 `config.json` 中的群名完全一致。
   - 如果标题不匹配，立即停止操作，重新搜索。
3. **触底校验 (Scroll to Bottom)**:
   - 寻找右下角的“向下箭头”按钮 (`.sticky-reveal-button`)。
   - 如果按钮存在，点击它。等待 500ms 后，如果按钮依然存在，再次点击，直到它消失。
   - 兜底：将 `.MessageList` 容器滚动到底部。
4. **发送指令 (Send)**:
   - 确认已在底部后，在输入框输入指令并发送。

## 配置

在使用此技能前，请在技能目录下创建或修改 `config.json`，列出你想要自动签到的群组名称：

```json
{
  "groups": ["群组名称1", "群组名称2"]
}
```

## 核心机制 (Serial Execution Flow)

为了确保签到任务的 100% 成功率和安全性，本技能采用了**严格的串行执行流**：

1. **Navigate**: 准确定位并切换到目标群组。
2. **Wait & Verify Title**: 轮询等待直到顶部标题与目标群组名**完全一致**，防止发错群。
3. **Scroll to Bottom**: 智能检测并点击“向下箭头”，并配合手动滚动，确保加载最新消息。
4. **Verify Latest**: 记录当前最新消息的时间和内容作为基准。
5. **Send**: 聚焦输入框并发送“签到”指令。

## 使用方法

直接对 AI 说：

- "帮我签到那几个群"
- "运行 tg-checkin"

AI 在执行时会优先加载 `tg-logic.js` 脚本以获得最可靠的操作接口。

## 注意事项

1. **首次运行**：AI 会把网页版登录二维码发给你，请在手机上扫码登录一次，之后会自动记住。
2. **群名匹配**：请确保 `config.json` 里的群名与 Telegram 侧边栏显示的完全一致。
