---
name: xiaohongshu
description: 'XiaoHongShu (Little Red Book) data collection and interaction toolkit. Use when working with XiaoHongShu (小红书) platform for: (1) Searching and scraping notes/posts, (2) Getting user profiles and details, (3) Extracting comments and likes, (4) Following users and liking posts, (5) Fetching home feed and trending content. Automatically handles all encryption parameters (cookies, headers) including a1, webId, x-s, x-s-common, x-t, sec_poison_id, websectiga, gid, x-b3-traceid, x-xray-traceid. Supports guest mode and authenticated sessions via web_session cookie.'
---

# Xiaohongshu Skill

小红书（XiaoHongShu / Little Red Book）数据采集和交互工具包。基于RedCrack纯Python逆向工程实现。

## Quick Start

### Installation

Dependencies are already installed:

```bash
pip install aiohttp loguru pycryptodome getuseragent
```

### Basic Usage

```python
import asyncio
import sys
sys.path.insert(0, r'C:\\Users\\Chocomint\\.openclaw\\workspace\\xiaohongshu\\scripts')

from request.web.xhs_session import create_xhs_session

async def main():
    # ✅ 推荐：不强制代理（有代理再填 proxy）
    # 说明：当前小红书接口经常对“未登录/游客”限制搜索能力。
    # 如果 search 报 code=-104（未登录无权限），请提供 web_session。
    xhs = await create_xhs_session(proxy=None, web_session="YOUR_WEB_SESSION_OR_NONE")

    # Search notes
    res = await xhs.apis.note.search_notes("美妆")
    data = await res.json()
    print(data)

    await xhs.close_session()

asyncio.run(main())
```

## Core Capabilities

### 1. Search & Discovery

**Search notes by keyword:**

```python
res = await xhs_session.apis.note.search_notes("口红")
```

**Get home feed (trending):**

```python
# 注意：get_homefeed 需要 category 参数
res = await xhs_session.apis.note.get_homefeed(
    xhs_session.apis.note.homefeed_category_enum.FOOD
)
```

**Get note detail:**

```python
# note_detail 需要 note_id + xsec_token（有时在搜索结果 item 里叫 xsec_token）
res = await xhs_session.apis.note.note_detail(note_id, xsec_token)
```

### 2. User Interactions

**Get user info:**

```python
res = await xhs_session.apis.auth.get_self_simple_info()
```

**Follow a user:**

```python
res = await xhs_session.apis.user.follow_user(user_id)
```

**Like a note:**

```python
res = await xhs_session.apis.note.like_note(note_id)
```

### 3. Comments

**Get comments for a note:**

```python
# comments 也需要 note_id + xsec_token
res = await xhs_session.apis.comments.get_comments(note_id, xsec_token)
```

## Configuration

### Proxy

代理不是硬性要求（本技能可以 `proxy=None` 运行）。但在以下情况建议使用代理：

- 网络环境不稳定/请求超时
- 频繁触发风控（例如 461）想换出口 IP 试试

**不使用代理：**

```python
xhs = await create_xhs_session(proxy=None, web_session=None)
```

**使用代理：**

```python
xhs = await create_xhs_session(
    proxy="http://127.0.0.1:7890",
    web_session="your_web_session_cookie"  # 需要登录能力时再提供
)
```

### Encryption Parameters

All encryption parameters are automatically generated:

- **Cookies**: a1, webId, acw_tc, web_session, sec_poison_id, websectiga, gid
- **Headers**: x-s, x-s-common, x-t, x-b3-traceid, x-xray-traceid

Configuration file: `scripts/request/web/encrypt/web_encrypt_config.ini`

## Session Management

### Guest Mode (No Login)

```python
xhs_session = await create_xhs_session(proxy="http://127.0.0.1:7890")
```

### Authenticated Mode (With Login)

```python
xhs_session = await create_xhs_session(
    proxy="http://127.0.0.1:7890",
    web_session="030037afxxxxxxxxxxxxxxxxxxxaeb59d5b4"  # Your cookie
)
```

### Close Session

```python
await xhs_session.close_session()
```

## Links & IDs (重要)

- 小红书笔记的公开标识通常是 **note_id（十六进制风格字符串）**，例如：`697cc945000000000a02cdad`。
- 这个 note_id **可以做数学意义的 16 进制→10 进制转换**，但那只是“另一种表示法”，**不会变成小红书的短数字 ID（类似 App Store 的 id741292507）**，也不会更适合拼接小红书链接。
- 我们通过接口得到的可直接打开的网页链接通常形如：
  - `https://www.xiaohongshu.com/explore/<note_id>?xsec_token=...&xsec_source=pc_search`
- **xhslink.com 短链**一般需要在 App/登录态里通过“分享→复制链接”获得；仅靠当前接口通常拿不到。

### 输出到聊天时的链接美化（推荐）

为了避免长链接难看，优先用**文本标签超链接**：

- Markdown：`[标题](https://www.xiaohongshu.com/explore/...)`

---

## Available APIs

All APIs are accessible via `xhs_session.apis.*`:

**Authentication (`apis.auth`):**

- `get_self_simple_info()` - Get current user info

**Notes (`apis.note`):**

- `search_notes(keyword)` - Search notes by keyword
- `get_homefeed(category)` - Get home feed
- `note_detail(note_id, share_token)` - Get note details
- `like_note(note_id)` - Like a note

**Comments (`apis.comments`):**

- `get_comments(note_id, share_token)` - Get note comments

**User (`apis.user`):**

- `follow_user(user_id)` - Follow a user
- `get_user_info(user_id)` - Get user details

## Example Workflows

### Workflow 1: Search and Extract Notes

```python
async def search_example():
    xhs_session = await create_xhs_session(proxy="http://127.0.0.1:7890")

    # Search for makeup tutorials
    res = await xhs_session.apis.note.search_notes("美妆教程")
    data = await res.json()

    for note in data['data']['items']:
        print(f"Title: {note['display_title']}")
        print(f"Author: {note['user']['nickname']}")
        print(f"Likes: {note['liked_count']}")
        print("---")

    await xhs_session.close_session()
```

### Workflow 2: Get Comments for Analysis

```python
async def comments_example():
    xhs_session = await create_xhs_session(proxy="http://127.0.0.1:7890")

    note_id = "64f1a2d30000000013003689"
    res = await xhs_session.apis.comments.get_comments(note_id, "")
    data = await res.json()

    for comment in data['data']['comments']:
        print(f"User: {comment['user']['nickname']}")
        print(f"Content: {comment['content']}")
        print(f"Likes: {comment['like_count']}")
        print("---")

    await xhs_session.close_session()
```

### Workflow 3: User Profile Analysis

```python
async def profile_example():
    xhs_session = await create_xhs_session(
        proxy="http://127.0.0.1:7890",
        web_session="your_cookie_here"
    )

    # Get self info
    res = await xhs_session.apis.auth.get_self_simple_info()
    data = await res.json()

    print(f"Username: {data['data']['user']['nickname']}")
    print(f"Followers: {data['data']['user']['follows']}")
    print(f"Fans: {data['data']['user']['fans']}")

    await xhs_session.close_session()
```

## Important Notes

1. **Proxy is required** for most operations due to XiaoHongShu's anti-scraping measures
2. **Rate limiting**: Be respectful with request frequency to avoid IP bans
3. **Authentication**: Some operations require login (web_session cookie)
4. **Legal compliance**: Use only for legitimate research and data analysis purposes

## Technical Details

Based on [RedCrack](https://github.com/Cialle/RedCrack) - Pure Python reverse engineering of XiaoHongShu's encryption algorithms.

**What's automatically handled:**

- Base64/Base58 custom encoding
- RC4/XOR encryption
- MD5/SHA256 hashing
- Custom signature generation (x-s, x-s-common)
- Dynamic cookie generation (a1, webId, sec_poison_id, etc.)

**No JavaScript runtime required** - All encryption is pure Python.

## Troubleshooting

### Connection errors

- Verify your proxy is running on the configured port
- Try different proxy servers if needed
- Check network connectivity

### 461 errors（风控/安全校验）

- 这通常不是代码语法问题，而是触发了小红书的风控/安全校验。
- 典型现象：`OtherStatusError: 461异常`，或者接口返回看似 success=true 但 HTTP=461。

应对建议：

- 降低频率/加随机 sleep、避免并发
- 换关键词/换 endpoint（例如先用搜索拿到 note_id + xsec_token，再查 detail）
- 使用稳定的登录态（web_session）
- 必要时更换代理出口

### 401/403 errors

- web_session 可能过期
- 小红书可能更新了风控参数/签名逻辑（需要更新逆向实现）

### Import errors

- Ensure all dependencies are installed: `pip install aiohttp loguru pycryptodome getuseragent`
- Check that the skill path is correct in `sys.path.insert()`
