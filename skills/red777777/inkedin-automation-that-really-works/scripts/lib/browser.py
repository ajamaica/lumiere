#!/usr/bin/env python3
"""Browser lifecycle management for LinkedIn automation."""
import sys, time, json, os
from pathlib import Path
from contextlib import contextmanager

# If using a venv, ensure Playwright is importable
VENV_PW = os.environ.get("LINKEDIN_VENV_PACKAGES", "")
if os.path.isdir(VENV_PW) and VENV_PW not in sys.path:
    sys.path.insert(0, VENV_PW)

from playwright.sync_api import sync_playwright

# Configure via env vars or defaults
PROFILE_DIR = os.environ.get("LINKEDIN_BROWSER_PROFILE", os.path.expanduser("~/.linkedin-browser"))
HEADLESS = True
VIEWPORT = {"width": 1280, "height": 900}
LOCALE = "de-DE"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


def get_browser(headless=None):
    """Launch browser with persistent LinkedIn session. Returns (pw, context)."""
    if headless is None:
        headless = HEADLESS
    pw = sync_playwright().start()
    ctx = pw.chromium.launch_persistent_context(
        PROFILE_DIR,
        headless=headless,
        args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
        user_agent=USER_AGENT,
        viewport=VIEWPORT,
        locale=LOCALE,
    )
    return pw, ctx


@contextmanager
def browser_session(headless=None):
    """Context manager for browser lifecycle. Yields (context, page)."""
    pw, ctx = get_browser(headless)
    page = ctx.new_page()
    try:
        yield ctx, page
    finally:
        ctx.close()
        pw.stop()


def is_logged_in(page):
    """Check if we're logged into LinkedIn. Navigates to feed."""
    page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)
    url = page.url
    if "/login" in url or "/checkpoint" in url or "authwall" in url:
        return False
    try:
        page.wait_for_selector('[data-view-name="feed-full-update"]', timeout=8000)
        return True
    except Exception:
        return "feed" in url and "/login" not in url


def check_session():
    """Check session validity. Returns JSON result."""
    with browser_session() as (ctx, page):
        logged_in = is_logged_in(page)
        profile_name = ""
        if logged_in:
            try:
                el = page.locator('.feed-identity-module__actor-meta a').first
                profile_name = el.inner_text(timeout=3000).strip()
            except Exception:
                pass
        return {"success": True, "logged_in": logged_in, "profile": profile_name, "url": page.url}
