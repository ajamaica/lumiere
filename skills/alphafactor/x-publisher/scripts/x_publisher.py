#!/usr/bin/env python3
"""
X (Twitter) 推文发布工具
支持：纯文本推文、带图片/视频媒体、返回发布结果
"""

import os
import sys
import json
import argparse
from typing import Optional, List, Dict
from datetime import datetime

# 尝试导入 tweepy
try:
    import tweepy
    TWEEPY_AVAILABLE = True
except ImportError:
    TWEEPY_AVAILABLE = False
    print("⚠️  tweepy 库未安装，请先运行: pip3 install tweepy --user")

def get_client():
    """获取 X API 客户端"""
    if not TWEEPY_AVAILABLE:
        return None
    
    # 从环境变量获取认证信息
    bearer_token = os.getenv('X_BEARER_TOKEN')
    api_key = os.getenv('X_API_KEY')
    api_secret = os.getenv('X_API_SECRET')
    access_token = os.getenv('X_ACCESS_TOKEN')
    access_token_secret = os.getenv('X_ACCESS_TOKEN_SECRET')
    
    # 检查必需的认证信息
    missing = []
    if not api_key:
        missing.append('X_API_KEY')
    if not api_secret:
        missing.append('X_API_SECRET')
    if not access_token:
        missing.append('X_ACCESS_TOKEN')
    if not access_token_secret:
        missing.append('X_ACCESS_TOKEN_SECRET')
    
    if missing:
        print(f"❌ 缺少环境变量: {', '.join(missing)}")
        print("\n请设置以下环境变量:")
        print("  export X_API_KEY='your-api-key'")
        print("  export X_API_SECRET='your-api-secret'")
        print("  export X_ACCESS_TOKEN='your-access-token'")
        print("  export X_ACCESS_TOKEN_SECRET='your-access-token-secret'")
        print("  export X_BEARER_TOKEN='your-bearer-token'  # 可选")
        print("\n获取方式: https://developer.twitter.com/en/portal/dashboard")
        return None
    
    try:
        # 创建 OAuth 1.0a 认证（用于发推和媒体上传）
        auth = tweepy.OAuth1UserHandler(
            api_key, api_secret,
            access_token, access_token_secret
        )
        
        # 创建 API v1.1 实例（用于媒体上传）
        api = tweepy.API(auth)
        
        # 创建 API v2 客户端（用于发推）
        client = tweepy.Client(
            bearer_token=bearer_token,
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_token_secret,
            wait_on_rate_limit=True
        )
        
        return {
            'client': client,
            'api': api,
            'auth': auth
        }
    except Exception as e:
        print(f"❌ 初始化 X API 客户端失败: {e}")
        return None

def upload_media(api, media_path: str) -> Optional[str]:
    """上传媒体文件（图片或视频）"""
    if not os.path.exists(media_path):
        print(f"❌ 媒体文件不存在: {media_path}")
        return None
    
    # 检查文件大小和类型
    file_size = os.path.getsize(media_path)
    file_ext = os.path.splitext(media_path)[1].lower()
    
    # 图片限制: 5MB
    # 视频限制: 512MB
    image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    video_exts = ['.mp4', '.mov', '.avi', '.webm']
    
    if file_ext in image_exts and file_size > 5 * 1024 * 1024:
        print(f"❌ 图片文件过大 (>5MB): {media_path}")
        return None
    
    if file_ext in video_exts and file_size > 512 * 1024 * 1024:
        print(f"❌ 视频文件过大 (>512MB): {media_path}")
        return None
    
    try:
        print(f"📤 正在上传媒体: {media_path} ({file_size / 1024:.1f} KB)")
        
        # 使用 chunked upload 支持大文件
        if file_ext in video_exts:
            media = api.media_upload(
                media_path,
                chunked=True,
                media_category='tweet_video'
            )
        else:
            media = api.media_upload(media_path)
        
        media_id = media.media_id_string
        print(f"✅ 媒体上传成功, ID: {media_id}")
        return media_id
        
    except Exception as e:
        print(f"❌ 媒体上传失败: {e}")
        return None

def publish_tweet(client, text: str, media_ids: List[str] = None) -> Optional[Dict]:
    """发布推文"""
    try:
        # 检查文本长度（X 限制 280 字符）
        if len(text) > 280:
            print(f"⚠️  文本长度 {len(text)} 超过 280 字符限制，将被截断")
            text = text[:277] + "..."
        
        # 发布推文
        if media_ids:
            response = client.create_tweet(
                text=text,
                media_ids=media_ids
            )
        else:
            response = client.create_tweet(text=text)
        
        # 提取结果
        tweet_data = response.data
        result = {
            'success': True,
            'tweet_id': tweet_data['id'],
            'text': tweet_data['text'],
            'created_at': datetime.now().isoformat(),
            'url': f"https://twitter.com/user/status/{tweet_data['id']}"
        }
        
        return result
        
    except tweepy.errors.Forbidden as e:
        return {
            'success': False,
            'error': '权限不足',
            'message': str(e),
            'api_errors': e.api_errors if hasattr(e, 'api_errors') else None
        }
    except tweepy.errors.Unauthorized as e:
        return {
            'success': False,
            'error': '认证失败',
            'message': '请检查 API 密钥和令牌是否正确',
            'api_errors': e.api_errors if hasattr(e, 'api_errors') else None
        }
    except tweepy.errors.TooManyRequests as e:
        return {
            'success': False,
            'error': '请求过于频繁',
            'message': '已触发速率限制，请稍后再试',
            'api_errors': e.api_errors if hasattr(e, 'api_errors') else None
        }
    except Exception as e:
        return {
            'success': False,
            'error': '发布失败',
            'message': str(e)
        }

def print_result(result: Dict):
    """打印发布结果"""
    print("\n" + "=" * 60)
    
    if result.get('success'):
        print("✅ 推文发布成功!")
        print("=" * 60)
        print(f"📝 推文 ID: {result['tweet_id']}")
        print(f"🔗 链接: {result['url']}")
        print(f"⏰ 发布时间: {result['created_at']}")
        print(f"📄 内容预览: {result['text'][:100]}{'...' if len(result['text']) > 100 else ''}")
    else:
        print("❌ 推文发布失败")
        print("=" * 60)
        print(f"错误类型: {result.get('error', 'Unknown')}")
        print(f"错误信息: {result.get('message', 'No message')}")
        
        if result.get('api_errors'):
            print("\nAPI 详细错误:")
            for error in result['api_errors']:
                print(f"  - {error.get('message', 'Unknown error')}")
                if 'code' in error:
                    print(f"    错误码: {error['code']}")
    
    print("=" * 60)

def get_user_info(client) -> Optional[Dict]:
    """获取当前用户信息"""
    try:
        # 需要指定 user_fields 才能获取 public_metrics
        user = client.get_me(user_fields=['public_metrics', 'username', 'name'])
        if user and user.data:
            # 安全获取 public_metrics
            public_metrics = getattr(user.data, 'public_metrics', {}) or {}
            return {
                'id': user.data.id,
                'username': getattr(user.data, 'username', 'unknown'),
                'name': getattr(user.data, 'name', 'Unknown'),
                'followers_count': public_metrics.get('followers_count', 0),
                'following_count': public_metrics.get('following_count', 0),
                'tweet_count': public_metrics.get('tweet_count', 0)
            }
        return None
    except Exception as e:
        print(f"⚠️  获取用户信息失败: {e}")
        return None

def validate_credentials(client_data) -> bool:
    """验证认证信息是否有效"""
    try:
        client = client_data['client']
        user_info = get_user_info(client)
        
        if user_info:
            print(f"\n✅ 认证成功!")
            print(f"👤 用户名: @{user_info['username']}")
            print(f"📛 显示名: {user_info['name']}")
            print(f"👥 粉丝: {user_info['followers_count']:,}")
            print(f"📝 推文: {user_info['tweet_count']:,}")
            return True
        else:
            print("\n❌ 认证失败: 无法获取用户信息")
            return False
            
    except Exception as e:
        print(f"\n❌ 认证验证失败: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description='X (Twitter) 推文发布工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 发布纯文本推文
  %(prog)s tweet "Hello, X!"

  # 发布带图片的推文
  %(prog)s tweet "Check out this image!" --media /path/to/image.jpg

  # 发布带多个媒体的推文
  %(prog)s tweet "My photos:" --media /path/to/photo1.jpg --media /path/to/photo2.png

  # 发布带视频的推文
  %(prog)s tweet "Watch this video!" --media /path/to/video.mp4

  # 验证认证信息
  %(prog)s verify
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # tweet 命令
    tweet_parser = subparsers.add_parser('tweet', help='发布推文')
    tweet_parser.add_argument('text', help='推文内容')
    tweet_parser.add_argument('--media', '-m', action='append',
                             help='媒体文件路径（可多次使用，最多4个）')
    
    # verify 命令
    subparsers.add_parser('verify', help='验证认证信息')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if not TWEEPY_AVAILABLE:
        print("\n❌ 请先安装 tweepy:")
        print("   pip3 install tweepy --user")
        return
    
    # 获取客户端
    client_data = get_client()
    if not client_data:
        return
    
    if args.command == 'verify':
        validate_credentials(client_data)
    
    elif args.command == 'tweet':
        # 验证认证
        if not validate_credentials(client_data):
            return
        
        client = client_data['client']
        api = client_data['api']
        
        # 上传媒体
        media_ids = []
        if args.media:
            if len(args.media) > 4:
                print("⚠️  最多支持 4 个媒体文件，将只使用前 4 个")
                args.media = args.media[:4]
            
            for media_path in args.media:
                media_id = upload_media(api, media_path)
                if media_id:
                    media_ids.append(media_id)
            
            if args.media and not media_ids:
                print("❌ 所有媒体上传失败，停止发布")
                return
        
        # 发布推文
        print(f"\n📤 正在发布推文...")
        result = publish_tweet(client, args.text, media_ids)
        
        # 打印结果
        print_result(result)
        
        # 输出 JSON 格式（便于程序处理）
        if result.get('success'):
            print("\n📋 JSON 输出:")
            print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
