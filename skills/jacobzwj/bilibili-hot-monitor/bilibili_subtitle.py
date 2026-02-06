"""
B站视频字幕获取工具
获取指定B站视频的字幕并打印出来
"""

import re
import json
import sys
import io
import requests
from typing import Optional

# 修复Windows命令行编码问题
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def bv_to_av(bv: str) -> int:
    """将BV号转换为AV号"""
    table = "fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF"
    tr = {table[i]: i for i in range(58)}
    s = [11, 10, 3, 8, 4, 6]
    xor = 177451812
    add = 8728348608

    r = sum(tr[bv[s[i]]] * (58 ** i) for i in range(6))
    return (r - add) ^ xor


def extract_bvid(url: str) -> Optional[str]:
    """从URL中提取BV号"""
    # 匹配 BV 号的正则表达式
    pattern = r'BV[a-zA-Z0-9]+'
    match = re.search(pattern, url)
    if match:
        return match.group()
    return None


def get_video_info(bvid: str) -> dict:
    """获取视频信息，包括aid和cid"""
    url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com"
    }

    response = requests.get(url, headers=headers)
    data = response.json()

    if data["code"] != 0:
        raise Exception(f"获取视频信息失败: {data.get('message', '未知错误')}")

    return data["data"]


def get_subtitle_info(aid: int, cid: int, sessdata: str = "") -> list:
    """获取字幕信息"""
    url = f"https://api.bilibili.com/x/player/wbi/v2?aid={aid}&cid={cid}"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com"
    }

    cookies = {}
    if sessdata:
        cookies["SESSDATA"] = sessdata

    response = requests.get(url, headers=headers, cookies=cookies)
    data = response.json()

    if data["code"] != 0:
        raise Exception(f"获取字幕信息失败: {data.get('message', '未知错误')}")

    subtitles = data.get("data", {}).get("subtitle", {}).get("subtitles", [])
    return subtitles


def download_subtitle(subtitle_url: str) -> list:
    """下载字幕内容"""
    # 确保URL以https开头
    if subtitle_url.startswith("//"):
        subtitle_url = "https:" + subtitle_url

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com"
    }

    response = requests.get(subtitle_url, headers=headers)
    data = response.json()

    return data.get("body", [])


def format_time(seconds: float) -> str:
    """将秒数格式化为时间字符串"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


def print_subtitle(subtitle_body: list):
    """打印字幕内容"""
    print("\n" + "=" * 60)
    print("字幕内容")
    print("=" * 60 + "\n")

    for item in subtitle_body:
        from_time = format_time(item["from"])
        to_time = format_time(item["to"])
        content = item["content"]
        print(f"[{from_time} --> {to_time}]")
        print(f"  {content}\n")


def get_bilibili_subtitle(url: str, sessdata: str = ""):
    """
    主函数：获取B站视频字幕

    参数:
        url: B站视频URL
        sessdata: 可选，登录后的SESSDATA cookie，用于获取需要登录的字幕
    """
    print(f"正在处理视频: {url}")

    # 1. 提取BV号
    bvid = extract_bvid(url)
    if not bvid:
        raise Exception("无法从URL中提取BV号")
    print(f"BV号: {bvid}")

    # 2. 获取视频信息
    video_info = get_video_info(bvid)
    aid = video_info["aid"]
    cid = video_info["cid"]
    title = video_info["title"]

    print(f"视频标题: {title}")
    print(f"AID: {aid}, CID: {cid}")

    # 3. 获取字幕列表
    subtitles = get_subtitle_info(aid, cid, sessdata)

    if not subtitles:
        print("\n该视频没有可用的字幕")
        print("提示: 如果视频有CC字幕或AI字幕，可能需要登录才能获取")
        print("请提供SESSDATA cookie（从浏览器中获取）")
        return None

    print(f"\n找到 {len(subtitles)} 个字幕:")
    for i, sub in enumerate(subtitles):
        lang = sub.get("lan_doc", sub.get("lan", "未知"))
        print(f"  {i + 1}. {lang}")

    # 4. 下载并显示第一个字幕（通常是中文或AI生成的字幕）
    # 优先选择中文字幕
    selected_subtitle = None
    for sub in subtitles:
        lan = sub.get("lan", "")
        if "zh" in lan or "ai-zh" in lan:
            selected_subtitle = sub
            break

    if not selected_subtitle:
        selected_subtitle = subtitles[0]

    subtitle_url = selected_subtitle.get("subtitle_url", "")
    if not subtitle_url:
        raise Exception("字幕URL为空")

    print(f"\n正在下载字幕: {selected_subtitle.get('lan_doc', '未知语言')}")

    # 5. 下载并打印字幕
    subtitle_body = download_subtitle(subtitle_url)
    print_subtitle(subtitle_body)

    return subtitle_body


def subtitle_to_text(subtitle_body: list) -> str:
    """将字幕转换为纯文本"""
    return "\n".join(item["content"] for item in subtitle_body)


def print_cookie_help():
    """打印获取Cookie的帮助信息"""
    print("""
================================================================================
如何获取 SESSDATA Cookie:
================================================================================
1. 打开浏览器，访问 https://www.bilibili.com 并登录
2. 按 F12 打开开发者工具
3. 点击 "Application"（应用程序）标签页
4. 在左侧找到 "Cookies" -> "https://www.bilibili.com"
5. 在右侧列表中找到 "SESSDATA"
6. 复制它的值（Value列）
7. 将复制的值填入代码中的 sessdata 变量

注意：SESSDATA 是你的登录凭证，请勿泄露给他人！
================================================================================
""")


if __name__ == "__main__":
    import sys

    # 默认测试URL
    default_url = "https://www.bilibili.com/video/BV11d6rB4EnK/"

    # 支持命令行参数
    if len(sys.argv) > 1:
        video_url = sys.argv[1]
    else:
        video_url = default_url

    # 如果需要登录才能获取字幕，请填入你的SESSDATA
    # 获取方法见 print_cookie_help() 的输出
    sessdata = ""  # 填入你的SESSDATA

    # 如果命令行提供了第二个参数作为SESSDATA
    if len(sys.argv) > 2:
        sessdata = sys.argv[2]

    try:
        subtitle = get_bilibili_subtitle(video_url, sessdata)

        if subtitle:
            # 也可以导出为纯文本
            print("\n" + "=" * 60)
            print("纯文本版本")
            print("=" * 60)
            print(subtitle_to_text(subtitle))
        else:
            print_cookie_help()

    except Exception as e:
        print(f"错误: {e}")
        print_cookie_help()
