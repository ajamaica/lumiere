# MS-Qwen-VL

基于 ModelScope Qwen3-VL 多模态 API 的视觉识别技能，专为 Claude Code 设计。

## 功能特点

- **OpenAI SDK 兼容**：使用标准 OpenAI SDK 调用 API
- **多种任务支持**：图像描述、OCR、视觉问答、目标检测、图表解析
- **双模型模式**：
  - 快速模式：Qwen3-VL-30B（默认）
  - 精细模式：Qwen3-VL-235B
- **灵活输入**：支持本地图片和 URL

## 安装

```bash
# 安装依赖
pip install -r requirements.txt

# 配置 API Key
cp scripts/.env.example scripts/.env
```

编辑 `scripts/.env` 文件，填入从 https://modelscope.cn/my/myaccesstoken 获取的 API Key：

```bash
MODELSCOPE_API_KEY=your_api_key_here
```

## 使用方法

### 命令行

```bash
# 图像描述（默认）
python scripts/ms_qwen_vl.py image.jpg

# OCR 文字识别
python scripts/ms_qwen_vl.py image.jpg --task ocr

# 视觉问答
python scripts/ms_qwen_vl.py image.jpg --task ask --question "图片里有什么？"

# 目标检测
python scripts/ms_qwen_vl.py image.jpg --task detect

# 图表解析
python scripts/ms_qwen_vl.py image.jpg --task chart

# 使用精细模式（235B 模型）
python scripts/ms_qwen_vl.py image.jpg --task describe --precise

# 输出到文件
python scripts/ms_qwen_vl.py image.jpg --task ocr --output result.txt
```

### Python 代码

```python
from scripts.ms_qwen_vl import analyze_image

# 图像描述
result = analyze_image("image.jpg")
print(result)

# OCR 识别
result = analyze_image("image.jpg", task="ocr")
print(result)

# 视觉问答
result = analyze_image("image.jpg", task="ask", question="这是什么？")
print(result)

# 使用精细模式
result = analyze_image("image.jpg", task="describe", precise=True)
print(result)
```

## 任务类型

| 任务     | 参数       | 说明                     |
| -------- | ---------- | ------------------------ |
| 图像描述 | `describe` | 详细描述图片内容（默认） |
| OCR 识别 | `ocr`      | 识别图片中的文字         |
| 视觉问答 | `ask`      | 回答关于图片的问题       |
| 目标检测 | `detect`   | 检测图片中的物体         |
| 图表解析 | `chart`    | 解析图表数据             |

## 环境变量

| 变量名                     | 说明             | 默认值                             |
| -------------------------- | ---------------- | ---------------------------------- |
| `MODELSCOPE_API_KEY`       | API 密钥（必需） | -                                  |
| `MODELSCOPE_MODEL`         | 默认模型         | `Qwen/Qwen3-VL-30B-A3B-Instruct`   |
| `MODELSCOPE_MODEL_PRECISE` | 精细模式模型     | `Qwen/Qwen3-VL-235B-A22B-Instruct` |

## 获取 API Key

访问 https://modelscope.cn/my/myaccesstoken 登录后获取 API Key。

## 文件结构

```
ms-qwen-vl/
├── SKILL.md              # Claude Code Skill 定义
├── README.md             # 项目说明
├── requirements.txt      # Python 依赖
├── .gitignore            # Git 忽略配置
├── scripts/
│   ├── .env.example      # 环境变量示例
│   └── ms_qwen_vl.py     # 核心解析脚本
└── references/
    ├── api-guide.md      # OpenAI SDK 兼容调用说明
    └── models.md         # Qwen3-VL 系列模型说明
```

## 依赖

- `openai` >= 1.0.0 - OpenAI SDK
- `Pillow` >= 9.0.0 - 图像处理
- `python-dotenv` >= 1.0.0 - 环境变量加载

## 许可证

MIT License
