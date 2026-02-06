#!/usr/bin/env python3
"""
网页内容提取脚本
从任意URL爬取并提取页面文本内容
"""

import sys
import json
import re
import requests
from bs4 import BeautifulSoup


def extract_text_from_url(url: str) -> dict:
    """
    从URL爬取并提取页面文本内容

    参数:
        url: 目标URL

    返回:
        dict: {"success": bool, "content": str, "error": str, "title": str}
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5,zh-CN;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive"
    }

    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()

        # 检测编码
        if response.encoding == 'ISO-8859-1':
            response.encoding = response.apparent_encoding

        soup = BeautifulSoup(response.text, 'html.parser')

        # 提取标题
        title = ""
        if soup.title:
            title = soup.title.get_text().strip()

        # 移除不需要的元素
        for element in soup(["script", "style", "nav", "footer", "header", "iframe", "noscript"]):
            element.decompose()

        # 提取主要内容
        # 尝试多种常见的内容容器选择器
        content_selectors = [
            'article',
            'main',
            '[role="main"]',
            '[class*="content"]',
            '[class*="article"]',
            '[class*="post"]',
            '[class*="entry"]',
            '[id*="content"]',
            '[id*="article"]',
            '[id*="post"]',
            '[id*="main"]',
            'div.post-content',
            'div.entry-content',
            'div.markdown-body',
            'div.article-body',
            'div.story-body',
            '.article__content',
            '.post__content',
            '.content-body'
        ]

        text = ""
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(separator='\n', strip=True)
                if len(text) > 500:  # 如果内容足够长，就使用它
                    break

        # 如果没有找到容器，尝试使用整个body
        if not text or len(text) < 500:
            body = soup.find('body')
            if body:
                text = body.get_text(separator='\n', strip=True)

        # 清理文本
        # 移除多余的空行
        text = re.sub(r'\n\s*\n', '\n\n', text)
        # 移除行首行尾的空白
        text = '\n'.join(line.strip() for line in text.split('\n'))
        text = text.strip()

        if len(text) < 100:
            return {
                "success": False,
                "content": "",
                "error": "提取的内容过短，可能不是有效的页面",
                "title": title
            }

        return {
            "success": True,
            "content": text,
            "error": None,
            "title": title
        }

    except requests.exceptions.Timeout:
        return {
            "success": False,
            "content": "",
            "error": "请求超时",
            "title": ""
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "content": "",
            "error": "连接失败",
            "title": ""
        }
    except requests.exceptions.HTTPError as e:
        return {
            "success": False,
            "content": "",
            "error": f"HTTP错误: {e.response.status_code}",
            "title": ""
        }
    except Exception as e:
        return {
            "success": False,
            "content": "",
            "error": f"爬取失败: {str(e)}",
            "title": ""
        }


def main():
    """命令行入口"""
    if len(sys.argv) != 2:
        print("用法: python extract_webpage.py <URL>")
        print("示例: python extract_webpage.py https://example.com/article")
        sys.exit(1)

    url = sys.argv[1]

    try:
        result = extract_text_from_url(url)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
