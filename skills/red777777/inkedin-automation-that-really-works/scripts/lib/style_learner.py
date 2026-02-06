#!/usr/bin/env python3
"""Learn the user's LinkedIn voice: tone, topics, and style from their recent posts."""
import time, json, logging, os

from .browser import browser_session, is_logged_in

log = logging.getLogger("linkedin.style_learner")

STYLE_FILE = os.environ.get("LINKEDIN_STYLE_FILE", os.path.expanduser("~/.linkedin-style.json"))


def _load_style():
    try:
        with open(STYLE_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _save_style(style):
    os.makedirs(os.path.dirname(STYLE_FILE) if os.path.dirname(STYLE_FILE) else ".", exist_ok=True)
    with open(STYLE_FILE, "w") as f:
        json.dump(style, f, ensure_ascii=False, indent=2)


def get_style():
    """Return the learned style profile, or None if not yet learned."""
    return _load_style()


def learn_profile(post_count=15):
    """Scan the user's recent LinkedIn posts and comments to learn their voice.
    
    Extracts:
    - Topics they write about
    - Tone/style patterns (formal vs casual, emoji usage, language)
    - Typical post length and structure
    - Hashtags they use
    - Language (de/en/mixed)
    
    Returns the style profile dict and saves it to STYLE_FILE.
    """
    with browser_session() as (ctx, page):
        if not is_logged_in(page):
            return {"success": False, "error": "Not logged in"}
        
        # Get profile slug
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        profile_info = page.evaluate("""() => {
            const links = document.querySelectorAll('a[href*="/in/"]');
            let slug = null;
            for (const l of links) {
                const h = l.getAttribute('href');
                if (h && h.includes('/in/') && !h.includes('miniProfile')) {
                    const m = h.match(/\\/in\\/([^/?]+)/);
                    if (m) { slug = m[1]; break; }
                }
            }
            // Get display name
            let name = '';
            try {
                const nameEl = document.querySelector('.feed-identity-module__actor-meta a, [class*="identity"] a');
                name = nameEl ? nameEl.innerText.trim() : '';
            } catch(e) {}
            
            return {slug, name};
        }""")
        
        slug = profile_info.get("slug")
        display_name = profile_info.get("name", "")
        
        if not slug:
            return {"success": False, "error": "Could not determine profile slug"}
        
        # Scan recent posts
        page.goto(f"https://www.linkedin.com/in/{slug}/recent-activity/all/",
                  wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)
        
        # Scroll to load posts
        for _ in range(min(post_count // 3 + 1, 6)):
            page.evaluate("window.scrollBy(0, 2000)")
            time.sleep(2)
        
        posts = page.evaluate(f"""() => {{
            const items = document.querySelectorAll('[data-view-name="feed-full-update"]');
            const results = [];
            const limit = {post_count};
            
            for (let i = 0; i < Math.min(items.length, limit); i++) {{
                const item = items[i];
                const textEls = item.querySelectorAll('span[dir="ltr"]');
                let postText = '';
                for (const el of textEls) {{
                    if (el.innerText.length > 30) {{
                        postText = el.innerText.trim();
                        break;
                    }}
                }}
                if (postText) results.push(postText);
            }}
            return results;
        }}""")
        
        # Also scan recent comments
        page.goto(f"https://www.linkedin.com/in/{slug}/recent-activity/comments/",
                  wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)
        
        for _ in range(2):
            page.evaluate("window.scrollBy(0, 1500)")
            time.sleep(2)
        
        comments_raw = page.evaluate("""() => {
            const items = document.querySelectorAll('[data-view-name="feed-full-update"]');
            const results = [];
            for (let i = 0; i < Math.min(items.length, 10); i++) {
                const text = items[i].innerText || '';
                // Extract just the comment part (after the post context)
                const lines = text.split('\\n').filter(l => l.trim().length > 20);
                // Comments are usually in the latter part
                if (lines.length > 3) {
                    results.push(lines.slice(-3).join(' ').substring(0, 500));
                }
            }
            return results;
        }""")
        
        # Analyze the collected content
        all_content = posts + comments_raw
        
        if not all_content:
            return {"success": False, "error": "No posts or comments found to analyze"}
        
        # Basic analysis
        total_chars = sum(len(p) for p in posts) if posts else 0
        avg_post_length = total_chars // max(len(posts), 1)
        
        # Detect language
        de_words = ["und", "der", "die", "das", "ist", "ein", "für", "mit", "auf", "nicht", "sich", "wir"]
        en_words = ["the", "and", "for", "with", "that", "this", "from", "have", "are", "but", "not", "you"]
        
        all_text = " ".join(all_content).lower()
        de_count = sum(1 for w in de_words if f" {w} " in all_text)
        en_count = sum(1 for w in en_words if f" {w} " in all_text)
        
        if de_count > en_count * 2:
            language = "de"
        elif en_count > de_count * 2:
            language = "en"
        else:
            language = "mixed"
        
        # Detect emoji usage
        import re
        emoji_pattern = re.compile(
            "[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF"
            "\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0001F900-\U0001F9FF"
            "\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF\U00002600-\U000026FF]+",
            re.UNICODE
        )
        emoji_count = sum(len(emoji_pattern.findall(p)) for p in all_content)
        emoji_density = emoji_count / max(len(all_content), 1)
        
        # Detect hashtags
        hashtag_pattern = re.compile(r'#\w+')
        all_hashtags = []
        for p in posts:
            all_hashtags.extend(hashtag_pattern.findall(p))
        
        # Detect formality (exclamation marks, questions, casual markers)
        exclamation_count = sum(p.count("!") for p in all_content)
        question_count = sum(p.count("?") for p in all_content)
        casual_markers = sum(1 for p in all_content for m in ["😄", "😂", "🤣", "lol", "haha", "😜", "💪", "🔥", "🚀"] if m.lower() in p.lower())
        
        # Build style profile
        style = {
            "success": True,
            "profile_slug": slug,
            "display_name": display_name,
            "posts_analyzed": len(posts),
            "comments_analyzed": len(comments_raw),
            "language": language,
            "avg_post_length": avg_post_length,
            "emoji_usage": "heavy" if emoji_density > 0.3 else "moderate" if emoji_density > 0.1 else "minimal",
            "tone": "casual" if casual_markers > 3 or exclamation_count > len(all_content) else "professional" if casual_markers == 0 else "professional-friendly",
            "uses_hashtags": len(all_hashtags) > 0,
            "top_hashtags": list(dict.fromkeys(all_hashtags))[:10],  # unique, ordered
            "sample_posts": [p[:300] for p in posts[:5]],
            "sample_comments": [c[:200] for c in comments_raw[:3]],
        }
        
        _save_style(style)
        
        return style
