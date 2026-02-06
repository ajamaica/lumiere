#!/usr/bin/env python3
"""
从 Chrome 浏览器提取小红书 cookies
"""

import json
import sqlite3
import shutil
import tempfile
import subprocess
from pathlib import Path

def get_chrome_cookies():
    """从 Chrome 提取小红书相关的 cookies"""
    
    # Chrome cookies 数据库路径
    chrome_cookies_path = Path.home() / 'Library/Application Support/Google/Chrome/Default/Cookies'
    
    if not chrome_cookies_path.exists():
        print(f"❌ Chrome cookies 文件不存在: {chrome_cookies_path}")
        return None
    
    # 复制数据库（因为 Chrome 可能锁定了原文件）
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        tmp_path = tmp.name
    
    shutil.copy2(chrome_cookies_path, tmp_path)
    
    try:
        conn = sqlite3.connect(tmp_path)
        cursor = conn.cursor()
        
        # 查询小红书相关的 cookies
        cursor.execute("""
            SELECT name, value, host_key, path, expires_utc, is_secure, is_httponly
            FROM cookies 
            WHERE host_key LIKE '%xiaohongshu%'
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            print("❌ 没有找到小红书的 cookies，请确认已登录")
            return None
        
        # 转换为标准格式
        cookies = []
        for row in rows:
            name, encrypted_value, domain, path, expires, secure, httponly = row
            
            # Chrome 的 value 是加密的，需要解密
            # macOS 使用 Keychain 存储密钥
            cookies.append({
                'name': name,
                'value': '',  # 加密的，需要解密
                'domain': domain,
                'path': path,
                'secure': bool(secure),
                'httpOnly': bool(httponly),
                'encrypted_value': encrypted_value
            })
        
        return cookies
        
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def decrypt_chrome_cookies():
    """使用 security 命令解密 Chrome cookies"""
    
    # 获取 Chrome 的加密密钥
    try:
        result = subprocess.run(
            ['security', 'find-generic-password', '-w', '-s', 'Chrome Safe Storage', '-a', 'Chrome'],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print("❌ 无法获取 Chrome 加密密钥")
            return None
        password = result.stdout.strip()
    except Exception as e:
        print(f"❌ 获取密钥失败: {e}")
        return None
    
    # 这里需要用 pycryptodome 解密，比较复杂
    # 更简单的方法是用 browser-cookie3 库
    print("Chrome cookies 是加密的，尝试使用 browser-cookie3...")
    return None


def extract_with_browser_cookie3():
    """使用 browser-cookie3 库提取 cookies"""
    try:
        import browser_cookie3
    except ImportError:
        print("正在安装 browser-cookie3...")
        subprocess.run(['pip', 'install', 'browser-cookie3'], check=True)
        import browser_cookie3
    
    try:
        # 获取 Chrome cookies
        cj = browser_cookie3.chrome(domain_name='.xiaohongshu.com')
        
        cookies = []
        for cookie in cj:
            cookies.append({
                'name': cookie.name,
                'value': cookie.value,
                'domain': cookie.domain,
                'path': cookie.path,
                'secure': cookie.secure,
                'httpOnly': bool(cookie.has_nonstandard_attr('HttpOnly')),
                'expires': cookie.expires
            })
        
        return cookies
    except Exception as e:
        print(f"❌ 提取失败: {e}")
        return None


def main():
    print("=" * 50)
    print("从 Chrome 提取小红书 Cookies")
    print("=" * 50)
    
    cookies = extract_with_browser_cookie3()
    
    if not cookies:
        print("\n❌ 无法提取 cookies")
        return
    
    # 保存目录
    save_dir = Path.home() / '.xiaohongshu-scraper'
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存完整 cookies
    cookie_file = save_dir / 'cookies.json'
    with open(cookie_file, 'w', encoding='utf-8') as f:
        json.dump(cookies, f, ensure_ascii=False, indent=2)
    
    # 生成 cookie 字符串
    cookie_str = '; '.join([f"{c['name']}={c['value']}" for c in cookies])
    cookie_str_file = save_dir / 'cookie_string.txt'
    with open(cookie_str_file, 'w', encoding='utf-8') as f:
        f.write(cookie_str)
    
    print(f"\n✅ 成功提取 {len(cookies)} 个 cookies!")
    print(f"\n保存位置:")
    print(f"  - {cookie_file}")
    print(f"  - {cookie_str_file}")
    
    # 显示关键 cookies
    print(f"\n关键 cookies:")
    key_cookies = ['a1', 'web_session', 'webId', 'xsecappid']
    for c in cookies:
        if c['name'] in key_cookies:
            print(f"  - {c['name']}: {c['value'][:20]}...")


if __name__ == '__main__':
    main()
