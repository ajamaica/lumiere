#!/usr/bin/env python3
"""Learning English Words - SQLite helper.

This script is intentionally small and deterministic, so the agent can rely on it.

Usage:
  words.py init
  words.py migrate
  words.py add "<headword>" [--type word|phrase|idiom] [--pos "verb"] [--ipa "/.../"]
             [--definition-en "..."] [--when-to-use "w1" "w2"]
             [--meanings "m1" "m2" "m3"] [--forms "..."] [--derived "w1" "w2" ...]
             [--confusions "c1" "c2" ...] [--collocations "k1" "k2" ...]
             [--tags "IT" "meetings" ...]
             [--examples "e1" "e2" "e3"]
             [--pitfalls "p1" "p2" "p3"]
             [--countability countable|uncountable|both]
             [--audio-uri "https://..."] [--audio-auto]
             [--update]
  words.py find "<headword>"
  words.py render "<headword>" [--fill-audio]
  words.py patch "<headword>" [--inflections "f1" "f2" ...] [--derived "w1" "w2" ...]
             [--definition-en "..."] [--when-to-use "w1" "w2" ...]
             [--confusions "c1" "c2" ...] [--collocations "k1" "k2" ...]
             [--tags "IT" ...]
  # (local-only maintenance scripts live in scripts/local/)
  words.py cambridge-audio "<headword>" [--prefer us|uk]
  words.py due [--limit N]
  words.py hardest [--limit N]
  words.py grade <card_id> <grade0to3> [--response-type en_to_pl|pl_to_en|cloze|usage] [--user-answer "..."]
  words.py stats

DB path:
  Controlled by env var `ENGLISH_LEARN_CARDS_DB` (default: ~/clawd/memory/english-learn-cards.db)

New fields (v2): definition_en, when_to_use, confusions, collocations, tags.
Use `words.py migrate` once after updating the script.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import requests

DB_PATH = os.environ.get(
    "ENGLISH_LEARN_CARDS_DB",
    os.path.expanduser("~/clawd/memory/english-learn-cards.db"),
)



def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def migrate_db(con: sqlite3.Connection) -> dict:
    """Best-effort schema migration for existing DBs."""
    init_db(con)  # ensures base tables exist

    info = con.execute("PRAGMA table_info(cards)").fetchall()
    cols = {r[1] for r in info}
    defaults = {r[1]: r[4] for r in info}  # dflt_value

    wanted = [
        ("definition_en", "TEXT"),
        ("when_to_use_json", "TEXT"),
        ("confusions_json", "TEXT"),
        ("collocations_json", "TEXT"),
    ]

    added = []
    for name, typ in wanted:
        if name not in cols:
            con.execute(f"ALTER TABLE cards ADD COLUMN {name} {typ}")
            added.append(name)

    dropped = []

    # Drop deprecated column (SQLite requires table rebuild).
    if "minimal_pair_json" in cols:
        _rebuild_cards_table_drop_minimal_pair(con)
        dropped.append("minimal_pair_json")
        # refresh info after rebuild
        info = con.execute("PRAGMA table_info(cards)").fetchall()
        defaults = {r[1]: r[4] for r in info}

    # Ensure defaults exist for created_at/updated_at (some rebuilds may have lost them).
    if defaults.get("created_at") is None or defaults.get("updated_at") is None:
        # Rebuild again using the correct schema (no minimal_pair_json, but with defaults)
        _rebuild_cards_table_drop_minimal_pair(con)
        # (function name is historical; it rebuilds to the canonical schema)

    con.commit()
    return {"status": "ok", "added": added, "dropped": dropped}


def _rebuild_cards_table_drop_minimal_pair(con: sqlite3.Connection) -> None:
    """Rebuild cards table to physically drop deprecated minimal_pair_json column.

    Important: keep defaults for created_at/updated_at so inserts work.
    """
    con.execute("PRAGMA foreign_keys=OFF")
    con.execute("BEGIN")

    con.executescript(
        """
        CREATE TABLE cards_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          headword TEXT NOT NULL,
          display TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('word','phrase','idiom')),
          language_variant TEXT NOT NULL DEFAULT 'en-US',
          pos TEXT,
          ipa TEXT,
          audio_uri TEXT,
          countability TEXT CHECK (countability IN ('countable','uncountable','both')),
          definition_en TEXT,
          when_to_use_json TEXT,
          confusions_json TEXT,
          collocations_json TEXT,
          meanings_json TEXT NOT NULL,
          forms_json TEXT,
          examples_json TEXT NOT NULL,
          pitfalls_json TEXT,
          tags_json TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          UNIQUE(headword)
        );
        """
    )

    # Copy data (ignore missing columns in older DBs).
    cols = {r[1] for r in con.execute("PRAGMA table_info(cards)").fetchall()}

    def has(c: str) -> bool:
        return c in cols

    select_cols = [
        "id",
        "headword",
        "display",
        "type",
        "language_variant",
        "pos",
        "ipa",
        "audio_uri",
        "countability",
        "definition_en" if has("definition_en") else "NULL as definition_en",
        "when_to_use_json" if has("when_to_use_json") else "NULL as when_to_use_json",
        "confusions_json" if has("confusions_json") else "NULL as confusions_json",
        "collocations_json" if has("collocations_json") else "NULL as collocations_json",
        "meanings_json",
        "forms_json",
        "examples_json",
        "pitfalls_json",
        "tags_json",
        "notes",
        "created_at" if has("created_at") else "strftime('%Y-%m-%dT%H:%M:%fZ','now') as created_at",
        "updated_at" if has("updated_at") else "strftime('%Y-%m-%dT%H:%M:%fZ','now') as updated_at",
    ]

    con.execute(
        "INSERT INTO cards_new (id, headword, display, type, language_variant, pos, ipa, audio_uri, countability, definition_en, when_to_use_json, confusions_json, collocations_json, meanings_json, forms_json, examples_json, pitfalls_json, tags_json, notes, created_at, updated_at) "
        + "SELECT "
        + ", ".join(select_cols)
        + " FROM cards"
    )

    con.executescript(
        """
        DROP TABLE cards;
        ALTER TABLE cards_new RENAME TO cards;
        """
    )

    con.execute("COMMIT")
    con.execute("PRAGMA foreign_keys=ON")


def init_db(con: sqlite3.Connection) -> None:
    con.executescript(
        """
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          headword TEXT NOT NULL,
          display TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('word','phrase','idiom')),
          language_variant TEXT NOT NULL DEFAULT 'en-US',
          pos TEXT,
          ipa TEXT,
          audio_uri TEXT,
          countability TEXT CHECK (countability IN ('countable','uncountable','both')),
          definition_en TEXT,
          when_to_use_json TEXT,
          confusions_json TEXT,
          collocations_json TEXT,
          meanings_json TEXT NOT NULL,
          forms_json TEXT,
          examples_json TEXT NOT NULL,
          pitfalls_json TEXT,
          tags_json TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          UNIQUE(headword)
        );

        CREATE TABLE IF NOT EXISTS srs_state (
          card_id INTEGER PRIMARY KEY,
          ease REAL NOT NULL DEFAULT 2.5,
          interval_days INTEGER NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL DEFAULT 0,
          lapses INTEGER NOT NULL DEFAULT 0,
          last_review_at TEXT,
          due_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          card_id INTEGER NOT NULL,
          reviewed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          grade INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 3),
          response_type TEXT NOT NULL CHECK (response_type IN ('en_to_pl','pl_to_en','cloze','usage')),
          user_answer TEXT,
          notes TEXT,
          FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
        );
        """
    )
    con.commit()


def norm_headword(s: str) -> str:
    return " ".join(s.strip().lower().split())


def j(x: Any) -> str:
    return json.dumps(x, ensure_ascii=False)


def _cambridge_audio_url(headword: str, prefer: str = "us") -> Optional[str]:
    """Best-effort: extract a Cambridge mp3 URL for a headword.

    Strategy:
    1) Try english-polish (often has clean US/UK audio paths).
    2) If Cambridge returns only placeholder audio ("bleak"/"blank"), fall back to english.

    Notes:
    - Cambridge embeds mp3 paths in HTML like /media/english/us_pron/.../*.mp3
    - This is heuristic and may fail for some entries.
    """

    headword = norm_headword(headword)
    prefer = (prefer or "us").lower()
    pref_token = "/us_pron/" if prefer == "us" else "/uk_pron/"

    def fetch_rel(dict_path: str) -> list[str]:
        url = f"https://dictionary.cambridge.org/dictionary/{dict_path}/{requests.utils.quote(headword)}"
        try:
            r = requests.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) learning-english-words/1.0",
                    "Accept-Language": "en-US,en;q=0.9,pl;q=0.8",
                },
                timeout=10,
            )
            r.raise_for_status()
        except Exception:
            return []
        return re.findall(r"/media/[^\s\"']+\.mp3", r.text)

    rel = fetch_rel("english-polish")
    # Cambridge sometimes includes placeholder audio files (not the headword).
    placeholders = ("/bleak/bleak.mp3", "/ukblank", "/bleak/")
    def is_placeholder(p: str) -> bool:
        pl = p.lower()
        return any(tok in pl for tok in placeholders)

    # If the page only gives placeholders, try the english dictionary.
    if rel and all(is_placeholder(p) for p in rel):
        rel = fetch_rel("english")

    # Drop placeholders entirely.
    rel = [p for p in rel if not is_placeholder(p)]
    if not rel:
        return None

    def score(p: str) -> tuple:
        s = 0
        if pref_token in p:
            s += 50
        # Prefer paths that contain the headword (when available).
        if headword in p.lower():
            s += 20
        # Prefer english-polish over english if both present.
        if "/english-polish/" in p:
            s += 10
        return (-s, len(p))

    best = sorted(set(rel), key=score)[0]
    return "https://dictionary.cambridge.org" + best


def add_card(args: argparse.Namespace) -> dict:
    head = norm_headword(args.headword)
    meanings = list(args.meanings or [])[:3]
    examples = list(args.examples or [])
    pitfalls = list(args.pitfalls or [])[:3] if args.pitfalls else []

    if len(meanings) == 0:
        raise SystemExit("Need at least 1 meaning (--meanings)")
    if len(examples) != 3:
        raise SystemExit("Need exactly 3 examples (--examples e1 e2 e3)")

    audio_uri = args.audio_uri
    if (not audio_uri) and args.audio_auto:
        audio_uri = _cambridge_audio_url(head, prefer="us")

    con = connect()
    init_db(con)
    migrate_db(con)

    cur = con.execute("SELECT id FROM cards WHERE headword=?", (head,))
    row = cur.fetchone()
    if row and not args.update:
        return {"status": "exists", "id": row["id"], "headword": head}

    forms_list = args.forms.split("|") if args.forms else []
    derived_list = list(args.derived or [])
    if derived_list:
        forms_json = j({"inflections": forms_list, "derived": derived_list})
    else:
        forms_json = j(forms_list)

    payload = {
        "headword": head,
        "display": args.display or head,
        "type": args.type,
        "pos": args.pos,
        "ipa": args.ipa,
        "audio_uri": audio_uri,
        "countability": args.countability,
        "definition_en": args.definition_en,
        "when_to_use_json": j(list(args.when_to_use or [])),
        "confusions_json": j(list(args.confusions or [])),
        "collocations_json": j(list(args.collocations or [])),
        # minimal_pair_json removed (contrasts live in confusions)
        "meanings_json": j(meanings),
        "forms_json": forms_json,
        "examples_json": j(examples),
        "pitfalls_json": j(pitfalls),
        "tags_json": j(list(args.tags or [])) if args.tags else None,
        "updated_at": now_iso(),
    }

    if row:
        con.execute(
            """UPDATE cards SET display=:display, type=:type, pos=:pos, ipa=:ipa, audio_uri=:audio_uri,
               countability=:countability, definition_en=:definition_en, when_to_use_json=:when_to_use_json,
               confusions_json=:confusions_json, collocations_json=:collocations_json,
               meanings_json=:meanings_json, forms_json=:forms_json, examples_json=:examples_json,
               pitfalls_json=:pitfalls_json, tags_json=:tags_json, updated_at=:updated_at
               WHERE id=:id""",
            {**payload, "id": row["id"]},
        )
        card_id = row["id"]
    else:
        con.execute(
            """INSERT INTO cards (headword, display, type, pos, ipa, audio_uri, countability,
               definition_en, when_to_use_json, confusions_json, collocations_json,
               meanings_json, forms_json, examples_json, pitfalls_json, tags_json)
               VALUES (:headword,:display,:type,:pos,:ipa,:audio_uri,:countability,
               :definition_en,:when_to_use_json,:confusions_json,:collocations_json,
               :meanings_json,:forms_json,:examples_json,:pitfalls_json,:tags_json)""",
            payload,
        )
        card_id = con.execute("SELECT last_insert_rowid() as id").fetchone()["id"]
        con.execute("INSERT INTO srs_state (card_id, due_at) VALUES (?, ?)", (card_id, now_iso()))

    con.commit()
    return {"status": "ok", "id": card_id, "headword": head}


def find_card_by_headword(con: sqlite3.Connection, head: str) -> Optional[dict]:
    row = con.execute(
        "SELECT c.*, s.ease, s.interval_days, s.repetitions, s.lapses, s.due_at FROM cards c JOIN srs_state s ON s.card_id=c.id WHERE c.headword=?",
        (head,),
    ).fetchone()
    if not row:
        return None
    d = dict(row)
    for k in [
        "meanings_json",
        "forms_json",
        "examples_json",
        "pitfalls_json",
        "tags_json",
        "when_to_use_json",
        "confusions_json",
        "collocations_json",
    ]:
        if d.get(k):
            d[k] = json.loads(d[k])
    return d


def find_card(args: argparse.Namespace) -> dict:
    head = norm_headword(args.headword)
    con = connect()
    init_db(con)
    migrate_db(con)
    d = find_card_by_headword(con, head)
    if not d:
        return {"status": "missing", "headword": head}
    return {"status": "ok", "card": d}


def render_card_slack(card: dict) -> str:
    # Separator line: use box drawing, renders well in Slack.
    sep = "────────"

    head = card.get("display") or card.get("headword")
    pos = card.get("pos") or ""
    ipa = card.get("ipa") or ""
    audio = card.get("audio_uri")

    lines = []
    lines.append(f"*{head}* ({pos})".rstrip())
    if ipa:
        lines.append(f"IPA: `{ipa}`")
    else:
        lines.append("IPA: `(missing)`")

    if audio:
        lines.append(f"Audio (US): <{audio}>")
    else:
        lines.append("Audio (US): (not found)")

    # Definition (+ one-line usage hint)
    definition = card.get("definition_en")
    when = card.get("when_to_use_json") or []
    if definition:
        lines.append("")
        lines.append("*DEFINITION (1 line)*")
        lines.append(f"• {definition}")
        if when:
            # single short line instead of a whole section
            lines.append(f"• Used when: {when[0]}")
        lines.append(sep)

    # Examples (moved up: context first)
    examples = card.get("examples_json") or []
    lines.append("")
    lines.append("*EXAMPLES (exactly 3)*")
    for e in examples[:3]:
        lines.append(f"• {e}")
    lines.append(sep)

    # Meanings
    meanings = card.get("meanings_json") or []
    lines.append("")
    lines.append("*MEANINGS (max 3)*")
    for m in meanings[:3]:
        lines.append(f"• {m}")
    lines.append(sep)

    # Forms / Derived
    forms = card.get("forms_json")
    inflections = []
    derived = []
    if isinstance(forms, dict):
        inflections = list(forms.get("inflections") or [])
        derived = list(forms.get("derived") or [])
    elif isinstance(forms, list):
        inflections = forms

    if inflections or derived:
        lines.append("")
        lines.append("*FORMS / VARIATIONS*")
        if inflections:
            lines.append("• inflections: " + " | ".join(inflections))
        if derived:
            lines.append("• derived/related: " + " | ".join(derived))
        lines.append(sep)

    # Countability
    if (card.get("pos") or "").lower() == "noun" and card.get("countability"):
        lines.append("")
        lines.append("*COUNTABILITY*")
        lines.append(f"• {card['countability']}")
        lines.append(sep)

    # Common confusions
    conf = card.get("confusions_json") or []
    if conf:
        lines.append("")
        lines.append("*COMMON CONFUSIONS*")
        for c in conf[:5]:
            lines.append(f"• {c}")
        lines.append(sep)

    # Collocations
    coll = card.get("collocations_json") or []
    if coll:
        lines.append("")
        lines.append("*COLLOCATIONS*")
        for c in coll[:8]:
            lines.append(f"• {c}")
        lines.append(sep)

    # NOTE: QUICK CONTRAST removed.
    # We keep contrasts inside COMMON CONFUSIONS to avoid duplication.

    # Examples moved up (after definition)

    # Tags
    tags = card.get("tags_json") or []
    if tags:
        lines.append("")
        lines.append("*TAGS*")
        lines.append("• " + " | ".join(tags))

    return "\n".join(lines).strip() + "\n"


def _normalize_forms_payload(existing_forms: Any) -> tuple[list[str], list[str]]:
    """Return (inflections, derived) from stored forms_json which can be list or dict."""
    if isinstance(existing_forms, dict):
        return list(existing_forms.get("inflections") or []), list(existing_forms.get("derived") or [])
    if isinstance(existing_forms, list):
        return list(existing_forms), []
    return [], []


def render_card(args: argparse.Namespace) -> dict:
    head = norm_headword(args.headword)
    con = connect()
    init_db(con)
    card = find_card_by_headword(con, head)
    if not card:
        return {"status": "missing", "headword": head}

    if args.fill_audio and not card.get("audio_uri"):
        audio = _cambridge_audio_url(head, prefer="us")
        if audio:
            con.execute("UPDATE cards SET audio_uri=?, updated_at=? WHERE id=?", (audio, now_iso(), card["id"]))
            con.commit()
            card["audio_uri"] = audio

    return {"status": "ok", "headword": head, "text": render_card_slack(card), "audio_uri": card.get("audio_uri")}


# NOTE: local-only maintenance script (upgrade-existing) moved to:
#   skills/local/learning-english-words/scripts/local/upgrade_existing.py
def patch_card(args: argparse.Namespace) -> dict:
    head = norm_headword(args.headword)
    con = connect()
    init_db(con)
    migrate_db(con)
    card = find_card_by_headword(con, head)
    if not card:
        return {"status": "missing", "headword": head}

    # forms
    inf0, der0 = _normalize_forms_payload(card.get("forms_json"))
    inf = list(args.inflections) if args.inflections else inf0
    der = list(args.derived) if args.derived else der0

    if der:
        forms_json = j({"inflections": inf, "derived": der})
    else:
        forms_json = j(inf)

    # v2 fields (only patch when provided; otherwise keep existing)
    definition_en = args.definition_en if args.definition_en is not None else card.get("definition_en")
    when_to_use = j(list(args.when_to_use)) if args.when_to_use is not None else j(card.get("when_to_use_json") or [])
    confusions = j(list(args.confusions)) if args.confusions is not None else j(card.get("confusions_json") or [])
    collocations = j(list(args.collocations)) if args.collocations is not None else j(card.get("collocations_json") or [])
    tags_json = j(list(args.tags)) if args.tags is not None else (j(card.get("tags_json") or []) if card.get("tags_json") is not None else None)

    con.execute(
        """UPDATE cards
           SET forms_json=?, definition_en=?, when_to_use_json=?, confusions_json=?, collocations_json=?, tags_json=?, updated_at=?
           WHERE id=?""",
        (forms_json, definition_en, when_to_use, confusions, collocations, tags_json, now_iso(), card["id"]),
    )
    con.commit()

    return {
        "status": "ok",
        "headword": head,
        "inflections": inf,
        "derived": der,
        "definition_en": definition_en,
        "when_to_use": json.loads(when_to_use),
        "confusions": json.loads(confusions),
        "collocations": json.loads(collocations),
        "tags": json.loads(tags_json) if tags_json else [],
    }


def list_due(args: argparse.Namespace) -> dict:
    con = connect()
    init_db(con)
    migrate_db(con)
    limit = int(args.limit)
    rows = con.execute(
        """SELECT c.id, c.headword, c.pos, c.meanings_json, s.due_at, s.ease, s.lapses
           FROM cards c JOIN srs_state s ON s.card_id=c.id
           WHERE s.due_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')
           ORDER BY s.due_at ASC
           LIMIT ?""",
        (limit,),
    ).fetchall()
    out = []
    for r in rows:
        out.append({
            "id": r["id"],
            "headword": r["headword"],
            "pos": r["pos"],
            "due_at": r["due_at"],
            "ease": r["ease"],
            "lapses": r["lapses"],
            "meanings": json.loads(r["meanings_json"]),
        })
    return {"status": "ok", "due": out}


def list_hardest(args: argparse.Namespace) -> dict:
    con = connect()
    init_db(con)
    migrate_db(con)
    limit = int(args.limit)
    rows = con.execute(
        """SELECT c.id, c.headword, c.pos, s.ease, s.lapses, s.repetitions, s.due_at
           FROM cards c JOIN srs_state s ON s.card_id=c.id
           ORDER BY s.lapses DESC, s.ease ASC, s.repetitions ASC
           LIMIT ?""",
        (limit,),
    ).fetchall()
    return {"status": "ok", "hardest": [dict(r) for r in rows]}


def grade_card(args: argparse.Namespace) -> dict:
    card_id = int(args.card_id)
    grade = int(args.grade)
    if grade < 0 or grade > 3:
        raise SystemExit("grade must be 0..3")

    con = connect()
    init_db(con)
    migrate_db(con)
    s = con.execute("SELECT * FROM srs_state WHERE card_id=?", (card_id,)).fetchone()
    if not s:
        raise SystemExit("unknown card_id")

    ease = float(s["ease"])
    interval_days = int(s["interval_days"])
    repetitions = int(s["repetitions"])
    lapses = int(s["lapses"])

    due_at: str

    if grade == 0:
        repetitions = 0
        lapses += 1
        ease = max(1.3, ease - 0.2)
        due_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        interval_days = 0
    else:
        repetitions += 1
        if repetitions == 1:
            interval_days = 1
        elif repetitions == 2:
            interval_days = 3
        else:
            bonus = 1.15 if grade == 3 else 1.0 if grade == 2 else 0.85
            interval_days = max(1, round(interval_days * ease * bonus))

        if grade == 3:
            ease += 0.05
        elif grade == 1:
            ease -= 0.05
        ease = max(1.3, ease)
        due_at = (datetime.now(timezone.utc) + timedelta(days=interval_days)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    con.execute(
        """UPDATE srs_state SET ease=?, interval_days=?, repetitions=?, lapses=?, last_review_at=?, due_at=?
           WHERE card_id=?""",
        (ease, interval_days, repetitions, lapses, now_iso(), due_at, card_id),
    )
    con.execute(
        "INSERT INTO reviews (card_id, grade, response_type, user_answer) VALUES (?,?,?,?)",
        (card_id, grade, args.response_type, args.user_answer),
    )
    con.commit()

    return {
        "status": "ok",
        "card_id": card_id,
        "new": {
            "ease": ease,
            "interval_days": interval_days,
            "repetitions": repetitions,
            "lapses": lapses,
            "due_at": due_at,
        },
    }


def stats(args: argparse.Namespace) -> dict:
    con = connect()
    init_db(con)
    migrate_db(con)

    total = con.execute("SELECT count(*) as n FROM cards").fetchone()["n"]
    due_today = con.execute(
        """SELECT count(*) as n FROM srs_state
           WHERE due_at <= datetime('now','localtime','start of day','+1 day')"""
    ).fetchone()["n"]
    due_now = con.execute(
        """SELECT count(*) as n FROM srs_state
           WHERE due_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')"""
    ).fetchone()["n"]

    hardest = con.execute(
        """SELECT c.headword, s.lapses, s.ease
           FROM cards c JOIN srs_state s ON s.card_id=c.id
           ORDER BY s.lapses DESC, s.ease ASC
           LIMIT 10"""
    ).fetchall()

    return {
        "status": "ok",
        "total": total,
        "due_now": due_now,
        "due_today": due_today,
        "hardest": [dict(r) for r in hardest],
    }


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("init")
    sub.add_parser("migrate")

    ap_add = sub.add_parser("add")
    ap_add.add_argument("headword")
    ap_add.add_argument("--display")
    ap_add.add_argument("--type", default="word", choices=["word", "phrase", "idiom"])
    ap_add.add_argument("--pos")
    ap_add.add_argument("--ipa")
    ap_add.add_argument("--audio-uri")
    ap_add.add_argument("--audio-auto", action="store_true")
    ap_add.add_argument("--countability", choices=["countable", "uncountable", "both"])

    ap_add.add_argument("--definition-en")
    ap_add.add_argument("--when-to-use", nargs="+")
    ap_add.add_argument("--confusions", nargs="+")
    ap_add.add_argument("--collocations", nargs="+")
    # --minimal-pair removed (store contrasts in --confusions)
    ap_add.add_argument("--tags", nargs="+")

    ap_add.add_argument("--meanings", nargs="+")
    ap_add.add_argument("--forms", help="Use '|' to separate inflections")
    ap_add.add_argument("--derived", nargs="+", help="Related/derived words (other parts of speech)")
    ap_add.add_argument("--examples", nargs="+")
    ap_add.add_argument("--pitfalls", nargs="+")
    ap_add.add_argument("--update", action="store_true")

    ap_find = sub.add_parser("find")
    ap_find.add_argument("headword")

    ap_render = sub.add_parser("render")
    ap_render.add_argument("headword")
    ap_render.add_argument("--fill-audio", action="store_true")

    ap_due = sub.add_parser("due")
    ap_due.add_argument("--limit", default=50)

    ap_hard = sub.add_parser("hardest")
    ap_hard.add_argument("--limit", default=20)

    ap_grade = sub.add_parser("grade")
    ap_grade.add_argument("card_id")
    ap_grade.add_argument("grade")
    ap_grade.add_argument("--response-type", default="pl_to_en", choices=["en_to_pl", "pl_to_en", "cloze", "usage"])
    ap_grade.add_argument("--user-answer", default=None)

    ap_patch = sub.add_parser("patch")
    ap_patch.add_argument("headword")
    ap_patch.add_argument("--inflections", nargs="+")
    ap_patch.add_argument("--derived", nargs="+")
    ap_patch.add_argument("--definition-en")
    ap_patch.add_argument("--when-to-use", nargs="+")
    ap_patch.add_argument("--confusions", nargs="+")
    ap_patch.add_argument("--collocations", nargs="+")
    # --minimal-pair removed (store contrasts in --confusions)
    ap_patch.add_argument("--tags", nargs="+")

    ap_ca = sub.add_parser("cambridge-audio")
    ap_ca.add_argument("headword")
    ap_ca.add_argument("--prefer", default="us", choices=["us", "uk"])

    sub.add_parser("stats")

    args = p.parse_args()

    if args.cmd == "init":
        con = connect(); init_db(con); migrate_db(con)
        print(json.dumps({"status": "ok", "db": DB_PATH}, ensure_ascii=False))
        return
    if args.cmd == "migrate":
        con = connect(); init_db(con)
        print(json.dumps(migrate_db(con), ensure_ascii=False))
        return
    if args.cmd == "add":
        print(json.dumps(add_card(args), ensure_ascii=False))
        return
    if args.cmd == "find":
        print(json.dumps(find_card(args), ensure_ascii=False))
        return
    if args.cmd == "due":
        print(json.dumps(list_due(args), ensure_ascii=False))
        return
    if args.cmd == "hardest":
        print(json.dumps(list_hardest(args), ensure_ascii=False))
        return
    if args.cmd == "grade":
        print(json.dumps(grade_card(args), ensure_ascii=False))
        return
    if args.cmd == "render":
        print(json.dumps(render_card(args), ensure_ascii=False))
        return
    if args.cmd == "patch":
        print(json.dumps(patch_card(args), ensure_ascii=False))
        return
    # (upgrade-existing moved to scripts/local/upgrade_existing.py)
    if args.cmd == "cambridge-audio":
        url = _cambridge_audio_url(args.headword, prefer=args.prefer)
        print(json.dumps({"status": "ok" if url else "missing", "headword": norm_headword(args.headword), "audio_uri": url}, ensure_ascii=False))
        return
    if args.cmd == "stats":
        print(json.dumps(stats(args), ensure_ascii=False))
        return


if __name__ == "__main__":
    main()
