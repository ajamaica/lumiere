#!/usr/bin/env python3
"""
小红书单篇笔记爬取脚本
抓取笔记内容和所有图片

使用方法:
    python fetch_note.py "笔记URL" --output /tmp/note_output
"""

import argparse
import json
import time
import os
import re
import requests
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("请先安装 playwright: pip install playwright && playwright install chromium")
    exit(1)


def download_image(url, save_path):
    """下载图片"""
    try:
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
        
        browser = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            viewport={'width': 1280, 'height': 900},
            locale='zh-CN'
        )
        
        page = browser.pages[0] if browser.pages else browser.new_page()
        
        try:
            print(f"正在打开: {url}")
            page.goto(url, wait_until='load', timeout=60000)
            time.sleep(8)  # 等待页面完全加载和可能的跳转
            
            # 等待内容加载
            try:
                page.wait_for_selector('#detail-desc, .note-content, [class*="desc"], .desc', timeout=15000)
            except:
                print("等待内容选择器超时，继续尝试...")
            time.sleep(3)
            
            # 提取标题
            title_el = page.query_selector('#detail-title, .title, [class*="title"]')
            if title_el:
                result['title'] = title_el.inner_text().strip()
            
            # 提取作者
            author_el = page.query_selector('.author-container .username, .username, [class*="author"] .name')
            if author_el:
                result['author'] = author_el.inner_text().strip()
            
            # 提取正文内容
            content_el = page.query_selector('#detail-desc, .note-content, [class*="desc"]')
            if content_el:
                result['content'] = content_el.inner_text().strip()
            
            # 提取点赞数
            like_el = page.query_selector('[class*="like-wrapper"] .count, .like-count, [class*="like"] span.count')
            if like_el:
                result['likes'] = like_el.inner_text().strip()
            
            # 提取收藏数
            collect_el = page.query_selector('[class*="collect-wrapper"] .count, .collect-count, [class*="collect"] span.count')
            if collect_el:
                result['collects'] = collect_el.inner_text().strip()
            
            # 提取评论数
            comment_el = page.query_selector('[class*="chat-wrapper"] .count, .comment-count, [class*="comment"] span.count')
            if comment_el:
                result['comments_count'] = comment_el.inner_text().strip()
            
            # 提取发布时间
            time_el = page.query_selector('.date, [class*="date"], [class*="time"]')
            if time_el:
                result['publish_time'] = time_el.inner_text().strip()
            
            # 提取标签
            tag_els = page.query_selector_all('#detail-desc a[href*="search_result"], .tag, [class*="tag"]')
            for tag_el in tag_els:
                tag_text = tag_el.inner_text().strip()
                if tag_text.startswith('#'):
                    result['tags'].append(tag_text)
            
            # 提取所有图片
            # 方法1: 从轮播图获取
            carousel_imgs = page.query_selector_all('.swiper-slide img, [class*="carousel"] img, [class*="slider"] img')
            for img in carousel_imgs:
                src = img.get_attribute('src')
                if src and 'http' in src and src not in result['images']:
                    # 获取高清图
                    src = re.sub(r'\?.*$', '', src)  # 移除参数获取原图
                    result['images'].append(src)
            
            # 方法2: 从主图获取
            main_imgs = page.query_selector_all('.note-slider img, .media-container img, [class*="note-image"] img')
            for img in main_imgs:
                src = img.get_attribute('src')
                if src and 'http' in src and src not in result['images']:
                    src = re.sub(r'\?.*$', '', src)
                    result['images'].append(src)
            
            # 方法3: 点击切换获取所有图片
            indicators = page.query_selector_all('.swiper-pagination-bullet, [class*="indicator"] span, [class*="dot"]')
            if len(indicators) > 1:
                print(f"发现 {len(indicators)} 张图片，正在切换获取...")
                for i, indicator in enumerate(indicators):
                    try:
                        indicator.click()
                        time.sleep(1)
                        current_img = page.query_selector('.swiper-slide-active img, [class*="active"] img')
                        if current_img:
                            src = current_img.get_attribute('src')
                            if src and 'http' in src and src not in result['images']:
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
    parser = argparse.ArgumentParser(description='小红书单篇笔记爬取')
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
    print(f"图片: {len(result['images'])} 张")


if __name__ == '__main__':
    main()
