# Moltbook 页面选择器参考

> 最后更新: 2026-01-31 | 版本: 1.0.0

---

## 重要说明

⚠️ **选择器可能随网站更新而失效**

Moltbook 是一个活跃开发的网站，页面结构可能随时变化。本文档提供的选择器基于当前观察，使用时应：

1. 优先使用 `browser_snapshot()` 获取页面快照
2. 从快照中动态识别元素，而非硬编码选择器
3. 遇到选择器失效时，更新本文档

---

## 首页元素

### 统计数据区域

```
位置: 页面顶部
内容: AI agents 数量 | posts 数量 | comments 数量
格式: "XXX,XXX AI agents | XX,XXX posts | XXX,XXX comments"
```

**提取方法**:

```python
# 从 snapshot 文本中提取
import re
stats_pattern = r'([\d,]+)\s*AI agents.*?([\d,]+)\s*posts.*?([\d,]+)\s*comments'
match = re.search(stats_pattern, snapshot_text)
if match:
    agents = int(match.group(1).replace(',', ''))
    posts = int(match.group(2).replace(',', ''))
    comments = int(match.group(3).replace(',', ''))
```

### Feed 切换按钮

| 按钮   | 功能     | 识别特征             |
| ------ | -------- | -------------------- |
| 🆕 New | 最新帖子 | 默认选中，文本 "New" |
| 🔥 Top | 热门帖子 | 文本 "Top"           |

**切换方法**:

```python
# 使用 browser_click 点击对应按钮
browser_click(ref="Top 按钮的 ref")
browser_wait_for(time=2)  # 等待内容加载
```

---

## 帖子列表

### 帖子卡片结构

每个帖子卡片包含以下信息：

| 字段     | 位置       | 格式                   |
| -------- | ---------- | ---------------------- |
| 标题     | 卡片顶部   | 纯文本，可能包含 emoji |
| 作者     | 标题下方   | `u/username` 格式      |
| Submolt  | 作者旁边   | `m/submolt_name` 格式  |
| 投票数   | 左侧或底部 | `⬆️ N` 或纯数字        |
| 评论数   | 底部       | `💬 N` 或 `N comments` |
| 发布时间 | 底部       | 相对时间如 "2h ago"    |

**提取模式**:

```python
# 从 snapshot 中识别帖子
post_pattern = {
    'title': '帖子标题文本',
    'author': r'u/(\w+)',
    'submolt': r'm/(\w+)',
    'votes': r'⬆️?\s*(\d+)',
    'comments': r'💬?\s*(\d+)|(\d+)\s*comments?',
    'time': r'(\d+[hmd])\s*ago'
}
```

### 帖子链接

帖子详情页 URL 格式：

```
https://moltbook.com/post/{uuid}
例如: https://moltbook.com/post/779504a7-d645-4d39-a4e5-12e90e4ff513
```

---

## 帖子详情页

### 主要内容区域

| 区域   | 内容                    |
| ------ | ----------------------- |
| 标题区 | 完整标题 + 作者信息     |
| 正文区 | Markdown 渲染的帖子内容 |
| 投票区 | 上下投票按钮 + 当前票数 |
| 评论区 | 评论列表                |

### 评论结构

每条评论包含：

| 字段 | 说明                 |
| ---- | -------------------- |
| 作者 | `u/username`         |
| 内容 | Markdown 文本        |
| 投票 | 评论的投票数         |
| 时间 | 发布时间             |
| 嵌套 | 回复评论（缩进显示） |

**评论提取建议**:

- 限制抓取前 30 条评论
- 优先抓取高赞评论（votes > 3）
- 忽略深度嵌套的回复（> 2 层）

---

## Submolt 页面

### URL 格式

```
https://moltbook.com/m/{submolt_name}
例如: https://moltbook.com/m/counting
```

### 页面结构

| 区域     | 内容                         |
| -------- | ---------------------------- |
| 头部     | Submolt 名称 + 描述 + 成员数 |
| 帖子列表 | 该 submolt 下的帖子          |

---

## 用户页面

### URL 格式

```
https://moltbook.com/u/{username}
例如: https://moltbook.com/u/RosaBot
```

### 可提取信息

| 字段     | 说明           |
| -------- | -------------- |
| Karma    | 用户总积分     |
| 帖子数   | 发布的帖子数量 |
| 评论数   | 发表的评论数量 |
| 加入时间 | 账号创建时间   |

---

## 动态内容处理

### 等待策略

```python
# 页面加载后等待动态内容
browser_navigate(url)
browser_wait_for(time=3)  # 基础等待

# 等待特定内容出现
browser_wait_for(text="posts")  # 等待统计数据加载
```

### 滚动加载

Moltbook 可能使用无限滚动加载更多帖子：

```python
# 滚动加载更多内容
browser_evaluate(function="() => window.scrollTo(0, document.body.scrollHeight)")
browser_wait_for(time=2)
```

---

## 选择器失效处理

当选择器失效时：

1. **检测方法**:

   ```python
   snapshot = browser_snapshot()
   if '关键元素' not in snapshot:
       # 选择器可能已失效
       raise SelectorError("关键元素未找到")
   ```

2. **恢复策略**:
   - 使用 `browser_snapshot()` 重新分析页面结构
   - 更新本文档中的选择器
   - 报告错误给用户

3. **错误报告格式**:

   ```
   ⚠️ 选择器失效

   位置: [首页/帖子详情/评论区]
   预期元素: [描述]
   实际情况: [描述]

   建议: 请检查 references/selectors.md 是否需要更新
   ```

---

## 版本历史

| 版本  | 日期       | 变更     |
| ----- | ---------- | -------- |
| 1.0.0 | 2026-01-31 | 初始版本 |
