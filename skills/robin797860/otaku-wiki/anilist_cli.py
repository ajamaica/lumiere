#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
AniList GraphQL CLI (no external deps).
Endpoint: https://graphql.anilist.co  :contentReference[oaicite:2]{index=2}

Usage examples:
  python3 anilist_cli.py anime --search "葬送的芙莉莲" --top 1
  python3 anilist_cli.py anime --id 151807
  python3 anilist_cli.py character --search "四宫辉夜" --top 1
  python3 anilist_cli.py staff --search "花澤香菜" --top 1
"""

import argparse
import json
import re
import sys
import urllib.request
from typing import Any, Dict, Optional

ANILIST_GQL = "https://graphql.anilist.co"

TAG_RE = re.compile(r"<[^>]+>")

def strip_html(s: Optional[str]) -> str:
    if not s:
        return ""
    s = s.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    s = TAG_RE.sub("", s)
    return re.sub(r"\n{3,}", "\n\n", s).strip()

def gql(query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    payload = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    req = urllib.request.Request(
        ANILIST_GQL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "otaku-wiki/1.0 (+moltbot skill)"
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        data = json.loads(raw)
    if "errors" in data:
        raise RuntimeError(data["errors"][0].get("message", "AniList GraphQL error"))
    return data["data"]

def pick_first_page_node(page: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    media = page.get("media") or page.get("characters") or page.get("staff")
    if not media:
        return None
    return media[0]

def out(obj: Any):
    json.dump(obj, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")

MEDIA_FIELDS = """
id
title { romaji english native }
type
format
status
episodes
duration
season
seasonYear
startDate { year month day }
endDate { year month day }
averageScore
meanScore
popularity
favourites
genres
tags { name rank isAdult }
description(asHtml:false)
siteUrl
coverImage { large }
bannerImage
studios(isMain:true) { nodes { name siteUrl } }
characters(perPage:3, sort:[ROLE, FAVOURITES_DESC]) {
  nodes {
    id
    name { full native }
    siteUrl
    image { large }
  }
}
staff(perPage:3, sort:[RELEVANCE]) {
  nodes {
    id
    name { full native }
    languageV2
    siteUrl
    image { large }
  }
}
"""

CHAR_FIELDS = """
id
name { full native alternative }
description(asHtml:false)
gender
age
dateOfBirth { year month day }
favourites
siteUrl
image { large }
media(perPage:5, sort:[POPULARITY_DESC]) {
  nodes {
    id
    title { romaji english native }
    type
    format
    seasonYear
    averageScore
    siteUrl
    coverImage { large }
  }
}
"""

STAFF_FIELDS = """
id
name { full native alternative }
languageV2
description(asHtml:false)
favourites
siteUrl
image { large }
staffMedia(perPage:5, sort:[POPULARITY_DESC]) {
  nodes {
    id
    title { romaji english native }
    type
    format
    seasonYear
    averageScore
    siteUrl
    coverImage { large }
  }
}
characters(perPage:5, sort:[FAVOURITES_DESC]) {
  nodes {
    id
    name { full native }
    siteUrl
    image { large }
  }
}
"""

Q_MEDIA_BY_ID = f"query($id:Int){{ Media(id:$id,type:ANIME){{ {MEDIA_FIELDS} }} }}"
Q_MEDIA_SEARCH = f"query($search:String,$page:Int,$perPage:Int){{ Page(page:$page,perPage:$perPage){{ media(search:$search,type:ANIME){{ {MEDIA_FIELDS} }} }} }}"
Q_CHAR_SEARCH = f"query($search:String,$page:Int,$perPage:Int){{ Page(page:$page,perPage:$perPage){{ characters(search:$search){{ {CHAR_FIELDS} }} }} }}"
Q_STAFF_SEARCH = f"query($search:String,$page:Int,$perPage:Int){{ Page(page:$page,perPage:$perPage){{ staff(search:$search){{ {STAFF_FIELDS} }} }} }}"

def normalize_media(m: Dict[str, Any]) -> Dict[str, Any]:
    m = dict(m)
    m["description"] = strip_html(m.get("description"))
    # drop adult tags
    tags = m.get("tags") or []
    m["tags"] = [t for t in tags if not t.get("isAdult")]
    return m

def normalize_profile(p: Dict[str, Any]) -> Dict[str, Any]:
    p = dict(p)
    p["description"] = strip_html(p.get("description"))
    return p

def cmd_anime(args: argparse.Namespace):
    if args.id is not None:
        data = gql(Q_MEDIA_BY_ID, {"id": int(args.id)})
        m = data.get("Media")
        if not m:
            out({"ok": False, "error": "not_found"})
            return
        out({"ok": True, "media": normalize_media(m)})
        return

    page = gql(Q_MEDIA_SEARCH, {"search": args.search, "page": 1, "perPage": max(1, min(args.top, 25))}).get("Page", {})
    # return up to top results (still normalized)
    arr = page.get("media") or []
    arr = [normalize_media(x) for x in arr][: args.top]
    out({"ok": bool(arr), "results": arr})

def cmd_character(args: argparse.Namespace):
    page = gql(Q_CHAR_SEARCH, {"search": args.search, "page": 1, "perPage": max(1, min(args.top, 25))}).get("Page", {})
    arr = page.get("characters") or []
    arr = [normalize_profile(x) for x in arr][: args.top]
    out({"ok": bool(arr), "results": arr})

def cmd_staff(args: argparse.Namespace):
    page = gql(Q_STAFF_SEARCH, {"search": args.search, "page": 1, "perPage": max(1, min(args.top, 25))}).get("Page", {})
    arr = page.get("staff") or []
    arr = [normalize_profile(x) for x in arr][: args.top]
    out({"ok": bool(arr), "results": arr})

def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    ap_anime = sub.add_parser("anime")
    ap_anime.add_argument("--search", type=str, default=None)
    ap_anime.add_argument("--id", type=int, default=None)
    ap_anime.add_argument("--top", type=int, default=1)
    ap_anime.set_defaults(fn=cmd_anime)

    ap_char = sub.add_parser("character")
    ap_char.add_argument("--search", type=str, required=True)
    ap_char.add_argument("--top", type=int, default=1)
    ap_char.set_defaults(fn=cmd_character)

    ap_staff = sub.add_parser("staff")
    ap_staff.add_argument("--search", type=str, required=True)
    ap_staff.add_argument("--top", type=int, default=1)
    ap_staff.set_defaults(fn=cmd_staff)

    args = ap.parse_args()
    if args.cmd == "anime" and args.id is None and not args.search:
        ap.error("anime requires --search or --id")
    args.fn(args)

if __name__ == "__main__":
    main()

