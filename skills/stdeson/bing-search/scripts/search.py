#!/usr/bin/env python3
"""Bing Search Skill"""
import sys, os, re, json, urllib.request, urllib.parse, ssl

def search_bing(query, proxy=None, num_results=10):
    url = f"https://www.bing.com/search?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    proxy_handler = urllib.request.ProxyHandler({"http": proxy, "https": proxy}) if proxy else None
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    opener = urllib.request.build_opener(proxy_handler or urllib.request.ProxyHandler(), urllib.request.HTTPSHandler(context=ctx))
    try:
        with opener.open(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        links = re.findall(r'href="(https://[^"]*)"', html)
        results = []
        seen = set()
        for link in links:
            if any(x in link for x in ['bing.com', 'microsoft.com', 'r.bing.com']): continue
            if link not in seen and link.startswith('http'):
                seen.add(link); results.append(link)
                if len(results) >= num_results: break
        return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: python search.py <query>"); sys.exit(1)
    query = sys.argv[1]
    proxy = os.environ.get("ALL_PROXY") or os.environ.get("HTTP_PROXY")
    print(json.dumps(search_bing(query, proxy), indent=2, ensure_ascii=False))
