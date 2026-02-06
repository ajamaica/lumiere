#!/usr/bin/env python3
"""
小红书笔记抓取 - Playwright + Cookies 方案
加载已保存的 cookies，绕过登录

使用方法:
    python fetch_note_v3.py "笔记URL或ID" --output /tmp/xhs_output --ocr
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


def load_cookies():
    """加载保存的 cookies"""
    cookie_file = Path.home() / '.xiaohongshu-scraper' / 'cookies.json'
    if not cookie_file.exists():
        print(f"❌ Cookie 文件不存在: {cookie_file}")
        return None
    
    with open(cookie_file, 'r') as f:
        cookies = json.load(f)
    return cookies


def extract_note_id(url_or_id):
    """从各种格式的链接中提取笔记 ID"""
    if re.match(r'^[a-f0-9]{24}$', url_or_id):
        return url_or_id
    
    patterns = [
        r'/explore/([a-f0-9]{24})',
        r'/discovery/item/([a-f0-9]{24})',
        r'/item/([a-f0-9]{24})',
        r'note_id=([a-f0-9]{24})',
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
    print("")
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
        result = subprocess.run(
            ['swift', swift_file, image_path],
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception as e:
        print(f"OCR 失败: {e}")
        return None


def fetch_note(note_id, output_dir, do_ocr=False):
    """使用 Playwright 抓取笔记"""
    
    from playwright.sync_api import sync_playwright
    
    cookies = load_cookies()
    if not cookies:
        return None
    
    result = {
        'note_id': note_id,
        'fetch_time': datetime.now().isoformat(),
        'title': '',
        'author': '',
        'content': '',
        'likes': '',
        'collects': '',
        'comments': '',
        'images': [],
        'local_images': [],
        'ocr_results': []
    }
    
    # 创建目录
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = output_dir / 'images'
    images_dir.mkdir(exist_ok=True)
    
    url = f"https://www.xiaohongshu.com/explore/{note_id}"
    
    with sync_playwright() as p:
        # 使用普通浏览器模式（非持久化），手动注入 cookies
        browser = p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        context = browser.new_context(
            viewport={'width': 1280, 'height': 900},
            locale='zh-CN',
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        # 注入 cookies
        playwright_cookies = []
        for c in cookies:
            playwright_cookies.append({
                'name': c['name'],
                'value': c['value'],
                'domain': c.get('domain', '.xiaohongshu.com'),
                'path': c.get('path', '/'),
                'secure': bool(c.get('secure', False)),
                'httpOnly': bool(c.get('httpOnly', False)),
            })
        
        context.add_cookies(playwright_cookies)
        
        page = context.new_page()
        
        try:
            print(f"正在打开: {url}")
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            
            # 等待页面加载
            time.sleep(5)
            
            # 检查是否需要登录或被拦截
            page_content = page.content()
            if '当前笔记暂时无法浏览' in page_content or '页面不见了' in page_content:
                print("页面被拦截，尝试刷新...")
                page.reload()
                time.sleep(5)
            
            # 等待内容加载
            try:
                page.wait_for_selector('#detail-desc, .note-content, .desc', timeout=15000)
            except:
                print("等待内容超时，继续尝试...")
            
            time.sleep(2)
            
            # 提取标题
            title_selectors = ['#detail-title', '.title', 'h1[class*="title"]']
            for sel in title_selectors:
                try:
                    el = page.query_selector(sel)
                    if el:
                        text = el.inner_text().strip()
                        if text and len(text) > 2 and '无法浏览' not in text:
                            result['title'] = text
                            break
                except:
                    pass
            
            # 提取作者
            try:
                author_el = page.query_selector('.username, .author-wrapper .name, [class*="author"] .name')
                if author_el:
                    result['author'] = author_el.inner_text().strip()
            except:
                pass
            
            # 提取正文
            content_selectors = ['#detail-desc', '.note-content', '.desc', '[class*="desc"]']
            for sel in content_selectors:
                try:
                    el = page.query_selector(sel)
                    if el:
                        text = el.inner_text().strip()
                        if text and len(text) > 5:
                            result['content'] = text
                            break
                except:
                    pass
            
            # 提取互动数据
            try:
                like_el = page.query_selector('[class*="like-wrapper"] .count, .like-count')
                if like_el:
                    result['likes'] = like_el.inner_text().strip()
            except:
                pass
            
            try:
                collect_el = page.query_selector('[class*="collect-wrapper"] .count, .collect-count')
                if collect_el:
                    result['collects'] = collect_el.inner_text().strip()
            except:
                pass
            
            # 提取图片 - 多种方法
            print("正在提取图片...")
            
            # 方法1: 从轮播图获取
            swiper_imgs = page.query_selector_all('.swiper-slide img, [class*="carousel"] img, [class*="slider"] img')
            for img in swiper_imgs:
                try:
                    src = img.get_attribute('src')
                    if src and 'http' in src:
                        src = re.sub(r'\?.*$', '', src)  # 移除参数获取原图
                        if src not in result['images']:
                            result['images'].append(src)
                except:
                    pass
            
            # 方法2: 点击切换图片
            indicators = page.query_selector_all('.swiper-pagination-bullet, [class*="indicator"] span')
            if len(indicators) > 1:
                print(f"发现 {len(indicators)} 个图片，正在切换...")
                for i, indicator in enumerate(indicators):
                    try:
                        indicator.click()
                        time.sleep(0.5)
                        active_img = page.query_selector('.swiper-slide-active img')
                        if active_img:
                            src = active_img.get_attribute('src')
                            if src and 'http' in src:
                                src = re.sub(r'\?.*$', '', src)
                                if src not in result['images']:
                                    result['images'].append(src)
                    except:
                        pass
            
            # 方法3: 从所有图片中筛选
            all_imgs = page.query_selector_all('img')
            for img in all_imgs:
                try:
                    src = img.get_attribute('src')
                    if src and 'http' in src:
                        # 过滤小图
                        if any(x in src for x in ['avatar', 'icon', 'logo', 'emoji', 'loading']):
                            continue
                        if 'sns-webpic' in src or 'ci.xiaohongshu.com' in src:
                            src = re.sub(r'\?.*$', '', src)
                            if src not in result['images']:
                                result['images'].append(src)
                except:
                    pass
            
            print(f"找到 {len(result['images'])} 张图片")
            
            # 截图
            screenshot_path = output_dir / 'screenshot.png'
            page.screenshot(path=str(screenshot_path), full_page=True)
            print(f"页面截图已保存")
            
        except Exception as e:
            print(f"抓取出错: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    # 下载图片
    if result['images']:
        print(f"\n正在下载 {len(result['images'])} 张图片...")
        for i, img_url in enumerate(result['images']):
            ext = '.jpg'
            if '.png' in img_url:
                ext = '.png'
            elif '.webp' in img_url:
                ext = '.webp'
            
            filename = f"image_{i+1:02d}{ext}"
            save_path = images_dir / filename
            
            if download_image(img_url, str(save_path)):
                result['local_images'].append(str(save_path))
                print(f"  ✓ {filename}")
            else:
                print(f"  ✗ {filename}")
    
    # OCR
    if do_ocr and result['local_images']:
        print(f"\n正在进行 OCR 识别...")
        for img_path in result['local_images']:
            print(f"  处理: {Path(img_path).name}")
            text = ocr_image_vision(img_path)
            if text:
                result['ocr_results'].append({
                    'image': Path(img_path).name,
                    'text': text
                })
                print(f"    识别到 {len(text)} 字符")
    
    # 保存结果
    with open(output_dir / 'note.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # 生成 Markdown
    md = f"""# {result['title']}

**作者**: {result['author']}  
**点赞**: {result['likes']} | **收藏**: {result['collects']}  
**抓取时间**: {result['fetch_time']}

---

## 正文

{result['content']}

---

## 图片

"""
    for i, img_path in enumerate(result['local_images']):
        img_name = Path(img_path).name
        md += f"### 图片 {i+1}\n\n![{img_name}](images/{img_name})\n\n"
        
        for ocr in result['ocr_results']:
            if ocr['image'] == img_name:
                md += f"**OCR 文字:**\n```\n{ocr['text']}\n```\n\n"
                break
    
    with open(output_dir / 'note.md', 'w', encoding='utf-8') as f:
        f.write(md)
    
    return result


def main():
    parser = argparse.ArgumentParser(description='小红书笔记抓取 v3')
    parser.add_argument('url', help='笔记 URL 或 ID')
    parser.add_argument('--output', '-o', default='/tmp/xhs_note', help='输出目录')
    parser.add_argument('--ocr', action='store_true', help='对图片进行 OCR')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("小红书笔记抓取 v3 (Playwright + Cookies)")
    print("=" * 60)
    
    note_id = extract_note_id(args.url)
    if not note_id:
        print(f"❌ 无法提取笔记 ID: {args.url}")
        return
    
    print(f"笔记 ID: {note_id}")
    
    result = fetch_note(note_id, args.output, args.ocr)
    
    if result:
        print(f"\n" + "=" * 60)
        print("✅ 抓取完成!")
        print("=" * 60)
        print(f"标题: {result['title']}")
        print(f"作者: {result['author']}")
        print(f"图片: {len(result['local_images'])} 张")
        print(f"输出: {args.output}")


if __name__ == '__main__':
    main()
