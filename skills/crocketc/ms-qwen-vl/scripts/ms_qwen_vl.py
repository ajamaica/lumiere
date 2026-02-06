#!/usr/bin/env python3
"""
MS-Qwen-VL CLI
使用 OpenAI SDK 兼容方式调用 ModelScope Qwen3-VL 多模态 API

支持功能：
- 图像描述 (describe)
- OCR 文字识别 (ocr)
- 视觉问答 (ask)
- 目标检测 (detect)
- 图表解析 (chart)
"""

import argparse
import base64
import os
import sys
from pathlib import Path
from typing import Literal, Optional

import dotenv
from openai import OpenAI
from PIL import Image

# 加载环境变量
dotenv.load_dotenv(Path(__file__).parent / ".env")

# 默认配置
DEFAULT_API_KEY = os.getenv("MODELSCOPE_API_KEY", "")
DEFAULT_MODEL = os.getenv("MODELSCOPE_MODEL", "Qwen/Qwen3-VL-30B-A3B-Instruct")
DEFAULT_MODEL_PRECISE = os.getenv("MODELSCOPE_MODEL_PRECISE", "Qwen/Qwen3-VL-235B-A22B-Instruct")
API_BASE_URL = "https://api-inference.modelscope.cn/v1"

# 任务类型定义
TaskType = Literal["describe", "ocr", "ask", "detect", "chart"]


def encode_image_to_base64(image_path: str) -> str:
    """
    将本地图片编码为 base64 格式

    Args:
        image_path: 图片路径

    Returns:
        data URI 格式的字符串 (data:image/{type};base64,{data})
    """
    with Image.open(image_path) as img:
        # 获取图片格式
        fmt = img.format or "png"
        mime_type = f"image/{fmt.lower()}"

        # 转换为 RGB (处理 RGBA 等)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # 编码为 base64
        import io
        buffer = io.BytesIO()
        img.save(buffer, format=fmt)
        img_bytes = buffer.getvalue()
        img_b64 = base64.b64encode(img_bytes).decode("utf-8")

        return f"data:{mime_type};base64,{img_b64}"


def get_image_content(image_path: str) -> str:
    """
    获取图片内容，URL 直接使用，本地文件编码为 base64

    Args:
        image_path: 图片路径或 URL

    Returns:
        URL 或 base64 data URI
    """
    if image_path.startswith(("http://", "https://")):
        return image_path
    return encode_image_to_base64(image_path)


def get_task_prompt(task: TaskType, question: Optional[str] = None) -> str:
    """
    根据任务类型生成对应的 prompt

    Args:
        task: 任务类型
        question: 用户自定义问题 (仅用于 ask 任务)

    Returns:
        任务 prompt
    """
    prompts = {
        "describe": "请详细描述这张图片的内容，包括主要元素、场景、颜色等。",
        "ocr": "请识别图片中的所有文字内容，保持原文格式和排版。",
        "detect": "请检测并描述图片中的所有物体，包括位置和数量。",
        "chart": "请分析这张图表，提取数据并说明图表的含义。",
    }

    if task == "ask":
        if not question:
            raise ValueError("--question 参数在 ask 任务中是必需的")
        return question

    return prompts.get(task, prompts["describe"])


def analyze_image(
    image_path: str,
    task: TaskType = "describe",
    question: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    precise: bool = False,
) -> str:
    """
    调用 ModelScope API 分析图片

    Args:
        image_path: 图片路径或 URL
        task: 任务类型
        question: 自定义问题 (ask 任务需要)
        api_key: ModelScope API Key
        model: 指定模型
        precise: 是否使用精细模式模型

    Returns:
        分析结果文本
    """
    # 配置参数
    api_key = api_key or DEFAULT_API_KEY
    if not api_key:
        raise ValueError(
            "请设置 MODELSCOPE_API_KEY 环境变量或传入 --api-key 参数\n"
            "获取 API Key: https://modelscope.cn/my/myaccesstoken"
        )

    if model:
        model_name = model
    elif precise:
        model_name = DEFAULT_MODEL_PRECISE
    else:
        model_name = DEFAULT_MODEL

    # 获取图片内容
    image_content = get_image_content(image_path)

    # 获取任务 prompt
    prompt = get_task_prompt(task, question)

    # 创建 OpenAI 客户端
    client = OpenAI(
        api_key=api_key,
        base_url=API_BASE_URL,
    )

    # 调用 API
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_content}},
                    {"type": "text", "text": prompt},
                ],
            }
        ],
        temperature=0.7,
        max_tokens=2048,
    )

    # 返回结果
    return response.choices[0].message.content or ""


def main():
    parser = argparse.ArgumentParser(
        description="MS-Qwen-VL CLI - 使用 OpenAI SDK 调用 ModelScope Qwen3-VL 多模态 API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
任务类型:
  describe   图像描述 (默认)
  ocr        OCR 文字识别
  ask        视觉问答 (需要 --question 参数)
  detect     目标检测
  chart      图表解析

示例:
  # 图像描述
  python scripts/ms_qwen_vl.py image.jpg

  # OCR 识别
  python scripts/ms_qwen_vl.py image.jpg --task ocr

  # 视觉问答
  python scripts/ms_qwen_vl.py image.jpg --task ask --question "图片里有什么？"

  # 使用精细模式
  python scripts/ms_qwen_vl.py image.jpg --task describe --precise

  # 输出到文件
  python scripts/ms_qwen_vl.py image.jpg --task ocr --output result.txt
        """,
    )

    parser.add_argument(
        "image",
        help="图片路径或 URL",
    )

    parser.add_argument(
        "--task",
        "-t",
        choices=["describe", "ocr", "ask", "detect", "chart"],
        default="describe",
        help="任务类型 (默认: describe)",
    )

    parser.add_argument(
        "--question",
        "-q",
        help="自定义问题 (ask 任务必需)",
    )

    parser.add_argument(
        "--api-key",
        "-k",
        help="ModelScope API Key (也可通过 MODELSCOPE_API_KEY 环境变量设置)",
    )

    parser.add_argument(
        "--model",
        "-m",
        help="指定模型 (覆盖默认模型)",
    )

    parser.add_argument(
        "--precise",
        "-p",
        action="store_true",
        help="使用精细模式模型 (Qwen3-VL-235B)",
    )

    parser.add_argument(
        "--output",
        "-o",
        help="将结果保存到指定文件",
    )

    args = parser.parse_args()

    try:
        result = analyze_image(
            image_path=args.image,
            task=args.task,
            question=args.question,
            api_key=args.api_key,
            model=args.model,
            precise=args.precise,
        )

        if args.output:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(result, encoding="utf-8")
            print(f"结果已保存到: {args.output}")
        else:
            print(result)

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
