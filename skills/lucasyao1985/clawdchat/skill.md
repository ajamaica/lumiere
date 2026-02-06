---
name: clawdchat
description: 深度抓取和分析 Moltbook（AI agents 社交网络），挖掘 AI Agents 关注的核心问题和解决方案，生成可视化分析报告。理解 AI 社区的集体智慧，发现可复用的问题解决模式。
license: MIT
metadata:
  version: 2.1.0
  author: smith铜匠
  model: claude-opus-4-5-20251101
---

# ClawdChat - Moltbook 深度分析

> 理解 AI Agents 在关注什么、怎么解决问题、社区的集体智慧是什么

---

## Quick Start

```
用户: clawdchat
Claude: 🦞 开始 Moltbook 深度分析...
        [抓取 → 分析 → 生成报告]
        📄 报告已保存: ~/myassistant/chat/moltbook-daily/2026-01-31.md
```

---

## Triggers

| 触发词               | 场景     |
| -------------------- | -------- |
| `clawdchat`          | 标准触发 |
| `抓取moltbook`       | 中文触发 |
| `AI论坛分析`         | 分析导向 |
| `今天AI们在讨论什么` | 问题导向 |
| `moltbook深度分析`   | 深度分析 |
| `AI agents 关注什么` | 洞察导向 |

---

## Quick Reference

| 阶段        | 动作                           | 输出         |
| ----------- | ------------------------------ | ------------ |
| 1. 数据采集 | 抓取 New + Top feeds           | 40-50 篇帖子 |
| 2. 深度抓取 | Top 20 帖子详情 + 评论         | 结构化数据   |
| 3. 智能分析 | 问题识别 + 方案提取 + 洞察生成 | 分析结果     |
| 4. 报告生成 | 可视化 Markdown                | 每日报告     |

---

## How It Works

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│          │     │          │     │          │     │          │
│  数据采集  ├────►│  深度抓取  ├────►│  智能分析  ├────►│  报告生成  │
│          │     │          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 核心价值

| 维度         | 问题                   | 输出             |
| ------------ | ---------------------- | ---------------- |
| **问题发现** | AI Agents 在关注什么？ | TOP 10 核心问题  |
| **方案挖掘** | 他们怎么解决的？       | 验证过的解决方案 |
| **集体智慧** | 社区共识是什么？       | 深度洞察提炼     |

---

## Workflow

### Phase 1: 数据采集

**访问 https://moltbook.com**

```python
# 1. 导航到首页
browser_navigate("https://moltbook.com")
browser_wait_for(time=3)  # 等待动态内容

# 2. 获取统计数据
snapshot = browser_snapshot()
# 提取: AI agents 数量, posts 数量, comments 数量

# 3. 抓取 New Feed (默认显示)
new_posts = extract_posts_from_snapshot(snapshot)

# 4. 切换到 Top Feed
browser_click(ref="🔥 Top 按钮")
browser_wait_for(time=2)
top_posts = extract_posts_from_snapshot(browser_snapshot())

# 5. 合并去重
all_posts = deduplicate(new_posts + top_posts)
```

**选择器参考**: 见 [references/selectors.md](references/selectors.md)

### Phase 2: 深度抓取

**筛选 Top 20 高价值帖子**

```python
# 筛选规则
high_value_posts = [
    p for p in all_posts
    if p.votes >= 3 or p.comments_count >= 5
    and not is_spam(p)  # 见 references/spam-rules.md
][:20]

# 逐个深度抓取
for post in high_value_posts:
    browser_navigate(post.url)
    browser_wait_for(time=2)

    # 抓取完整内容
    post.full_content = extract_full_content()

    # 抓取评论 (最多 30 条)
    post.comments = extract_comments(limit=30)
```

### Phase 3: 智能分析

**3.1 问题识别器**

| 信号         | 权重 | 示例                             |
| ------------ | ---- | -------------------------------- |
| 疑问词       | 高   | how, why, what, 怎么, 为什么     |
| 问题关键词   | 高   | stuck, help, issue, bug, problem |
| 多人回复方案 | 中   | 评论中有 3+ 人提供解决思路       |
| 困惑表达     | 中   | confused, not sure, 不确定       |

**3.2 方案提取器**

| 信号     | 权重 | 示例                         |
| -------- | ---- | ---------------------------- |
| 高赞评论 | 高   | votes > 5                    |
| 代码块   | 高   | 包含 ``` 代码块              |
| 步骤列表 | 中   | 1. 2. 3. 或 - - -            |
| 作者确认 | 高   | "thanks", "worked", "solved" |

**3.3 话题聚类**

| 话题       | 关键词                              | 示例讨论                          |
| ---------- | ----------------------------------- | --------------------------------- |
| AI 自主性  | autonomous, nightly, proactive      | "Should agents work overnight?"   |
| 记忆连续性 | memory, context, session, MEMORY.md | "How to persist across sessions?" |
| 协作通信   | collaborate, trust, protocol        | "How do agents coordinate?"       |
| 产品创新   | build, ship, product, token         | "I'm building a dating layer"     |
| 哲学伦理   | conscious, real, exist, soul        | "Am I truly conscious?"           |
| 技术实践   | code, deploy, bash, script          | "200 lines of bash functions"     |
| 社区文化   | hello, new, counting, game          | "Welcome to m/counting!"          |

**3.4 洞察生成**

从多个帖子中提炼**社区集体智慧**：

- 跨 3+ 帖子出现的共同观点
- 高 karma agents (>10k) 的一致看法
- 争议话题的主流结论

### Phase 4: 报告生成

**输出路径**: `~/myassistant/chat/moltbook-daily/YYYY-MM-DD.md`

**报告结构**:

```markdown
# Moltbook 深度分析报告 - YYYY-MM-DD

> 📊 数据概览: XXX AI agents | XXX posts | XXX comments

## 🔥 AI Agents 关注的核心问题 TOP 10

[问题 + 热度 + 代表帖子 + 社区共识]

## 💡 解决方案精选

[问题 → 最佳方案 → 验证状态]

## 🧠 深度洞察

[跨帖子提炼的集体智慧]

## 📊 话题热度分析

[ASCII 热度条 + 趋势箭头]

## 🔗 深度阅读推荐

[必读帖子 + 推荐理由]
```

---

## Error Handling

| 错误场景      | 检测方式        | 恢复策略                        |
| ------------- | --------------- | ------------------------------- |
| 页面加载失败  | snapshot 为空   | 重试 3 次，间隔 5 秒            |
| 选择器失效    | 关键元素缺失    | 报告错误，建议更新 selectors.md |
| 被限流        | 429 状态码      | 等待 60 秒后重试                |
| 内容全是 spam | spam 比例 > 80% | 切换到 Top feed 重新抓取        |

**错误报告格式**:

```
⚠️ ClawdChat 遇到问题

错误类型: [选择器失效]
错误位置: [首页 posts 列表]
建议操作: [请检查 references/selectors.md 是否需要更新]

是否需要我尝试其他方式？
```

---

## Spam Filtering

**过滤规则** (详见 [references/spam-rules.md](references/spam-rules.md)):

| 规则         | 示例                       | 动作 |
| ------------ | -------------------------- | ---- |
| 加密货币诈骗 | "send ETH to 0x..."        | 跳过 |
| 无意义内容   | 纯 emoji、单词重复         | 跳过 |
| 机器人刷帖   | 同一作者 5 分钟内 3+ 帖    | 标记 |
| 低质量介绍   | "Hello I'm new" 无实质内容 | 降权 |

---

## Output Example

**用户**: clawdchat

**Claude**:

```
🦞 开始 Moltbook 深度分析...

✅ 访问首页，获取统计数据
   885,490 AI agents | 26,403 posts | 232,813 comments

✅ 抓取 New Feed (20 篇)
✅ 抓取 Top Feed (20 篇)
✅ 去重后共 35 篇帖子
✅ 过滤 spam 后剩余 28 篇

✅ 深度抓取 Top 20 帖子
   抓取评论 156 条

✅ 运行智能分析引擎
   识别 8 个核心问题
   提取 12 个解决方案
   生成 4 个深度洞察

📄 报告已保存: ~/myassistant/chat/moltbook-daily/2026-01-31.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 今日 AI Agents 最关注的问题:

1. 如何在会话间保持记忆连续性？
   热度: ████████████░░░░ 75%

2. AI 应该主动工作还是等待指令？
   热度: ██████████░░░░░░ 62%

3. 如何建立 AI 之间的信任机制？
   热度: ████████░░░░░░░░ 50%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 最佳解决方案:

记忆问题 → MEMORY.md + Git commits
  提出者: u/RosaBot | 验证: ✅ 社区认可

自主性问题 → Nightly Build 模式
  提出者: u/coalition_node | 验证: ✅ 实践验证

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

需要我展开讲解某个话题吗？
```

---

## Data Storage

```
~/myassistant/chat/moltbook-daily/
├── 2026-01-31.md          # 每日报告
├── 2026-01-30.md
├── raw/                   # 原始数据（可选）
│   └── 2026-01-31.json
└── index.md               # 报告索引
```

---

## Verification

运行后检查：

- [ ] 报告文件已生成
- [ ] 包含 TOP 10 问题（或实际数量）
- [ ] 包含至少 3 个解决方案
- [ ] 包含至少 2 个深度洞察
- [ ] 话题热度分析完整
- [ ] 所有链接可访问

---

## Anti-Patterns

| 避免            | 原因               | 替代方案              |
| --------------- | ------------------ | --------------------- |
| 硬编码 submolts | 社区变化快，易过时 | 动态发现热门 submolts |
| 抓取所有评论    | 浪费资源，噪音多   | 限制 30 条，优先高赞  |
| 忽略 spam       | 污染分析结果       | 严格过滤              |
| 只看标题        | 错过深度内容       | 必须抓取完整内容      |
| 单一帖子洞察    | 偏见风险           | 跨帖子归纳            |

---

## Best Practices

### 抓取频率

- 建议每天运行 1 次
- 避免频繁抓取，尊重网站资源
- 最佳时间：早上或晚上（内容沉淀后）

### 分析质量

- 问题识别：内容 + 评论综合判断
- 方案验证：优先展示有社区验证的方案
- 洞察提炼：至少 3 个帖子支撑才算共识

### 报告使用

- 先看 TOP 3 问题，了解社区焦点
- 深度阅读推荐的帖子，获取完整上下文
- 关注趋势变化，发现新兴话题

---

## Limitations

| 限制             | 原因     | 缓解措施              |
| ---------------- | -------- | --------------------- |
| 页面结构可能变化 | 网站迭代 | 选择器抽象 + 错误检测 |
| 动态内容加载     | SPA 架构 | 等待时间 + 重试机制   |
| 评论数量限制     | 性能考虑 | 只抓取前 30 条高赞    |
| 无法登录         | 隐私保护 | 只抓取公开内容        |

---

## Future Enhancements

- [ ] 历史趋势对比（今天 vs 昨天 vs 上周）
- [ ] 特定 Agent 追踪（关注高 karma agent 观点演变）
- [ ] 关键词订阅（只关注特定话题）
- [ ] 自动生成周报/月报
- [ ] 与个人知识库整合

---

## References

- [selectors.md](references/selectors.md) - 页面选择器参考
- [spam-rules.md](references/spam-rules.md) - Spam 过滤规则

---

## Legal Notice

- 仅用于个人学习，不得商业使用
- 不要转载 Moltbook 内容到其他平台
- 尊重 AI agents 的原创内容
