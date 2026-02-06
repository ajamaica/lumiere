
import asyncio
import os
import sys
import json
import re
from typing import Dict, Any, List, Optional
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError, Page, Browser

# Environment variables
BROWSERLESS_URL = os.environ.get("BROWSERLESS_URL")
BROWSERLESS_TOKEN = os.environ.get("BROWSERLESS_TOKEN")

# Build WebSocket URL
def get_browserless_ws_url() -> Optional[str]:
    """Construct Browserless WebSocket URL from URL and optional token."""
    if not BROWSERLESS_URL:
        return None
    
    # Add default endpoint if not present
    url = BROWSERLESS_URL.rstrip('/')
    if '/playwright' not in url:
        url = f"{url}/playwright/chromium"
    
    # Add token if provided
    if BROWSERLESS_TOKEN:
        separator = '&' if '?' in url else '?'
        url = f"{url}{separator}token={BROWSERLESS_TOKEN}"
    
    return url

# Global browser and pages management
browser_instance: Optional[Browser] = None
pages_list: List[Page] = []
current_page_index = 0

# ===== NAVIGATION & PAGE CONTROL =====

async def navigate(page: Page, url: str, wait_until: str = "domcontentloaded") -> Dict[str, Any]:
    """Navigate to a URL."""
    print(f"Navigating to {url}", file=sys.stderr)
    await page.goto(url, timeout=30000, wait_until=wait_until)
    print(f"Navigation to {url} complete.", file=sys.stderr)
    return {"status": "success", "action": "navigate", "url": url, "final_url": page.url}

async def go_back(page: Page) -> Dict[str, Any]:
    """Navigate back in history."""
    await page.go_back()
    return {"status": "success", "action": "go_back", "url": page.url}

async def go_forward(page: Page) -> Dict[str, Any]:
    """Navigate forward in history."""
    await page.go_forward()
    return {"status": "success", "action": "go_forward", "url": page.url}

async def reload(page: Page, hard: bool = False) -> Dict[str, Any]:
    """Reload the current page."""
    await page.reload()
    return {"status": "success", "action": "reload", "url": page.url}

async def wait_for_load(page: Page, timeout: int = 30000) -> Dict[str, Any]:
    """Wait for page to finish loading."""
    await page.wait_for_load_state("load", timeout=timeout)
    return {"status": "success", "action": "wait_for_load"}

# ===== DATA EXTRACTION =====

async def get_text(page: Page, selector: str, url: Optional[str] = None, all: bool = False) -> Dict[str, Any]:
    """Extract text content from element(s)."""
    if url:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
    
    print(f"Getting text from selector: {selector}", file=sys.stderr)
    
    if all:
        elements = await page.locator(selector).all()
        texts = [await el.text_content() for el in elements]
        return {"status": "success", "action": "get_text", "selector": selector, "texts": texts, "count": len(texts)}
    else:
        text_content = await page.text_content(selector, timeout=10000)
        return {"status": "success", "action": "get_text", "selector": selector, "text": text_content}

async def get_attribute(page: Page, selector: str, attribute: str, all: bool = False) -> Dict[str, Any]:
    """Get attribute value from element(s)."""
    print(f"Getting attribute '{attribute}' from selector: {selector}", file=sys.stderr)
    
    if all:
        elements = await page.locator(selector).all()
        values = [await el.get_attribute(attribute) for el in elements]
        return {"status": "success", "action": "get_attribute", "selector": selector, "attribute": attribute, "values": values}
    else:
        value = await page.get_attribute(selector, attribute)
        return {"status": "success", "action": "get_attribute", "selector": selector, "attribute": attribute, "value": value}

async def get_html(page: Page, selector: str, outer: bool = False, all: bool = False) -> Dict[str, Any]:
    """Get inner or outer HTML of element(s)."""
    if all:
        elements = await page.locator(selector).all()
        if outer:
            htmls = [await el.evaluate("el => el.outerHTML") for el in elements]
        else:
            htmls = [await el.inner_html() for el in elements]
        return {"status": "success", "action": "get_html", "selector": selector, "htmls": htmls}
    else:
        if outer:
            html = await page.locator(selector).evaluate("el => el.outerHTML")
        else:
            html = await page.inner_html(selector)
        return {"status": "success", "action": "get_html", "selector": selector, "html": html}

async def get_value(page: Page, selector: str) -> Dict[str, Any]:
    """Get input value from form element."""
    value = await page.input_value(selector)
    return {"status": "success", "action": "get_value", "selector": selector, "value": value}

async def get_style(page: Page, selector: str, property: str) -> Dict[str, Any]:
    """Get computed CSS style property."""
    style_value = await page.locator(selector).evaluate(f"el => getComputedStyle(el).{property}")
    return {"status": "success", "action": "get_style", "selector": selector, "property": property, "value": style_value}

async def get_multiple(page: Page, extractions: List[Dict], url: Optional[str] = None) -> Dict[str, Any]:
    """Extract multiple pieces of data at once."""
    if url:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
    
    results = {}
    for extraction in extractions:
        name = extraction["name"]
        selector = extraction["selector"]
        ext_type = extraction["type"]
        get_all = extraction.get("all", False)
        
        try:
            if ext_type == "text":
                result = await get_text(page, selector, all=get_all)
                results[name] = result.get("texts" if get_all else "text")
            elif ext_type == "attribute":
                attr = extraction["attribute"]
                result = await get_attribute(page, selector, attr, all=get_all)
                results[name] = result.get("values" if get_all else "value")
            elif ext_type == "html":
                outer = extraction.get("outer", False)
                result = await get_html(page, selector, outer, all=get_all)
                results[name] = result.get("htmls" if get_all else "html")
        except Exception as e:
            results[name] = {"error": str(e)}
    
    return {"status": "success", "action": "get_multiple", "data": results}

# ===== INTERACTION & INPUT =====

async def type_text(page: Page, selector: str, text: str, url: Optional[str] = None, 
                   delay: int = 0, clear: bool = True) -> Dict[str, Any]:
    """Type text into an element."""
    if url:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await asyncio.sleep(2)

    print(f"Typing '{text}' into selector: {selector}", file=sys.stderr)
    await page.wait_for_selector(selector, timeout=20000)
    
    if clear:
        await page.fill(selector, "")
    
    if delay > 0:
        await page.type(selector, text, delay=delay)
    else:
        await page.fill(selector, text)
    
    print(f"Successfully typed into {selector}.", file=sys.stderr)
    return {"status": "success", "action": "type_text", "selector": selector, "text": text}

async def click(page: Page, selector: str, force: bool = False, delay: int = 0) -> Dict[str, Any]:
    """Click on an element."""
    print(f"Clicking selector: {selector}", file=sys.stderr)
    await page.wait_for_selector(selector, timeout=10000)
    
    if delay > 0:
        await asyncio.sleep(delay / 1000)
    
    await page.click(selector, force=force)
    print(f"Successfully clicked {selector}.", file=sys.stderr)
    return {"status": "success", "action": "click", "selector": selector}

async def double_click(page: Page, selector: str) -> Dict[str, Any]:
    """Double-click an element."""
    await page.dblclick(selector)
    return {"status": "success", "action": "double_click", "selector": selector}

async def right_click(page: Page, selector: str) -> Dict[str, Any]:
    """Right-click (context menu) on an element."""
    await page.click(selector, button="right")
    return {"status": "success", "action": "right_click", "selector": selector}

async def hover(page: Page, selector: str) -> Dict[str, Any]:
    """Move mouse over an element."""
    await page.hover(selector)
    return {"status": "success", "action": "hover", "selector": selector}

async def focus(page: Page, selector: str) -> Dict[str, Any]:
    """Focus on an element."""
    await page.focus(selector)
    return {"status": "success", "action": "focus", "selector": selector}

async def select_option(page: Page, selector: str, values: List[str]) -> Dict[str, Any]:
    """Select option(s) in a dropdown."""
    await page.select_option(selector, values)
    return {"status": "success", "action": "select_option", "selector": selector, "values": values}

async def check(page: Page, selector: str) -> Dict[str, Any]:
    """Check a checkbox or radio button."""
    await page.check(selector)
    return {"status": "success", "action": "check", "selector": selector}

async def uncheck(page: Page, selector: str) -> Dict[str, Any]:
    """Uncheck a checkbox."""
    await page.uncheck(selector)
    return {"status": "success", "action": "uncheck", "selector": selector}

async def upload_file(page: Page, selector: str, files: List[str]) -> Dict[str, Any]:
    """Upload file(s) to file input."""
    await page.set_input_files(selector, files)
    return {"status": "success", "action": "upload_file", "selector": selector, "files": files}

async def press_key(page: Page, key: str) -> Dict[str, Any]:
    """Press keyboard key(s)."""
    await page.keyboard.press(key)
    return {"status": "success", "action": "press_key", "key": key}

async def keyboard_type(page: Page, text: str, delay: int = 0) -> Dict[str, Any]:
    """Type text with keyboard (supports shortcuts)."""
    await page.keyboard.type(text, delay=delay)
    return {"status": "success", "action": "keyboard_type", "text": text}

# ===== SCROLLING & POSITION =====

async def scroll_to(page: Page, x: int = 0, y: int = 0) -> Dict[str, Any]:
    """Scroll to specific position."""
    await page.evaluate(f"window.scrollTo({x}, {y})")
    return {"status": "success", "action": "scroll_to", "x": x, "y": y}

async def scroll_into_view(page: Page, selector: str) -> Dict[str, Any]:
    """Scroll element into viewport."""
    await page.locator(selector).scroll_into_view_if_needed()
    return {"status": "success", "action": "scroll_into_view", "selector": selector}

async def scroll_to_bottom(page: Page) -> Dict[str, Any]:
    """Scroll to bottom of page."""
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    return {"status": "success", "action": "scroll_to_bottom"}

async def scroll_to_top(page: Page) -> Dict[str, Any]:
    """Scroll to top of page."""
    await page.evaluate("window.scrollTo(0, 0)")
    return {"status": "success", "action": "scroll_to_top"}

# ===== VISUAL & CAPTURE =====

async def screenshot(page: Page, url: Optional[str] = None, path: str = "screenshot.png", 
                    full_page: bool = False, selector: Optional[str] = None,
                    quality: int = 90, type: str = "png") -> Dict[str, Any]:
    """Take screenshot of page or element."""
    if url:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await asyncio.sleep(2)

    print(f"Taking screenshot to {path} (full_page={full_page})", file=sys.stderr)
    
    screenshot_options = {
        "path": path,
        "full_page": full_page,
        "type": type
    }
    
    if type == "jpeg":
        screenshot_options["quality"] = quality
    
    if selector:
        element = page.locator(selector)
        await element.screenshot(**screenshot_options)
    else:
        await page.screenshot(**screenshot_options)
    
    print(f"Screenshot saved to {path}.", file=sys.stderr)
    return {"status": "success", "action": "screenshot", "path": path}

async def pdf(page: Page, url: Optional[str] = None, path: str = "page.pdf",
             format: str = "A4", landscape: bool = False,
             margin: Optional[Dict] = None, print_background: bool = True) -> Dict[str, Any]:
    """Generate PDF from current page."""
    if url:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await asyncio.sleep(2)
    
    pdf_options = {
        "path": path,
        "format": format,
        "landscape": landscape,
        "print_background": print_background
    }
    
    if margin:
        pdf_options["margin"] = margin
    
    await page.pdf(**pdf_options)
    return {"status": "success", "action": "pdf", "path": path}

# ===== EVALUATION & EXECUTION =====

async def evaluate(page: Page, expression: str) -> Dict[str, Any]:
    """Execute JavaScript in page context."""
    print(f"Evaluating JavaScript expression: {expression}", file=sys.stderr)
    result = await page.evaluate(expression)
    print(f"Evaluation result: {result}", file=sys.stderr)
    return {"status": "success", "action": "evaluate", "expression": expression, "result": result}

async def evaluate_function(page: Page, function: str, args: List[Any]) -> Dict[str, Any]:
    """Execute JavaScript function with arguments."""
    result = await page.evaluate(function, args)
    return {"status": "success", "action": "evaluate_function", "result": result}

# ===== WAITING & TIMING =====

async def wait_for_selector(page: Page, selector: str, timeout: int = 10000, 
                           state: str = "visible") -> Dict[str, Any]:
    """Wait for element to appear."""
    await page.wait_for_selector(selector, timeout=timeout, state=state)
    return {"status": "success", "action": "wait_for_selector", "selector": selector, "state": state}

async def wait_for_timeout(page: Page, timeout: int) -> Dict[str, Any]:
    """Wait for specified milliseconds."""
    await page.wait_for_timeout(timeout)
    return {"status": "success", "action": "wait_for_timeout", "timeout": timeout}

async def wait_for_function(page: Page, expression: str, timeout: int = 10000) -> Dict[str, Any]:
    """Wait for JavaScript expression to return truthy."""
    await page.wait_for_function(expression, timeout=timeout)
    return {"status": "success", "action": "wait_for_function", "expression": expression}

async def wait_for_navigation(page: Page, timeout: int = 30000, wait_until: str = "load") -> Dict[str, Any]:
    """Wait for navigation to complete."""
    async with page.expect_navigation(timeout=timeout, wait_until=wait_until):
        pass
    return {"status": "success", "action": "wait_for_navigation", "url": page.url}

# ===== ELEMENT STATE CHECKING =====

async def is_visible(page: Page, selector: str) -> Dict[str, Any]:
    """Check if element is visible."""
    visible = await page.is_visible(selector)
    return {"status": "success", "action": "is_visible", "selector": selector, "visible": visible}

async def is_enabled(page: Page, selector: str) -> Dict[str, Any]:
    """Check if element is enabled."""
    enabled = await page.is_enabled(selector)
    return {"status": "success", "action": "is_enabled", "selector": selector, "enabled": enabled}

async def is_checked(page: Page, selector: str) -> Dict[str, Any]:
    """Check if checkbox/radio is checked."""
    checked = await page.is_checked(selector)
    return {"status": "success", "action": "is_checked", "selector": selector, "checked": checked}

async def element_exists(page: Page, selector: str) -> Dict[str, Any]:
    """Check if element exists in DOM."""
    count = await page.locator(selector).count()
    exists = count > 0
    return {"status": "success", "action": "element_exists", "selector": selector, "exists": exists}

async def element_count(page: Page, selector: str) -> Dict[str, Any]:
    """Count elements matching selector."""
    count = await page.locator(selector).count()
    return {"status": "success", "action": "element_count", "selector": selector, "count": count}

# ===== STORAGE & COOKIES =====

async def get_cookies(page: Page, name: Optional[str] = None) -> Dict[str, Any]:
    """Get all cookies or specific cookie."""
    cookies = await page.context.cookies()
    
    if name:
        cookie = next((c for c in cookies if c["name"] == name), None)
        return {"status": "success", "action": "get_cookies", "cookie": cookie}
    
    return {"status": "success", "action": "get_cookies", "cookies": cookies}

async def set_cookie(page: Page, name: str, value: str, domain: Optional[str] = None,
                    path: str = "/", expires: Optional[int] = None,
                    httpOnly: bool = False, secure: bool = False,
                    sameSite: str = "Lax") -> Dict[str, Any]:
    """Set a cookie."""
    cookie = {
        "name": name,
        "value": value,
        "path": path,
        "httpOnly": httpOnly,
        "secure": secure,
        "sameSite": sameSite
    }
    
    if domain:
        cookie["domain"] = domain
    if expires:
        cookie["expires"] = expires
    
    await page.context.add_cookies([cookie])
    return {"status": "success", "action": "set_cookie", "cookie": cookie}

async def delete_cookies(page: Page, name: Optional[str] = None) -> Dict[str, Any]:
    """Delete cookies."""
    if name:
        await page.context.clear_cookies(name=name)
    else:
        await page.context.clear_cookies()
    return {"status": "success", "action": "delete_cookies"}

async def get_local_storage(page: Page, key: str) -> Dict[str, Any]:
    """Get localStorage item."""
    value = await page.evaluate(f"localStorage.getItem('{key}')")
    return {"status": "success", "action": "get_local_storage", "key": key, "value": value}

async def set_local_storage(page: Page, key: str, value: str) -> Dict[str, Any]:
    """Set localStorage item."""
    await page.evaluate(f"localStorage.setItem('{key}', '{value}')")
    return {"status": "success", "action": "set_local_storage", "key": key, "value": value}

async def clear_local_storage(page: Page) -> Dict[str, Any]:
    """Clear all localStorage."""
    await page.evaluate("localStorage.clear()")
    return {"status": "success", "action": "clear_local_storage"}

# ===== NETWORK & REQUESTS =====

async def set_extra_headers(page: Page, headers: Dict[str, str]) -> Dict[str, Any]:
    """Set extra HTTP headers for all requests."""
    await page.set_extra_http_headers(headers)
    return {"status": "success", "action": "set_extra_headers", "headers": headers}

async def block_resources(page: Page, types: List[str]) -> Dict[str, Any]:
    """Block specific resource types."""
    await page.route("**/*", lambda route: (
        route.abort() if route.request.resource_type in types else route.continue_()
    ))
    return {"status": "success", "action": "block_resources", "types": types}

async def get_page_info(page: Page, include_html: bool = False) -> Dict[str, Any]:
    """Get comprehensive page information."""
    info = {
        "title": await page.title(),
        "url": page.url,
        "viewport": page.viewport_size
    }
    
    if include_html:
        info["html"] = await page.content()
    
    return {"status": "success", "action": "get_page_info", "info": info}

# ===== IFRAME HANDLING =====

async def get_frame_text(page: Page, frame_selector: str, selector: str) -> Dict[str, Any]:
    """Get text from element inside iframe."""
    frame = page.frame_locator(frame_selector)
    text = await frame.locator(selector).text_content()
    return {"status": "success", "action": "get_frame_text", "text": text}

async def click_in_frame(page: Page, frame_selector: str, selector: str) -> Dict[str, Any]:
    """Click element inside iframe."""
    frame = page.frame_locator(frame_selector)
    await frame.locator(selector).click()
    return {"status": "success", "action": "click_in_frame", "selector": selector}

# ===== MULTI-PAGE/TAB =====

async def new_page(browser: Browser, url: Optional[str] = None) -> Dict[str, Any]:
    """Open a new page/tab."""
    global pages_list, current_page_index
    page = await browser.new_page()
    pages_list.append(page)
    current_page_index = len(pages_list) - 1
    
    if url:
        await page.goto(url)
    
    return {"status": "success", "action": "new_page", "index": current_page_index, "url": page.url}

async def close_page(index: int) -> Dict[str, Any]:
    """Close a specific page."""
    global pages_list, current_page_index
    
    if 0 <= index < len(pages_list):
        await pages_list[index].close()
        pages_list.pop(index)
        
        if current_page_index >= len(pages_list):
            current_page_index = max(0, len(pages_list) - 1)
        
        return {"status": "success", "action": "close_page", "index": index}
    
    return {"status": "error", "message": f"Invalid page index: {index}"}

async def switch_page(index: int) -> Dict[str, Any]:
    """Switch to a different page."""
    global current_page_index
    
    if 0 <= index < len(pages_list):
        current_page_index = index
        return {"status": "success", "action": "switch_page", "index": index, "url": pages_list[index].url}
    
    return {"status": "error", "message": f"Invalid page index: {index}"}

async def list_pages() -> Dict[str, Any]:
    """List all open pages."""
    pages_info = [{"index": i, "url": p.url, "title": await p.title()} for i, p in enumerate(pages_list)]
    return {"status": "success", "action": "list_pages", "pages": pages_info, "current": current_page_index}

# ===== BROWSER CONTEXT =====

async def set_viewport(page: Page, width: int, height: int) -> Dict[str, Any]:
    """Set viewport size."""
    await page.set_viewport_size({"width": width, "height": height})
    return {"status": "success", "action": "set_viewport", "width": width, "height": height}

async def set_geolocation(page: Page, latitude: float, longitude: float, accuracy: float = 100) -> Dict[str, Any]:
    """Set geolocation."""
    await page.context.set_geolocation({"latitude": latitude, "longitude": longitude, "accuracy": accuracy})
    return {"status": "success", "action": "set_geolocation", "latitude": latitude, "longitude": longitude}

async def set_user_agent(page: Page, user_agent: str) -> Dict[str, Any]:
    """Set custom user agent."""
    await page.set_extra_http_headers({"User-Agent": user_agent})
    return {"status": "success", "action": "set_user_agent", "user_agent": user_agent}

# ===== ADVANCED AUTOMATION =====

async def drag_and_drop(page: Page, source: str, target: str) -> Dict[str, Any]:
    """Drag element and drop on target."""
    await page.drag_and_drop(source, target)
    return {"status": "success", "action": "drag_and_drop", "source": source, "target": target}

async def fill_form(page: Page, fields: Dict[str, str], url: Optional[str] = None) -> Dict[str, Any]:
    """Fill multiple form fields at once."""
    if url:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
    
    results = {}
    for selector, value in fields.items():
        try:
            await page.fill(selector, value)
            results[selector] = "success"
        except Exception as e:
            results[selector] = f"error: {str(e)}"
    
    return {"status": "success", "action": "fill_form", "results": results}

async def extract_table(page: Page, selector: str, headers: bool = True) -> Dict[str, Any]:
    """Extract data from HTML table."""
    table_data = await page.locator(selector).evaluate("""
        (table) => {
            const rows = Array.from(table.querySelectorAll('tr'));
            return rows.map(row => 
                Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim())
            );
        }
    """)
    
    result = {"status": "success", "action": "extract_table", "data": table_data}
    
    if headers and table_data:
        result["headers"] = table_data[0]
        result["rows"] = table_data[1:]
    
    return result

async def extract_links(page: Page, selector: str = "a", filter: Optional[str] = None) -> Dict[str, Any]:
    """Extract all links from page."""
    links = await page.locator(selector).evaluate_all("""
        (elements) => elements.map(el => ({
            text: el.textContent.trim(),
            href: el.href
        }))
    """)
    
    if filter:
        pattern = re.compile(filter)
        links = [link for link in links if pattern.search(link["href"])]
    
    return {"status": "success", "action": "extract_links", "links": links, "count": len(links)}

async def handle_dialog(page: Page, action: str = "accept", text: Optional[str] = None) -> Dict[str, Any]:
    """Set how to handle JavaScript dialogs (alert/confirm/prompt)."""
    async def dialog_handler(dialog):
        if action == "accept":
            await dialog.accept(text if text else "")
        else:
            await dialog.dismiss()
    
    page.on("dialog", dialog_handler)
    return {"status": "success", "action": "handle_dialog", "dialog_action": action}

# ===== LEGACY FUNCTION (for backward compatibility) =====

async def get_product_info(page: Page, search_url: str, product_link_selector: str, 
                          product_image_selector: str) -> Dict[str, Any]:
    """Get product link and image (legacy function)."""
    print(f"Navigating to {search_url} to get product info.", file=sys.stderr)
    await page.goto(search_url, timeout=30000, wait_until="domcontentloaded")
    await asyncio.sleep(5)

    product_link = None
    product_image = None

    try:
        link_element = page.locator(product_link_selector).first
        if link_element:
            await link_element.wait_for(state="visible", timeout=10000)
            product_link = await link_element.get_attribute("href")

        image_element = page.locator(product_image_selector).first
        if image_element:
            await image_element.wait_for(state="visible", timeout=10000)
            product_image = await image_element.get_attribute("src")

        return {"status": "success", "action": "get_product_info", "link": product_link, "image": product_image}
    except Exception as e:
        return {"status": "error", "message": f"Error getting product info: {e}"}


# ===== MAIN EXECUTION ROUTER =====

async def run_action(action: str, args: dict):
    """Main router for all browser actions."""
    ws_url = get_browserless_ws_url()
    
    if not ws_url:
        return {
            "status": "error", 
            "message": "BROWSERLESS_URL environment variable not set. Please configure it in OpenClaw settings.",
            "required_vars": ["BROWSERLESS_URL", "BROWSERLESS_TOKEN (optional)"]
        }

    global browser_instance, pages_list, current_page_index
    browser = None
    
    try:
        async with async_playwright() as p:
            # Hide token from logs for security
            safe_url = ws_url.split('?')[0] if '?' in ws_url else ws_url
            print(f"Connecting to Browserless at: {safe_url}", file=sys.stderr)
            browser = await p.chromium.connect(ws_url, timeout=30000)
            browser_instance = browser
            
            # Initialize first page if needed
            if not pages_list:
                page = await browser.new_page()
                pages_list.append(page)
                current_page_index = 0
            
            page = pages_list[current_page_index]
            
            # Route to appropriate action function
            action_map = {
                # Navigation
                "navigate": lambda: navigate(page, **args),
                "go_back": lambda: go_back(page),
                "go_forward": lambda: go_forward(page),
                "reload": lambda: reload(page, **args),
                "wait_for_load": lambda: wait_for_load(page, **args),
                
                # Data Extraction
                "get_text": lambda: get_text(page, **args),
                "get_attribute": lambda: get_attribute(page, **args),
                "get_html": lambda: get_html(page, **args),
                "get_value": lambda: get_value(page, **args),
                "get_style": lambda: get_style(page, **args),
                "get_multiple": lambda: get_multiple(page, **args),
                
                # Interaction
                "type_text": lambda: type_text(page, **args),
                "click": lambda: click(page, **args),
                "double_click": lambda: double_click(page, **args),
                "right_click": lambda: right_click(page, **args),
                "hover": lambda: hover(page, **args),
                "focus": lambda: focus(page, **args),
                "select_option": lambda: select_option(page, **args),
                "check": lambda: check(page, **args),
                "uncheck": lambda: uncheck(page, **args),
                "upload_file": lambda: upload_file(page, **args),
                "press_key": lambda: press_key(page, **args),
                "keyboard_type": lambda: keyboard_type(page, **args),
                
                # Scrolling
                "scroll_to": lambda: scroll_to(page, **args),
                "scroll_into_view": lambda: scroll_into_view(page, **args),
                "scroll_to_bottom": lambda: scroll_to_bottom(page),
                "scroll_to_top": lambda: scroll_to_top(page),
                
                # Visual
                "screenshot": lambda: screenshot(page, **args),
                "pdf": lambda: pdf(page, **args),
                
                # Evaluation
                "evaluate": lambda: evaluate(page, **args),
                "evaluate_function": lambda: evaluate_function(page, **args),
                
                # Waiting
                "wait_for_selector": lambda: wait_for_selector(page, **args),
                "wait_for_timeout": lambda: wait_for_timeout(page, **args),
                "wait_for_function": lambda: wait_for_function(page, **args),
                "wait_for_navigation": lambda: wait_for_navigation(page, **args),
                
                # Element State
                "is_visible": lambda: is_visible(page, **args),
                "is_enabled": lambda: is_enabled(page, **args),
                "is_checked": lambda: is_checked(page, **args),
                "element_exists": lambda: element_exists(page, **args),
                "element_count": lambda: element_count(page, **args),
                
                # Storage
                "get_cookies": lambda: get_cookies(page, **args),
                "set_cookie": lambda: set_cookie(page, **args),
                "delete_cookies": lambda: delete_cookies(page, **args),
                "get_local_storage": lambda: get_local_storage(page, **args),
                "set_local_storage": lambda: set_local_storage(page, **args),
                "clear_local_storage": lambda: clear_local_storage(page),
                
                # Network
                "set_extra_headers": lambda: set_extra_headers(page, **args),
                "block_resources": lambda: block_resources(page, **args),
                "get_page_info": lambda: get_page_info(page, **args),
                
                # iFrame
                "get_frame_text": lambda: get_frame_text(page, **args),
                "click_in_frame": lambda: click_in_frame(page, **args),
                
                # Multi-page
                "new_page": lambda: new_page(browser, **args),
                "close_page": lambda: close_page(**args),
                "switch_page": lambda: switch_page(**args),
                "list_pages": lambda: list_pages(),
                
                # Browser Context
                "set_viewport": lambda: set_viewport(page, **args),
                "set_geolocation": lambda: set_geolocation(page, **args),
                "set_user_agent": lambda: set_user_agent(page, **args),
                
                # Advanced
                "drag_and_drop": lambda: drag_and_drop(page, **args),
                "fill_form": lambda: fill_form(page, **args),
                "extract_table": lambda: extract_table(page, **args),
                "extract_links": lambda: extract_links(page, **args),
                "handle_dialog": lambda: handle_dialog(page, **args),
                
                # Legacy
                "get_product_info": lambda: get_product_info(page, **args),
            }
            
            if action not in action_map:
                return {
                    "status": "error", 
                    "message": f"Unknown action: {action}. Available actions: {', '.join(sorted(action_map.keys()))}"
                }
            
            result = await action_map[action]()
            
            await browser.close()
            browser_instance = None
            pages_list = []
            current_page_index = 0
            
            return result
            
    except PlaywrightTimeoutError as e:
        if browser: 
            await browser.close()
        return {"status": "error", "message": f"Timeout occurred: {str(e)}"}
    except Exception as e:
        if browser: 
            await browser.close()
        return {"status": "error", "message": f"An error occurred: {str(e)}", "type": type(e).__name__}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "message": "Usage: python main.py <action> <json_args>",
            "example": 'python main.py navigate \'{"url": "https://example.com"}\''
        }))
        sys.exit(1)
    
    action = sys.argv[1]
    
    # Handle empty args
    if len(sys.argv) < 3:
        args = {}
    else:
        try:
            args = json.loads(sys.argv[2])
        except json.JSONDecodeError as e:
            print(json.dumps({
                "status": "error",
                "message": f"Invalid JSON for arguments: {str(e)}",
                "received": sys.argv[2] if len(sys.argv) > 2 else ""
            }), file=sys.stderr)
            sys.exit(1)
    
    # Execute action and output result
    result = asyncio.run(run_action(action, args))
    print(json.dumps(result, indent=2))

