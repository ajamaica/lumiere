# Graph API Reference

## Base URL

```
https://graph.facebook.com/v21.0
```

## Authentication

Tất cả request cần `access_token` parameter.

### Token Types

- **User Token**: Lấy từ OAuth login, dùng để lấy Page tokens
- **Page Token**: Dùng cho các thao tác trên Page cụ thể

### Token Flow

1. User login → short-lived user token (~1h)
2. Exchange → long-lived user token (~60 days)
3. Get /me/accounts → Page tokens (không hết hạn nếu từ long-lived user token)

## Endpoints

### Pages

```
GET /me/accounts
  ?fields=id,name,access_token
```

Trả về list Pages mà user quản lý.

### Posts

#### List posts

```
GET /{page-id}/posts
  ?fields=id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)
  &limit=10
```

#### Create text post

```
POST /{page-id}/feed
  message=Hello world
```

#### Create photo post

```
POST /{page-id}/photos
  message=Caption
  source=<file>
```

#### Create link post

```
POST /{page-id}/feed
  message=Check this
  link=https://example.com
```

#### Delete post

```
DELETE /{post-id}
```

### Comments

#### List comments

```
GET /{post-id}/comments
  ?fields=id,message,from,created_time,like_count,is_hidden
  &limit=25
```

#### Reply to comment

```
POST /{comment-id}/comments
  message=Reply text
```

#### Hide/unhide comment

```
POST /{comment-id}
  is_hidden=true|false
```

#### Delete comment

```
DELETE /{comment-id}
```

## Permissions

| Permission              | Mô tả                                |
| ----------------------- | ------------------------------------ |
| pages_show_list         | Xem list Pages user quản lý          |
| pages_read_engagement   | Đọc posts, comments, reactions       |
| pages_manage_posts      | Tạo/sửa/xoá posts                    |
| pages_manage_engagement | Quản lý comments (hide/delete/reply) |

## Rate Limits

- ~200 calls/user/hour cho hầu hết endpoints
- Batch requests để giảm số calls
- Check header `X-App-Usage` để monitor

## Error Codes

| Code | Mô tả                      |
| ---- | -------------------------- |
| 190  | Token hết hạn hoặc invalid |
| 200  | Permission denied          |
| 10   | Permission chưa được cấp   |
| 368  | Spam/policy violation      |
