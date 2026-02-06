# 微信公众号 API 参考

官方文档: https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html

## 认证

### 获取 Access Token

```
GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET
```

**响应**：

```json
{
  "access_token": "ACCESS_TOKEN",
  "expires_in": 7200
}
```

**说明**：

- `access_token` 有效期 7200 秒（2小时）
- 建议缓存并在过期前重新获取
- 每日调用上限 2000 次

## 草稿箱接口

### 新增草稿

```
POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN
```

**请求体**：

```json
{
  "articles": [
    {
      "title": "TITLE",
      "author": "AUTHOR",
      "digest": "DIGEST",
      "content": "CONTENT",
      "content_source_url": "SOURCE_URL",
      "thumb_media_id": "THUMB_MEDIA_ID",
      "need_open_comment": 1,
      "only_fans_can_comment": 0,
      "show_cover_pic": 1
    }
  ]
}
```

**字段说明**：

| 字段                  | 类型   | 必填 | 说明                              |
| --------------------- | ------ | ---- | --------------------------------- |
| title                 | string | 是   | 标题                              |
| author                | string | 否   | 作者                              |
| digest                | string | 否   | 图文消息的摘要，不超过120字       |
| content               | string | 是   | 图文消息的内容，支持HTML标签      |
| content_source_url    | string | 否   | 图文消息的原文地址                |
| thumb_media_id        | string | 是   | 封面图片素材ID                    |
| need_open_comment     | int    | 否   | 是否打开评论，1为打开，0为不打开  |
| only_fans_can_comment | int    | 否   | 是否粉丝才可评论，1为粉丝才可评论 |
| show_cover_pic        | int    | 否   | 是否显示封面，1为显示，0为不显示  |

**响应**：

```json
{
  "media_id": "MEDIA_ID"
}
```

### 获取草稿列表

```
POST https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=ACCESS_TOKEN
```

**请求体**：

```json
{
  "offset": 0,
  "count": 20,
  "no_content": 0
}
```

**字段说明**：

| 字段       | 类型 | 说明                                                  |
| ---------- | ---- | ----------------------------------------------------- |
| offset     | int  | 从全部素材的该偏移位置开始返回，0表示从第一个素材返回 |
| count      | int  | 返回素材的数量，取值在1到20之间                       |
| no_content | int  | 1 表示不返回 content 字段，0 表示返回，默认为 0       |

**响应**：

```json
{
  "total_count": 20,
  "item_count": 20,
  "item": [
    {
      "media_id": "MEDIA_ID",
      "content": {
        "news_item": [
          {
            "title": "TITLE",
            "author": "AUTHOR",
            "digest": "DIGEST",
            "content": "CONTENT",
            "content_source_url": "",
            "thumb_media_id": "THUMB_MEDIA_ID",
            "show_cover_pic": 1,
            "need_open_comment": 1,
            "only_fans_can_comment": 0,
            "url": "URL"
          }
        ],
        "create_time": 1577795022,
        "update_time": 1577795022
      },
      "update_time": 1577795022
    }
  ]
}
```

### 删除草稿

```
POST https://api.weixin.qq.com/cgi-bin/draft/delete?access_token=ACCESS_TOKEN
```

**请求体**：

```json
{
  "media_id": "MEDIA_ID"
}
```

### 发布草稿（发布功能）

```
POST https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=ACCESS_TOKEN
```

**请求体**：

```json
{
  "media_id": "MEDIA_ID"
}
```

**响应**：

```json
{
  "publish_id": "PUBLISH_ID",
  "msg_data_id": 1234567890
}
```

**注意**：发布接口需要开通发布权限，发布后有审核过程。

## 素材管理接口

### 上传图文消息内的图片

```
POST https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=ACCESS_TOKEN
```

**Content-Type**: `multipart/form-data`

**说明**：上传图片到微信服务器，返回图片 URL，用于图文消息正文。

**限制**：

- 图片大小不超过 10MB
- 支持 JPG, PNG, GIF 格式

**响应**：

```json
{
  "url": "https://mmbiz.qpic.cn/xxx/0"
}
```

### 新增永久素材（封面图）

```
POST https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=ACCESS_TOKEN&type=image
```

**Content-Type**: `multipart/form-data`

**说明**：上传封面图片素材，返回 `media_id` 用于创建草稿。

## 错误码

| 错误码 | 说明                                | 处理建议                   |
| ------ | ----------------------------------- | -------------------------- |
| -1     | 系统繁忙                            | 稍后重试                   |
| 0      | 请求成功                            | -                          |
| 40001  | 获取 access_token 时 AppSecret 错误 | 检查 AppSecret 是否正确    |
| 40002  | 不合法的凭证类型                    | 检查 access_token 是否有效 |
| 40003  | 不合法的 OpenID                     | 检查 OpenID 是否正确       |
| 40004  | 不合法的媒体文件类型                | 检查媒体文件格式           |
| 40005  | 不合法的文件类型                    | 检查文件类型               |
| 40006  | 不合法的文件大小                    | 检查文件大小是否超限       |
| 40007  | 不合法的媒体文件 ID                 | 检查 media_id 是否有效     |
| 40014  | 不合法的 access_token               | 重新获取 access_token      |
| 41001  | 缺少 access_token 参数              | 检查请求参数               |
| 42001  | access_token 超时                   | 重新获取 access_token      |
| 43001  | 需要 GET 请求                       | 检查请求方法               |
| 43002  | 需要 POST 请求                      | 检查请求方法               |
| 44002  | POST 的数据包为空                   | 检查请求体                 |
| 45009  | 接口调用超过频率限制                | 降低调用频率               |
| 48001  | api 功能未授权                      | 确认公众号有该接口权限     |
| 50001  | 用户未授权该 api                    | 用户未同意授权             |
| 50002  | 用户受限                            | 可能是由于用户投诉         |
| 61451  | 参数错误 (invalid parameter)        | 检查请求参数               |
| 61452  | 无效的操作 (invalid action)         | 检查操作是否合法           |

## 内容规范

### 正文内容

- 支持 HTML 标签：`<p>`, `<br>`, `<img>`, `<b>`, `<i>`, `<s>` 等
- 图片必须使用微信服务器的 URL（通过 uploadimg 接口上传）
- 外部链接会被过滤或提示跳转

### 标题规范

- 长度不超过 64 字符
- 不能包含特殊字符
- 不能为纯数字

### 摘要规范

- 长度不超过 120 字符
- 不填写则自动提取正文前 54 字符
- 用于文章列表展示和分享预览

## Python 示例

### 获取 Access Token

```python
import requests

def get_access_token(appid, appsecret):
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={appsecret}"
    response = requests.get(url)
    data = response.json()
    return data.get('access_token')
```

### 创建草稿

```python
import requests
import json

def create_draft(access_token, title, content, author=""):
    url = f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}"

    data = {
        "articles": [{
            "title": title,
            "author": author,
            "digest": content[:120],
            "content": content,
            "thumb_media_id": "",
            "need_open_comment": 1,
            "only_fans_can_comment": 0
        }]
    }

    response = requests.post(url, json=data)
    return response.json()
```

### 上传图片

```python
import requests

def upload_image(access_token, image_path):
    url = f"https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token={access_token}"

    with open(image_path, 'rb') as f:
        files = {'media': f}
        response = requests.post(url, files=files)

    return response.json().get('url')
```

## 参考链接

- [微信公众号开发文档](https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html)
- [草稿箱接口文档](https://developers.weixin.qq.com/doc/offiaccount/Draft_Box/Add_draft.html)
- [素材管理接口](https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/New_temporary_materials.html)
