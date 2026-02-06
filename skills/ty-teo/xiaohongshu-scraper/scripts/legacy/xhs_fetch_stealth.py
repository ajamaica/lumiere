#!/usr/bin/env python3
"""
小红书笔记抓取 - Playwright Stealth 方案
使用 stealth 模式绕过反爬检测

使用方法:
    python xhs_fetch_stealth.py "笔记URL或ID" --output /tmp/xhs_output --ocr
"""

import argparse
import json
import os
import re
import requests
import subprocess
import asyncio
from pathlib import Path
from datetime import datetime
from playwright.async_api import async_playwright
from playwright_stealth import Stealth


def load_cookies():
    """加载保存的 cookies"""
    cookie_file = Path.home() / '.xiaohongshu-scraper' / 'cookies.json'
    if cookie_file.exists():
        return json.loads(cookie_file.read_text())
    return None


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


def download_file(url, save_path):
    """下载文件"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.xiaohongshu.com/'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=60, stream=True)
        if resp.status_code == 200:
            with open(save_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
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
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(0) }
let request = VNRecognizeTextRequest { request, error in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    for observation in observations {
        if let topCandidate = observation.topCandidates(1).first { print(topCandidate.string) }
    }
}
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en"]
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])
'''
    with open('/tmp/ocr_vision.swift', 'w') as f:
        f.write(swift_code)
    try:
        result = subprocess.run(['swift', '/tmp/ocr_vision.swift', image_path], capture_output=True, text=True, timeout=60)
        return result.stdout.strip() if result.returncode == 0 else None
    except:
        return None


async def fetch_note(note_id, output_dir, do_ocr=False):
    """使用 Playwright + Stealth 抓取笔记"""
    
    cookies = load_cookies()
    
    result = {
        'note_id': note_id,
        'fetch_time': datetime.now().isoformat(),
        'title': '',
        'desc': '',
        'author': {'nickname': '', 'user_id': ''},
        'interact': {},
        'tags': [],
        'images': [],
        'local_images': [],
        'ocr_results': [],
    }
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = output_dir / 'images'
    images_dir.mkdir(exist_ok=True)
    
    url = f"https://www.xiaohongshu.com/explore/{note_id}"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 900},
            locale='zh-CN',
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        # 注入 cookies
        if cookies:
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
            await context.add_cookies(playwright_cookies)
        
        page = await context.new_page()
        
        # 应用 stealth 模式
        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        
        try:
            print(f"正在打开: {url}")
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            
            # 等待页面加载
            await asyncio.sleep(3)
            
            # 检查是否被拦截
            content = await page.content()
            if '当前笔记暂时无法浏览' in content:
                print("页面被拦截，等待后重试...")
                await asyncio.sleep(2)
                await page.reload()
                await asyncio.sleep(3)
            
            # 等待内容加载
            try:
                await page.wait_for_selector('#detail-desc, .note-content, .desc', timeout=15000)
            except:
                print("等待内容超时，继续尝试...")
            
            await asyncio.sleep(2)
            
            # 从页面 JS 中提取数据
            data = await page.evaluate('''() => {
                try {
                    const state = window.__INITIAL_STATE__;
                    if (state && state.note && state.note.noteDetailMap) {
                        const noteMap = state.note.noteDetailMap;
                        for (const key in noteMap) {
                            if (noteMap[key] && noteMap[key].note) {
                                return noteMap[key].note;
                            }
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
                return null;
            }''')
            
            print(f"JS 数据: {data is not None}")
            
            if data and (data.get('noteId') or data.get('title') or data.get('imageList')):
                result['title'] = data.get('title', '')
                result['desc'] = data.get('desc', '')
                result['author'] = {
                    'nickname': data.get('user', {}).get('nickname', ''),
                    'user_id': data.get('user', {}).get('userId', ''),
                }
                result['interact'] = data.get('interactInfo', {})
                result['tags'] = [t.get('name', '') for t in data.get('tagList', [])]
                
                # 提取图片
                for img in data.get('imageList', []):
                    url = img.get('urlDefault') or img.get('url', '')
                    if url:
                        url = re.sub(r'\?.*$', '', url)
                        result['images'].append(url)
                
                print(f"从 JS 获取: 标题={result['title']}, 图片={len(result['images'])}张")
            else:
                # 备用：从 DOM 提取
                print("从 JS 获取数据失败，尝试从 DOM 提取...")
                
                # 标题
                title_el = await page.query_selector('#detail-title, .title')
                if title_el:
                    result['title'] = (await title_el.inner_text()).strip()
                
                # 作者
                author_el = await page.query_selector('.username, .author-wrapper .name')
                if author_el:
                    result['author']['nickname'] = (await author_el.inner_text()).strip()
                
                # 描述
                desc_el = await page.query_selector('#detail-desc, .note-content, .desc')
                if desc_el:
                    result['desc'] = (await desc_el.inner_text()).strip()
                
                # 图片 - 多种选择器
                img_selectors = [
                    '.swiper-slide img',
                    '[class*="carousel"] img', 
                    '[class*="slider"] img',
                    '.note-slider img',
                    '[class*="image"] img',
                ]
                for selector in img_selectors:
                    imgs = await page.query_selector_all(selector)
                    for img in imgs:
                        src = await img.get_attribute('src')
                        if src and 'http' in src and 'avatar' not in src and 'icon' not in src:
                            src = re.sub(r'\?.*$', '', src)
                            if src not in result['images']:
                                result['images'].append(src)
                
                # 如果还没图片，尝试点击切换
                if not result['images']:
                    indicators = await page.query_selector_all('.swiper-pagination-bullet, [class*="indicator"] span')
                    if indicators:
                        print(f"发现 {len(indicators)} 个图片指示器")
                        for ind in indicators:
                            try:
                                await ind.click()
                                await asyncio.sleep(0.5)
                                active_img = await page.query_selector('.swiper-slide-active img, [class*="active"] img')
                                if active_img:
                                    src = await active_img.get_attribute('src')
                                    if src and 'http' in src:
                                        src = re.sub(r'\?.*$', '', src)
                                        if src not in result['images']:
                                            result['images'].append(src)
                            except:
                                pass
            
            # 截图
            await page.screenshot(path=str(output_dir / 'screenshot.png'), full_page=True)
            
        except Exception as e:
            print(f"错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()
    
    # 下载图片
    if result['images']:
        print(f"\n正在下载 {len(result['images'])} 张图片...")
        for i, img_url in enumerate(result['images']):
            ext = '.webp' if '.webp' in img_url else '.jpg'
            filename = f"image_{i+1:02d}{ext}"
            save_path = images_dir / filename
            if download_file(img_url, str(save_path)):
                result['local_images'].append(str(save_path))
                print(f"  ✓ {filename}")
    
    # OCR
    if do_ocr and result['local_images']:
        print("\n正在进行 OCR...")
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
    md = f"""# {result['title']}

**作者**: {result['author']['nickname']}  
**抓取时间**: {result['fetch_time']}

---

## 正文

{result['desc']}

---

## 图片

"""
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
    print("小红书笔记抓取 (Stealth 模式)")
    print("=" * 60)
    
    note_id = extract_note_id(args.url)
    if not note_id:
        print(f"❌ 无法提取笔记 ID: {args.url}")
        return
    
    print(f"笔记 ID: {note_id}")
    
    result = asyncio.run(fetch_note(note_id, args.output, args.ocr))
    
    print(f"\n✅ 完成!")
    print(f"标题: {result['title']}")
    print(f"作者: {result['author']['nickname']}")
    print(f"图片: {len(result['local_images'])} 张")
    print(f"输出: {args.output}")


if __name__ == '__main__':
    main()
