#!/usr/bin/env python3
"""
小红书笔记抓取脚本 v2
支持抓取单篇笔记的标题、内容、图片，并进行 OCR

使用方法:
    python fetch_note_v2.py "笔记URL" --output /tmp/xhs_output
"""

import argparse
import json
import time
import os
import re
import requests
import base64
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("请先安装 playwright: pip install playwright && playwright install chromium")
    exit(1)


def download_image(url, save_path, headers=None):
    """下载图片"""
    try:
        if headers is None:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': 'https://www.xiaohongshu.com/'
            }
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(resp.content)
            return True
    except Exception as e:
        print(f"下载失败: {e}")
    return False


def fetch_note(url, output_dir=None, user_data_dir=None):
    """抓取单篇笔记"""
    
    result = {
        'url': url,
        'fetch_time': datetime.now().isoformat(),
        'title': '',
        'author': '',
        'content': '',
        'likes': '',
        'collects': '',
        'comments_count': '',
        'publish_time': '',
        'tags': [],
        'images': [],
        'local_images': []
    }
    
    # 创建输出目录
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        images_dir = os.path.join(output_dir, 'images')
        os.makedirs(images_dir, exist_ok=True)
    
    with sync_playwright() as p:
        if user_data_dir is None:
            user_data_dir = str(Path.home() / '.xiaohongshu-scraper')
        
        # 启动浏览器
        browser = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            viewport={'width': 1280, 'height': 900},
            locale='zh-CN',
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        page = browser.pages[0] if browser.pages else browser.new_page()
        
        try:
            print(f"正在打开: {url}")
            
            # 先访问首页建立 session
            page.goto("https://www.xiaohongshu.com", wait_until='domcontentloaded', timeout=30000)
            time.sleep(3)
            
            # 再访问目标页面
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            time.sleep(5)
            
            # 等待页面加载
            try:
                page.wait_for_selector('#detail-desc, .note-content, .desc, [class*="content"]', timeout=20000)
            except:
                print("等待内容选择器超时，继续尝试...")
            
            time.sleep(3)
            
            # 尝试多种选择器提取标题
            title_selectors = [
                '#detail-title',
                '.title',
                '[class*="title"]',
                'h1'
            ]
            for sel in title_selectors:
                try:
                    el = page.query_selector(sel)
                    if el:
                        text = el.inner_text().strip()
                        if text and len(text) > 2:
                            result['title'] = text
                            break
                except:
                    pass
            
            # 提取作者
            author_selectors = [
                '.author-container .username',
                '.username',
                '[class*="author"] .name',
                '.user-info .name'
            ]
            for sel in author_selectors:
                try:
                    el = page.query_selector(sel)
                    if el:
                        text = el.inner_text().strip()
                        if text:
                            result['author'] = text
                            break
                except:
                    pass
            
            # 提取正文内容
            content_selectors = [
                '#detail-desc',
                '.note-content',
                '.desc',
                '[class*="desc"]',
                '[class*="content"]'
            ]
            for sel in content_selectors:
                try:
                    el = page.query_selector(sel)
                    if el:
                        text = el.inner_text().strip()
                        if text and len(text) > 10:
                            result['content'] = text
                            break
                except:
                    pass
            
            # 提取互动数据
            try:
                like_el = page.query_selector('[class*="like-wrapper"] .count, .like-count, [class*="like"] span.count')
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
            
            # 提取所有图片
            print("正在提取图片...")
            
            # 方法1: 从轮播图/滑动区域获取
            img_selectors = [
                '.swiper-slide img',
                '[class*="carousel"] img',
                '[class*="slider"] img',
                '.note-slider img',
                '.media-container img',
                '[class*="note-image"] img',
                '[class*="image-item"] img'
            ]
            
            for sel in img_selectors:
                try:
                    imgs = page.query_selector_all(sel)
                    for img in imgs:
                        src = img.get_attribute('src')
                        if src and 'http' in src and src not in result['images']:
                            # 尝试获取高清图
                            src = re.sub(r'\?.*$', '', src)
                            result['images'].append(src)
                except:
                    pass
            
            # 方法2: 点击切换获取所有图片
            indicators = page.query_selector_all('.swiper-pagination-bullet, [class*="indicator"] span, [class*="dot"]')
            if len(indicators) > 1:
                print(f"发现 {len(indicators)} 个图片指示器，正在切换...")
                for i, indicator in enumerate(indicators):
                    try:
                        indicator.click()
                        time.sleep(0.8)
                        # 获取当前显示的图片
                        current_imgs = page.query_selector_all('.swiper-slide-active img, [class*="active"] img')
                        for img in current_imgs:
                            src = img.get_attribute('src')
                            if src and 'http' in src and src not in result['images']:
                                src = re.sub(r'\?.*$', '', src)
                                result['images'].append(src)
                    except Exception as e:
                        print(f"切换图片 {i+1} 失败: {e}")
            
            # 方法3: 从页面所有图片中筛选
            all_imgs = page.query_selector_all('img')
            for img in all_imgs:
                try:
                    src = img.get_attribute('src')
                    if src and 'http' in src:
                        # 过滤掉头像、图标等小图
                        if any(x in src for x in ['avatar', 'icon', 'logo', 'emoji']):
                            continue
                        # 检查图片尺寸
                        width = img.get_attribute('width')
                        height = img.get_attribute('height')
                        if width and height:
                            try:
                                if int(width) < 100 or int(height) < 100:
                                    continue
                            except:
                                pass
                        if src not in result['images']:
                            src = re.sub(r'\?.*$', '', src)
                            result['images'].append(src)
                except:
                    pass
            
            print(f"找到 {len(result['images'])} 张图片")
            
            # 下载图片
            if output_dir and result['images']:
                print("正在下载图片...")
                for i, img_url in enumerate(result['images']):
                    ext = '.jpg'
                    if '.png' in img_url:
                        ext = '.png'
                    elif '.webp' in img_url:
                        ext = '.webp'
                    
                    filename = f"image_{i+1:02d}{ext}"
                    save_path = os.path.join(images_dir, filename)
                    
                    if download_image(img_url, save_path):
                        result['local_images'].append(save_path)
                        print(f"  ✓ {filename}")
                    else:
                        print(f"  ✗ {filename} 下载失败")
            
            # 截图保存整个页面
            if output_dir:
                screenshot_path = os.path.join(output_dir, 'screenshot.png')
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"页面截图已保存: {screenshot_path}")
            
        except Exception as e:
            print(f"抓取出错: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    # 保存结果
    if output_dir:
        json_path = os.path.join(output_dir, 'note.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n结果已保存到: {json_path}")
    
    return result


def main():
    parser = argparse.ArgumentParser(description='小红书单篇笔记抓取 v2')
    parser.add_argument('url', help='笔记URL')
    parser.add_argument('--output', '-o', help='输出目录')
    parser.add_argument('--user-data', '-u', help='浏览器用户数据目录')
    
    args = parser.parse_args()
    
    output_dir = args.output or f"xhs_note_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    result = fetch_note(
        url=args.url,
        output_dir=output_dir,
        user_data_dir=args.user_data
    )
    
    print(f"\n抓取完成!")
    print(f"标题: {result['title']}")
    print(f"作者: {result['author']}")
    print(f"内容: {result['content'][:100]}..." if len(result['content']) > 100 else f"内容: {result['content']}")
    print(f"图片: {len(result['images'])} 张")


if __name__ == '__main__':
    main()
