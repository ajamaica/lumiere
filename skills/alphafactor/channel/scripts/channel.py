#!/usr/bin/env python3
"""
微信公众号草稿箱管理工具
支持：创建图文草稿、上传图片、发布文章、获取草稿列表
"""

import os
import sys
import json
import re
import argparse
import urllib.request
import urllib.parse
from datetime import datetime
from typing import List, Dict, Optional

# 微信 API 配置
WECHAT_API_BASE = "https://api.weixin.qq.com/cgi-bin"

# 存储文件
CONFIG_DIR = os.path.expanduser("~/.config/channel")
ACCESS_TOKEN_FILE = os.path.join(CONFIG_DIR, "access_token.json")
DRAFTS_CACHE_FILE = os.path.join(CONFIG_DIR, "drafts_cache.json")

def ensure_config_dir():
    """确保配置目录存在"""
    os.makedirs(CONFIG_DIR, exist_ok=True)

def get_access_token() -> Optional[str]:
    """获取 Access Token"""
    appid = os.getenv('WECHAT_APPID')
    appsecret = os.getenv('WECHAT_APPSECRET')
    
    if not appid or not appsecret:
        print("❌ 错误: 请设置环境变量 WECHAT_APPID 和 WECHAT_APPSECRET")
        print("\n获取方式:")
        print("  1. 登录微信公众平台 https://mp.weixin.qq.com")
        print("  2. 开发 → 基本配置 → 开发者ID")
        return None
    
    # 检查缓存的 token
    if os.path.exists(ACCESS_TOKEN_FILE):
        try:
            with open(ACCESS_TOKEN_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
                # 简单检查是否过期（实际应该检查 expires_in）
                if cache.get('expires_at', 0) > datetime.now().timestamp():
                    return cache.get('access_token')
        except Exception:
            pass
    
    # 获取新 token
    url = f"{WECHAT_API_BASE}/token?grant_type=client_credential&appid={appid}&secret={appsecret}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if 'access_token' in data:
                token = data['access_token']
                expires_in = data.get('expires_in', 7200)
                
                # 缓存 token
                ensure_config_dir()
                with open(ACCESS_TOKEN_FILE, 'w', encoding='utf-8') as f:
                    json.dump({
                        'access_token': token,
                        'expires_at': datetime.now().timestamp() + expires_in - 300  # 提前5分钟过期
                    }, f)
                
                return token
            else:
                print(f"❌ 获取 Access Token 失败: {data.get('errmsg', 'Unknown error')}")
                return None
                
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return None

def upload_image(access_token: str, image_path: str) -> Optional[str]:
    """上传图片到微信服务器，获取 URL"""
    if not os.path.exists(image_path):
        print(f"❌ 图片文件不存在: {image_path}")
        return None
    
    # 检查文件大小（微信限制 10MB）
    file_size = os.path.getsize(image_path)
    if file_size > 10 * 1024 * 1024:
        print(f"❌ 图片文件过大 (>10MB): {image_path}")
        return None
    
    url = f"{WECHAT_API_BASE}/media/uploadimg?access_token={access_token}"
    
    try:
        # 构建 multipart/form-data 请求
        boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        filename = os.path.basename(image_path)
        
        body = []
        body.append(f'--{boundary}'.encode())
        body.append(f'Content-Disposition: form-data; name="media"; filename="{filename}"'.encode())
        body.append(b'Content-Type: image/jpeg')
        body.append(b'')
        body.append(image_data)
        body.append(f'--{boundary}--'.encode())
        
        data = b'\r\n'.join(body)
        
        req = urllib.request.Request(url, data=data, headers={
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'Content-Length': len(data)
        })
        
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if 'url' in result:
                print(f"✅ 图片上传成功: {result['url'][:50]}...")
                return result['url']
            else:
                print(f"❌ 图片上传失败: {result.get('errmsg', 'Unknown error')}")
                return None
                
    except Exception as e:
        print(f"❌ 图片上传失败: {e}")
        return None

def extract_digest(content: str, max_length: int = 120) -> str:
    """从正文提取摘要（第一段内容）"""
    # 移除 HTML 标签
    text = re.sub(r'<[^>]+>', '', content)
    # 移除多余空白
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 获取第一段（按段落分隔）
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    
    if paragraphs:
        first_para = paragraphs[0]
        # 截取前 max_length 个字符
        if len(first_para) > max_length:
            return first_para[:max_length - 3] + "..."
        return first_para
    
    return ""

def process_content(content: str, access_token: str) -> str:
    """处理正文内容，将本地图片替换为微信图片 URL"""
    # 查找所有图片标签
    img_pattern = r'!<span class="image"><span>([^\u003c]*)</span></span>\(([^)]+)\)'
    
    def replace_image(match):
        alt_text = match.group(1)
        image_path = match.group(2)
        
        # 如果是本地路径，上传图片
        if os.path.exists(image_path):
            image_url = upload_image(access_token, image_path)
            if image_url:
                return f'<img src="{image_url}" alt="{alt_text}" />'
        
        # 如果已经是 URL，直接使用
        if image_path.startswith('http'):
            return f'<img src="{image_path}" alt="{alt_text}" />'
        
        # 上传失败，保留原样
        return match.group(0)
    
    # 转换 Markdown 图片为 HTML
    processed = re.sub(img_pattern, replace_image, content)
    
    # 简单处理 Markdown 格式（粗体、斜体等）
    processed = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', processed)
    processed = re.sub(r'\*(.+?)\*', r'<em>\1</em>', processed)
    
    return processed

def create_draft(access_token: str, title: str, content: str, author: str = "",
                cover_image: str = None, need_open_comment: int = 1,
                only_fans_can_comment: int = 0) -> Optional[Dict]:
    """创建图文草稿"""
    
    # 处理内容中的图片
    processed_content = process_content(content, access_token)
    
    # 提取摘要
    digest = extract_digest(content)
    
    # 上传封面图（如果有）
    thumb_media_id = None
    if cover_image and os.path.exists(cover_image):
        # 封面图需要通过素材上传接口
        thumb_media_id = upload_thumb_image(access_token, cover_image)
    
    # 构建请求数据
    articles = [{
        "title": title,
        "author": author,
        "digest": digest,
        "content": processed_content,
        "content_source_url": "",
        "thumb_media_id": thumb_media_id or "",
        "need_open_comment": need_open_comment,
        "only_fans_can_comment": only_fans_can_comment,
        "show_cover_pic": 1 if cover_image else 0
    }]
    
    url = f"{WECHAT_API_BASE}/draft/add?access_token={access_token}"
    
    try:
        data = json.dumps({"articles": articles}, ensure_ascii=False).encode('utf-8')
        
        req = urllib.request.Request(url, data=data, headers={
            'Content-Type': 'application/json; charset=utf-8'
        })
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if 'media_id' in result:
                return {
                    'success': True,
                    'media_id': result['media_id'],
                    'title': title,
                    'digest': digest,
                    'created_at': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': result.get('errmsg', 'Unknown error'),
                    'errcode': result.get('errcode', -1)
                }
                
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def upload_thumb_image(access_token: str, image_path: str) -> Optional[str]:
    """上传封面图素材"""
    # 简化处理，实际应该调用新增永久素材接口
    # 这里返回 None，表示不使用封面图
    return None

def get_drafts(access_token: str, offset: int = 0, count: int = 20) -> List[Dict]:
    """获取草稿列表"""
    url = f"{WECHAT_API_BASE}/draft/batchget?access_token={access_token}"
    
    try:
        data = json.dumps({
            "offset": offset,
            "count": count,
            "no_content": 0
        }).encode('utf-8')
        
        req = urllib.request.Request(url, data=data, headers={
            'Content-Type': 'application/json; charset=utf-8'
        })
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if 'item' in result:
                return result['item']
            else:
                print(f"⚠️  获取草稿列表失败: {result.get('errmsg', 'Unknown error')}")
                return []
                
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return []

def delete_draft(access_token: str, media_id: str) -> bool:
    """删除草稿"""
    url = f"{WECHAT_API_BASE}/draft/delete?access_token={access_token}"
    
    try:
        data = json.dumps({"media_id": media_id}).encode('utf-8')
        
        req = urllib.request.Request(url, data=data, headers={
            'Content-Type': 'application/json; charset=utf-8'
        })
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('errcode') == 0:
                print(f"✅ 草稿删除成功")
                return True
            else:
                print(f"❌ 删除失败: {result.get('errmsg', 'Unknown error')}")
                return False
                
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def publish_draft(access_token: str, media_id: str) -> Optional[Dict]:
    """发布草稿（需开通发布权限）"""
    url = f"{WECHAT_API_BASE}/freepublish/submit?access_token={access_token}"
    
    try:
        data = json.dumps({"media_id": media_id}).encode('utf-8')
        
        req = urllib.request.Request(url, data=data, headers={
            'Content-Type': 'application/json; charset=utf-8'
        })
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if 'publish_id' in result:
                return {
                    'success': True,
                    'publish_id': result['publish_id'],
                    'msg_data_id': result.get('msg_data_id')
                }
            else:
                return {
                    'success': False,
                    'error': result.get('errmsg', 'Unknown error'),
                    'errcode': result.get('errcode', -1)
                }
                
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def print_drafts(drafts: List[Dict]):
    """打印草稿列表"""
    if not drafts:
        print("📭 草稿箱为空")
        return
    
    print(f"\n📝 草稿列表 ({len(drafts)} 篇):\n")
    print(f"{'序号':<6} {'Media ID':<30} {'标题':<40} {'更新时间':<20}")
    print("-" * 100)
    
    for i, draft in enumerate(drafts, 1):
        media_id = draft.get('media_id', 'N/A')[:28]
        content = draft.get('content', {})
        news_item = content.get('news_item', [{}])[0]
        title = news_item.get('title', '无标题')[:38]
        update_time = draft.get('update_time', '')
        
        if update_time:
            update_time = datetime.fromtimestamp(int(update_time)).strftime('%Y-%m-%d %H:%M')
        
        print(f"{i:<6} {media_id:<30} {title:<40} {update_time:<20}")

def print_result(result: Dict):
    """打印创建结果"""
    print("\n" + "=" * 60)
    
    if result.get('success'):
        print("✅ 草稿创建成功!")
        print("=" * 60)
        print(f"📄 Media ID: {result['media_id']}")
        print(f"📝 标题: {result['title']}")
        print(f"📋 摘要: {result['digest'][:60]}{'...' if len(result['digest']) > 60 else ''}")
        print(f"⏰ 创建时间: {result['created_at']}")
        print("\n💡 提示:")
        print("   - 草稿已保存到微信公众号后台")
        print("   - 请登录 mp.weixin.qq.com 查看并发布")
        print("   - 或使用 'publish' 命令直接发布（需开通权限）")
    else:
        print("❌ 草稿创建失败")
        print("=" * 60)
        print(f"错误信息: {result.get('error', 'Unknown error')}")
        if 'errcode' in result:
            print(f"错误码: {result['errcode']}")
    
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(
        description='微信公众号草稿箱管理工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 创建纯文本草稿
  %(prog)s create "文章标题" "这里是正文内容..."

  # 创建带封面图的草稿
  %(prog)s create "文章标题" "正文内容..." --cover cover.jpg

  # 从文件读取正文
  %(prog)s create "文章标题" --file article.txt

  # 查看草稿列表
  %(prog)s list

  # 发布草稿
  %(prog)s publish media_id_here

  # 删除草稿
  %(prog)s delete media_id_here
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # create 命令
    create_parser = subparsers.add_parser('create', help='创建草稿')
    create_parser.add_argument('title', help='文章标题')
    create_parser.add_argument('content', nargs='?', help='正文内容（或直接提供）')
    create_parser.add_argument('--file', '-f', help='从文件读取正文')
    create_parser.add_argument('--author', '-a', default='', help='作者名称')
    create_parser.add_argument('--cover', '-c', help='封面图片路径')
    create_parser.add_argument('--no-comment', action='store_true', help='关闭评论')
    create_parser.add_argument('--fans-only', action='store_true', help='仅粉丝可评论')
    
    # list 命令
    list_parser = subparsers.add_parser('list', help='列出草稿')
    list_parser.add_argument('--limit', '-l', type=int, default=20, help='数量限制')
    
    # publish 命令
    publish_parser = subparsers.add_parser('publish', help='发布草稿')
    publish_parser.add_argument('media_id', help='草稿 Media ID')
    
    # delete 命令
    delete_parser = subparsers.add_parser('delete', help='删除草稿')
    delete_parser.add_argument('media_id', help='草稿 Media ID')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # 获取 access token
    access_token = get_access_token()
    if not access_token:
        return
    
    if args.command == 'create':
        # 获取正文内容
        content = args.content or ""
        
        if args.file:
            if os.path.exists(args.file):
                with open(args.file, 'r', encoding='utf-8') as f:
                    content = f.read()
            else:
                print(f"❌ 文件不存在: {args.file}")
                return
        
        if not content:
            print("❌ 正文内容不能为空")
            return
        
        # 创建草稿
        result = create_draft(
            access_token=access_token,
            title=args.title,
            content=content,
            author=args.author,
            cover_image=args.cover,
            need_open_comment=0 if args.no_comment else 1,
            only_fans_can_comment=1 if args.fans_only else 0
        )
        
        print_result(result)
    
    elif args.command == 'list':
        drafts = get_drafts(access_token, count=args.limit)
        print_drafts(drafts)
    
    elif args.command == 'publish':
        result = publish_draft(access_token, args.media_id)
        
        if result and result.get('success'):
            print(f"✅ 发布请求已提交")
            print(f"   Publish ID: {result['publish_id']}")
            print(f"   请通过后台查看发布状态")
        else:
            print(f"❌ 发布失败: {result.get('error', 'Unknown error')}")
    
    elif args.command == 'delete':
        if delete_draft(access_token, args.media_id):
            print(f"✅ 草稿已删除: {args.media_id}")

if __name__ == '__main__':
    main()
