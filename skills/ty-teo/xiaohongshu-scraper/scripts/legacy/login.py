#!/usr/bin/env python3
"""
小红书登录脚本
启动浏览器让用户登录，保存 Cookie
"""

import json
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("请先安装 playwright: pip install playwright && playwright install chromium")
    exit(1)


def login_xiaohongshu():
    """启动浏览器让用户登录小红书"""
    
    user_data_dir = str(Path.home() / '.xiaohongshu-scraper')
    cookie_file = str(Path.home() / '.xiaohongshu-scraper' / 'cookies.json')
    
    print("=" * 50)
    print("小红书登录")
    print("=" * 50)
    print(f"\n浏览器数据目录: {user_data_dir}")
    print(f"Cookie 保存位置: {cookie_file}")
    print("\n正在启动浏览器...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            viewport={'width': 1280, 'height': 900},
            locale='zh-CN',
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        page = browser.pages[0] if browser.pages else browser.new_page()
        
        try:
            # 打开小红书登录页
            print("\n正在打开小红书...")
            page.goto("https://www.xiaohongshu.com", timeout=60000)
            
            print("\n" + "=" * 50)
            print("请在浏览器中登录小红书")
            print("登录成功后，按 Enter 键继续...")
            print("=" * 50)
            
            input()
            
            # 等待一下确保登录完成
            time.sleep(2)
            
            # 获取 cookies
            cookies = page.context.cookies()
            
            # 保存 cookies
            Path(user_data_dir).mkdir(parents=True, exist_ok=True)
            with open(cookie_file, 'w', encoding='utf-8') as f:
                json.dump(cookies, f, ensure_ascii=False, indent=2)
            
            # 提取关键 cookie 用于 API
            cookie_str = '; '.join([f"{c['name']}={c['value']}" for c in cookies if 'xiaohongshu' in c.get('domain', '')])
            
            print("\n" + "=" * 50)
            print("✅ Cookie 保存成功!")
            print("=" * 50)
            print(f"\nCookie 文件: {cookie_file}")
            print(f"\n共保存 {len(cookies)} 个 Cookie")
            
            # 保存简化版 cookie 字符串
            cookie_str_file = str(Path.home() / '.xiaohongshu-scraper' / 'cookie_string.txt')
            with open(cookie_str_file, 'w', encoding='utf-8') as f:
                f.write(cookie_str)
            print(f"Cookie 字符串: {cookie_str_file}")
            
        except Exception as e:
            print(f"\n❌ 出错: {e}")
        finally:
            browser.close()
    
    print("\n浏览器已关闭")


if __name__ == '__main__':
    login_xiaohongshu()
