# HomePod TTS 依赖说明

## 系统依赖

### 必需

- **Bash** (Linux/macOS/Windows WSL)
- **curl** - 用于 HTTP 请求
- **lsof** - 用于检查端口占用
- **bc** - 用于数学计算
- **Python 3.8+** - 用于 TTS 生成

### 可选

- **Miniforge/Miniconda** - 环境管理（推荐）
- **Git** - 用于版本控制

## Conda 环境依赖

```bash
# 创建环境
conda create -n qwen-tts python=3.10
conda activate qwen-tts

# 安装 Python 依赖
pip install torch>=2.0
pip install soundfile
pip install modelscope
pip install qwen-tts
```

### 详细依赖

```
torch>=2.0.0          # PyTorch 深度学习框架
soundfile>=0.12.0     # 音频文件读写
modelscope>=1.12.0    # 模型管理
qwen-tts              # Qwen3-TTS 模型
```

## Home Assistant 要求

- Home Assistant 2023.0+
- Long-Lived Access Token
- 可访问的 HomePod/Media Player 实体

## 外部服务

1. **Home Assistant** - 智能家居平台
   - URL: http://homeassistant.local:8123 或自定义
   - 需要 API 访问令牌

2. **本地 HTTP 服务** (自动启动)
   - 端口: 8080 (可配置)
   - 用于 serving 音频文件给 Home Assistant

## 目录结构要求

```
project/
├── scripts/
│   └── play-tts.sh        # 主脚本
├── tts/
│   └── tts_dongxuelian_emotion.py  # TTS 脚本（需单独获取）
├── .env                   # 配置文件（需创建）
└── .env.example           # 配置模板
```

## 可选依赖

- **ffmpeg** - 音频格式转换（如果需要处理非 WAV 文件）
- **sox** - 音频处理工具
