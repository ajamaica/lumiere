#!/usr/bin/env python3
"""
小红书内容爬取脚本
使用 Playwright 自动化浏览器，爬取小红书搜索结果

使用方法:
    python scrape.py "搜索关键词" --count 10 --output output.json

依赖:
    pip install playwright
    playwright install chromium
"""

import argparse
import json
import time
import re
from pathlib import Path
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("请先安装 playwright: pip install playwright && playwright install chromium")
    exit(1)


def extract_notes_from_search(page, max_count=10):
    """从搜索结果页直接提取笔记信息"""
    notes = []
    
    # 等待页面加载
    time.sleep(3)
    
    # 滚动加载更多内容
    scroll_times = max(3, max_count // 5)
    for _ in range(scroll_times):
        page.keyboard.press("End")
        time.sleep(1.5)
    
    # 回到顶部
    page.keyboard.press("Home")
    time.sleep(1)
    
    # 获取所有笔记卡片
    cards = page.query_selector_all('section.note-item')
    
    for card in cards[:max_count]:
        try:
            note = {
                'url': '',
                'title': '',
                'author': '',
                'content': '',
                'likes': '',
                'images': [],
                'tags': []
            }
            
            # 标题
            title_el = card.query_selector('.title, [class*="title"], span.title')
            if title_el:
                note['title'] = title_el.inner_text().strip()
            
            # 作者
            author_el = card.query_selector('.author-wrapper .name, .name, [class*="author"] .name')
            if author_el:
                note['author'] = author_el.inner_text().strip()
            
            # 点赞数
            like_el = card.query_selector('[class*="like"] span, .like-wrapper span, .count')
            if like_el:
                note['likes'] = like_el.inner_text().strip()
            
            # 链接
            link_el = card.query_selector('a[href*="/explore/"], a[href*="/search_result/"]')
            if link_el:
                href = link_el.get_attribute('href')
                if href:
                    if href.startswith('/'):
                        href = 'https://www.xiaohongshu.com' + href
                    note['url'] = href
            
            # 图片
            img_el = card.query_selector('img')
            if img_el:
                src = img_el.get_attribute('src')
                if src:
                    note['images'].append(src)
            
            # 只添加有标题的笔记
            if note['title']:
                notes.append(note)
                
        except Exception as e:
            continue
    
    return notes


def scrape_xiaohongshu(keyword, count=10, output_file=None, user_data_dir=None):
    """主爬取函数"""
    
    results = {
        'keyword': keyword,
        'scrape_time': datetime.now().isoformat(),
        'total_count': 0,
        'notes': []
    }
    
    with sync_playwright() as p:
        # 使用持久化的浏览器配置（保持登录状态）
        if user_data_dir is None:
            user_data_dir = str(Path.home() / '.xiaohongshu-scraper')
        
        browser = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            viewport={'width': 1280, 'height': 800},
            locale='zh-CN'
        )
        
        page = browser.pages[0] if browser.pages else browser.new_page()
        
        try:
            # 1. 打开搜索页面
            search_url = f"https://www.xiaohongshu.com/search_result?keyword={keyword}"
            print(f"正在搜索: {keyword}")
            page.goto(search_url, wait_until='networkidle', timeout=30000)
            time.sleep(3)
            
            # 检查是否需要登录
            login_el = page.query_selector('[class*="login-btn"], .login-container')
            if login_el:
                print("\n⚠️  需要登录小红书")
                print("请在浏览器中扫码登录，登录后按 Enter 继续...")
                input()
                page.reload()
                time.sleep(3)
            
            # 2. 直接从搜索结果页提取笔记信息
            print(f"正在提取笔记...")
            results['notes'] = extract_notes_from_search(page, count)
            results['total_count'] = len(results['notes'])
            print(f"找到 {results['total_count']} 篇笔记")
            
        finally:
            browser.close()
    
    # 保存结果
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n结果已保存到: {output_file}")
    
    return results


def main():
    parser = argparse.ArgumentParser(description='小红书内容爬取')
    parser.add_argument('keyword', help='搜索关键词')
    parser.add_argument('--count', '-c', type=int, default=10, help='爬取数量 (默认 10)')
    parser.add_argument('--output', '-o', help='输出文件路径 (JSON)')
    parser.add_argument('--user-data', '-u', help='浏览器用户数据目录 (用于保持登录)')
    
    args = parser.parse_args()
    
    output_file = args.output or f"xiaohongshu_{args.keyword}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    results = scrape_xiaohongshu(
        keyword=args.keyword,
        count=args.count,
        output_file=output_file,
        user_data_dir=args.user_data
    )
    
    print(f"\n爬取完成! 共获取 {results['total_count']} 篇笔记")


if __name__ == '__main__':
    main()
