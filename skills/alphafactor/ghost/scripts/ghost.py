#!/usr/bin/env python3
"""
Ghost CMS Admin API Client
支持：发布、更新、删除文章
"""

import json
import sys
import os
import re
from datetime import datetime, timedelta
import requests
import jwt

# Ghost API 配置
def get_config():
    """从环境变量获取配置"""
    config = {
        'api_url': os.getenv('GHOST_API_URL', ''),  # 例如: https://your-blog.com/ghost/api/admin/
        'admin_api_key': os.getenv('GHOST_ADMIN_API_KEY', ''),  # 格式: id:secret
    }
    return config

def generate_token(api_key):
    """生成 Ghost Admin API JWT Token"""
    if not api_key or ':' not in api_key:
        return None
    
    key_id, secret = api_key.split(':', 1)
    
    # Ghost 使用 HS256 算法
    token = jwt.encode(
        {
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(minutes=5),
            'aud': '/admin/'
        },
        bytes.fromhex(secret),
        algorithm='HS256',
        headers={'kid': key_id}
    )
    return token

def get_headers(api_key, content_type='application/json'):
    """获取请求头"""
    token = generate_token(api_key)
    headers = {
        'Authorization': f'Ghost {token}'
    }
    if content_type:
        headers['Content-Type'] = content_type
    return headers

def upload_image(config, image_path):
    """上传图片到 Ghost 获取 URL"""
    if not os.path.exists(image_path):
        print(f"❌ 图片不存在: {image_path}")
        return None
    
    url = f"{config['api_url']}/images/upload/"
    
    try:
        import requests
        
        with open(image_path, 'rb') as f:
            files = {'file': (os.path.basename(image_path), f, 'image/jpeg')}
            headers = get_headers(config['admin_api_key'], None)
            
            response = requests.post(url, files=files, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            image_url = data.get('url') or data.get('images', [{}])[0].get('url')
            
            if image_url:
                print(f"✅ 图片上传成功: {image_url}")
                return image_url
            else:
                print(f"⚠️  图片上传返回异常: {data}")
                return None
                
    except Exception as e:
        print(f"❌ 图片上传失败: {e}")
        return None

def slugify(text):
    """生成 slug"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s]+', '-', text)
    return text[:100]

def create_post(config, title, content, status='draft', tags=None, excerpt=None, feature_image=None):
    """创建新文章"""
    # 使用 source=html 参数确保内容被正确解析为 HTML
    url = f"{config['api_url']}/posts/?source=html"
    
    post_data = {
        'posts': [{
            'title': title,
            'html': content,
            'slug': slugify(title),
            'status': status,  # draft 或 published
            'excerpt': excerpt or ''
        }]
    }
    
    if tags:
        post_data['posts'][0]['tags'] = [{'name': tag} for tag in tags]
    
    if feature_image:
        post_data['posts'][0]['feature_image'] = feature_image
    
    headers = get_headers(config['admin_api_key'])
    
    try:
        response = requests.post(url, json=post_data, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        post = data['posts'][0]
        print(f"✅ 文章创建成功")
        print(f"   ID: {post['id']}")
        print(f"   标题: {post['title']}")
        print(f"   URL: {post.get('url', 'N/A')}")
        print(f"   状态: {post['status']}")
        return post
    except requests.exceptions.RequestException as e:
        print(f"❌ 创建失败: {e}")
        if hasattr(e.response, 'text'):
            print(f"   错误详情: {e.response.text}")
        return None

def update_post(config, post_id, **kwargs):
    """更新文章"""
    url = f"{config['api_url']}/posts/{post_id}/"
    
    update_data = {'posts': [{}]}
    
    if 'title' in kwargs:
        update_data['posts'][0]['title'] = kwargs['title']
    if 'content' in kwargs:
        update_data['posts'][0]['html'] = kwargs['content']
    if 'status' in kwargs:
        update_data['posts'][0]['status'] = kwargs['status']
    if 'excerpt' in kwargs:
        update_data['posts'][0]['excerpt'] = kwargs['excerpt']
    if 'tags' in kwargs:
        update_data['posts'][0]['tags'] = [{'name': tag} for tag in kwargs['tags']]
    
    headers = get_headers(config['admin_api_key'])
    
    try:
        response = requests.put(url, json=update_data, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        post = data['posts'][0]
        print(f"✅ 文章更新成功")
        print(f"   ID: {post['id']}")
        print(f"   标题: {post['title']}")
        return post
    except requests.exceptions.RequestException as e:
        print(f"❌ 更新失败: {e}")
        if hasattr(e.response, 'text'):
            print(f"   错误详情: {e.response.text}")
        return None

def delete_post(config, post_id):
    """删除文章"""
    url = f"{config['api_url']}/posts/{post_id}/"
    
    headers = get_headers(config['admin_api_key'])
    
    try:
        response = requests.delete(url, headers=headers)
        response.raise_for_status()
        print(f"✅ 文章删除成功")
        print(f"   ID: {post_id}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ 删除失败: {e}")
        if hasattr(e.response, 'text'):
            print(f"   错误详情: {e.response.text}")
        return False

def list_posts(config, limit=10):
    """列出文章"""
    url = f"{config['api_url']}/posts/?limit={limit}"
    
    headers = get_headers(config['admin_api_key'])
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        posts = data['posts']
        print(f"📄 最近 {len(posts)} 篇文章:")
        print("-" * 60)
        for post in posts:
            status = "🟢" if post['status'] == 'published' else "🟡"
            print(f"{status} [{post['id']}] {post['title']}")
            print(f"   状态: {post['status']} | 更新: {post['updated_at'][:10]}")
            print(f"   URL: {post.get('url', 'N/A')}")
            print()
        return posts
    except requests.exceptions.RequestException as e:
        print(f"❌ 获取失败: {e}")
        return None

def main():
    config = get_config()
    
    if not config['api_url'] or not config['admin_api_key']:
        print("❌ 错误: 请设置环境变量 GHOST_API_URL 和 GHOST_ADMIN_API_KEY")
        print("\n示例:")
        print('export GHOST_API_URL="https://your-blog.com/ghost/api/admin/"')
        print('export GHOST_ADMIN_API_KEY="your-admin-api-key"')
        sys.exit(1)
    
    if len(sys.argv) < 2:
        print("用法:")
        print(f"  {sys.argv[0]} create \"标题\" \"内容\" [--status draft|published] [--tags tag1,tag2]")
        print(f"  {sys.argv[0]} update <post_id> [--title \"新标题\"] [--content \"新内容\"]")
        print(f"  {sys.argv[0]} delete <post_id>")
        print(f"  {sys.argv[0]} list")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'create':
        if len(sys.argv) < 4:
            print("❌ 错误: 创建文章需要标题和内容")
            sys.exit(1)
        
        title = sys.argv[2]
        content = sys.argv[3]
        status = 'draft'
        tags = None
        
        # 解析额外参数
        for i, arg in enumerate(sys.argv[4:], 4):
            if arg == '--status' and i + 1 < len(sys.argv):
                status = sys.argv[i + 1]
            elif arg == '--tags' and i + 1 < len(sys.argv):
                tags = sys.argv[i + 1].split(',')
        
        create_post(config, title, content, status, tags)
    
    elif command == 'update':
        if len(sys.argv) < 3:
            print("❌ 错误: 更新文章需要 post_id")
            sys.exit(1)
        
        post_id = sys.argv[2]
        kwargs = {}
        
        # 解析参数
        for i, arg in enumerate(sys.argv[3:], 3):
            if arg == '--title' and i + 1 < len(sys.argv):
                kwargs['title'] = sys.argv[i + 1]
            elif arg == '--content' and i + 1 < len(sys.argv):
                kwargs['content'] = sys.argv[i + 1]
            elif arg == '--status' and i + 1 < len(sys.argv):
                kwargs['status'] = sys.argv[i + 1]
            elif arg == '--tags' and i + 1 < len(sys.argv):
                kwargs['tags'] = sys.argv[i + 1].split(',')
        
        update_post(config, post_id, **kwargs)
    
    elif command == 'delete':
        if len(sys.argv) < 3:
            print("❌ 错误: 删除文章需要 post_id")
            sys.exit(1)
        
        post_id = sys.argv[2]
        delete_post(config, post_id)
    
    elif command == 'list':
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        list_posts(config, limit)
    
    else:
        print(f"❌ 未知命令: {command}")
        print("支持的命令: create, update, delete, list")

if __name__ == '__main__':
    main()
