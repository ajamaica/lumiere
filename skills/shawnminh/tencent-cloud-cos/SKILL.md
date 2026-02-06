---
name: tencentcloud-cos-skill
description: 腾讯云对象存储(COS)和数据万象(CI)集成 - 基于官方MCP服务器的Clawdbot技能
metadata:
  {
    'openclaw':
      {
        'emoji': '☁️',
        'homepage': 'https://github.com/Tencent/cos-mcp',
        'requires':
          {
            'bins': ['node', 'npx'],
            'env': ['TENCENT_COS_SECRET_ID', 'TENCENT_COS_SECRET_KEY'],
            'config': ['tencent-cos.enabled'],
          },
        'primaryEnv': 'TENCENT_COS_SECRET_ID',
        'install':
          [
            {
              'id': 'npm',
              'kind': 'node',
              'package': 'cos-mcp',
              'bins': ['cos-mcp'],
              'label': '安装腾讯云COS MCP服务器 (npm)',
            },
          ],
      },
  }
---

# 腾讯云COS技能 ☁️

基于腾讯云官方 [cos-mcp](https://www.npmjs.com/package/cos-mcp) MCP服务器的Clawdbot技能，提供完整的腾讯云对象存储(COS)和数据万象(CI)能力。

## ✨ 核心功能

### 🗂️ 云存储操作

- **文件上传**: 上传本地文件到COS存储桶
- **文件下载**: 从COS下载文件到本地
- **文件列表**: 查看存储桶中的文件
- **文件管理**: 删除、复制、移动文件

### 🖼️ 图片处理 (数据万象CI)

- **图片信息**: 获取图片元数据
- **质量评估**: 评估图片质量分数
- **超分辨率**: AI提升图片分辨率
- **智能抠图**: 自动去除图片背景
- **二维码识别**: 识别图片中的二维码
- **文字水印**: 添加文字水印到图片

### 🔍 智能搜索

- **以图搜图**: 上传图片搜索相似图片
- **文本搜图**: 用文字描述搜索相关图片

### 📄 文档处理

- **文档转换**: 支持多种格式转PDF
- **视频处理**: 视频封面生成、截帧

## 🔧 安装配置

### 1. 安装依赖

```bash
# 安装腾讯云COS MCP服务器
npm install -g cos-mcp@latest
```

### 2. 配置环境变量

```bash
# 设置腾讯云COS认证信息
export TENCENT_COS_SECRET_ID="AKIDxxxxxxxxxxxxxxxxxxxxxxxx"
export TENCENT_COS_SECRET_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TENCENT_COS_REGION="ap-guangzhou"
export TENCENT_COS_BUCKET="your-bucket-name-123456"
```

### 3. Clawdbot配置

在 `~/.openclaw/openclaw.json` 中添加:

```json
{
  "skills": {
    "entries": {
      "tencent-cos": {
        "enabled": true,
        "env": {
          "TENCENT_COS_SECRET_ID": "AKIDxxxxxxxxxxxxxxxxxxxxxxxx",
          "TENCENT_COS_SECRET_KEY": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          "TENCENT_COS_REGION": "ap-guangzhou",
          "TENCENT_COS_BUCKET": "your-bucket-name-123456"
        }
      }
    }
  }
}
```

## 📖 使用指南

### 基础文件操作

```
# 上传文件到COS
上传文件到腾讯云COS: /path/to/local/file.jpg

# 从COS下载文件
从腾讯云COS下载文件: cos-file-key.jpg

# 列出COS文件
列出腾讯云COS存储桶中的文件

# 获取文件信息
获取COS文件信息: file-key.jpg
```

### 图片处理

```
# 评估图片质量
评估图片质量: image.jpg

# 提升图片分辨率
提升图片分辨率: low-res-image.jpg

# 去除图片背景
去除图片背景: portrait.jpg

# 识别二维码
识别二维码图片: qrcode.jpg

# 添加文字水印
添加水印到图片: original.jpg 文字: "公司机密"
```

### 智能搜索

```
# 文本搜索图片
搜索相关图片: 风景照片

# 图片搜索相似图片
搜索相似图片: reference.jpg
```

### 文档处理

```
# 文档转PDF
转换文档为PDF: document.docx

# 生成视频封面
生成视频封面: video.mp4
```

## 🛠️ 工具列表

### 存储操作工具

| 工具名         | 描述          | 参数示例                |
| -------------- | ------------- | ----------------------- |
| `cos_upload`   | 上传文件到COS | `local_path`, `cos_key` |
| `cos_download` | 从COS下载文件 | `cos_key`, `local_path` |
| `cos_list`     | 列出COS文件   | `prefix`, `max_keys`    |
| `cos_delete`   | 删除COS文件   | `cos_key`               |
| `cos_get_url`  | 获取文件URL   | `cos_key`, `expires`    |

### 图片处理工具

| 工具名                  | 描述         | 参数示例          |
| ----------------------- | ------------ | ----------------- |
| `cos_image_info`        | 获取图片信息 | `cos_key`         |
| `cos_assess_quality`    | 评估图片质量 | `cos_key`         |
| `cos_super_resolution`  | 超分辨率处理 | `cos_key`         |
| `cos_remove_background` | 去除背景     | `cos_key`         |
| `cos_detect_qrcode`     | 识别二维码   | `cos_key`         |
| `cos_add_watermark`     | 添加文字水印 | `cos_key`, `text` |

### 搜索工具

| 工具名                | 描述     | 参数示例  |
| --------------------- | -------- | --------- |
| `cos_search_by_image` | 以图搜图 | `cos_key` |
| `cos_search_by_text`  | 文本搜图 | `text`    |

### 文档工具

| 工具名                     | 描述         | 参数示例  |
| -------------------------- | ------------ | --------- |
| `cos_convert_to_pdf`       | 文档转PDF    | `cos_key` |
| `cos_generate_video_cover` | 生成视频封面 | `cos_key` |

## 🚀 快速开始示例

### 示例1: 批量上传图片并处理

```
1. 上传图片文件夹到COS
2. 对每张图片进行质量评估
3. 自动优化低质量图片
4. 添加统一水印
5. 生成处理报告
```

### 示例2: 智能图片库管理

```
1. 上传新图片到COS
2. 自动提取图片特征
3. 建立智能索引
4. 支持自然语言搜索
5. 按需生成不同尺寸
```

### 示例3: 文档自动化流水线

```
1. 接收各种格式文档
2. 统一转换为PDF
3. 存储到COS指定目录
4. 生成访问链接
5. 发送处理通知
```

## ⚙️ 高级配置

### 自定义MCP服务器配置

```json
{
  "tencent_cos": {
    "mcp_server": {
      "command": "npx",
      "args": [
        "cos-mcp",
        "--Region=${TENCENT_COS_REGION}",
        "--Bucket=${TENCENT_COS_BUCKET}",
        "--SecretId=${TENCENT_COS_SECRET_ID}",
        "--SecretKey=${TENCENT_COS_SECRET_KEY}",
        "--connectType=stdio"
      ]
    },
    "timeout": 30000,
    "retry_attempts": 3
  }
}
```

### 多环境支持

```bash
# 开发环境
export TENCENT_COS_ENV="development"
export TENCENT_COS_BUCKET="dev-bucket-123456"

# 生产环境
export TENCENT_COS_ENV="production"
export TENCENT_COS_BUCKET="prod-bucket-123456"
```

## 🔒 安全最佳实践

### 1. 密钥管理

- 使用环境变量存储密钥，不要硬编码
- 定期轮换访问密钥
- 使用子账号密钥，遵循最小权限原则

### 2. 访问控制

- 设置存储桶访问权限
- 使用临时密钥进行敏感操作
- 启用操作日志审计

### 3. 数据安全

- 启用服务器端加密
- 敏感数据单独存储
- 定期备份重要数据

## 🐛 故障排除

### 常见问题

1. **认证失败**
   - 检查SecretId和SecretKey是否正确
   - 确认密钥是否有对应存储桶的权限
   - 验证密钥是否过期

2. **连接超时**
   - 检查网络连接
   - 确认区域配置是否正确
   - 增加超时时间设置

3. **权限不足**
   - 检查存储桶权限设置
   - 确认操作是否在允许范围内
   - 使用具有足够权限的密钥

### 调试模式

```bash
# 启用详细日志
export TENCENT_COS_DEBUG="true"

# 查看MCP服务器日志
cos-mcp --Region=ap-guangzhou --Bucket=test --SecretId=test --SecretKey=test --connectType=sse --port=3001
```

## 📞 支持与贡献

### 官方资源

- **腾讯云COS文档**: https://cloud.tencent.com/document/product/436
- **cos-mcp GitHub**: https://github.com/Tencent/cos-mcp
- **MCP协议文档**: https://modelcontextprotocol.io

### 问题反馈

1. 技能使用问题: 在Clawdbot社区反馈
2. COS功能问题: 联系腾讯云技术支持
3. MCP协议问题: 查看MCP官方文档

### 贡献指南

欢迎提交Pull Request改进这个技能：

1. Fork项目仓库
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 📄 许可证

本技能基于腾讯云cos-mcp项目，遵循BSD-3许可证。

---

_最后更新: 2026-02-02_
_版本: 1.0.0_
