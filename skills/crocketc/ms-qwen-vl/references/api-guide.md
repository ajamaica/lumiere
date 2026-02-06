# ModelScope API 使用指南

使用 OpenAI SDK 兼容方式调用 ModelScope 多模态 API。

---

## API 基础信息

| 项目     | 值                                       |
| -------- | ---------------------------------------- |
| 基础 URL | `https://api-inference.modelscope.cn/v1` |
| 认证方式 | API Key (Bearer Token)                   |
| API 格式 | OpenAI Chat Completions 兼容             |

---

## 快速开始

### 安装依赖

```bash
pip install openai>=1.0.0
```

### 初始化客户端

```python
from openai import OpenAI

client = OpenAI(
    api_key="your_api_key",
    base_url="https://api-inference.modelscope.cn/v1",
)
```

### 调用 API（URL 图片）

```python
response = client.chat.completions.create(
    model="Qwen/Qwen3-VL-30B-A3B-Instruct",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}},
                {"type": "text", "text": "请描述这张图片的内容。"},
            ],
        }
    ],
)

print(response.choices[0].message.content)
```

---

## 本地图片处理

### 使用辅助函数（推荐）

```python
from scripts.ms_qwen_vl import get_image_content

# 获取图片 content（URL 或 base64）
image_content = get_image_content("image.jpg")

# 或直接使用 analyze_image 函数
from scripts.ms_qwen_vl import analyze_image
result = analyze_image("image.jpg", task="ocr")
```

### Base64 编码实现

```python
import base64
from io import BytesIO
from PIL import Image

def encode_image(image_path: str) -> str:
    """将图片编码为 base64 data URI"""
    with Image.open(image_path) as img:
        fmt = img.format or "png"
        mime_type = f"image/{fmt.lower()}"
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        buffer = BytesIO()
        img.save(buffer, format=fmt)
        img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:{mime_type};base64,{img_b64}"
```

---

## API 参数

### Chat Completions 参数

```python
response = client.chat.completions.create(
    model="Qwen/Qwen3-VL-30B-A3B-Instruct",  # 必需：模型名称
    messages=[...],                          # 必需：消息列表
    temperature=0.7,                         # 可选：温度 (0.1-1.0)
    max_tokens=2048,                         # 可选：最大输出 token 数
    top_p=0.8,                               # 可选：核采样
)
```

### 消息格式

```python
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {"url": "https://example.com/image.jpg"}  # 或 base64 data URI
            },
            {
                "type": "text",
                "text": "你的问题或指令"
            },
        ],
    }
]
```

---

## 推荐模型

| 模型                               | 参数量 | 特点             |
| ---------------------------------- | ------ | ---------------- |
| `Qwen/Qwen3-VL-30B-A3B-Instruct`   | 30B    | 日常任务，速度快 |
| `Qwen/Qwen3-VL-235B-A22B-Instruct` | 235B   | 高精度，复杂任务 |

更多模型请参考 [models.md](models.md)

---

## 常见问题

**Q: 如何获取 API Key？**
A: 访问 https://modelscope.cn/my/myaccesstoken

**Q: 支持哪些图片格式？**
A: 常见格式均支持：JPG、PNG、GIF、WEBP 等

**Q: 图片大小限制？**
A: 建议不超过 10MB
