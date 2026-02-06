# ModelScope 视觉模型列表

ModelScope 平台可用的 Qwen3-VL 多模态视觉模型。

---

## 推荐模型

| 模型                               | 参数量 | 特点           | 适用场景                     |
| ---------------------------------- | ------ | -------------- | ---------------------------- |
| `Qwen/Qwen3-VL-30B-A3B-Instruct`   | 30B    | 速度快，成本省 | 图像描述、普通 OCR、代码截图 |
| `Qwen/Qwen3-VL-235B-A22B-Instruct` | 235B   | 精度高，能力强 | 手写文字、复杂图表、医学影像 |

---

## 模型详情

### Qwen3-VL-30B-A3B-Instruct（默认）

日常多模态任务的首选模型。

- **调用方式**：默认使用
- **优势**：响应快、成本省
- **场景**：图像描述、印刷体 OCR、简单问答

### Qwen3-VL-235B-A22B-Instruct（精细模式）

高精度复杂任务专用模型。

- **调用方式**：`--precise` 参数或设置环境变量
- **优势**：多模态理解能力强、精度高
- **场景**：手写识别、复杂图表、专业领域分析

---

## 使用示例

```bash
# 默认 30B 模型
python scripts/ms_qwen_vl.py image.jpg --task describe

# 使用 235B 精细模式
python scripts/ms_qwen_vl.py image.jpg --task describe --precise

# 自定义模型
python scripts/ms_qwen_vl.py image.jpg --model Qwen/Qwen3-VL-7B-Instruct
```

```python
from scripts.ms_qwen_vl import analyze_image

# 默认模型
result = analyze_image("image.jpg", task="describe")

# 精细模式
result = analyze_image("image.jpg", task="describe", precise=True)

# 自定义模型
result = analyze_image("image.jpg", model="Qwen/Qwen3-VL-7B-Instruct")
```

---

## 环境变量配置

可在 `.env` 文件中设置默认模型：

```bash
# 默认模型
MODELSCOPE_MODEL=Qwen/Qwen3-VL-30B-A3B-Instruct

# 精细模式模型
MODELSCOPE_MODEL_PRECISE=Qwen/Qwen3-VL-235B-A22B-Instruct
```

---

## 更多模型

访问 ModelScope 查看更多多模态模型：
https://modelscope.cn/models?task=image-to-text
