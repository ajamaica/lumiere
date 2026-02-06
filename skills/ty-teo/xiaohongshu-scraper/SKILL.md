---
name: xiaohongshu-scraper
version: 1.0.0
description: 小红书内容爬取和整理。用于搜索小红书笔记、提取详细内容（正文、评论、图片）、生成整理好的 Markdown 文档。当用户要求搜索小红书、查找小红书攻略、整理小红书内容时使用。
---

# 小红书内容爬取

基于 XHS-Downloader 的小红书笔记抓取工具。

## 快速使用

### 1. 启动 API 服务（首次使用或服务未运行时）

```bash
cd /Users/lixiaoji/clawd/skills/xiaohongshu-scraper/scripts
./xhs-api-service.sh start
```

### 2. 完整抓取并保存（推荐）

```bash
# 抓取笔记，下载图片，OCR识别，保存到指定文件夹
python xhs_scraper.py "笔记URL" --output /tmp/xhs_note

# 批量抓取多个链接
python xhs_scraper.py "URL1" "URL2" "URL3" --output /tmp/xhs_notes

# 不进行 OCR（更快）
python xhs_scraper.py "笔记URL" --output /tmp/xhs_note --no-ocr

# 仅获取信息不下载
python xhs_scraper.py "笔记URL" --info-only

# 输出 JSON 格式
python xhs_scraper.py "笔记URL" --json
```

### 3. 支持的链接格式

- `https://www.xiaohongshu.com/explore/作品ID?xsec_token=XXX`
- `https://www.xiaohongshu.com/discovery/item/作品ID?xsec_token=XXX`
- `https://www.xiaohongshu.com/user/profile/作者ID/作品ID?xsec_token=XXX`
- `https://xhslink.com/分享码`（短链接）
- 支持一次输入多个链接，空格分隔

## 服务管理

```bash
# 启动服务
./xhs-api-service.sh start

# 停止服务
./xhs-api-service.sh stop

# 重启服务
./xhs-api-service.sh restart

# 查看状态
./xhs-api-service.sh status
```

## API 直接调用

服务运行后，可以直接调用 API：

```bash
# 获取笔记信息
curl -X POST http://127.0.0.1:5556/xhs/detail \
  -H "Content-Type: application/json" \
  -d '{"url": "笔记链接", "download": true}'
```

API 文档：http://127.0.0.1:5556/docs

## 输出文件结构

```
output_dir/
├── 作品ID/
│   ├── note.json           # 结构化数据（完整信息）
│   ├── note.md             # Markdown 文档
│   ├── images/             # 下载的图片
│   │   ├── 01.jpeg
│   │   ├── 02.jpeg
│   │   └── ...
│   └── ocr/                # OCR 识别结果
│       ├── 01.md           # 每张图片对应的 OCR 文本
│       ├── 02.md
│       └── ...
```

## note.json 格式

```json
{
  "note_id": "笔记ID",
  "fetch_time": "抓取时间",
  "title": "标题",
  "desc": "描述/正文",
  "type": "作品类型（图文/视频）",
  "author": {
    "nickname": "作者昵称",
    "user_id": "作者ID",
    "profile_url": "作者主页"
  },
  "interact": {
    "liked_count": 123,
    "collected_count": 456,
    "comment_count": 78,
    "share_count": 9
  },
  "tags": ["标签1", "标签2"],
  "publish_time": "发布时间",
  "last_update_time": "最后更新时间",
  "url": "笔记链接",
  "download_urls": ["下载地址列表"],
  "local_files": ["本地文件路径"],
  "ocr_results": [
    {"image": "01.jpeg", "text": "OCR识别的文字"}
  ]
}
```

## Python 调用示例

```python
import subprocess
import json
from pathlib import Path

def scrape_xhs_note(url: str, output_dir: str) -> dict:
    """抓取小红书笔记"""
    script = "/Users/lixiaoji/clawd/skills/xiaohongshu-scraper/scripts/xhs_scraper.py"
    result = subprocess.run(
        ["python", script, url, "--output", output_dir, "--json"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        return json.loads(result.stdout)
    else:
        raise Exception(result.stderr)

# 使用示例
data = scrape_xhs_note("https://www.xiaohongshu.com/explore/xxx", "/tmp/xhs")
print(data["title"])
```

## 脚本列表

| 脚本 | 用途 |
|------|------|
| `xhs_scraper.py` | 完整抓取工具（推荐）：下载+OCR+保存 |
| `xhs_api_client.py` | 简单客户端：仅获取信息 |
| `xhs-api-service.sh` | API 服务管理脚本 |
| `xhs_download.py` | 直接调用源码下载（无需 API） |

## 依赖

- XHS-Downloader（已安装在 `/Users/lixiaoji/Downloads/XHS-Downloader-master-2`）
- Python 3.12+
- requests

## 配置路径

| 项目 | 路径 |
|------|------|
| XHS-Downloader 源码 | `/Users/lixiaoji/Downloads/XHS-Downloader-master-2` |
| 默认下载目录 | `/Users/lixiaoji/Downloads/XHS-Downloader_V2/_internal/Volume/Download` |
| 默认输出目录 | `/Users/lixiaoji/clawd/data/xhs` |
| API 日志 | `/tmp/xhs-downloader-api.log` |

## 注意事项

1. **首次使用**需要先启动 API 服务
2. 下载的文件默认保存在 XHS-Downloader 目录
3. 使用 `--output` 参数将文件整理保存到指定目录
4. OCR 功能使用 macOS 内置的 Vision 框架，仅支持 macOS
5. 某些笔记可能有访问限制（作者设置、被删除等）
6. 短链接需要网络请求解析，确保网络通畅

## 故障排除

### API 服务无法启动

1. 检查端口 5556 是否被占用：`lsof -i :5556`
2. 查看日志：`cat /tmp/xhs-downloader-api.log`
3. 手动启动测试：
   ```bash
   cd /Users/lixiaoji/Downloads/XHS-Downloader-master-2
   source venv/bin/activate
   python main.py api
   ```

### 获取数据失败

1. 检查链接格式是否正确
2. 某些笔记可能有访问限制（作者设置、被删除等）
3. 尝试在浏览器中打开链接确认笔记是否可访问

### 找不到下载的文件

1. 检查下载目录是否有新文件
2. 文件名格式为：`发布时间_作者昵称_标题_序号.扩展名`
3. 等待下载完成后再查找
