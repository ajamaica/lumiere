#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Reco helper for clawdbot skill (no external deps).
- similar: seed title -> AniList recommendations
- search : light heuristic parse -> AniList Page(Media) filter

AniList GraphQL endpoint: https://graphql.anilist.co
"""

import argparse
import json
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime
from typing import Any, Dict, List, Optional

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
            "User-Agent": "otaku-reco/1.2 (+clawdbot skill)"
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        # Print server response body for GraphQL errors
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            body = "<no body>"
        raise RuntimeError(f"HTTP {e.code} {e.reason}\n{body}") from e

    data = json.loads(raw)
    if "errors" in data:
        # AniList GraphQL returns errors[] with messages
        raise RuntimeError(data["errors"][0].get("message", "AniList GraphQL error"))
    return data["data"]

MEDIA_MIN = """
id
title { romaji english native }
format
status
episodes
seasonYear
averageScore
popularity
genres
description(asHtml:false)
siteUrl
coverImage { large }
tags { name rank isAdult }
"""

Q_FIND_SEED = f"""
query($search:String) {{
  Page(page:1, perPage:5) {{
    media(search:$search, type:ANIME, sort:[POPULARITY_DESC]) {{
      id
      title {{ romaji english native }}
      seasonYear
      format
      averageScore
      siteUrl
    }}
  }}
}}
"""

Q_SIMILAR = f"""
query($id:Int,$perPage:Int) {{
  Media(id:$id, type:ANIME) {{
    id
    title {{ romaji english native }}
    siteUrl
    recommendations(perPage:$perPage, sort:[RATING_DESC]) {{
      edges {{
        node {{
          rating
          mediaRecommendation {{
            {MEDIA_MIN}
          }}
        }}
      }}
    }}
  }}
}}
"""

# IMPORTANT:
# startDate_* expects FuzzyDateInt, not Int
Q_SEARCH = f"""
query(
  $page:Int,
  $perPage:Int,
  $search:String,
  $genre_in:[String],
  $tag_in:[String],
  $isAdult:Boolean,
  $episodes_lesser:Int,
  $episodes_greater:Int,
  $startDate_greater:FuzzyDateInt,
  $startDate_lesser:FuzzyDateInt,
  $sort:[MediaSort]
) {{
  Page(page:$page, perPage:$perPage) {{
    media(
      type:ANIME,
      search:$search,
      genre_in:$genre_in,
      tag_in:$tag_in,
      isAdult:$isAdult,
      episodes_lesser:$episodes_lesser,
      episodes_greater:$episodes_greater,
      startDate_greater:$startDate_greater,
      startDate_lesser:$startDate_lesser,
      sort:$sort
    ) {{
      {MEDIA_MIN}
    }}
  }}
}}
"""

# Very light heuristics mapping CN hints -> AniList genre/tag names.
# You can extend this as you like (still no DB).
GENRE_HINTS = {
    "治愈": ["Slice of Life"],
    "日常": ["Slice of Life"],
    "热血": ["Action"],
    "燃": ["Action"],
    "战斗": ["Action"],
    "悬疑": ["Mystery", "Thriller"],
    "推理": ["Mystery"],
    "科幻": ["Sci-Fi"],
    "恋爱": ["Romance"],
    "搞笑": ["Comedy"],
    "喜剧": ["Comedy"],
    "恐怖": ["Horror"],
    "音乐": ["Music"],
    "运动": ["Sports"],
}

# NOTE:
# Some of these are better handled as exclusions (不要xxx).
# AniList "tag_in" expects *tag names*; for exclusions we do a client-side filter.
TAG_HINTS = {
    "不刀": {"include": ["Feel Good"]},
    "治愈向": {"include": ["Iyashikei"]},
    "机战": {"include": ["Mecha"]},
    "百合": {"include": ["Yuri"]},
    "BL": {"include": ["Boys' Love"]},
    "不要后宫": {"exclude": ["Harem"]},
    "不看后宫": {"exclude": ["Harem"]},
    "不要异世界": {"exclude": ["Isekai"]},
    "不看异世界": {"exclude": ["Isekai"]},
}

def year_to_fuzzy_start(year: int) -> int:
    # FuzzyDateInt uses YYYYMMDD (integer). Use Jan 1st as lower bound.
    return year * 10000 + 101

def parse_prompt(prompt: str) -> Dict[str, Any]:
    p = prompt.strip()

    genre_in: List[str] = []
    tag_in: List[str] = []
    tag_not: List[str] = []

    for k, gs in GENRE_HINTS.items():
        if k in p:
            for g in gs:
                if g not in genre_in:
                    genre_in.append(g)

    for k, rule in TAG_HINTS.items():
        if k in p:
            for t in rule.get("include", []):
                if t not in tag_in:
                    tag_in.append(t)
            for t in rule.get("exclude", []):
                if t not in tag_not:
                    tag_not.append(t)

    # episodes length heuristic
    episodes_lesser = None
    m = re.search(r"(?:不超过|不多于|最多|<=|≤)\s*(\d+)\s*集", p)
    if m:
        episodes_lesser = int(m.group(1))
    elif any(x in p for x in ["短", "短篇", "一季", "12集", "13集"]):
        episodes_lesser = 13

    # time range heuristic
    startDate_greater = None
    startDate_lesser = None

    if "近5年" in p or "最近五年" in p:
        y = datetime.now().year - 5
        startDate_greater = year_to_fuzzy_start(y)

    # If user explicitly says e.g. "2010年后"
    m2 = re.search(r"(\d{4})\s*年\s*(?:后|以后|之后)", p)
    if m2:
        y = int(m2.group(1))
        startDate_greater = year_to_fuzzy_start(y)

    # free text title search heuristic: if prompt looks like a title rather than constraints
    search = None
    constraint_words = ["治愈", "热血", "悬疑", "恋爱", "搞笑", "科幻", "日常", "近5年", "不要", "不看", "最好", "集"]
    if len(p) <= 24 and not any(w in p for w in constraint_words):
        search = p

    return {
        "raw": p,
        "search": search,
        "genre_in": genre_in or None,
        "tag_in": tag_in or None,
        "tag_not": tag_not or None,
        "episodes_lesser": episodes_lesser,
        "episodes_greater": None,
        "startDate_greater": startDate_greater,
        "startDate_lesser": startDate_lesser,
    }

def normalize_media(m: Dict[str, Any]) -> Dict[str, Any]:
    m = dict(m)
    m["description"] = strip_html(m.get("description"))
    tags = m.get("tags") or []
    # drop adult tags
    m["tags"] = [t for t in tags if not t.get("isAdult")]
    return m

def cmd_similar(args: argparse.Namespace):
    seed = args.seed.strip()
    find = gql(Q_FIND_SEED, {"search": seed}).get("Page", {}).get("media", [])
    if not find:
        print(json.dumps({"ok": False, "error": "seed_not_found", "seed": seed}, ensure_ascii=False, indent=2))
        return

    chosen = find[0]
    data = gql(Q_SIMILAR, {"id": chosen["id"], "perPage": max(1, min(args.limit, 25))})
    media = data.get("Media") or {}
    edges = (media.get("recommendations") or {}).get("edges") or []

    recs = []
    for e in edges:
        node = (e.get("node") or {})
        mr = node.get("mediaRecommendation")
        if mr:
            recs.append({
                "rating": node.get("rating"),
                "media": normalize_media(mr),
            })

    print(json.dumps({"ok": True, "seed": chosen, "recommendations": recs}, ensure_ascii=False, indent=2))

def cmd_search(args: argparse.Namespace):
    parsed = parse_prompt(args.prompt)

    # prefer score then popularity
    sort = ["SCORE_DESC", "POPULARITY_DESC"]

    vars1 = {
        "page": 1,
        "perPage": max(1, min(args.limit, 25)),
        "search": parsed["search"],
        "genre_in": parsed["genre_in"],
        "tag_in": parsed["tag_in"],
        "isAdult": False,
        "episodes_lesser": parsed["episodes_lesser"],
        "episodes_greater": parsed["episodes_greater"],
        "startDate_greater": parsed["startDate_greater"],
        "startDate_lesser": parsed["startDate_lesser"],
        "sort": sort,
    }

    page = gql(Q_SEARCH, vars1).get("Page", {})
    arr = [normalize_media(x) for x in (page.get("media") or [])]

    # Client-side exclusions by tag name
    tag_not = set(parsed["tag_not"] or [])
    if tag_not:
        def has_banned(m: Dict[str, Any]) -> bool:
            names = {t.get("name") for t in (m.get("tags") or [])}
            return any(b in names for b in tag_not)
        arr = [m for m in arr if not has_banned(m)]

    print(json.dumps({"ok": bool(arr), "parsed": parsed, "results": arr[: args.limit]}, ensure_ascii=False, indent=2))

def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("similar", help="recommendations based on a seed anime title")
    sp.add_argument("--seed", required=True, help="seed anime title (cn/jp/en)")
    sp.add_argument("--limit", type=int, default=12)
    sp.set_defaults(fn=cmd_similar)

    sp2 = sub.add_parser("search", help="search recommendations by a raw preference prompt")
    sp2.add_argument("--prompt", required=True, help="raw user prompt")
    sp2.add_argument("--limit", type=int, default=20)
    sp2.set_defaults(fn=cmd_search)

    args = ap.parse_args()
    args.fn(args)

if __name__ == "__main__":
    main()

