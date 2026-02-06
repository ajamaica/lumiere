---
name: facebook-page
description: Manage Facebook Pages via Meta Graph API. Post content (text, photos, links), list posts, manage comments (list/reply/hide/delete). Use when user wants to publish to Facebook Page, check Page posts, or handle comments.
---

# Facebook Page

Skill để quản lý Facebook Page qua Meta Graph API.

## Chức năng

- List các Page mà user quản lý
- Đăng bài (text, ảnh, link)
- List bài đăng của Page
- List/reply/hide/delete comment

## Setup (một lần)

### 1. Tạo Meta App

1. Vào https://developers.facebook.com/apps/ → Create App
2. Chọn **"Other"** → **"Business"** (hoặc Consumer tuỳ use-case)
3. Điền tên app, email
4. Vào **App settings > Basic**: lấy **App ID** và **App Secret**

### 2. Cấu hình OAuth

1. Vào **Add Product** → thêm **Facebook Login**
2. Trong **Facebook Login > Settings**:
   - Valid OAuth Redirect URIs: để trống (dùng manual code flow)
3. Vào **App Roles > Roles** → thêm account làm Admin/Developer

### 3. Cấu hình .env

```bash
cd skills/facebook-page
cp .env.example .env
# Edit .env với App ID và Secret
```

### 4. Cài dependencies và lấy token

```bash
cd scripts
npm install
node auth.js login
```

Script sẽ:

1. In ra URL để user mở browser, đăng nhập, approve permissions
2. User copy URL sau khi approve (chứa `code=...`)
3. Paste URL vào terminal
4. Script exchange code → long-lived token → page tokens
5. Lưu tokens vào `~/.config/fbpage/tokens.json`

## Commands

### List pages

```bash
node cli.js pages
```

### Đăng bài text

```bash
node cli.js post create --page PAGE_ID --message "Hello world"
```

### Đăng bài có ảnh

```bash
node cli.js post create --page PAGE_ID --message "Caption" --photo /path/to/image.jpg
```

### Đăng bài có link

```bash
node cli.js post create --page PAGE_ID --message "Check this out" --link "https://example.com"
```

### List posts

```bash
node cli.js post list --page PAGE_ID --limit 10
```

### List comments của post

```bash
node cli.js comments list --post POST_ID
```

### Reply comment

```bash
node cli.js comments reply --comment COMMENT_ID --message "Thanks!"
```

### Hide comment

```bash
node cli.js comments hide --comment COMMENT_ID
```

### Delete comment

```bash
node cli.js comments delete --comment COMMENT_ID
```

## Permissions cần thiết

- `pages_show_list` - list pages
- `pages_read_engagement` - đọc posts/comments
- `pages_manage_posts` - đăng/sửa/xoá bài
- `pages_manage_engagement` - quản lý comments

## Lưu ý

- Token Page không hết hạn (nếu lấy từ long-lived user token)
- Không log/print token ra output
- App ở Testing mode chỉ hoạt động với accounts trong Roles
