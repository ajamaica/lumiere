#!/usr/bin/env python3
"""
小红书笔记抓取 - 使用已打开的 Chrome 浏览器
通过 Chrome DevTools Protocol 连接到已登录的 Chrome

使用前：
1. 关闭所有 Chrome 窗口
2. 用以下命令启动 Chrome（开启远程调试）：
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

使用方法:
    python fetch_note_chrome.py "笔记URL或ID" --output /tmp/xhs_output --ocr
"""

import argparse
import json
import os
import re
import requests
import subprocess
import time
from pathlib import Path
from datetime import datetime


def extract_note_id(url_or_id):
    """从各种格式的链接中提取笔记 ID"""
    if re.match(r'^[a-f0-9]{24}$', url_or_id):
        return url_or_id
    
    patterns = [
        r'/explore/([a-f0-9]{24})',
        r'/discovery/item/([a-f0-9]{24})',
        r'/item/([a-f0-9]{24})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    return None


def download_image(url, save_path):
    """下载图片"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.xiaohongshu.com/'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(resp.content)
            return True
    except Exception as e:
        print(f"下载失败: {e}")
    return False


def ocr_image_vision(image_path):
    """使用 macOS Vision 框架进行 OCR"""
    swift_code = '''
import Vision
import AppKit

let imagePath = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    exit(0)
}

let request = VNRecognizeTextRequest { request, error in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    for observation in observations {
        if let topCandidate = observation.topCandidates(1).first {
            print(topCandidate.string)
        }
    }
}
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en"]
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])
'''
    swift_file = '/tmp/ocr_vision.swift'
    with open(swift_file, 'w') as f:
        f.write(swift_code)
    
    try:
        result = subprocess.run(['swift', swift_file, image_path], capture_output=True, text=True, timeout=60)
        return result.stdout.strip() if result.returncode == 0 else None
    except:
        return None


def connect_to_chrome():
    """连接到已开启调试的 Chrome"""
    try:
        resp = requests.get('http://localhost:9222/json', timeout=5)
        if resp.status_code == 200:
            tabs = resp.json()
            return tabs
    except:
        pass
    return None


def fetch_with_playwright_cdp(note_id, output_dir, do_ocr=False):
    """通过 CDP 连接到已有 Chrome"""
    from playwright.sync_api import sync_playwright
    
    result = {
        'note_id': note_id,
        'fetch_time': datetime.now().isoformat(),
        'title': '',
        'author': '',
        'content': '',
        'images': [],
        'local_images': [],
        'ocr_results': []
    }
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = output_dir / 'images'
    images_dir.mkdir(exist_ok=True)
    
    url = f"https://www.xiaohongshu.com/explore/{note_id}"
    
    with sync_playwright() as p:
        # 连接到已运行的 Chrome
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        
        # 获取默认上下文
        context = browser.contexts[0]
        page = context.new_page()
        
        try:
            print(f"正在打开: {url}")
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            time.sleep(5)
            
            # 等待内容
            try:
                page.wait_for_selector('#detail-desc, .note-content', timeout=15000)
            except:
                pass
            
            time.sleep(2)
            
            # 提取标题
            for sel in ['#detail-title', '.title']:
                try:
                    el = page.query_selector(sel)
                    if el:
                        text = el.inner_text().strip()
                        if text and '无法浏览' not in text:
                            result['title'] = text
                            break
                except:
                    pass
            
            # 提取作者
            try:
                el = page.query_selector('.username, .author-wrapper .name')
                if el:
                    result['author'] = el.inner_text().strip()
            except:
                pass
            
            # 提取正文
            for sel in ['#detail-desc', '.note-content', '.desc']:
                try:
                    el = page.query_selector(sel)
                    if el:
                        text = el.inner_text().strip()
                        if text:
                            result['content'] = text
                            break
                except:
                    pass
            
            # 提取图片
            print("正在提取图片...")
            
            # 点击切换获取所有图片
            indicators = page.query_selector_all('.swiper-pagination-bullet')
            if indicators:
                print(f"发现 {len(indicators)} 张图片")
                for i, ind in enumerate(indicators):
                    try:
                        ind.click()
                        time.sleep(0.5)
                        img = page.query_selector('.swiper-slide-active img')
                        if img:
                            src = img.get_attribute('src')
                            if src and 'http' in src:
                                src = re.sub(r'\?.*$', '', src)
                                if src not in result['images']:
                                    result['images'].append(src)
                    except:
                        pass
            
            # 备用：获取所有图片
            if not result['images']:
                imgs = page.query_selector_all('img')
                for img in imgs:
                    try:
                        src = img.get_attribute('src')
                        if src and ('sns-webpic' in src or 'ci.xiaohongshu.com' in src):
                            src = re.sub(r'\?.*$', '', src)
                            if src not in result['images']:
                                result['images'].append(src)
                    except:
                        pass
            
            print(f"找到 {len(result['images'])} 张图片")
            
            # 截图
            page.screenshot(path=str(output_dir / 'screenshot.png'), full_page=True)
            
        except Exception as e:
            print(f"错误: {e}")
        finally:
            page.close()
    
    # 下载图片
    if result['images']:
        print(f"\n下载 {len(result['images'])} 张图片...")
        for i, img_url in enumerate(result['images']):
            ext = '.webp' if '.webp' in img_url else '.jpg'
            filename = f"image_{i+1:02d}{ext}"
            save_path = images_dir / filename
            if download_image(img_url, str(save_path)):
                result['local_images'].append(str(save_path))
                print(f"  ✓ {filename}")
    
    # OCR
    if do_ocr and result['local_images']:
        print("\n进行 OCR...")
        for img_path in result['local_images']:
            text = ocr_image_vision(img_path)
            if text:
                result['ocr_results'].append({
                    'image': Path(img_path).name,
                    'text': text
                })
                print(f"  {Path(img_path).name}: {len(text)} 字符")
    
    # 保存
    with open(output_dir / 'note.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # Markdown
    md = f"# {result['title']}\n\n**作者**: {result['author']}\n\n## 正文\n\n{result['content']}\n\n## 图片\n\n"
    for i, img in enumerate(result['local_images']):
        name = Path(img).name
        md += f"![{name}](images/{name})\n\n"
        for ocr in result['ocr_results']:
            if ocr['image'] == name:
                md += f"```\n{ocr['text']}\n```\n\n"
    
    with open(output_dir / 'note.md', 'w', encoding='utf-8') as f:
        f.write(md)
    
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('url', help='笔记 URL 或 ID')
    parser.add_argument('--output', '-o', default='/tmp/xhs_note')
    parser.add_argument('--ocr', action='store_true')
    args = parser.parse_args()
    
    print("=" * 60)
    print("小红书笔记抓取 - Chrome CDP 方案")
    print("=" * 60)
    
    note_id = extract_note_id(args.url)
    if not note_id:
        print(f"❌ 无法提取笔记 ID")
        return
    
    print(f"笔记 ID: {note_id}")
    
    # 检查 Chrome 调试端口
    tabs = connect_to_chrome()
    if not tabs:
        print("\n❌ 无法连接到 Chrome 调试端口")
        print("\n请按以下步骤操作：")
        print("1. 完全关闭 Chrome（包括后台进程）")
        print("2. 在终端运行：")
        print('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222')
        print("3. 在打开的 Chrome 中登录小红书")
        print("4. 重新运行此脚本")
        return
    
    print(f"✓ 已连接到 Chrome（{len(tabs)} 个标签页）")
    
    result = fetch_with_playwright_cdp(note_id, args.output, args.ocr)
    
    print(f"\n✅ 完成!")
    print(f"标题: {result['title']}")
    print(f"图片: {len(result['local_images'])} 张")
    print(f"输出: {args.output}")


if __name__ == '__main__':
    main()
