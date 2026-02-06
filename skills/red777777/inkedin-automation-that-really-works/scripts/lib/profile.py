#!/usr/bin/env python3
"""LinkedIn profile and activity page scraping."""
import time, logging

from .browser import browser_session, is_logged_in

log = logging.getLogger("linkedin.profile")


def scrape_activity(profile_url, count=10):
    """Scrape recent activity/posts from a LinkedIn profile."""
    with browser_session() as (ctx, page):
        if not is_logged_in(page):
            return {"success": False, "error": "Not logged in"}

        try:
            # Ensure we hit the activity page
            activity_url = profile_url.rstrip("/")
            if "/recent-activity" not in activity_url:
                activity_url += "/recent-activity/all/"

            page.goto(activity_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(4)

            posts = []
            for _ in range(max(3, count // 2)):
                page.evaluate("window.scrollBy(0, 1500)")
                time.sleep(2)

            items = page.locator('[data-view-name="feed-full-update"], .feed-shared-update-v2').all()

            for item in items[:count]:
                try:
                    text = ""
                    url = ""
                    for sel in ['.break-words span[dir="ltr"]', '.update-components-text', '.feed-shared-update-v2__description']:
                        try:
                            text = item.locator(sel).first.inner_text(timeout=2000).strip()[:500]
                            if text:
                                break
                        except Exception:
                            continue

                    try:
                        href = item.locator('a[href*="/feed/update/"], a[href*="activity"]').first.get_attribute("href", timeout=2000)
                        if href:
                            url = href if href.startswith("http") else "https://www.linkedin.com" + href
                    except Exception:
                        pass

                    if text:
                        posts.append({"text": text, "url": url})
                except Exception:
                    continue

            return {"success": True, "posts": posts, "count": len(posts), "profile_url": profile_url}

        except Exception as e:
            return {"success": False, "error": str(e)}
