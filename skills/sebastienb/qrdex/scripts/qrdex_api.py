#!/usr/bin/env python3
"""QRdex.io API client CLI. Requires: requests (pip install requests)."""
import os
import sys
import json
import argparse

try:
    import requests
except ImportError:
    print("Error: pip install requests", file=sys.stderr)
    sys.exit(1)

BASE = "https://qrdex.io/api/v1"


def headers():
    key = os.environ.get("QRDEX_API_KEY")
    if not key:
        print("Error: Set QRDEX_API_KEY env var", file=sys.stderr)
        sys.exit(1)
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def api(method, path, **kwargs):
    r = getattr(requests, method)(f"{BASE}{path}", headers=headers(), **kwargs)
    if r.status_code == 204:
        return {}
    if r.headers.get("content-type", "").startswith("image/"):
        return r.content
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text}
    if r.status_code >= 400:
        print(f"Error {r.status_code}: {json.dumps(data, indent=2)}", file=sys.stderr)
        sys.exit(1)
    return data


def cmd_list(args):
    params = {}
    if args.page:
        params["page"] = args.page
    if args.per_page:
        params["per_page"] = args.per_page
    if args.qr_type:
        params["qr_type"] = args.qr_type
    data = api("get", "/qr_codes", params=params)
    for qr in data.get("data", []):
        print(f"  [{qr['id']}] {qr['title']}  ({qr['qr_type']})  {qr['full_short_url']}  scans={qr['scans_count']}")
    meta = data.get("meta", {})
    print(f"\nPage {meta.get('page')}/{meta.get('total_pages')} ({meta.get('total')} total)")


def cmd_create(args):
    qr = {"title": args.title, "qr_type": args.type}
    if args.url:
        qr["url"] = args.url
    if args.phone:
        qr["telephone_number"] = args.phone
    if args.email:
        qr["email_address"] = args.email
    if args.subject:
        qr["email_subject"] = args.subject
    if args.message:
        qr["message"] = args.message
    if args.ssid:
        qr["wifi_ssid"] = args.ssid
    if args.wifi_encryption:
        qr["wifi_encryption"] = args.wifi_encryption
    if args.wifi_password:
        qr["wifi_password"] = args.wifi_password
    if args.wifi_hidden:
        qr["wifi_hidden"] = True
    if args.fg_color:
        qr["foreground_color"] = args.fg_color
    if args.bg_color:
        qr["background_color"] = args.bg_color
    if args.shape:
        qr["shape"] = args.shape
    data = api("post", "/qr_codes", json={"qr_code": qr})
    d = data["data"]
    print(f"Created [{d['id']}] {d['title']}")
    print(f"  URL: {d['full_short_url']}")
    print(f"  Image: {d['image_url']}")


def cmd_get(args):
    data = api("get", f"/qr_codes/{args.id}")
    print(json.dumps(data["data"], indent=2))


def cmd_update(args):
    qr = {}
    if args.title:
        qr["title"] = args.title
    if args.url:
        qr["url"] = args.url
    if args.fg_color:
        qr["foreground_color"] = args.fg_color
    if args.bg_color:
        qr["background_color"] = args.bg_color
    if args.shape:
        qr["shape"] = args.shape
    if not qr:
        print("Nothing to update", file=sys.stderr)
        sys.exit(1)
    data = api("patch", f"/qr_codes/{args.id}", json={"qr_code": qr})
    print(f"Updated [{data['data']['id']}] {data['data']['title']}")


def cmd_delete(args):
    data = api("delete", f"/qr_codes/{args.id}")
    print(f"Deleted [{data.get('data', {}).get('id')}]")


def cmd_image(args):
    content = api("get", f"/qr_codes/{args.id}/image")
    out = args.output or f"qr_{args.id}.svg"
    with open(out, "wb") as f:
        f.write(content)
    print(f"Saved to {out}")


def main():
    p = argparse.ArgumentParser(description="QRdex.io API client")
    sub = p.add_subparsers(dest="command", required=True)

    ls = sub.add_parser("list", help="List QR codes")
    ls.add_argument("--page", type=int)
    ls.add_argument("--per-page", type=int)
    ls.add_argument("--qr-type", choices=["url", "email", "telephone", "sms", "whatsapp", "wifi"])

    cr = sub.add_parser("create", help="Create a QR code")
    cr.add_argument("--title", required=True)
    cr.add_argument("--type", required=True, choices=["url", "email", "telephone", "sms", "whatsapp", "wifi"])
    cr.add_argument("--url")
    cr.add_argument("--phone")
    cr.add_argument("--email")
    cr.add_argument("--subject")
    cr.add_argument("--message")
    cr.add_argument("--ssid")
    cr.add_argument("--wifi-encryption", choices=["WPA", "WEP", "nopass"])
    cr.add_argument("--wifi-password")
    cr.add_argument("--wifi-hidden", action="store_true")
    cr.add_argument("--fg-color")
    cr.add_argument("--bg-color")
    cr.add_argument("--shape")

    gt = sub.add_parser("get", help="Get QR code details")
    gt.add_argument("id", type=int)

    up = sub.add_parser("update", help="Update a QR code")
    up.add_argument("id", type=int)
    up.add_argument("--title")
    up.add_argument("--url")
    up.add_argument("--fg-color")
    up.add_argument("--bg-color")
    up.add_argument("--shape")

    dl = sub.add_parser("delete", help="Delete a QR code")
    dl.add_argument("id", type=int)

    im = sub.add_parser("image", help="Download QR image")
    im.add_argument("id", type=int)
    im.add_argument("-o", "--output")

    args = p.parse_args()
    {"list": cmd_list, "create": cmd_create, "get": cmd_get,
     "update": cmd_update, "delete": cmd_delete, "image": cmd_image}[args.command](args)


if __name__ == "__main__":
    main()
