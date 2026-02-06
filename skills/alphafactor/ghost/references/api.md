# Ghost Admin API 参考

## 认证方式

Ghost Admin API 使用 **JWT Token** 认证。

### 获取 Admin API Key

1. 登录 Ghost Admin (https://your-blog.com/ghost/)
2. 进入 Settings → Integrations
3. 点击 "Add custom integration"
4. 复制 Admin API Key (格式: `id:secret`)

### 配置示例

```bash
# ~/.config/ghost/credentials
export GHOST_API_URL="https://your-blog.com/ghost/api/admin/"
export GHOST_ADMIN_API_KEY="5f8c3c2e8c3d2e1f3a4b5c6d:7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
```

## API 端点

### 文章 (Posts)

| 操作     | 方法   | 端点           |
| -------- | ------ | -------------- |
| 列出文章 | GET    | `/posts/`      |
| 创建文章 | POST   | `/posts/`      |
| 更新文章 | PUT    | `/posts/{id}/` |
| 删除文章 | DELETE | `/posts/{id}/` |

### 文章状态

- `draft` - 草稿（默认）
- `published` - 已发布
- `scheduled` - 定时发布

### 文章字段

```json
{
  "title": "文章标题",
  "slug": "article-slug",
  "html": "<p>HTML 内容</p>",
  "excerpt": "摘要",
  "status": "published",
  "tags": [{ "name": "标签名" }]
}
```

## 使用示例

### 创建草稿

```bash
ghost-create "我的新文章" "<p>文章内容</p>" --status draft
```

### 直接发布

```bash
ghost-create "重要公告" "<p>内容</p>" --status published --tags "公告,重要"
```

### 更新文章

```bash
ghost-update 5f8c3c2e8c3d2e1f3a4b5c6d --title "新标题"
```

### 删除文章

```bash
ghost-delete 5f8c3c2e8c3d2e1f3a4b5c6d
```

### 列出文章

```bash
ghost-list 20
```
