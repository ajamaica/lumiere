#!/usr/bin/env python3
"""LinkedIn analytics — extract engagement stats from recent posts."""
import time, json, logging

from .browser import browser_session, is_logged_in

log = logging.getLogger("linkedin.analytics")


def get_post_analytics(count=10):
    """Scrape engagement stats from your recent LinkedIn posts.
    
    Returns list of posts with impressions, likes, comments, reposts.
    """
    with browser_session() as (ctx, page):
        if not is_logged_in(page):
            return {"success": False, "error": "Not logged in"}

        # Navigate to own post activity
        # First get our profile slug
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)

        profile_slug = page.evaluate("""() => {
            const links = document.querySelectorAll('a[href*="/in/"]');
            for (const l of links) {
                const h = l.getAttribute('href');
                if (h && h.includes('/in/') && !h.includes('miniProfile')) {
                    const match = h.match(/\\/in\\/([^/?]+)/);
                    return match ? match[1] : null;
                }
            }
            return null;
        }""")

        if not profile_slug:
            return {"success": False, "error": "Could not determine profile slug"}

        page.goto(f"https://www.linkedin.com/in/{profile_slug}/recent-activity/all/",
                  wait_until="domcontentloaded", timeout=30000)
        time.sleep(5)

        # Scroll to load more posts
        for _ in range(min(count // 3, 5)):
            page.evaluate("window.scrollBy(0, 2000)")
            time.sleep(2)

        # Extract post data
        posts = page.evaluate(f"""() => {{
            const items = document.querySelectorAll('[data-view-name="feed-full-update"]');
            const results = [];
            const limit = {count};

            for (let i = 0; i < Math.min(items.length, limit); i++) {{
                const item = items[i];
                const post = {{}};

                // Post text (first 200 chars)
                try {{
                    const textEl = item.querySelector('.feed-shared-update-v2__description, [class*="update-components-text"], span[dir="ltr"]');
                    post.text = textEl ? textEl.innerText.substring(0, 200).trim() : '';
                }} catch(e) {{ post.text = ''; }}

                // Reactions count
                try {{
                    const reactEl = item.querySelector('[class*="social-details-social-counts__reactions-count"], button[aria-label*="Reaktion"], span[class*="reactions-count"]');
                    post.reactions = reactEl ? parseInt(reactEl.innerText.replace(/\\D/g, '')) || 0 : 0;
                }} catch(e) {{ post.reactions = 0; }}

                // Comments count
                try {{
                    const commentEl = item.querySelector('button[aria-label*="Kommentar"], button[aria-label*="comment"]');
                    const label = commentEl ? commentEl.getAttribute('aria-label') || '' : '';
                    const match = label.match(/(\\d+)/);
                    post.comments = match ? parseInt(match[1]) : 0;
                }} catch(e) {{ post.comments = 0; }}

                // Reposts count
                try {{
                    const repostEl = item.querySelector('button[aria-label*="Repost"], button[aria-label*="Erneut"]');
                    const label = repostEl ? repostEl.getAttribute('aria-label') || '' : '';
                    const match = label.match(/(\\d+)/);
                    post.reposts = match ? parseInt(match[1]) : 0;
                }} catch(e) {{ post.reposts = 0; }}

                // Timestamp
                try {{
                    const timeEl = item.querySelector('time, [class*="actor__sub-description"] span');
                    post.time = timeEl ? timeEl.innerText.trim() : '';
                }} catch(e) {{ post.time = ''; }}

                post.engagement = post.reactions + post.comments * 3 + post.reposts * 2;
                results.push(post);
            }}
            return results;
        }}""")

        # Summary stats
        total_reactions = sum(p.get("reactions", 0) for p in posts)
        total_comments = sum(p.get("comments", 0) for p in posts)
        total_reposts = sum(p.get("reposts", 0) for p in posts)
        avg_engagement = sum(p.get("engagement", 0) for p in posts) / max(len(posts), 1)

        # Sort by engagement to find top posts
        top_posts = sorted(posts, key=lambda p: p.get("engagement", 0), reverse=True)[:3]

        return {
            "success": True,
            "profile": profile_slug,
            "post_count": len(posts),
            "summary": {
                "total_reactions": total_reactions,
                "total_comments": total_comments,
                "total_reposts": total_reposts,
                "avg_engagement_score": round(avg_engagement, 1),
            },
            "top_posts": top_posts,
            "all_posts": posts,
        }


def get_profile_stats():
    """Get profile-level stats (followers, views)."""
    with browser_session() as (ctx, page):
        if not is_logged_in(page):
            return {"success": False, "error": "Not logged in"}

        page.goto("https://www.linkedin.com/dashboard/", wait_until="domcontentloaded", timeout=30000)
        time.sleep(4)

        stats = page.evaluate("""() => {
            const result = {};
            const cards = document.querySelectorAll('[class*="analytics-card"], [class*="dashboard-card"], .pv-recent-activity-section');
            for (const card of cards) {
                const text = card.innerText || '';
                // Profile views
                if (text.includes('Profilbesuche') || text.includes('Profile viewers') || text.includes('profile views')) {
                    const match = text.match(/(\\d[\\d.,]*)/);
                    if (match) result.profile_views = match[1];
                }
                // Post impressions
                if (text.includes('Impressionen') || text.includes('impressions')) {
                    const match = text.match(/(\\d[\\d.,]*)/);
                    if (match) result.impressions = match[1];
                }
                // Search appearances
                if (text.includes('Suchauftritte') || text.includes('search appearances')) {
                    const match = text.match(/(\\d[\\d.,]*)/);
                    if (match) result.search_appearances = match[1];
                }
            }
            
            // Follower count
            const followerEls = document.querySelectorAll('*');
            for (const el of followerEls) {
                if (el.children.length === 0 && el.textContent.match(/\\d+.*Follower/)) {
                    const match = el.textContent.match(/(\\d[\\d.,]*)/);
                    if (match) result.followers = match[1];
                    break;
                }
            }
            return result;
        }""")

        return {"success": True, **stats}
