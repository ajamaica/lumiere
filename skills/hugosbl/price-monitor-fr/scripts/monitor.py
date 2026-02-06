#!/usr/bin/env python3
"""
Price Monitor — Surveille les prix de produits e-commerce et alerte sur les baisses.
Stdlib uniquement (urllib, json, re, html.parser).
"""

import argparse
import json
import os
import re
import sys
import time
import uuid
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from urllib.parse import urlparse

# ── Config ──────────────────────────────────────────────────────────────────

DATA_DIR = os.path.expanduser("~/.price-monitor")
PRODUCTS_FILE = os.path.join(DATA_DIR, "products.json")
HISTORY_DIR = os.path.join(DATA_DIR, "history")
ALERTS_FILE = os.path.join(DATA_DIR, "alerts.json")

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
TIMEOUT = 10
DROP_THRESHOLD = 0.05  # 5%

# ── Storage helpers ─────────────────────────────────────────────────────────

def _ensure_dirs():
    os.makedirs(HISTORY_DIR, exist_ok=True)

def _load_json(path, default=None):
    if default is None:
        default = []
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_json(path, data):
    _ensure_dirs()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _load_products():
    return _load_json(PRODUCTS_FILE, [])

def _save_products(products):
    _save_json(PRODUCTS_FILE, products)

def _history_path(product_id):
    return os.path.join(HISTORY_DIR, f"{product_id}.json")

def _load_history(product_id):
    return _load_json(_history_path(product_id), [])

def _save_history(product_id, history):
    _save_json(_history_path(product_id), history)

def _load_alerts():
    return _load_json(ALERTS_FILE, [])

def _save_alerts(alerts):
    _save_json(ALERTS_FILE, alerts)

# ── Site detection ──────────────────────────────────────────────────────────

def _detect_site(url):
    host = urlparse(url).hostname or ""
    host = host.lower()
    if "amazon" in host:
        return "amazon"
    if "fnac" in host:
        return "fnac"
    if "cdiscount" in host:
        return "cdiscount"
    if "boulanger" in host:
        return "boulanger"
    return "generic"

def _site_label(url):
    host = urlparse(url).hostname or url
    host = host.lower().removeprefix("www.")
    return host

# ── Price extractors ────────────────────────────────────────────────────────

def _parse_price(text):
    """Parse a price string like '449,99 €' or '449.99' into a float."""
    if not text:
        return None
    text = text.strip().replace("\u202f", "").replace("\xa0", "").replace(" ", "")
    text = text.replace("€", "").replace("EUR", "").strip()
    # Handle French format: 1.234,56 or 1 234,56
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    text = re.sub(r"[^\d.]", "", text)
    try:
        return float(text)
    except (ValueError, TypeError):
        return None

def _extract_amazon(html):
    """Amazon.fr price extractor."""
    # Try a-offscreen span
    m = re.search(r'<span class="a-offscreen">\s*([^<]+)\s*</span>', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "a-offscreen"
    # Try data-a-color="price"
    m = re.search(r'data-a-color="price"[^>]*>.*?<span[^>]*>([^<]+)</span>', html, re.DOTALL)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "data-a-color"
    # Try priceblock
    m = re.search(r'id="priceblock_ourprice"[^>]*>([^<]+)<', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "priceblock"
    return None, None

def _extract_fnac(html):
    """Fnac.com price extractor."""
    # Meta tag
    m = re.search(r'<meta\s+property="product:price:amount"\s+content="([^"]+)"', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "meta-product-price"
    # f-priceBox-price
    m = re.search(r'class="f-priceBox-price[^"]*"[^>]*>([^<]+)<', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "f-priceBox-price"
    return None, None

def _extract_cdiscount(html):
    """Cdiscount price extractor."""
    m = re.search(r'class="c-product__price[^"]*"[^>]*>([^<]+)<', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "c-product__price"
    # Alternate pattern
    m = re.search(r'itemprop="price"\s+content="([^"]+)"', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "itemprop-price"
    return None, None

def _extract_boulanger(html):
    """Boulanger price extractor."""
    m = re.search(r'class="price[^"]*"[^>]*>([^<]+)<', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "class-price"
    m = re.search(r'itemprop="price"\s+content="([^"]+)"', html)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "itemprop-price"
    return None, None

def _extract_generic(html):
    """
    Generic intelligent extractor. Priority:
    1. og:price:amount meta tag
    2. JSON-LD schema.org price
    3. itemprop="price"
    4. Regex fallback on € patterns
    """
    # 1. og:price:amount
    m = re.search(r'<meta\s+[^>]*property="og:price:amount"\s*[^>]*content="([^"]+)"', html, re.I)
    if not m:
        m = re.search(r'<meta\s+[^>]*content="([^"]+)"[^>]*property="og:price:amount"', html, re.I)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "og:price:amount"

    # 2. JSON-LD price
    for block in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL | re.I):
        try:
            data = json.loads(block.group(1))
            price = _find_price_in_jsonld(data)
            if price is not None:
                return price, "json-ld"
        except (json.JSONDecodeError, ValueError):
            pass

    # 3. itemprop="price"
    m = re.search(r'itemprop="price"\s+content="([^"]+)"', html, re.I)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "itemprop-price"
    m = re.search(r'itemprop="price"[^>]*>([^<]+)<', html, re.I)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "itemprop-price-text"

    # 4. product:price:amount meta (alternate)
    m = re.search(r'<meta\s+[^>]*property="product:price:amount"\s*[^>]*content="([^"]+)"', html, re.I)
    if m:
        price = _parse_price(m.group(1))
        if price:
            return price, "product:price:amount"

    # 5. Fallback: regex for € patterns
    prices = re.findall(r'(\d[\d\s.,]*)\s*€', html)
    valid = []
    for p in prices:
        val = _parse_price(p)
        if val and 0.01 < val < 100000:
            valid.append(val)
    if valid:
        # Most common price (likely the product price)
        from collections import Counter
        counts = Counter(valid)
        best = counts.most_common(1)[0][0]
        return best, "regex-euro"

    return None, None

def _find_price_in_jsonld(data):
    """Recursively find a price in JSON-LD data."""
    if isinstance(data, list):
        for item in data:
            result = _find_price_in_jsonld(item)
            if result is not None:
                return result
        return None
    if isinstance(data, dict):
        # Direct price field
        if "price" in data:
            val = _parse_price(str(data["price"]))
            if val:
                return val
        # offers
        if "offers" in data:
            result = _find_price_in_jsonld(data["offers"])
            if result is not None:
                return result
        # lowPrice
        if "lowPrice" in data:
            val = _parse_price(str(data["lowPrice"]))
            if val:
                return val
        # Recurse into @graph
        if "@graph" in data:
            result = _find_price_in_jsonld(data["@graph"])
            if result is not None:
                return result
    return None

EXTRACTORS = {
    "amazon": _extract_amazon,
    "fnac": _extract_fnac,
    "cdiscount": _extract_cdiscount,
    "boulanger": _extract_boulanger,
    "generic": _extract_generic,
}

# ── Fetch ───────────────────────────────────────────────────────────────────

def _fetch_html(url):
    """Download page HTML with realistic headers."""
    req = Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
        "Accept-Encoding": "identity",
        "Connection": "keep-alive",
    })
    try:
        with urlopen(req, timeout=TIMEOUT) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            return resp.read().decode(charset, errors="replace")
    except (URLError, HTTPError) as e:
        raise RuntimeError(f"Erreur réseau : {e}")

def _extract_price(url, html=None):
    """Extract price from a URL. Returns (price, source) or (None, error_msg)."""
    if html is None:
        html = _fetch_html(url)
    site = _detect_site(url)
    extractor = EXTRACTORS.get(site, _extract_generic)
    price, source = extractor(html)
    if price is None and site != "generic":
        # Fallback to generic
        price, source = _extract_generic(html)
    return price, source

# ── Commands ────────────────────────────────────────────────────────────────

def cmd_add(args):
    """Add a product to monitor."""
    products = _load_products()
    product_id = uuid.uuid4().hex[:8]
    site = _detect_site(args.url)
    name = args.name or _site_label(args.url)

    product = {
        "id": product_id,
        "url": args.url,
        "name": name,
        "site": site,
        "target_price": args.target_price,
        "added": datetime.now().isoformat(),
    }
    products.append(product)
    _save_products(products)

    if args.json:
        print(json.dumps(product, ensure_ascii=False, indent=2))
    else:
        print(f"✅ Produit ajouté : {name}")
        print(f"   ID: {product_id}")
        print(f"   Site: {_site_label(args.url)}")
        if args.target_price:
            print(f"   Prix cible: {args.target_price}€")

def cmd_list(args):
    """List monitored products."""
    products = _load_products()
    if not products:
        if args.json:
            print("[]")
        else:
            print("Aucun produit surveillé.")
        return

    if args.json:
        print(json.dumps(products, ensure_ascii=False, indent=2))
        return

    print(f"{'ID':<10} {'Nom':<30} {'Site':<20} {'Prix cible':<12}")
    print("─" * 72)
    for p in products:
        target = f"{p.get('target_price')}€" if p.get("target_price") else "—"
        name = p["name"][:28]
        site = _site_label(p["url"])[:18]
        print(f"{p['id']:<10} {name:<30} {site:<20} {target:<12}")

def cmd_check(args):
    """Check current prices."""
    products = _load_products()
    if not products:
        print("Aucun produit surveillé.")
        return

    if args.all:
        targets = products
    elif args.id:
        targets = [p for p in products if p["id"] == args.id]
        if not targets:
            print(f"❌ Produit {args.id} introuvable.")
            return
    else:
        targets = products  # default: all

    results = []
    new_alerts = []

    for p in targets:
        history = _load_history(p["id"])
        last_price = history[-1]["price"] if history else None

        try:
            price, source = _extract_price(p["url"])
        except Exception as e:
            results.append({
                "id": p["id"],
                "name": p["name"],
                "site": _site_label(p["url"]),
                "last_price": last_price,
                "current_price": None,
                "error": str(e),
            })
            continue

        if price is None:
            results.append({
                "id": p["id"],
                "name": p["name"],
                "site": _site_label(p["url"]),
                "last_price": last_price,
                "current_price": None,
                "error": "Prix non trouvé",
            })
            continue

        # Record in history
        entry = {
            "date": datetime.now().isoformat(),
            "price": price,
            "source": source,
        }
        history.append(entry)
        _save_history(p["id"], history)

        # Compute delta
        delta = None
        delta_pct = None
        if last_price and last_price > 0:
            delta = price - last_price
            delta_pct = (delta / last_price) * 100

        result = {
            "id": p["id"],
            "name": p["name"],
            "site": _site_label(p["url"]),
            "last_price": last_price,
            "current_price": price,
            "delta": delta,
            "delta_pct": delta_pct,
            "source": source,
        }
        results.append(result)

        # Check alerts
        alert = None
        if p.get("target_price") and price <= p["target_price"]:
            alert = {
                "type": "target_reached",
                "product_id": p["id"],
                "name": p["name"],
                "site": _site_label(p["url"]),
                "price": price,
                "target": p["target_price"],
                "date": datetime.now().isoformat(),
                "message": f"🎯 {p['name']} : {price}€ ≤ cible {p['target_price']}€ !",
            }
        elif delta_pct is not None and delta_pct < -DROP_THRESHOLD * 100:
            alert = {
                "type": "price_drop",
                "product_id": p["id"],
                "name": p["name"],
                "site": _site_label(p["url"]),
                "old_price": last_price,
                "new_price": price,
                "delta_pct": round(delta_pct, 1),
                "date": datetime.now().isoformat(),
                "message": f"🔥 {p['name']} : {last_price}€ → {price}€ ({delta_pct:+.1f}%)",
            }

        if alert:
            new_alerts.append(alert)

    # Save alerts
    if new_alerts:
        all_alerts = _load_alerts()
        all_alerts.extend(new_alerts)
        _save_alerts(all_alerts)

    # Output
    if args.json:
        output = {"results": results, "alerts": new_alerts}
        print(json.dumps(output, ensure_ascii=False, indent=2))
        return

    # Table display
    print(f"\n{'Nom':<25} {'Site':<18} {'Dernier':<12} {'Actuel':<12} {'Delta':<15}")
    print("─" * 82)
    for r in results:
        name = r["name"][:23]
        site = r["site"][:16]
        last = f"{r['last_price']}€" if r.get("last_price") else "—"
        if r.get("error"):
            current = "❌ erreur"
            delta_str = r["error"][:15]
        elif r.get("current_price") is None:
            current = "?"
            delta_str = "non trouvé"
        else:
            current = f"{r['current_price']}€"
            if r.get("delta_pct") is not None:
                delta_str = f"{r['delta']:+.2f}€ ({r['delta_pct']:+.1f}%)"
            else:
                delta_str = "nouveau"
        print(f"{name:<25} {site:<18} {last:<12} {current:<12} {delta_str:<15}")

    # Print alerts
    if new_alerts:
        print(f"\n🚨 Alertes :")
        for a in new_alerts:
            print(f"  {a['message']}")

def cmd_remove(args):
    """Remove a product."""
    products = _load_products()
    found = [p for p in products if p["id"] == args.id]
    if not found:
        print(f"❌ Produit {args.id} introuvable.")
        return

    products = [p for p in products if p["id"] != args.id]
    _save_products(products)

    # Remove history
    hist_path = _history_path(args.id)
    if os.path.exists(hist_path):
        os.remove(hist_path)

    if args.json:
        print(json.dumps({"removed": args.id}, ensure_ascii=False))
    else:
        print(f"🗑️  Produit {found[0]['name']} supprimé.")

def cmd_history(args):
    """Show price history for a product."""
    products = _load_products()
    product = next((p for p in products if p["id"] == args.id), None)
    if not product:
        print(f"❌ Produit {args.id} introuvable.")
        return

    history = _load_history(args.id)
    if not history:
        print(f"Aucun historique pour {product['name']}.")
        return

    if args.json:
        print(json.dumps({"product": product, "history": history}, ensure_ascii=False, indent=2))
        return

    print(f"📈 Historique : {product['name']}")
    print(f"{'Date':<22} {'Prix':<12} {'Source':<20}")
    print("─" * 54)
    for h in history:
        date = h["date"][:19].replace("T", " ")
        price = f"{h['price']}€"
        source = h.get("source", "?")
        print(f"{date:<22} {price:<12} {source:<20}")

def cmd_alerts(args):
    """Show price drop alerts."""
    alerts = _load_alerts()
    if not alerts:
        if args.json:
            print("[]")
        else:
            print("Aucune alerte.")
        return

    if args.json:
        print(json.dumps(alerts, ensure_ascii=False, indent=2))
        return

    print("🚨 Alertes de prix :")
    print("─" * 60)
    for a in alerts:
        date = a["date"][:19].replace("T", " ")
        print(f"  [{date}] {a['message']}")

# ── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Price Monitor — Surveille les prix e-commerce"
    )
    parser.add_argument("--json", action="store_true", help="Output JSON")
    sub = parser.add_subparsers(dest="command")

    # add
    p_add = sub.add_parser("add", help="Ajouter un produit")
    p_add.add_argument("url", help="URL du produit")
    p_add.add_argument("--name", help="Nom du produit")
    p_add.add_argument("--target-price", type=float, help="Prix cible (alerte si ≤)")

    # list
    sub.add_parser("list", help="Lister les produits")

    # check
    p_check = sub.add_parser("check", help="Vérifier les prix")
    p_check.add_argument("--all", action="store_true", help="Tous les produits")
    p_check.add_argument("id", nargs="?", help="ID du produit")

    # remove
    p_remove = sub.add_parser("remove", help="Supprimer un produit")
    p_remove.add_argument("id", help="ID du produit")

    # history
    p_hist = sub.add_parser("history", help="Historique des prix")
    p_hist.add_argument("id", help="ID du produit")

    # alerts
    sub.add_parser("alerts", help="Voir les alertes")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    commands = {
        "add": cmd_add,
        "list": cmd_list,
        "check": cmd_check,
        "remove": cmd_remove,
        "history": cmd_history,
        "alerts": cmd_alerts,
    }
    commands[args.command](args)

if __name__ == "__main__":
    main()
