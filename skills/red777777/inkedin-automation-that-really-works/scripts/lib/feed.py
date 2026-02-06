#!/usr/bin/env python3
"""LinkedIn feed reading and scanning."""
import time, logging

from .browser import browser_session, is_logged_in
from . import selectors

log = logging.getLogger("linkedin.feed")

# JS extraction runs inside the browser — resilient to class name changes
EXTRACT_POST_JS = """el => {
    // Author: first <strong> inside a profile link
    const links = el.querySelectorAll('a[href*="/in/"]');
    let author = '';
    for (const l of links) {
        const strong = l.querySelector('strong');
        if (strong) { author = strong.innerText.trim(); break; }
    }

    // Text: find the main content span (longest meaningful text block, skip header)
    let text = '';
    // Try span[dir=ltr] first (common LinkedIn pattern)
    const spans = el.querySelectorAll('span[dir="ltr"]');
    for (const s of spans) {
        const t = s.innerText ? s.innerText.trim() : '';
        if (t.length > text.length && t.length > 20) text = t;
    }
    // Fallback to any text container
    if (!text) {
        const blocks = el.querySelectorAll('p, div');
        for (const b of blocks) {
            const t = b.innerText ? b.innerText.trim() : '';
            if (t.length > text.length && t.length > 20 && t.length < 3000) text = t;
        }
    }

    // URL: activity/update link
    let url = '';
    const actLink = el.querySelector('a[href*="/feed/update/"]');
    if (actLink) url = actLink.href;
    if (!url) {
        const actLink2 = el.querySelector('a[href*="activity"]');
        if (actLink2 && actLink2.href.includes('linkedin.com')) url = actLink2.href;
    }

    return {author, text: text.substring(0, 500), url};
}"""


def read_feed(count=10):
    """Read the LinkedIn feed and return post summaries."""
    with browser_session() as (ctx, page):
        if not is_logged_in(page):
            return {"success": False, "error": "Not logged in"}

        posts = []
        try:
            # Scroll to load posts
            for _ in range(min(3, max(1, count // 3))):
                page.evaluate("window.scrollBy(0, 1000)")
                time.sleep(1.5)

            items = selectors.find_feed_items(page)

            for item in items[:count]:
                try:
                    data = item.evaluate(EXTRACT_POST_JS)
                    if data.get("author") or (data.get("text") and len(data["text"]) > 20):
                        posts.append({
                            "author": data.get("author", "").strip(),
                            "text": data.get("text", "").strip(),
                            "url": data.get("url", ""),
                        })
                except Exception:
                    continue

            return {"success": True, "posts": posts, "count": len(posts)}

        except Exception as e:
            return {"success": False, "error": str(e)}
