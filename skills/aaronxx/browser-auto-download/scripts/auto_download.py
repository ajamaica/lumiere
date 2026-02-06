"""
Playwright Browser-Automated Download (v2.0)
Improved download reliability with optimized wait times and better event handling.

Changes in v2.0:
- Increased initial page load wait time (2s → 3s)
- Extended auto-download detection window (5s → 10s)
- Longer wait after button clicks (10s → 15s)
- Increased download event timeout (15s → 20s)
- Better handling of JavaScript-rendered buttons
- Improved direct download link detection
"""

from playwright.sync_api import sync_playwright, Page
import sys
import time
import os
import platform
from typing import Optional


def get_system_preference():
    """Detect system architecture and return download preferences."""
    system = platform.system()
    machine = platform.machine()

    preferences = {
        'system': system,
        'machine': machine,
        'keywords': [],
        'avoid_keywords': []
    }

    if system == 'Windows':
        if machine in ['AMD64', 'x86_64']:
            preferences['keywords'] = ['windows', 'win64', 'windows 64', 'x64', '64-bit', '64 bit', 'pc']
            preferences['avoid_keywords'] = ['32', 'ia32', 'x86']
        else:
            preferences['keywords'] = ['windows', 'win32', 'windows 32', 'x86', '32-bit', '32 bit', 'pc']
            preferences['avoid_keywords'] = ['64', 'x64']
    elif system == 'Darwin':
        if machine in ['arm64', 'aarch64']:
            preferences['keywords'] = ['macos', 'darwin', 'arm64', 'apple silicon', 'm1', 'm2', 'm3']
            preferences['avoid_keywords'] = ['x64', 'intel']
        else:
            preferences['keywords'] = ['macos', 'darwin', 'x64', 'intel']
            preferences['avoid_keywords'] = ['arm', 'apple silicon']
    elif system == 'Linux':
        preferences['keywords'] = ['linux', system.lower()]
        if machine in ['x86_64', 'AMD64']:
            preferences['keywords'].extend(['x64', 'amd64'])

    return preferences


def find_platform_specific_page(page, preferences: dict) -> Optional[str]:
    """Find URL for platform-specific download page."""
    platform_keywords = ['pc', 'desktop', 'windows', 'mac', 'download',
                        '电脑', '桌面', '客户端']

    print("Checking for platform-specific page link...", file=sys.stderr)

    try:
        links = page.locator("a").all()
        for link in links[:50]:
            try:
                href = link.get_attribute('href')
                text = (link.text_content() or '').lower()

                if href and href.startswith('http'):
                    for keyword in platform_keywords:
                        if keyword in text or keyword in href.lower():
                            if 'download' in href.lower() or keyword in text:
                                print(f"Found platform page: {href}", file=sys.stderr)
                                return href
            except:
                continue
    except Exception as e:
        print(f"Error finding platform page: {e}", file=sys.stderr)

    return None


def scroll_page(page):
    """Scroll page to help load lazy-loaded content."""
    try:
        print("Scrolling page to load content...", file=sys.stderr)

        # First, wait a bit for initial content to load
        time.sleep(2)

        # Scroll down to load lazy content
        for i in range(3):
            page.evaluate("window.scrollBy(0, 500)")
            time.sleep(0.5)

        # Scroll back to top (for banner downloads like 360)
        page.evaluate("window.scrollBy(0, -1500)")
        time.sleep(1)

        # Additional wait for banner animations
        print("Waiting for banner content to load...", file=sys.stderr)
        time.sleep(2)

    except Exception as e:
        print(f"Scroll failed: {e}", file=sys.stderr)


def find_all_download_links(page):
    """Find all potential download links and buttons on the page."""
    download_links = []

    try:
        # Scan <a> tags
        all_links = page.locator("a").all()
        print(f"Scanning {len(all_links)} <a> links...", file=sys.stderr)

        for i, link in enumerate(all_links[:100]):
            try:
                href = link.get_attribute('href')
                text = (link.text_content() or '').strip()

                if href:
                    # Direct download links (.exe, .msi, .zip)
                    if any(ext in href.lower() for ext in ['.exe', '.msi', '.zip']):
                        download_links.append(('direct', href, text, 10, 'a'))
                        print(f"  [A{i}] Direct: {text[:50]} -> {href[:80]}", file=sys.stderr)
                    # Download page links
                    elif 'download' in href.lower():
                        download_links.append(('download', href, text, 8, 'a'))
                        print(f"  [A{i}] Download: {text[:50]} -> {href[:80]}", file=sys.stderr)
                    # Button-like links
                    elif any(kw in text for kw in ['下载', '立即下载', '免费下载', 'Download Now', 'Download', '极速', '安全卫士']):
                        download_links.append(('button', href, text, 6, 'a'))
                        print(f"  [A{i}] Button: {text[:50]} -> {href[:80]}", file=sys.stderr)
            except:
                continue

        # Also scan <button> tags
        all_buttons = page.locator("button").all()
        print(f"Scanning {len(all_buttons)} <button> tags...", file=sys.stderr)

        for i, btn in enumerate(all_buttons[:50]):
            try:
                text = (btn.text_content() or '').strip()
                if any(kw in text for kw in ['下载', '立即下载', '免费下载', 'Download', '极速', '安全卫士']):
                    download_links.append(('button', None, text, 6, 'button'))
                    print(f"  [B{i}] Button: {text[:50]}", file=sys.stderr)
            except:
                continue

        # Also scan elements with onclick handlers (for 360-style banner downloads)
        try:
            clickable_divs = page.locator("div[onclick], span[onclick]").all()
            print(f"Scanning {len(clickable_divs)} clickable elements...", file=sys.stderr)

            for i, elem in enumerate(clickable_divs[:30]):
                try:
                    text = (elem.text_content() or '').strip()
                    if any(kw in text for kw in ['下载', '极速', '安全卫士', '立即下载']):
                        onclick = elem.get_attribute('onclick')
                        download_links.append(('onclick', onclick, text, 7, 'div'))
                        print(f"  [D{i}] Clickable: {text[:50]}", file=sys.stderr)
                except:
                    continue
        except:
            pass

        print(f"Total elements found: {len(download_links)}", file=sys.stderr)
    except Exception as e:
        print(f"Error collecting links: {e}", file=sys.stderr)

    return download_links


def save_page_debug_info(page, url, output_dir=None):
    """Save page HTML and screenshot for debugging/analysis."""
    import hashlib
    from datetime import datetime

    if output_dir is None:
        output_dir = os.path.join(os.path.expanduser("~"), "Downloads")

    # Create debug folder
    debug_dir = os.path.join(output_dir, "browser-auto-download-debug")
    os.makedirs(debug_dir, exist_ok=True)

    # Generate filename from URL hash
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    try:
        # Save screenshot
        screenshot_path = os.path.join(debug_dir, f"page_{url_hash}_{timestamp}.png")
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved: {screenshot_path}", file=sys.stderr)

        # Save HTML
        html_path = os.path.join(debug_dir, f"page_{url_hash}_{timestamp}.html")
        html_content = page.content()
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"HTML saved: {html_path}", file=sys.stderr)

        # Save simplified text content
        text_path = os.path.join(debug_dir, f"page_{url_hash}_{timestamp}.txt")
        text_content = page.inner_text("body")
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(text_content)
        print(f"Text content saved: {text_path}", file=sys.stderr)

        return {
            'screenshot': screenshot_path,
            'html': html_path,
            'text': text_path
        }
    except Exception as e:
        print(f"Error saving debug info: {e}", file=sys.stderr)
        return None


def auto_download(
    url: str,
    download_button_selector: str = None,
    output_dir: str = None,
    headless: bool = False,
    wait_timeout: int = 60000,
    auto_select: bool = True,
    auto_navigate: bool = True,
    debug_mode: bool = False
):
    """
    Download file using Playwright browser automation.

    Fixed button click handling: checks all_downloads list before waiting for new events.
    """
    if output_dir is None:
        output_dir = os.path.join(os.path.expanduser("~"), "Downloads")

    print(f"Starting browser ({'headless' if headless else 'visible'})...", file=sys.stderr)
    sys.stderr.flush()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        # Global downloads list
        all_downloads = []

        def handle_download(download):
            """Capture all download events"""
            print(f"\nDownload detected: {download.suggested_filename}", file=sys.stderr)
            all_downloads.append(download)

        page.on("download", handle_download)

        try:
            # Step 1: Open initial page
            print(f"Opening: {url}", file=sys.stderr)

            # Check if URL is a direct download link
            is_direct_download = any(url.lower().endswith(ext) for ext in ['.exe', '.dmg', '.zip', '.msi'])

            if is_direct_download:
                # For direct download links, don't wait for networkidle
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    time.sleep(10)  # v2.0: Increased from 5 to 10 for better download detection
                except Exception as e:
                    # Download may have started, which is OK
                    if "Download is starting" in str(e) or "download" in str(e).lower():
                        print(f"Direct download detected: {e}", file=sys.stderr)
                    else:
                        raise
            else:
                page.goto(url, wait_until="networkidle")
                time.sleep(3)  # v2.0: Increased from 2 to 3 for better page stability

            # Step 1.5: Scroll page to load lazy content
            scroll_page(page)

            # Step 2: Check for auto-downloads
            print("Checking for auto-downloads...", file=sys.stderr)

            # Give more time for downloads to trigger
            if is_direct_download:
                time.sleep(10)  # Direct links may need more time
            else:
                time.sleep(10)  # v2.0: Increased from 5 to 10 for better auto-download detection

            download = None

            if all_downloads:
                print(f"Auto-download detected! ({len(all_downloads)} file(s))", file=sys.stderr)
                download = all_downloads[-1]  # Get the latest download
            else:
                # If no auto-download yet, try waiting for download event
                print("No immediate download, waiting for event...", file=sys.stderr)
                try:
                    download = page.wait_for_event("download", timeout=20000)  # v2.0: Increased from 10s to 20s
                    print("Download event captured!", file=sys.stderr)
                except:
                    # No download event, continue to other strategies
                    pass

            if not download:
                # Step 3: Try multi-step navigation (optional, skip for some sites)
                if auto_navigate:
                    # Special case: skip auto-navigation for 360 (download is on homepage banner)
                    if '360.cn' not in url.lower():
                        platform_page_url = find_platform_specific_page(
                            page,
                            get_system_preference() if auto_select else {}
                        )

                        if platform_page_url:
                            print(f"Navigating to platform page: {platform_page_url}", file=sys.stderr)
                            page.goto(platform_page_url, wait_until="networkidle")
                            time.sleep(3)

                            if all_downloads:
                                print("Download triggered on platform page!", file=sys.stderr)
                                download = all_downloads[0]

                # Step 4: Try clicking download buttons
                if not download:
                    print("Looking for download button to click...", file=sys.stderr)

                    # Special handling for relative download links (like 7-Zip)
                    all_links = page.locator("a").all()
                    relative_download_found = False

                    for link in all_links[:50]:
                        try:
                            href = link.get_attribute('href')
                            text = (link.text_content() or '').strip()

                            # Look for .exe/.msi relative links
                            if href and not href.startswith('http'):
                                if any(href.lower().endswith(ext) for ext in ['.exe', '.msi', '.dmg']):
                                    # Build absolute URL
                                    from urllib.parse import urljoin
                                    abs_url = urljoin(url, href)

                                    # Check if it matches platform (prefer x64 for Windows)
                                    if 'x64' in href.lower() or 'amd64' in href.lower():
                                        print(f"Found relative x64 link, direct download: {abs_url}", file=sys.stderr)
                                        page.goto(abs_url, wait_until="domcontentloaded")
                                        time.sleep(5)

                                        if all_downloads:
                                            download = all_downloads[-1]
                                            print("Direct download from relative link!", file=sys.stderr)
                                            relative_download_found = True
                                            break
                        except:
                            continue

                    if relative_download_found:
                        # Don't fall through to button clicking if we found a relative link
                        pass

                    # NEW: Try all download links (for complex pages like 360)
                    if not download:
                        print("Searching for all download links...", file=sys.stderr)
                        download_links = find_all_download_links(page)

                        if download_links:
                            print(f"Found {len(download_links)} potential download links", file=sys.stderr)

                            for link_type, href, text, wait_time, elem_type in download_links[:10]:  # Try top 10
                                try:
                                    print(f"Trying {link_type} ({elem_type}): {text[:50]}...", file=sys.stderr)

                                    if link_type == 'direct' and href:
                                        # Direct download link
                                        page.goto(href, wait_until="domcontentloaded")
                                        time.sleep(wait_time)
                                    elif link_type == 'onclick' and href:
                                        # Element with onclick handler
                                        try:
                                            # Try to find and click the element
                                            elem = page.locator(f"div[onclick*='{href[:30]}'], span[onclick*='{href[:30]}']").first
                                            if elem.count() > 0:
                                                elem.click()
                                                time.sleep(wait_time)
                                            else:
                                                # Try by text
                                                text_elem = page.locator(f"div:has-text('{text[:20]}'), span:has-text('{text[:20]}')").first
                                                if text_elem.count() > 0:
                                                    text_elem.click()
                                                    time.sleep(wait_time)
                                        except:
                                            print(f"  Failed to trigger onclick", file=sys.stderr)
                                    elif elem_type == 'button' and not href:
                                        # Pure button without href
                                        try:
                                            page.locator(f"button:has-text('{text}')").first.click()
                                            time.sleep(wait_time)
                                        except:
                                            print(f"  Failed to click button", file=sys.stderr)
                                    else:
                                        # Try clicking the link/button
                                        try:
                                            if elem_type == 'a' and href:
                                                link_elem = page.locator(f"a[href='{href}']")
                                                if link_elem.count() > 0:
                                                    # Try scrolling element into view first
                                                    try:
                                                        link_elem.first.scroll_into_view_if_needed()
                                                        time.sleep(0.5)
                                                    except:
                                                        pass

                                                    # Try clicking with force option
                                                    try:
                                                        link_elem.first.click(force=True)
                                                    except:
                                                        # If force click fails, try normal click
                                                        link_elem.first.click()

                                                    time.sleep(wait_time)
                                                else:
                                                    # Fallback to direct navigation
                                                    page.goto(href, wait_until="domcontentloaded")
                                                    time.sleep(wait_time)
                                            elif elem_type == 'button' and not href:
                                                # Pure button
                                                try:
                                                    btn_elem = page.locator(f"button:has-text('{text}')")
                                                    if btn_elem.count() > 0:
                                                        btn_elem.first.scroll_into_view_if_needed()
                                                        time.sleep(0.5)
                                                        btn_elem.first.click(force=True)
                                                        time.sleep(wait_time)
                                                except:
                                                    pass
                                            elif href:
                                                # Fallback to direct navigation
                                                page.goto(href, wait_until="domcontentloaded")
                                                time.sleep(wait_time)
                                        except Exception as click_error:
                                            print(f"  Click error: {click_error}", file=sys.stderr)
                                            # Click failed, try direct navigation as last resort
                                            if href:
                                                print(f"  Trying direct navigation to: {href[:80]}...", file=sys.stderr)
                                                page.goto(href, wait_until="domcontentloaded")
                                                time.sleep(wait_time)

                                    # Check if download triggered
                                    if all_downloads:
                                        download = all_downloads[-1]
                                        print(f"Download triggered via {link_type} link!", file=sys.stderr)
                                        break
                                except Exception as e:
                                    print(f"Failed with {link_type}: {e}", file=sys.stderr)
                                    continue

                    selectors = []

                    if download_button_selector:
                        selectors.append(download_button_selector)

                    selectors.extend([
                        # English patterns - more specific first
                        "button:has-text('Download for free')",
                        "a:has-text('Download Now')",
                        "a:has-text('download now')",
                        "button:has-text('Download')",
                        "a:has-text('Download')",
                        "text=Download",
                        # Chinese patterns - more specific
                        "text=稳定版 >> .. >> a:has-text('Windows 64')",
                        "text=稳定版 >> .. >> a:has-text('下载')",
                        "a:has-text('立即下载')",
                        "a:has-text('免费下载')",
                        "button:has-text('下载')",
                        "a:has-text('下载')",
                        "text=下载",
                        # Generic patterns
                        "a:has-text('.exe')",
                        "a:has-text('.msi')",
                        "a:has-text('.dmg')",
                        # Additional patterns for Golang/Eclipse
                        "a[href*='windows.amd64']",
                        "a[href*='amd64.msi']",
                        "a[href*='.msi']",
                    ])

                    for selector in selectors:
                        try:
                            if page.locator(selector).count() > 0:
                                print(f"Clicking: {selector}", file=sys.stderr)
                                page.locator(selector).first.click()

                                # Wait for download to trigger
                                print("Waiting for download to start...", file=sys.stderr)
                                time.sleep(15)  # v2.0: Increased from 10 to 15 for better download trigger detection

                                # Check if download was captured in all_downloads
                                if all_downloads:
                                    download = all_downloads[-1]  # Get latest download
                                    print("Download triggered by click!", file=sys.stderr)
                                    break
                                else:
                                    # Try waiting for new download event
                                    print("No immediate download, waiting for event...", file=sys.stderr)
                                    try:
                                        download = page.wait_for_event("download", timeout=20000)  # v2.0: Increased from 15s to 20s
                                        print("Download event captured!", file=sys.stderr)
                                        break
                                    except:
                                        print(f"Selector {selector} didn't trigger download", file=sys.stderr)
                                        continue
                        except Exception as e:
                            print(f"Error with selector {selector}: {e}", file=sys.stderr)
                            continue

                    if not download:
                        # Save debug information before failing (if debug mode is enabled)
                        if debug_mode:
                            print("Download failed, saving page debug information...", file=sys.stderr)
                            debug_info = save_page_debug_info(page, url, output_dir)
                            if debug_info:
                                print(f"Debug info saved to: {os.path.dirname(debug_info['screenshot'])}", file=sys.stderr)
                                print(f"  - Screenshot: {debug_info['screenshot']}", file=sys.stderr)
                                print(f"  - HTML: {debug_info['html']}", file=sys.stderr)
                                print(f"  - Text: {debug_info['text']}", file=sys.stderr)
                        else:
                            print("Download failed. Use --debug to save page screenshot and HTML for analysis.", file=sys.stderr)

                        raise Exception("Could not trigger download with any method")

            # Step 5: Save the download
            filename = download.suggested_filename
            print(f"Saving: {filename}", file=sys.stderr)

            save_path = os.path.join(output_dir, filename)
            download.save_as(save_path)
            download.delete()

            # Wait for file to complete writing
            max_wait = 180
            start_wait = time.time()
            while not os.path.exists(save_path) or os.path.getsize(save_path) == 0:
                if time.time() - start_wait > max_wait:
                    raise Exception(f"Download timeout after {max_wait}s")
                time.sleep(1)

            file_size = os.path.getsize(save_path)
            file_size_mb = file_size / (1024 * 1024)

            print(f"\nSUCCESS!", file=sys.stderr)
            print(f"File: {save_path}", file=sys.stderr)
            print(f"Size: {file_size_mb:.1f} MB", file=sys.stderr)

            time.sleep(2)
            browser.close()

            return {
                "path": save_path,
                "filename": filename,
                "size_bytes": file_size,
                "size_mb": file_size_mb,
                "platform": f"{platform.system()} {platform.machine()}"
            }

        except Exception as e:
            print(f"\nFAILED: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            browser.close()
            return None


def quick_download_wechat_devtools():
    """Quick download for WeChat DevTools"""
    return auto_download(
        url="https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html",
        headless=False,
        auto_select=True,
        auto_navigate=False
    )


def quick_download_meitu():
    """Quick download for Meitu Xiuxiu"""
    return auto_download(
        url="https://xiuxiu.meitu.com/",
        headless=False,
        auto_select=True,
        auto_navigate=True
    )


def quick_download_golang():
    """Quick download for Golang (Windows amd64)"""
    return auto_download(
        url="https://go.dev/dl/",
        download_button_selector="a[href*='windows-amd64.msi']",
        headless=False,
        auto_select=False,
        auto_navigate=False
    )


def quick_download_360():
    """Quick download for 360 Security (standard version)"""
    return auto_download(
        url="https://360.cn/",
        headless=False,
        auto_select=False,
        auto_navigate=False  # Important: don't navigate away from homepage
    )


def quick_download_eclipse():
    """Quick download for Eclipse IDE (Windows x64 with JRE)"""
    # Use direct CDN link instead of redirect page
    return auto_download(
        url="https://ftp.osuosl.org/pub/eclipse/oomph/epp/2025-12/R/eclipse-inst-jre-win64.exe",
        headless=False,
        auto_select=False,
        auto_navigate=False
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Browser-automated download with auto-detection and multi-step navigation"
    )
    parser.add_argument("--url", help="Target webpage URL")
    parser.add_argument("--selector", help="Download button selector")
    parser.add_argument("--output", help="Output directory")
    parser.add_argument("--headless", action="store_true", help="Headless mode")
    parser.add_argument("--no-auto-select", action="store_true", help="Disable platform auto-detection")
    parser.add_argument("--no-auto-navigate", action="store_true", help="Disable multi-step navigation")
    parser.add_argument("--wechat", action="store_true", help="Download WeChat DevTools")
    parser.add_argument("--meitu", action="store_true", help="Download Meitu Xiuxiu")
    parser.add_argument("--golang", action="store_true", help="Download Golang")
    parser.add_argument("--360se", "--360", dest="se360", action="store_true", help="Download 360 Security")
    parser.add_argument("--eclipse", action="store_true", help="Download Eclipse IDE")
    parser.add_argument("--debug", action="store_true", help="Save page screenshot and HTML for debugging")

    args = parser.parse_args()

    if args.wechat:
        result = quick_download_wechat_devtools()
    elif args.meitu:
        result = quick_download_meitu()
    elif args.golang:
        result = quick_download_golang()
    elif args.se360:  # --360 or --360se
        result = quick_download_360()
    elif args.eclipse:
        result = quick_download_eclipse()
    elif args.url:
        result = auto_download(
            url=args.url,
            download_button_selector=args.selector,
            output_dir=args.output,
            headless=args.headless,
            auto_select=not args.no_auto_select,
            auto_navigate=not args.no_auto_navigate,
            debug_mode=args.debug
        )
    else:
        parser.print_help()
        sys.exit(1)

    if result:
        import json
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("FAILED", file=sys.stderr)
        sys.exit(1)
