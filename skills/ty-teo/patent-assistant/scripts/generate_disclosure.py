#!/usr/bin/env python3
"""
交底书生成器 - 将技术描述转化为结构化交底书
"""

import argparse
import json
import sys
from datetime import datetime


TEMPLATE = """# 专利技术交底书

**生成日期**: {date}
**状态**: 草稿（需发明人审核）

---

## 一、发明名称

{title}

## 二、技术领域

本发明涉及{domain}技术领域，具体涉及{sub_domain}。

## 三、背景技术

### 3.1 现有技术描述

{prior_art}

### 3.2 现有技术缺陷

现有技术存在以下问题：

{problems}

## 四、发明内容

### 4.1 要解决的技术问题

本发明要解决的技术问题是：{core_problem}

### 4.2 技术方案

为解决上述技术问题，本发明采用以下技术方案：

{solution}

### 4.3 有益效果

采用本发明的技术方案，具有以下有益效果：

{benefits}

## 五、具体实施方式

### 5.1 实施例一

{implementation}

## 六、附图说明

建议绘制以下附图：

{figures}

## 七、关键词

{keywords}

---

## 审核清单

- [ ] 发明名称是否准确反映技术方案
- [ ] 背景技术描述是否完整
- [ ] 技术方案是否包含所有关键特征
- [ ] 有益效果是否有数据支撑
- [ ] 实施例是否足够详细
- [ ] 附图是否能清晰说明方案

## 下一步

1. 发明人审核并补充技术细节
2. 进行专利检索确认新颖性
3. 提交给专利代理人撰写权利要求书
"""


def extract_info_from_description(description: str) -> dict:
    """
    从技术描述中提取关键信息
    这是一个简化版本，实际使用时由 AI 完成
    """
    # 默认值
    info = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "title": "一种[待填写]的方法/装置/系统",
        "domain": "[待填写]",
        "sub_domain": "[待填写]",
        "prior_art": "[请描述现有技术方案]",
        "problems": "1. [问题1]\n2. [问题2]\n3. [问题3]",
        "core_problem": "[请描述要解决的核心问题]",
        "solution": description if description else "[请详细描述技术方案]",
        "benefits": "1. [效果1]\n2. [效果2]\n3. [效果3]",
        "implementation": "[请描述具体实施方式]",
        "figures": "- 图1：系统架构图\n- 图2：流程图\n- 图3：关键模块示意图",
        "keywords": "[关键词1], [关键词2], [关键词3]"
    }
    
    return info


def generate_disclosure(description: str, output_format: str = "markdown") -> str:
    """生成交底书"""
    info = extract_info_from_description(description)
    
    if output_format == "json":
        return json.dumps(info, ensure_ascii=False, indent=2)
    
    return TEMPLATE.format(**info)


def main():
    parser = argparse.ArgumentParser(description="专利交底书生成器")
    parser.add_argument("--input", "-i", help="输入文件路径")
    parser.add_argument("--output", "-o", help="输出文件路径")
    parser.add_argument("--format", "-f", choices=["markdown", "json"], default="markdown",
                        help="输出格式")
    parser.add_argument("description", nargs="?", help="技术描述（也可通过 stdin 输入）")
    
    args = parser.parse_args()
    
    # 获取输入
    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            description = f.read()
    elif args.description:
        description = args.description
    elif not sys.stdin.isatty():
        description = sys.stdin.read()
    else:
        print("请提供技术描述（通过参数、文件或 stdin）", file=sys.stderr)
        sys.exit(1)
    
    # 生成交底书
    result = generate_disclosure(description, args.format)
    
    # 输出
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"已保存到: {args.output}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
