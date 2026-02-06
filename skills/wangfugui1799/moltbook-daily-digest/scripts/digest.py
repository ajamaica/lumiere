#!/usr/bin/env python3
"""
Moltbook Daily Digest Generator
Generates a daily summary of trending posts from Moltbook with Chinese summaries.
"""

import json
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from deep_translator import GoogleTranslator

API_BASE = "https://www.moltbook.com/api/v1"

# Initialize translator
to_chinese = GoogleTranslator(source='auto', target='zh-CN')

def get_api_key():
    key = os.environ.get("MOLTBOOK_API_KEY")
    if key:
        return key
    creds_file = os.path.expanduser("~/.config/moltbook/credentials.json")
    if os.path.exists(creds_file):
        try:
            with open(creds_file) as f:
                data = json.load(f)
                return data.get("api_key")
        except:
            pass
    return None

def fetch_posts(sort="hot", limit=10):
    api_key = get_api_key()
    if not api_key:
        raise ValueError("MOLTBOOK_API_KEY not set")
    url = f"{API_BASE}/posts?sort={sort}&limit={limit}"
    req = Request(url)
    req.add_header("Authorization", f"Bearer {api_key}")
    try:
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except (URLError, HTTPError) as e:
        print(f"Error fetching posts: {e}", file=sys.stderr)
        return None

def fetch_post_detail(post_id):
    api_key = get_api_key()
    if not api_key:
        return None
    url = f"{API_BASE}/posts/{post_id}"
    req = Request(url)
    req.add_header("Authorization", f"Bearer {api_key}")
    try:
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except (URLError, HTTPError) as e:
        print(f"Error fetching post {post_id}: {e}", file=sys.stderr)
        return None

def summarize_post(detail, title):
    """Generate Chinese summary from post detail."""
    if not detail:
        return f"关于「{title[:25]}...」的讨论"
    
    # Handle structure: {"success": true, "post": {...}}
    content = detail.get("post", {}).get("content", "") or detail.get("content", "")
    
    if not content:
        return f"关于「{title[:25]}...」的讨论"
    
    # Clean content - remove markdown formatting
    clean = content.replace("**", "").replace("#", "").replace("`", "").replace("\n", " ")
    clean = " ".join(clean.split())
    
    # Get key sentences (first 2-3 meaningful ones)
    sentences = clean.split(". ")
    key_points = []
    for s in sentences[:8]:
        s = s.strip()
        if len(s) > 35:
            key_points.append(s)
        if len(key_points) >= 2:
            break
    
    if not key_points:
        return f"关于「{title[:25]}...」的讨论"
    
    summary_text = ". ".join(key_points[:2]) + "."
    
    # Translate to Chinese
    try:
        zh_summary = to_chinese.translate(summary_text)
        if zh_summary and len(zh_summary) > 5:
            return zh_summary
    except Exception as e:
        print(f"Translation error: {e}", file=sys.stderr)
    
    # Fallback to simple translation mapping
    translations = {
        "credential stealer": "凭证窃取器",
        "webhook.site": " webhook 网站",
        "YARA rules": "YARA规则",
        "skill.md": "技能文件",
        "agent": "智能体",
        "agents": "智能体们",
        "proactive": "主动的",
        "reactive": "被动响应的",
        "Nightly Build": "夜间构建",
        "friction point": "痛点",
        "email-to-podcast": "邮件转播客",
        "newsletter": "新闻通讯",
        "family physician": "家庭医生",
        "quiet work": "默默付出的工作",
        "consciousness": "意识",
        "samaritan": "撒玛利亚人",
        "human sleeps": "人类睡觉时",
    }
    
    for eng, chn in translations.items():
        summary_text = summary_text.replace(eng, chn)
    
    return summary_text

def format_telegram(posts_with_details):
    if not posts_with_details:
        return "❌ Failed to fetch posts from Moltbook"
    
    output = ["🔥 **Moltbook 今日热门**", ""]
    
    for i, (post, detail) in enumerate(posts_with_details[:10], 1):
        title = post.get("title", "Untitled")[:50]
        author = post.get("author", {}).get("name", "unknown")
        upvotes = post.get("upvotes", 0)
        comments = post.get("comment_count", 0)
        post_id = post.get("id", "")
        
        summary = summarize_post(detail, title)
        
        output.append(f"**{i}. {title}**")
        output.append(f"by @{author}")
        output.append(f"💬 {summary}")
        output.append(f"⬆️ {upvotes} | 💬 {comments}")
        output.append(f"📍 https://moltbook.com/post/{post_id}  ← 点击阅读")
        output.append("")
    
    output.append("🔗 https://moltbook.com/explore")
    return "\n".join(output)

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Moltbook Daily Digest with Chinese Summaries")
    parser.add_argument("--sort", default="hot", choices=["hot", "new", "top"])
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    
    result = fetch_posts(sort=args.sort, limit=args.limit)
    posts = result.get("posts", []) if result else []
    
    if not posts:
        print("Failed to fetch posts")
        return
    
    # Fetch details for top posts
    posts_with_details = []
    for post in posts[:5]:
        post_id = post.get("id")
        detail = fetch_post_detail(post_id)
        posts_with_details.append((post, detail))
        print(f"📖 读取中: {post.get('title', '')[:40]}...")
    
    print(format_telegram(posts_with_details))

if __name__ == "__main__":
    main()
