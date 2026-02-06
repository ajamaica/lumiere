# X (Twitter) API 参考

官方文档: https://developer.twitter.com/en/docs/twitter-api

## API 版本

Tweepy 同时支持 X API v1.1 和 v2：

| 版本 | 用途       | 说明               |
| ---- | ---------- | ------------------ |
| v1.1 | 媒体上传   | 使用 tweepy.API    |
| v2   | 发推、查询 | 使用 tweepy.Client |

## 认证方式

### OAuth 1.0a（用户认证）

用于发推、上传媒体等写操作：

```python
auth = tweepy.OAuth1UserHandler(
    api_key, api_secret,
    access_token, access_token_secret
)

# API v1.1
api = tweepy.API(auth)

# API v2
client = tweepy.Client(
    consumer_key=api_key,
    consumer_secret=api_secret,
    access_token=access_token,
    access_token_secret=access_token_secret
)
```

### OAuth 2.0（Bearer Token）

用于只读查询：

```python
client = tweepy.Client(bearer_token="your-bearer-token")
```

## 核心方法

### 发布推文

```python
# 纯文本
client.create_tweet(text="Hello, X!")

# 带媒体
client.create_tweet(
    text="Check this out!",
    media_ids=["media_id_1", "media_id_2"]
)

# 回复推文
client.create_tweet(
    text="This is a reply",
    in_reply_to_tweet_id="tweet_id_to_reply"
)

# 引用推文
client.create_tweet(
    text="Check out this tweet",
    quote_tweet_id="tweet_id_to_quote"
)
```

### 上传媒体

```python
# 简单上传
media = api.media_upload("/path/to/image.jpg")
media_id = media.media_id_string

# 分块上传（大文件）
media = api.media_upload(
    "/path/to/video.mp4",
    chunked=True,
    media_category="tweet_video"
)

# 带进度回调
def progress_callback(bytes_read):
    print(f"Uploaded: {bytes_read} bytes")

media = api.media_upload(
    "/path/to/video.mp4",
    chunked=True,
    media_category="tweet_video",
    progress_callback=progress_callback
)
```

### 媒体分类

| 类别          | 说明     | 用途     |
| ------------- | -------- | -------- |
| tweet_image   | 普通图片 | 推文配图 |
| tweet_video   | 视频     | 推文视频 |
| tweet_gif     | GIF 动画 | 推文动图 |
| amplify_video | 推广视频 | 广告     |

### 获取用户信息

```python
# 获取当前用户
me = client.get_me()
print(me.data.username)

# 获取指定用户
user = client.get_user(username="twitter")
print(user.data.id)

# 获取用户详细信息
user = client.get_user(
    username="twitter",
    user_fields=["created_at", "description", "public_metrics"]
)
```

### 获取推文

```python
# 获取指定推文
tweet = client.get_tweet("tweet_id")
print(tweet.data.text)

# 获取用户推文
tweets = client.get_users_tweets("user_id")
for tweet in tweets.data:
    print(tweet.text)
```

### 删除推文

```python
client.delete_tweet("tweet_id")
```

## 错误处理

### 常见错误码

| 错误码 | 说明     | 处理建议       |
| ------ | -------- | -------------- |
| 88     | 速率限制 | 等待后重试     |
| 130    | 服务过载 | 稍后重试       |
| 186    | 推文过长 | 缩短内容       |
| 187    | 重复推文 | 修改内容后重发 |
| 324    | 媒体无效 | 检查媒体文件   |
| 326    | 用户受限 | 检查账号状态   |
| 327    | 已转发   | 无需处理       |

### 异常类型

```python
from tweepy.errors import (
    HTTPException,
    Forbidden,
    NotFound,
    TooManyRequests,
    Unauthorized
)

try:
    client.create_tweet(text="Hello")
except Forbidden as e:
    print(f"权限不足: {e}")
except TooManyRequests as e:
    print(f"速率限制: {e}")
    print(f"重置时间: {e.response.headers.get('x-rate-limit-reset')}")
except Unauthorized as e:
    print(f"认证失败: {e}")
```

## 速率限制

### API v2 限制

| 端点               | 限制 | 窗口   |
| ------------------ | ---- | ------ |
| POST tweets        | 200  | 15分钟 |
| POST tweets (广告) | 600  | 15分钟 |
| GET tweets         | 900  | 15分钟 |
| GET users          | 900  | 15分钟 |

### 查看剩余配额

```python
# 检查响应头
response = client.get_me()
print(response.headers.get('x-rate-limit-remaining'))
print(response.headers.get('x-rate-limit-reset'))
```

## 数据字段

### 推文对象 (Tweet)

| 字段           | 类型   | 说明                 |
| -------------- | ------ | -------------------- |
| id             | string | 推文唯一ID           |
| text           | string | 推文内容             |
| author_id      | string | 作者ID               |
| created_at     | string | 创建时间             |
| public_metrics | object | 公开指标             |
| entities       | object | 实体（话题、链接等） |

### 用户对象 (User)

| 字段           | 类型   | 说明               |
| -------------- | ------ | ------------------ |
| id             | string | 用户唯一ID         |
| username       | string | 用户名（@后面的）  |
| name           | string | 显示名称           |
| created_at     | string | 注册时间           |
| public_metrics | object | 粉丝、关注、推文数 |
| description    | string | 个人简介           |

### 公开指标 (Public Metrics)

| 字段             | 类型 | 说明   |
| ---------------- | ---- | ------ |
| retweet_count    | int  | 转发数 |
| reply_count      | int  | 回复数 |
| like_count       | int  | 点赞数 |
| quote_count      | int  | 引用数 |
| impression_count | int  | 曝光数 |

## 最佳实践

1. **使用环境变量** 存储凭证
2. **启用速率限制等待** `wait_on_rate_limit=True`
3. **处理异常** 所有 API 调用都包裹 try-except
4. **日志记录** 记录关键操作和错误
5. **媒体预处理** 上传前检查文件大小和格式

## 官方资源

- Tweepy: https://docs.tweepy.org/
- X API v2: https://developer.twitter.com/en/docs/twitter-api
- X API 限制: https://developer.twitter.com/en/docs/twitter-api/rate-limits
