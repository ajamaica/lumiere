---
name: tg-history
description: Efficiently extract and read Telegram group chat history as text, bypassing screenshots/OCR for zero-token-waste.
metadata: { 'openclaw': { 'requires': { 'plugins': ['browser'] } } }
---

# tg-history Skill

极速、省钱的 Telegram 聊天记录读取工具。

## 功能

- **直接提取文本**：不通过截图 or OCR，直接从网页 DOM 中抓取聊天记录。
- **Token 暴减**：相比截图，Token 消耗降低 99% 以上。
- **精准格式**：自动整理为 `[时间] 发送者: 消息内容` 的清爽格式。

## 核心机制 (串行执行流程)

为了确保读取的是最新且正确的群聊记录，必须执行以下流程：

1. **精准导航 (Navigate & Wait)**:
   - 搜索并进入目标群组。
   - 等待至少 2 秒，确保 DOM 加载完成。
2. **标题核验 (Verify Title)**:
   - 检查 `.ChatInfo .title` 元素。
   - 确认标题与目标群名完全匹配。严禁在标题未确认的情况下提取数据。
3. **强制触底 (Scroll to Bottom)**:
   - 循环检测并点击“向下箭头” (`.sticky-reveal-button`)，直到其消失。
   - 若箭头未出现，手动将 `.MessageList` 滚动至 `scrollHeight`。
4. **提取与整理 (Extract & Verify)**:
   - 确保看到的是最新的消息（可通过时间戳校验）。
   - 从 DOM 中提取文本，整理为标准格式。

## 使用方法

直接对 AI 说：

- "帮我看看 [群名] 的聊天记录"
- "总结一下 [群名] 最近聊了什么"
- "运行 tg-history 获取 [群名] 历史"

## 优势

传统的“截图+AI识别”方案，一张图就要几千个像素数据；而 `tg-history` 直接读取网页上的文字，一段几百字的聊天记录只占用几百个字节的 Token。
