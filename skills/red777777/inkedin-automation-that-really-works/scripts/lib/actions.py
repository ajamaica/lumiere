#!/usr/bin/env python3
"""High-level LinkedIn actions with error handling and retry logic."""
import re, time, json, logging, os
from datetime import datetime

from .browser import browser_session, is_logged_in
from . import selectors

# Pattern: @FirstName LastName (2+ word names supported)
MENTION_RE = re.compile(r'@([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)+)')

log = logging.getLogger("linkedin.actions")


def _debug_screenshot(page, name="error"):
    """Save a debug screenshot on failure."""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = f"/tmp/linkedin_debug_{name}_{ts}.png"
    try:
        page.screenshot(path=path)
        return path
    except Exception:
        return None


def _result(success=True, **kwargs):
    return {"success": success, **kwargs}


def _error(msg, screenshot=None):
    r = {"success": False, "error": msg}
    if screenshot:
        r["debug_screenshot"] = screenshot
    return r


def _require_login(page):
    """Check login, raise if not logged in."""
    if not is_logged_in(page):
        raise RuntimeError("Not logged in to LinkedIn")


def _type_with_mentions(page, textbox, text, typing_delay=40):
    """Type text into a textbox, handling @Mentions via the typeahead dropdown.

    Splits text on @Mention patterns, types plain segments normally,
    and uses selectors.insert_mention() for each mention.

    Returns list of mention results.
    """
    mention_results = []
    # Split text into segments: alternating plain text and mention names
    parts = MENTION_RE.split(text)
    # parts is: [before_1, name_1, between_1_2, name_2, ..., after_last]
    # Even indices = plain text, odd indices = captured mention names

    for i, part in enumerate(parts):
        if not part:
            continue
        if i % 2 == 0:
            # Plain text segment — type line by line
            lines = part.split('\n')
            for j, line in enumerate(lines):
                if line:
                    textbox.type(line, delay=typing_delay)
                if j < len(lines) - 1:
                    textbox.press('Enter')
            time.sleep(0.3)
        else:
            # Mention name — use the typeahead flow
            result = selectors.insert_mention(page, textbox, part)
            mention_results.append(result)
            log.info(f"Mention '{part}': {result}")

    return mention_results


def create_post(text, image_path=None):
    """Create a new LinkedIn post."""
    with browser_session() as (ctx, page):
        _require_login(page)
        try:
            btn = selectors.find_start_post_button(page)
            btn.click()
            time.sleep(2)

            editor = selectors.find_post_editor(page)
            editor.click()
            time.sleep(0.5)
            _type_with_mentions(page, editor, text, typing_delay=30)
            time.sleep(1)

            if image_path and os.path.exists(image_path):
                try:
                    page.click('[aria-label="Add media"], [aria-label*="Medien"]', timeout=5000)
                    time.sleep(1)
                    page.set_input_files('input[type="file"]', image_path)
                    time.sleep(3)
                    # LinkedIn may show an image editor modal — click "Weiter"/"Next"/"Done" to proceed
                    time.sleep(2)
                    for selector in [
                        'button:has-text("Weiter")',
                        'button:has-text("Next")',
                        'button:has-text("Done")',
                        'button:has-text("Fertig")',
                        'button[aria-label*="Weiter"]',
                        'button[aria-label*="Next"]',
                        '[data-test-modal-close-btn]',
                    ]:
                        try:
                            loc = page.locator(selector).first
                            if loc.is_visible(timeout=2000):
                                loc.click()
                                time.sleep(2)
                                log.info(f"Clicked image editor button: {selector}")
                                break
                        except Exception:
                            continue
                except Exception as e:
                    log.warning(f"Image upload failed: {e}")

            submit = selectors.find_post_submit_button(page)
            # Handle both locator and coords dict (JS fallback)
            if isinstance(submit, dict) and 'x' in submit:
                page.mouse.click(submit['x'], submit['y'])
            else:
                submit.click()
            time.sleep(3)
            return _result(action="post")

        except Exception as e:
            ss = _debug_screenshot(page, "post")
            return _error(str(e), ss)


def comment_on_post(post_url, comment_text):
    """Comment on a specific LinkedIn post."""
    with browser_session() as (ctx, page):
        _require_login(page)
        try:
            page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)

            # Click comment button to open comment area
            try:
                comment_btn = page.locator('button[aria-label*="Comment"], button[aria-label*="Kommentar"]').first
                comment_btn.click()
                time.sleep(2)
            except Exception:
                pass  # Comment box may already be visible

            box = selectors.find_comment_box(page)
            box.click()
            time.sleep(0.5)

            mention_results = _type_with_mentions(page, box, comment_text)
            time.sleep(1)

            selectors.find_submit_button(page)
            time.sleep(3)
            return _result(action="comment", url=post_url, mentions=mention_results)

        except Exception as e:
            ss = _debug_screenshot(page, "comment")
            return _error(str(e), ss)


def delete_comment(post_url, match_text):
    """Delete a comment on a post identified by text fragment."""
    with browser_session() as (ctx, page):
        _require_login(page)
        try:
            page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)

            # Expand comments
            try:
                page.locator('button[aria-label*="Comment"], button[aria-label*="Kommentar"]').first.click()
                time.sleep(2)
            except Exception:
                pass

            # Scroll to load comments
            page.evaluate("window.scrollBy(0, 500)")
            time.sleep(2)

            # Find and click the comment's menu
            selectors.find_comment_menu_button(page, match_text)
            time.sleep(1)

            # Click delete
            selectors.find_menu_option(page, ["Löschen", "Delete", "Kommentar löschen"])
            time.sleep(2)

            # Confirm delete dialog
            try:
                selectors.find_menu_option(page, ["Löschen", "Delete", "Ja"])
            except Exception:
                pass
            time.sleep(2)
            return _result(action="delete_comment", url=post_url, matched=match_text)

        except Exception as e:
            ss = _debug_screenshot(page, "delete_comment")
            return _error(str(e), ss)


def edit_comment(post_url, match_text, new_text):
    """Edit a comment on a post identified by text fragment."""
    with browser_session() as (ctx, page):
        _require_login(page)
        try:
            page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)

            try:
                page.locator('button[aria-label*="Comment"], button[aria-label*="Kommentar"]').first.click()
                time.sleep(2)
            except Exception:
                pass

            page.evaluate("window.scrollBy(0, 500)")
            time.sleep(2)

            selectors.find_comment_menu_button(page, match_text)
            time.sleep(1)

            selectors.find_menu_option(page, ["Bearbeiten", "Edit", "Kommentar bearbeiten"])
            time.sleep(2)

            # Clear existing text and type new
            box = selectors.find_comment_box(page)
            box.click()
            time.sleep(0.5)
            # Select all and delete
            page.keyboard.press("Control+a")
            time.sleep(0.3)
            page.keyboard.press("Delete")
            time.sleep(0.5)
            _type_with_mentions(page, box, new_text, typing_delay=35)
            time.sleep(1)

            # Save/submit edit
            selectors.find_submit_button(page)
            time.sleep(3)
            return _result(action="edit_comment", url=post_url, matched=match_text)

        except Exception as e:
            ss = _debug_screenshot(page, "edit_comment")
            return _error(str(e), ss)


def repost_with_thoughts(post_url, thoughts):
    """Repost a LinkedIn post with commentary."""
    with browser_session() as (ctx, page):
        _require_login(page)
        try:
            page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)

            btn = selectors.find_repost_button(page)
            btn.click()
            time.sleep(2)

            # Click "Repost with your thoughts"
            selectors.find_menu_option(page, [
                "Repost with your thoughts",
                "Mit eigenem Kommentar reposten",
                "Mit eigenen Gedanken reposten",
            ])
            time.sleep(2)

            editor = selectors.find_post_editor(page)
            editor.click()
            time.sleep(0.5)
            _type_with_mentions(page, editor, thoughts, typing_delay=30)
            time.sleep(1)

            submit = selectors.find_post_submit_button(page)
            submit.click()
            time.sleep(3)
            return _result(action="repost", url=post_url)

        except Exception as e:
            ss = _debug_screenshot(page, "repost")
            return _error(str(e), ss)
