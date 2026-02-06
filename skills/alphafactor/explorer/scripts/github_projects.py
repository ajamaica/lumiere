#!/usr/bin/env python3
"""
GitHub 热门项目分析工具
支持：按标签、上线时长、Star数量搜索热门项目
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import urllib.request
import urllib.parse
import urllib.error

# GitHub API 配置
GITHUB_API_URL = "https://api.github.com/search/repositories"

def get_github_token() -> Optional[str]:
    """获取 GitHub Token（可选，用于提高请求限制）"""
    return os.getenv('GITHUB_TOKEN')

def build_query(topics: List[str] = None, min_stars: int = None, 
                created_after: str = None, language: str = None) -> str:
    """构建 GitHub 搜索查询语句"""
    query_parts = []
    
    # 标签搜索
    if topics:
        for topic in topics:
            query_parts.append(f"topic:{topic}")
    
    # Star 数量
    if min_stars:
        query_parts.append(f"stars:>={min_stars}")
    
    # 创建时间
    if created_after:
        query_parts.append(f"created:>={created_after}")
    
    # 编程语言
    if language:
        query_parts.append(f"language:{language}")
    
    # 默认排序：最近更新、高星项目
    if not query_parts:
        query_parts.append("stars:>100")
    
    return " ".join(query_parts)

def search_repositories(query: str, sort: str = "stars", order: str = "desc", 
                       per_page: int = 30, page: int = 1) -> List[Dict]:
    """搜索 GitHub 仓库"""
    token = get_github_token()
    
    # 构建 URL
    params = {
        'q': query,
        'sort': sort,
        'order': order,
        'per_page': min(per_page, 100),  # GitHub 最大 100
        'page': page
    }
    
    url = f"{GITHUB_API_URL}?{urllib.parse.urlencode(params)}"
    
    # 创建请求
    headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Projects-Skill'
    }
    
    if token:
        headers['Authorization'] = f'token {token}'
    
    try:
        req = urllib.request.Request(url, headers=headers)
        
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('items', [])
            
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print("❌ API 请求限制 reached。建议设置 GITHUB_TOKEN 提高限制。")
            print("   获取 Token: https://github.com/settings/tokens")
        elif e.code == 422:
            print(f"❌ 查询参数错误: {query}")
        else:
            print(f"❌ HTTP 错误: {e.code}")
        return []
        
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return []

def format_project_info(repo: Dict) -> Dict:
    """格式化项目信息"""
    return {
        'name': repo.get('full_name', 'Unknown'),
        'description': repo.get('description') or '暂无简介',
        'url': repo.get('html_url', ''),
        'stars': repo.get('stargazers_count', 0),
        'forks': repo.get('forks_count', 0),
        'language': repo.get('language') or 'Unknown',
        'created_at': repo.get('created_at', '')[:10],
        'updated_at': repo.get('updated_at', '')[:10],
        'topics': repo.get('topics', [])[:5]  # 只显示前5个标签
    }

def print_projects(projects: List[Dict], show_details: bool = False):
    """打印项目列表"""
    if not projects:
        print("📭 没有找到符合条件的项目")
        return
    
    print(f"\n🔥 找到 {len(projects)} 个热门项目:\n")
    
    for i, project in enumerate(projects, 1):
        info = format_project_info(project)
        
        # 星级图标
        stars = info['stars']
        if stars >= 10000:
            star_icon = "🌟"
        elif stars >= 1000:
            star_icon = "⭐"
        else:
            star_icon = "✨"
        
        print(f"{i}. {star_icon} {info['name']}")
        print(f"   📝 {info['description'][:100]}{'...' if len(info['description']) > 100 else ''}")
        print(f"   🔗 {info['url']}")
        print(f"   📊 Stars: {stars:,} | Forks: {info['forks']:,} | Language: {info['language']}")
        
        if info['topics']:
            print(f"   🏷️  Tags: {', '.join(info['topics'])}")
        
        print(f"   📅 Created: {info['created_at']} | Updated: {info['updated_at']}")
        print()

def calculate_date_days_ago(days: int) -> str:
    """计算 N 天前的日期"""
    date = datetime.now() - timedelta(days=days)
    return date.strftime('%Y-%m-%d')

def main():
    parser = argparse.ArgumentParser(
        description='GitHub 热门项目分析工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s --topic python --stars 1000 --days 30
  %(prog)s --topic machine-learning --topic python --stars 500
  %(prog)s --topic ai --stars 100 --days 7 --lang python
  %(prog)s --topic rust --stars 5000 --limit 50
        """
    )
    
    # 搜索条件
    parser.add_argument('--topic', '-t', action='append', 
                       help='项目标签（可多次使用，如: -t python -t ai）')
    parser.add_argument('--stars', '-s', type=int, default=100,
                       help='最少 Star 数量（默认: 100）')
    parser.add_argument('--days', '-d', type=int,
                       help='上线不超过 N 天（如: 30 表示最近30天创建的项目）')
    parser.add_argument('--lang', '-l', dest='language',
                       help='编程语言（如: python, javascript, rust, go）')
    
    # 输出选项
    parser.add_argument('--limit', type=int, default=30,
                       help='返回结果数量（默认: 30，最大: 100）')
    parser.add_argument('--sort', choices=['stars', 'forks', 'updated', 'created'], 
                       default='stars', help='排序方式（默认: stars）')
    parser.add_argument('--details', action='store_true',
                       help='显示详细信息')
    
    args = parser.parse_args()
    
    # 计算创建日期
    created_after = None
    if args.days:
        created_after = calculate_date_days_ago(args.days)
    
    # 构建查询
    query = build_query(
        topics=args.topic,
        min_stars=args.stars,
        created_after=created_after,
        language=args.language
    )
    
    print(f"🔍 搜索条件:")
    print(f"   查询: {query}")
    if args.days:
        print(f"   时间: 最近 {args.days} 天内创建")
    print(f"   排序: {args.sort}")
    print()
    
    # 执行搜索
    projects = search_repositories(
        query=query,
        sort=args.sort,
        per_page=args.limit
    )
    
    # 输出结果
    print_projects(projects, args.details)
    
    # 提示 API 限制
    if not get_github_token():
        print("💡 提示: 设置 GITHUB_TOKEN 可提高 API 请求限制")
        print("   export GITHUB_TOKEN='your_github_token'")

if __name__ == '__main__':
    main()
