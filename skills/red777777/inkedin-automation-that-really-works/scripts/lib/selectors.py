#!/usr/bin/env python3
"""Resilient selector engine for LinkedIn DOM elements.

Each 'intent' (e.g. find_comment_box) tries multiple selector strategies
in order and logs which one succeeded.
"""
import time, logging

log = logging.getLogger("linkedin.selectors")


class SelectorFailed(Exception):
    """All selector strategies exhausted."""
    pass


def _try_strategies(page, strategies, timeout=10000, label="element"):
    """Try a list of (name, selector) pairs. Returns first matching locator."""
    for name, selector in strategies:
        try:
            loc = page.locator(selector).first
            loc.wait_for(state="visible", timeout=timeout // len(strategies))
            log.debug(f"[{label}] Strategy '{name}' succeeded: {selector}")
            return loc
        except Exception:
            continue
    raise SelectorFailed(f"Could not find {label} after trying {len(strategies)} strategies")


def _try_js_strategies(page, js_fns, timeout=10, label="element"):
    """Try JS-based strategies with polling. Each fn returns element or null."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        for name, js in js_fns:
            result = page.evaluate(js)
            if result:
                log.debug(f"[{label}] JS strategy '{name}' succeeded")
                return result
        time.sleep(0.5)
    raise SelectorFailed(f"Could not find {label} via JS after {timeout}s")


def find_comment_box(page, timeout=10000):
    """Find the comment text input box."""
    strategies = [
        ("placeholder-de", '[data-placeholder*="Kommentar"]'),
        ("placeholder-en", '[data-placeholder*="comment"]'),
        ("role-textbox-comments", '.comments-comment-texteditor [role="textbox"]'),
        ("role-textbox-box", '.comments-comment-box [role="textbox"]'),
        ("ql-editor", '.comments-comment-texteditor .ql-editor'),
        ("contenteditable", '.comments-comment-texteditor [contenteditable="true"]'),
        ("role-textbox-last", '[role="textbox"]'),
    ]
    return _try_strategies(page, strategies, timeout=timeout, label="comment_box")


def find_submit_button(page, timeout=8000):
    """Find the comment submit/post button."""
    strategies = [
        ("class-submit", 'button.comments-comment-box__submit-button'),
        ("aria-posten", 'button[aria-label*="Posten"]'),
        ("aria-post", 'button[aria-label*="Post"]'),
        ("aria-submit", 'button[aria-label*="Submit"]'),
        ("aria-absenden", 'button[aria-label*="Absenden"]'),
        ("aria-kommentar-posten", 'button[aria-label*="Kommentar posten"]'),
    ]
    try:
        return _try_strategies(page, strategies, timeout=timeout, label="submit_button")
    except SelectorFailed:
        # JS fallback: find by text content
        page.evaluate("""() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                const t = btn.textContent.trim().toLowerCase();
                if (t === 'posten' || t === 'post' || t === 'absenden') {
                    btn.click(); return true;
                }
            }
            const sub = document.querySelector('button[class*="submit"]');
            if (sub) { sub.click(); return true; }
            return false;
        }""")
        return None  # Already clicked via JS


def find_post_editor(page, timeout=10000):
    """Find the main post creation editor textbox."""
    strategies = [
        ("placeholder-de-moechten", '[data-placeholder*="möchten"]'),
        ("placeholder-en", '[data-placeholder="What do you want to talk about?"]'),
        ("placeholder-de-alt", '[data-placeholder*="möchtest du"]'),
        ("share-creation-editor", '.share-creation-state__text-editor'),
        ("share-textbox", '.share-creation-state__text-editor [role="textbox"]'),
        ("ql-editor", '.ql-editor[contenteditable="true"]'),
    ]
    return _try_strategies(page, strategies, timeout=timeout, label="post_editor")


def find_start_post_button(page, timeout=10000):
    """Find the 'Start a post' trigger on the feed."""
    strategies = [
        ("class-trigger", 'button.share-box-feed-entry__trigger'),
        ("share-box-top-bar", '.share-box-feed-entry__top-bar'),
        ("placeholder-beitrag", '[placeholder*="Beitrag"]'),
        ("text-beitrag-beginnen", ':text("Beitrag beginnen")'),
        ("text-start-post", ':text("Start a post")'),
    ]
    return _try_strategies(page, strategies, timeout=timeout, label="start_post")


def find_post_submit_button(page, timeout=8000):
    """Find the post submit button in the post creation modal."""
    strategies = [
        ("class-primary", 'button.share-actions__primary-action'),
        ("share-actions-posten", '.share-actions button:has-text("Posten")'),
        ("share-actions-post", '.share-actions button:has-text("Post")'),
    ]
    return _try_strategies(page, strategies, timeout=timeout, label="post_submit")


def find_comment_menu_button(page, comment_text_fragment, timeout=10):
    """Find the 3-dot menu button for a specific comment (identified by text fragment)."""
    js_fns = [
        ("walk-up-aria", f"""() => {{
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {{
                if (walker.currentNode.textContent.includes({repr(comment_text_fragment)})) {{
                    let el = walker.currentNode.parentElement;
                    for (let i = 0; i < 20; i++) {{
                        if (!el) break;
                        const btn = el.querySelector('button[aria-label*="Weitere Aktionen"], button[aria-label*="More actions"], button[aria-label*="Optionen"]');
                        if (btn) {{ btn.scrollIntoView({{block: "center"}}); btn.click(); return true; }}
                        el = el.parentElement;
                    }}
                }}
            }}
            return false;
        }}"""),
        ("walk-up-dots", f"""() => {{
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {{
                if (walker.currentNode.textContent.includes({repr(comment_text_fragment)})) {{
                    let el = walker.currentNode.parentElement;
                    for (let i = 0; i < 20; i++) {{
                        if (!el) break;
                        const btns = el.querySelectorAll('button');
                        for (const b of btns) {{
                            const svg = b.querySelector('svg');
                            if (svg && b.offsetWidth < 50) {{ b.scrollIntoView({{block: "center"}}); b.click(); return true; }}
                        }}
                        el = el.parentElement;
                    }}
                }}
            }}
            return false;
        }}"""),
    ]
    return _try_js_strategies(page, js_fns, timeout=timeout, label="comment_menu")


def find_menu_option(page, option_texts, timeout=8):
    """Find and click a menu option by text (tries multiple labels).
    option_texts: list of strings like ['Löschen', 'Delete', 'Kommentar löschen']
    """
    text_checks = " || ".join(f't === {repr(t.lower())}' for t in option_texts)
    js_fns = [
        ("menuitem", f"""() => {{
            const items = document.querySelectorAll('[role="menuitem"], [role="option"]');
            for (const item of items) {{
                const t = item.textContent.trim().toLowerCase();
                if ({text_checks}) {{ item.click(); return true; }}
            }}
            return false;
        }}"""),
        ("any-element", f"""() => {{
            const items = document.querySelectorAll('span, div, button, li');
            for (const item of items) {{
                const t = item.textContent.trim().toLowerCase();
                if ({text_checks}) {{ item.click(); return true; }}
            }}
            return false;
        }}"""),
    ]
    return _try_js_strategies(page, js_fns, timeout=timeout, label="menu_option")


def find_repost_button(page, timeout=10000):
    """Find the repost button on a post."""
    strategies = [
        ("aria-repost", 'button[aria-label*="Repost"]'),
        ("aria-erneut", 'button[aria-label*="Erneut"]'),
        ("aria-teilen", 'button[aria-label*="teilen"]'),
    ]
    return _try_strategies(page, strategies, timeout=timeout, label="repost_button")


def find_feed_items(page):
    """Find all feed items on the current page."""
    strategies = [
        ("data-view", '[data-view-name="feed-full-update"]'),
        ("feed-update", '.feed-shared-update-v2'),
        ("update-comp", '[data-urn*="activity"]'),
    ]
    for name, selector in strategies:
        items = page.locator(selector).all()
        if items:
            log.debug(f"[feed_items] Strategy '{name}' found {len(items)} items")
            return items
    return []


def click_confirmed(page, locator_or_selector, verify_fn=None, timeout=5000, retries=2):
    """Click an element and optionally verify a state change.
    verify_fn: callable(page) -> bool, called after click to confirm state changed.
    """
    for attempt in range(retries + 1):
        try:
            if isinstance(locator_or_selector, str):
                loc = page.locator(locator_or_selector).first
            else:
                loc = locator_or_selector
            loc.click(timeout=timeout)
            if verify_fn is None:
                return True
            time.sleep(1)
            if verify_fn(page):
                return True
        except Exception:
            if attempt == retries:
                raise
        time.sleep(1)
    return False


TYPEAHEAD_SELECTORS = [
    '[role="listbox"]',
    '.mentions-typeahead',
    'ul.typeahead-results',
    '.basic-typeahead__triggered-content',
    '[class*="typeahead"]',
    '[class*="mention"][class*="dropdown"]',
    '[class*="mention"][class*="list"]',
]


def _wait_for_typeahead(page, timeout_ms=4000):
    """Wait for the mention/typeahead dropdown to appear. Returns True if found."""
    combined = ", ".join(TYPEAHEAD_SELECTORS)
    try:
        page.wait_for_selector(combined, state="visible", timeout=timeout_ms)
        log.debug("[typeahead] Dropdown appeared via combined selector")
        return True
    except Exception:
        pass
    # Fallback: check each individually (some may be dynamic)
    for sel in TYPEAHEAD_SELECTORS:
        try:
            page.wait_for_selector(sel, state="visible", timeout=500)
            log.debug(f"[typeahead] Dropdown appeared via fallback: {sel}")
            return True
        except Exception:
            continue
    return False


def _click_typeahead_match(page, full_name):
    """Find and click the matching person in the typeahead dropdown.
    full_name: e.g. 'Betina Weiler' — matches if dropdown item contains both parts.
    Returns True if clicked successfully.
    """
    parts = [p.strip().lower() for p in full_name.split() if p.strip()]
    # Build a JS check: item text must contain ALL name parts
    checks = " && ".join(f"t.includes({repr(p)})" for p in parts)

    js = f"""() => {{
        // First find the typeahead/dropdown container to scope our search
        const dropdownSelectors = [
            '[role="listbox"]',
            '[class*="typeahead"][class*="content"]',
            '[class*="typeahead"][class*="result"]',
            '[class*="mention"][class*="dropdown"]',
            '[class*="mention"][class*="list"]',
            '[class*="basic-typeahead"]',
        ];
        
        // Strategy 1: Search within a found dropdown container
        for (const dropSel of dropdownSelectors) {{
            const dropdown = document.querySelector(dropSel);
            if (dropdown && dropdown.offsetHeight > 0) {{
                const items = dropdown.querySelectorAll('li, [role="option"], div[id]');
                for (const item of items) {{
                    const t = (item.textContent || '').toLowerCase();
                    if ({checks}) {{
                        item.scrollIntoView({{block: 'center'}});
                        item.click();
                        return {{clicked: true, strategy: 'scoped:' + dropSel, text: item.textContent.trim().substring(0, 80)}};
                    }}
                }}
            }}
        }}
        
        // Strategy 2: role=option anywhere (these are specifically dropdown items)
        const options = document.querySelectorAll('[role="option"]');
        for (const item of options) {{
            const t = (item.textContent || '').toLowerCase();
            if ({checks}) {{
                item.scrollIntoView({{block: 'center'}});
                item.click();
                return {{clicked: true, strategy: '[role=option]', text: item.textContent.trim().substring(0, 80)}};
            }}
        }}
        
        return {{clicked: false}};
    }}"""
    result = page.evaluate(js)
    if result.get("clicked"):
        log.debug(f"[typeahead] Clicked match: {result.get('text')} via {result.get('strategy')}")
        return True
    return False


def _verify_mention_inserted(page):
    """Check if a mention chip/token was inserted (typeahead should be gone)."""
    # Check typeahead is gone
    combined = ", ".join(TYPEAHEAD_SELECTORS)
    try:
        page.wait_for_selector(combined, state="hidden", timeout=2000)
    except Exception:
        pass  # May already be hidden

    # Check for mention chip in the editor
    has_chip = page.evaluate("""() => {
        // LinkedIn wraps mentions in special elements
        const chips = document.querySelectorAll(
            '[data-entity-type="MINI_PROFILE"], ' +
            '[class*="mention"][contenteditable="false"], ' +
            'a[data-attribute-index], ' +
            '.ql-mention, ' +
            '[data-mention-id], ' +
            'span[data-id][contenteditable="false"]'
        );
        return chips.length > 0;
    }""")
    return has_chip


def _backspace_text(page, count):
    """Press Backspace N times to erase typed text."""
    for _ in range(count):
        page.keyboard.press("Backspace")
        time.sleep(0.05)


def insert_mention(page, textbox, full_name, max_retries=2):
    """Insert an @mention by triggering the typeahead dropdown and selecting the person.

    Args:
        page: Playwright page
        textbox: The textbox locator (must already be focused/clicked)
        full_name: Full name to mention, e.g. 'Betina Weiler'
        max_retries: Number of retry attempts if dropdown doesn't appear

    Returns:
        dict with {success: bool, method: str, ...}
    """
    first_name = full_name.split()[0]
    trigger_text = f"@{first_name}"

    for attempt in range(max_retries + 1):
        log.debug(f"[mention] Attempt {attempt + 1}: typing '{trigger_text}'")

        # Step 1: Type @ + first name slowly
        textbox.type(trigger_text, delay=100)
        time.sleep(0.5)

        # Step 2: Wait for typeahead dropdown
        dropdown_appeared = _wait_for_typeahead(page, timeout_ms=4000)

        if not dropdown_appeared:
            log.debug(f"[mention] Dropdown didn't appear on attempt {attempt + 1}")
            if attempt < max_retries:
                _backspace_text(page, len(trigger_text))
                time.sleep(1)
                continue
            else:
                log.warning(f"[mention] All retries exhausted, typing as plain text")
                remaining = full_name[len(first_name):]
                if remaining:
                    textbox.type(remaining, delay=50)
                return {"success": False, "method": "plain_text",
                        "reason": "typeahead never appeared"}

        # Step 3: Check if person is already visible with just first name
        time.sleep(0.5)
        clicked = _click_typeahead_match(page, full_name)

        if not clicked and len(full_name.split()) > 1:
            # Step 3b: Progressively type last name, letter by letter
            last_name = " ".join(full_name.split()[1:])
            log.debug(f"[mention] Not found with first name, typing last name progressively: '{last_name}'")
            textbox.type(" ", delay=50)
            time.sleep(0.5)

            for i, char in enumerate(last_name):
                textbox.type(char, delay=100)
                time.sleep(1.0)  # Let dropdown update

                # Re-check dropdown after each letter
                if not _wait_for_typeahead(page, timeout_ms=1500):
                    log.debug(f"[mention] Dropdown disappeared after typing '{last_name[:i+1]}'")
                    continue

                clicked = _click_typeahead_match(page, full_name)
                if clicked:
                    log.info(f"[mention] Found after typing '{last_name[:i+1]}' of last name")
                    break

        if not clicked:
            log.debug(f"[mention] No matching item for '{full_name}' in dropdown after progressive typing")
            # Backspace everything and type as plain text
            typed_total = len(trigger_text) + 1 + len(last_name) if len(full_name.split()) > 1 else len(trigger_text)
            _backspace_text(page, typed_total)
            time.sleep(0.3)
            page.keyboard.press("Escape")
            time.sleep(0.3)
            textbox.type(full_name, delay=30)
            return {"success": False, "method": "plain_text",
                    "reason": f"no match for '{full_name}' in typeahead",
                    "mention_failed": full_name}

        # Step 4: Verify mention chip was inserted
        time.sleep(0.8)
        chip_found = _verify_mention_inserted(page)
        log.debug(f"[mention] Chip verification: {chip_found}")

        # Add a trailing space after the mention
        textbox.press("End")
        time.sleep(0.1)
        textbox.type(" ", delay=50)

        return {"success": True, "method": "typeahead_chip" if chip_found else "typeahead_click",
                "name": full_name, "attempt": attempt + 1}

    # Should not reach here
    return {"success": False, "method": "unknown", "reason": "exhausted retries"}


def find_article_title_field(page, timeout=10000):
    """Find the article title input field."""
    strategies = [
        ("placeholder-titel", '[placeholder="Titel"]'),
        ("placeholder-title", '[placeholder="Title"]'),
        ("h1-contenteditable", 'h1[contenteditable="true"]'),
        ("article-title", '.article-editor__title [contenteditable="true"]'),
    ]
    return _try_strategies(page, strategies, timeout=timeout, label="article_title")


def find_article_body_field(page, timeout=10000):
    """Find the article body editor field."""
    strategies = [
        ("placeholder-text-de", '[data-placeholder*="Text hier ein"]'),
        ("placeholder-story", '[data-placeholder*="story"]'),
        ("article-content", '.article-editor__content [contenteditable="true"]'),
        ("prosemirror", '.ProseMirror[contenteditable="true"]'),
    ]
    try:
        return _try_strategies(page, strategies, timeout=timeout, label="article_body")
    except SelectorFailed:
        # JS fallback: find the second contenteditable (first is title)
        result = page.evaluate("""() => {
            const ces = document.querySelectorAll('[contenteditable="true"]');
            // Skip title (usually first or has h1-like styling)
            for (let i = 0; i < ces.length; i++) {
                const el = ces[i];
                // Body is usually larger and not h1
                if (el.tagName !== 'H1' && el.offsetHeight > 100) {
                    return {found: true, index: i};
                }
            }
            // Fallback: just return second contenteditable
            if (ces.length >= 2) {
                return {found: true, index: 1};
            }
            return {found: false};
        }""")
        if result.get("found"):
            log.debug(f"[article_body] JS fallback found at index {result['index']}")
            return page.locator('[contenteditable="true"]').nth(result['index'])
        raise SelectorFailed("Could not find article body editor")


def find_article_next_button(page, timeout=8000):
    """Find the 'Weiter'/'Next' button in article editor."""
    strategies = [
        ("text-weiter", 'button:has-text("Weiter")'),
        ("text-next", 'button:has-text("Next")'),
        ("aria-weiter", 'button[aria-label*="Weiter"]'),
    ]
    return _try_strategies(page, strategies, timeout=timeout, label="article_next")


def find_article_publish_button(page, timeout=8000):
    """Find the 'Veröffentlichen'/'Publish' button for articles."""
    strategies = [
        ("text-veroeffentlichen", 'button:has-text("Veröffentlichen")'),
        ("text-publish", 'button:has-text("Publish")'),
        ("aria-publish", 'button[aria-label*="Publish"]'),
    ]
    return _try_strategies(page, strategies, timeout=timeout, label="article_publish")


def click_by_coords(page, coords, wait_after=1.0):
    """Click at coordinates returned by JS fallback strategies."""
    if isinstance(coords, dict) and 'x' in coords and 'y' in coords:
        page.mouse.click(coords['x'], coords['y'])
        time.sleep(wait_after)
        return True
    return False
