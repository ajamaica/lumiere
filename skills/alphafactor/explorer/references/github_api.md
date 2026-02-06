# GitHub Search API 参考

官方文档: https://docs.github.com/en/rest/search

## Search Repositories

**Endpoint**: `GET https://api.github.com/search/repositories`

### 请求参数

| 参数       | 类型    | 必选 | 说明                          |
| ---------- | ------- | ---- | ----------------------------- |
| `q`        | string  | Y    | 搜索查询语句                  |
| `sort`     | string  | N    | 排序方式: stars/forks/updated |
| `order`    | string  | N    | 排序方向: asc/desc            |
| `per_page` | integer | N    | 每页结果数 (1-100)            |
| `page`     | integer | N    | 页码                          |

### 查询语法

#### 标签搜索

```
topic:python
```

#### Star 数量

```
stars:>1000          # 大于 1000 stars
stars:>=500          # 大于等于 500 stars
stars:1000..5000    # 1000-5000 stars
```

#### 创建时间

```
created:>2024-01-01        # 2024年后创建
created:2023-01-01..2023-12-31  # 2023年创建
```

#### 更新时间

```
pushed:>2024-01-01    # 最近有更新
```

#### 编程语言

```
language:python
language:javascript
language:rust
```

#### 组合查询

```
# Python AI 项目，Star > 1000
topic:machine-learning language:python stars:>1000

# 最近创建的 Rust 项目
topic:cli language:rust created:>2024-01-01
```

### 响应字段

```json
{
  "total_count": 40,
  "incomplete_results": false,
  "items": [
    {
      "id": 1296269,
      "full_name": "octocat/Hello-World",
      "description": "This your first repo!",
      "html_url": "https://github.com/octocat/Hello-World",
      "stargazers_count": 80,
      "forks_count": 10,
      "language": "JavaScript",
      "topics": ["octocat", "atom", "electron"],
      "created_at": "2011-01-26T19:01:12Z",
      "updated_at": "2024-01-26T19:14:43Z",
      "pushed_at": "2024-01-26T19:14:43Z"
    }
  ]
}
```

### 常用字段

| 字段                | 类型    | 说明                  |
| ------------------- | ------- | --------------------- |
| `id`                | integer | 仓库 ID               |
| `full_name`         | string  | 完整名称 (owner/repo) |
| `description`       | string  | 项目描述              |
| `html_url`          | string  | GitHub 链接           |
| `stargazers_count`  | integer | Star 数量             |
| `forks_count`       | integer | Fork 数量             |
| `language`          | string  | 主要编程语言          |
| `topics`            | array   | 标签列表              |
| `created_at`        | string  | 创建时间 (ISO 8601)   |
| `updated_at`        | string  | 更新时间              |
| `pushed_at`         | string  | 最后推送时间          |
| `size`              | integer | 仓库大小 (KB)         |
| `open_issues_count` | integer | Open Issues 数量      |
| `watchers_count`    | integer | Watchers 数量         |
| `license`           | object  | 许可证信息            |
| `owner`             | object  | 所有者信息            |

## 认证

### Token 认证

Header: `Authorization: token YOUR_TOKEN`

### 请求限制

| 认证状态 | 限制          |
| -------- | ------------- |
| 未认证   | 60 次/小时    |
| 已认证   | 5,000 次/小时 |

查看剩余限制：

```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/rate_limit
```

## 示例请求

### cURL

```bash
# 搜索 Python 项目
curl -G https://api.github.com/search/repositories \
  --data-urlencode "q=topic:python stars:>1000" \
  -H "Accept: application/vnd.github.v3+json"

# 使用 Token
curl -G https://api.github.com/search/repositories \
  --data-urlencode "q=topic:ai language:python" \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json"
```

### Python

```python
import requests

headers = {
    'Authorization': 'token YOUR_TOKEN',
    'Accept': 'application/vnd.github.v3+json'
}

params = {
    'q': 'topic:python stars:>1000',
    'sort': 'stars',
    'order': 'desc'
}

response = requests.get(
    'https://api.github.com/search/repositories',
    headers=headers,
    params=params
)

data = response.json()
for repo in data['items']:
    print(repo['full_name'], repo['stargazers_count'])
```

## 高级搜索技巧

### 排除特定内容

```
machine-learning NOT tutorial
```

### 搜索特定用户/组织

```
user:google topic:machine-learning
org:microsoft stars:>1000
```

### 搜索仓库大小

```
size:>10000        # 大于 10MB
size:1000..10000   # 1MB 到 10MB
```

### 搜索 Followers

```
followers:>1000
```

### 搜索 Forks

```
forks:>100
```

### 搜索 Archived 项目

```
archived:true
archived:false
```

### 搜索 Mirror 项目

```
mirror:true
```

## 注意事项

1. **URL 编码**：查询参数需要 URL 编码
2. **结果限制**：每次请求最多返回 1000 条结果
3. **超时时间**：查询复杂度过高可能超时
4. **缓存**：结果被缓存约 30 秒
