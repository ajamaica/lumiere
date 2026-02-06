#!/usr/bin/env python3
"""
quest — CLI for managing multi-step guided processes (quests).

A framework for AI agents to guide humans through complex real-world tasks
with built-in context management, activity logging, and decision tracking.
The quest is the single source of truth — no scattered memory files needed.

Storage: WORKSPACE/data/quests.json
"""

import argparse
import fcntl
import json
import os
import re
import sys
import tempfile
import textwrap
from datetime import datetime, timezone

# ── Colors ──────────────────────────────────────────────────────────────────

class C:
    RESET = "\033[0m"; BOLD = "\033[1m"; DIM = "\033[2m"
    RED = "\033[31m"; GREEN = "\033[32m"; YELLOW = "\033[33m"
    BLUE = "\033[34m"; MAGENTA = "\033[35m"; CYAN = "\033[36m"; WHITE = "\033[37m"

def c(text, *styles):
    return "".join(styles) + str(text) + C.RESET

# ── Storage ─────────────────────────────────────────────────────────────────

WORKSPACE = os.environ.get("WORKSPACE", os.path.expanduser("~/.openclaw/workspace"))
DATA_DIR = os.path.join(WORKSPACE, "data")
DATA_FILE = os.path.join(DATA_DIR, "quests.json")
TMPL_FILE = os.path.join(DATA_DIR, "quest-templates.json")

def _load_json(path):
    if not os.path.exists(path): return {}
    try:
        with open(path, "r") as f: return json.load(f)
    except json.JSONDecodeError as e:
        print(c(f"ERROR: Corrupted {os.path.basename(path)}: {e}", C.RED), file=sys.stderr)
        sys.exit(1)

def _save_json(path, data):
    """Atomic write with file locking to prevent data loss."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    lock_path = path + ".lock"
    with open(lock_path, "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")
        try:
            with os.fdopen(fd, "w") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(tmp, path)
        except:
            os.unlink(tmp)
            raise

def load_quests(): return _load_json(DATA_FILE)
def save_quests(data): _save_json(DATA_FILE, data)
def load_templates(): return _load_json(TMPL_FILE)
def save_templates(data): _save_json(TMPL_FILE, data)

# ── Helpers ─────────────────────────────────────────────────────────────────

def slugify(name):
    s = re.sub(r'[^\w\s-]', '', name.lower().strip())
    result = re.sub(r'-+', '-', re.sub(r'[\s_]+', '-', s)).strip('-')[:64]
    if not result:
        print(c("Name produces empty ID. Use alphanumeric characters.", C.RED)); sys.exit(1)
    return result

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def find_quest(quests, query):
    if not query:
        active = [q for q in quests.values() if q["status"] == "active"]
        return active[0] if len(active) == 1 else None
    if query in quests: return quests[query]
    matches = [q for qid, q in quests.items() if qid.startswith(query)]
    if len(matches) == 1: return matches[0]
    matches = [q for q in quests.values() if query.lower() in q["name"].lower()]
    if len(matches) == 1: return matches[0]
    if len(matches) > 1:
        print(c("Ambiguous:", C.YELLOW), ", ".join(c(m["id"], C.CYAN) for m in matches))
        sys.exit(1)
    return None

def require_quest(quests, query):
    q = find_quest(quests, query)
    if not q:
        print(c(f"Quest not found: {query or '(none)'}", C.RED))
        active = [q for q in quests.values() if q["status"] == "active"]
        if active:
            for a in active: print(f"  {c(a['id'], C.CYAN)} — {a['name']}")
        sys.exit(1)
    return q

def get_step(quest, step_ref):
    parts = str(step_ref).split(".")
    try:
        idx = int(parts[0]) - 1
    except ValueError:
        return None, None, None
    if idx < 0 or idx >= len(quest["steps"]): return None, None, None
    step = quest["steps"][idx]
    if len(parts) == 1: return step, None, idx
    try:
        sub_idx = int(parts[1]) - 1
    except ValueError:
        return None, None, None
    subs = step.get("substeps", [])
    if sub_idx < 0 or sub_idx >= len(subs): return None, None, None
    return step, subs[sub_idx], idx

def current_step(quest):
    for i, step in enumerate(quest["steps"]):
        if step["status"] in ("pending", "active", "blocked"):
            return step, i
    return None, None

def activate_next(quest):
    for step in quest["steps"]:
        if step["status"] == "pending":
            step["status"] = "active"
            return step
    return None

def count_done(quest):
    done = total = 0
    for s in quest["steps"]:
        if s["status"] == "skipped": continue
        total += 1
        if s["status"] == "done": done += 1
    return done, total

def renumber_steps(quest):
    for i, s in enumerate(quest["steps"]):
        s["id"] = i + 1
        for j, sub in enumerate(s.get("substeps", [])):
            sub["id"] = f"{s['id']}.{j+1}"

def add_log(quest, event, detail=""):
    quest.setdefault("log", []).append({"time": now_iso(), "event": event, "detail": detail})

def ensure_quest_fields(quest):
    """Ensure all v2 fields exist on quest (backward compat)."""
    defaults = {
        "tags": [], "priority": "medium", "deadline": None,
        "contacts": [], "links": [],
        "context": {"summary": "", "keyFacts": [], "decisions": [], "risks": []},
        "log": [],
    }
    for k, v in defaults.items():
        if k not in quest:
            quest[k] = v if not isinstance(v, (list, dict)) else type(v)(v)
    if "context" in quest:
        ctx_defaults = {"summary": "", "keyFacts": [], "decisions": [], "risks": []}
        for k, v in ctx_defaults.items():
            if k not in quest["context"]:
                quest["context"][k] = v if not isinstance(v, (list, dict)) else type(v)(v)

# ── Display helpers ─────────────────────────────────────────────────────────

def icon_step(status):
    return {"pending": c("○", C.DIM), "active": c("●", C.BLUE, C.BOLD),
            "done": c("✓", C.GREEN, C.BOLD), "skipped": c("⊘", C.DIM),
            "blocked": c("✗", C.RED, C.BOLD)}.get(status, "?")

def icon_quest(status):
    return {"active": c("▶", C.BLUE, C.BOLD), "completed": c("✓", C.GREEN, C.BOLD),
            "archived": c("▪", C.DIM)}.get(status, "?")

def progress_bar(done, total, width=20):
    if total == 0: return c("░" * width, C.DIM)
    filled = int(width * done / total)
    return c("█" * filled, C.GREEN) + c("░" * (width - filled), C.DIM) + f" {c(f'{done}/{total}', C.BOLD)}"

# ── Commands: Quest lifecycle ───────────────────────────────────────────────

def cmd_new(args):
    quests = load_quests()
    qid = slugify(args.name)
    if qid in quests:
        print(c(f"Quest '{qid}' already exists.", C.RED)); sys.exit(1)
    quest = {
        "id": qid, "name": args.name, "description": args.desc or "",
        "status": "active", "created": now_iso(), "updated": now_iso(),
        "tags": args.tags.split(",") if args.tags else [],
        "priority": args.priority or "medium", "deadline": args.deadline,
        "contacts": [], "links": [],
        "context": {"summary": "", "keyFacts": [], "decisions": [], "risks": []},
        "log": [{"time": now_iso(), "event": "created", "detail": args.desc or ""}],
        "steps": [],
    }
    quests[qid] = quest
    save_quests(quests)
    print(c("✓ Quest created:", C.GREEN, C.BOLD), c(qid, C.CYAN))
    if args.desc: print(f"  {c(args.desc, C.DIM)}")

def cmd_list(args):
    quests = load_quests()
    if not quests:
        hint = 'quest new "Name"'
        print(c("No quests.", C.DIM), f"Create: {c(hint, C.YELLOW)}"); return
    print(f"\n{c('Quests', C.BOLD)}\n")
    for qid, q in quests.items():
        if q["status"] == "archived" and not args.all: continue
        d, t = count_done(q)
        cur, _ = current_step(q)
        cur_l = c(f" → {cur['title']}", C.DIM) if cur else ""
        prio = ""
        if q.get("priority") == "high": prio = c(" !", C.RED, C.BOLD)
        elif q.get("priority") == "low": prio = c(" ↓", C.DIM)
        print(f"  {icon_quest(q['status'])} {c(qid, C.CYAN, C.BOLD)}{prio}  {q['name']}  {progress_bar(d, t)}{cur_l}")
    print()

def cmd_delete(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    if args.archive:
        quest["status"] = "archived"; save_quests(quests)
        print(f"{c('▪', C.DIM)} Archived: {quest['name']}")
    else:
        del quests[quest["id"]]; save_quests(quests)
        print(f"{c('✗', C.RED)} Deleted: {quest['name']}")

# ── Commands: Steps ─────────────────────────────────────────────────────────

def cmd_add(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    step = {
        "id": len(quest["steps"]) + 1, "title": args.title,
        "description": args.desc or "", "status": "pending",
        "substeps": [], "notes": [], "blockedReason": None, "completedAt": None,
    }
    if all(s["status"] in ("done", "skipped") for s in quest["steps"]):
        step["status"] = "active"
    quest["steps"].append(step)
    add_log(quest, "step_added", args.title)
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"{icon_step(step['status'])} Step {c(step['id'], C.BOLD)} added: {args.title}")

def cmd_insert(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    try:
        pos = int(args.position) - 1
    except ValueError:
        print(c("Position must be a number.", C.RED)); sys.exit(1)
    if pos < 0: pos = 0
    if pos > len(quest["steps"]): pos = len(quest["steps"])
    step = {
        "id": 0, "title": args.title, "description": args.desc or "",
        "status": "pending", "substeps": [], "notes": [],
        "blockedReason": None, "completedAt": None,
    }
    quest["steps"].insert(pos, step)
    renumber_steps(quest)
    add_log(quest, "step_inserted", f"Position {pos+1}: {args.title}")
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"{icon_step('pending')} Step inserted at position {c(pos+1, C.BOLD)}: {args.title}")

def cmd_remove(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    step, sub, idx = get_step(quest, args.step)
    if not step:
        print(c(f"Step {args.step} not found.", C.RED)); sys.exit(1)
    if sub:
        step["substeps"] = [s for s in step["substeps"] if s["id"] != sub["id"]]
        # Renumber remaining substeps
        for j, s in enumerate(step["substeps"]):
            s["id"] = f"{step['id']}.{j+1}"
        add_log(quest, "substep_removed", sub["title"])
        print(f"  {c('✗', C.RED)} Substep removed: {sub['title']}")
    else:
        title = step["title"]
        quest["steps"].pop(idx)
        renumber_steps(quest)
        add_log(quest, "step_removed", title)
        print(f"{c('✗', C.RED)} Step removed: {title}")
    quest["updated"] = now_iso()
    save_quests(quests)

def cmd_substep(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    step, _, _ = get_step(quest, args.step)
    if not step:
        print(c(f"Step {args.step} not found.", C.RED)); sys.exit(1)
    sub_num = len(step["substeps"]) + 1
    substep = {"id": f"{step['id']}.{sub_num}", "title": args.title,
               "status": "pending", "completedAt": None}
    step["substeps"].append(substep)
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"  {icon_step('pending')} Substep {c(substep['id'], C.BOLD)}: {args.title}")

def cmd_done(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)

    if args.step:
        step, substep, _ = get_step(quest, args.step)
        if not step:
            print(c(f"Step {args.step} not found.", C.RED)); sys.exit(1)
        target = substep or step
        if target["status"] == "done":
            print(c(f"Already done: {target['title']}", C.YELLOW)); return
        if substep:
            substep["status"] = "done"; substep["completedAt"] = now_iso()
            add_log(quest, "substep_done", substep["title"])
            print(f"  {c('✓', C.GREEN, C.BOLD)} {c(substep['id'], C.BOLD)}: {substep['title']}")
            if all(s["status"] in ("done", "skipped") for s in step["substeps"]):
                step["status"] = "done"; step["completedAt"] = now_iso()
                add_log(quest, "step_done", step["title"])
                print(f"{c('✓', C.GREEN, C.BOLD)} Step {c(step['id'], C.BOLD)} auto-completed")
                act = activate_next(quest)
                if act: print(f"\n{c('→ Next:', C.BLUE, C.BOLD)} {act['title']}")
        else:
            step["status"] = "done"; step["completedAt"] = now_iso()
            for sub in step.get("substeps", []):
                if sub["status"] not in ("done", "skipped"):
                    sub["status"] = "done"; sub["completedAt"] = now_iso()
            add_log(quest, "step_done", step["title"])
            print(f"{c('✓', C.GREEN, C.BOLD)} Step {c(step['id'], C.BOLD)}: {step['title']}")
            act = activate_next(quest)
            if act: print(f"\n{c('→ Next:', C.BLUE, C.BOLD)} {act['title']}")
    else:
        step, _ = current_step(quest)
        if not step:
            print(c("No active step.", C.YELLOW)); return
        step["status"] = "done"; step["completedAt"] = now_iso()
        for sub in step.get("substeps", []):
            if sub["status"] not in ("done", "skipped"):
                sub["status"] = "done"; sub["completedAt"] = now_iso()
        add_log(quest, "step_done", step["title"])
        print(f"{c('✓', C.GREEN, C.BOLD)} Step {c(step['id'], C.BOLD)}: {step['title']}")
        act = activate_next(quest)
        if act: print(f"\n{c('→ Next:', C.BLUE, C.BOLD)} {act['title']}")

    d, t = count_done(quest)
    if t > 0 and d == t:
        quest["status"] = "completed"; quest["completedAt"] = now_iso()
        add_log(quest, "quest_completed", "")
        print(f"\n{c('🎉 Quest completed!', C.GREEN, C.BOLD)} {quest['name']}")
    quest["updated"] = now_iso()
    save_quests(quests)

def cmd_skip(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    if args.step:
        step, sub, _ = get_step(quest, args.step)
        target = sub or step
    else:
        target, _ = current_step(quest)
    if not target:
        print(c("Nothing to skip.", C.YELLOW)); return
    target["status"] = "skipped"
    for s in target.get("substeps", []): s["status"] = "skipped"
    add_log(quest, "skipped", target["title"])
    print(f"{icon_step('skipped')} Skipped: {target['title']}")
    if not args.step or "." not in str(args.step):
        act = activate_next(quest)
        if act: print(f"\n{c('→ Next:', C.BLUE, C.BOLD)} {act['title']}")
    quest["updated"] = now_iso()
    save_quests(quests)

def cmd_block(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    step, _, _ = get_step(quest, args.step)
    if not step: print(c(f"Step {args.step} not found.", C.RED)); sys.exit(1)
    step["status"] = "blocked"; step["blockedReason"] = args.reason
    add_log(quest, "blocked", f"Step {step['id']}: {args.reason}")
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"{icon_step('blocked')} Blocked: {args.reason}")

def cmd_unblock(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    step, _, _ = get_step(quest, args.step)
    if not step: print(c(f"Step {args.step} not found.", C.RED)); sys.exit(1)
    step["status"] = "active"; step["blockedReason"] = None
    add_log(quest, "unblocked", f"Step {step['id']}")
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"{icon_step('active')} Unblocked: Step {step['id']}")

def cmd_edit(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    if args.step:
        step, sub, _ = get_step(quest, args.step)
        if not step: print(c(f"Step {args.step} not found.", C.RED)); sys.exit(1)
        target = sub or step
        if args.title: target["title"] = args.title
        if args.desc and "description" in target: target["description"] = args.desc
        print(f"  {c('✎', C.BOLD)} Updated: {target['title']}")
    else:
        # Edit quest-level fields
        if args.title: quest["name"] = args.title
        if args.desc: quest["description"] = args.desc
        print(f"  {c('✎', C.BOLD)} Quest updated")
    quest["updated"] = now_iso()
    save_quests(quests)

def cmd_reorder(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    step, _, idx = get_step(quest, args.step)
    if not step: print(c(f"Step {args.step} not found.", C.RED)); sys.exit(1)
    try:
        new_pos = int(args.position) - 1
    except ValueError:
        print(c("Position must be a number.", C.RED)); sys.exit(1)
    if new_pos < 0 or new_pos >= len(quest["steps"]):
        print(c(f"Invalid position.", C.RED)); sys.exit(1)
    quest["steps"].pop(idx)
    quest["steps"].insert(new_pos, step)
    renumber_steps(quest)
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"  {c('↕', C.BOLD)} Moved to position {args.position}")

# ── Commands: Context & Memory ──────────────────────────────────────────────

def cmd_note(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    step, _, _ = get_step(quest, args.step)
    if not step: print(c(f"Step {args.step} not found.", C.RED)); sys.exit(1)
    step["notes"].append({"text": args.text, "time": now_iso()})
    add_log(quest, "note", f"Step {step['id']}: {args.text}")
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"  {c('📝', C.BOLD)} Note on step {c(step['id'], C.BOLD)}")

def cmd_learn(args):
    """Record a key fact discovered during the process."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    quest["context"]["keyFacts"].append(args.fact)
    add_log(quest, "learned", args.fact)
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"  {c('💡', C.BOLD)} Fact recorded")

def cmd_decide(args):
    """Record a decision made during the process."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    decision = {"decision": args.decision, "reason": args.reason or "", "time": now_iso()}
    quest["context"]["decisions"].append(decision)
    add_log(quest, "decided", f"{args.decision} — {args.reason or 'no reason given'}")
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"  {c('⚖', C.BOLD)} Decision recorded")

def cmd_risk(args):
    """Record a risk or concern."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    quest["context"]["risks"].append(args.risk)
    add_log(quest, "risk_noted", args.risk)
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"  {c('⚠', C.YELLOW, C.BOLD)} Risk noted")

def cmd_summarize(args):
    """Update the agent-maintained context summary."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    quest["context"]["summary"] = args.text
    add_log(quest, "summary_updated", "")
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"  {c('📋', C.BOLD)} Summary updated")

def cmd_meta(args):
    """Set quest metadata (priority, deadline, tags)."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    if args.priority: quest["priority"] = args.priority
    if args.deadline: quest["deadline"] = args.deadline
    if args.tags:
        new_tags = [t.strip() for t in args.tags.split(",")]
        if args.remove:
            quest["tags"] = [t for t in quest["tags"] if t not in new_tags]
        else:
            quest["tags"] = list(set(quest["tags"] + new_tags))
    quest["updated"] = now_iso()
    save_quests(quests)
    print(f"  {c('⚙', C.BOLD)} Metadata updated")
    if quest.get("priority"): print(f"  Priority: {quest['priority']}")
    if quest.get("deadline"): print(f"  Deadline: {quest['deadline']}")
    if quest.get("tags"): print(f"  Tags: {', '.join(quest['tags'])}")

def cmd_contact(args):
    """Add or list contacts for a quest."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    if args.name:
        contact = {"name": args.name}
        if args.phone: contact["phone"] = args.phone
        if args.email: contact["email"] = args.email
        if args.role: contact["role"] = args.role
        if args.url: contact["url"] = args.url
        quest["contacts"].append(contact)
        quest["updated"] = now_iso()
        save_quests(quests)
        print(f"  {c('👤', C.BOLD)} Contact added: {args.name}")
    else:
        if not quest["contacts"]:
            print(c("  No contacts.", C.DIM)); return
        for ct in quest["contacts"]:
            parts = [c(ct["name"], C.BOLD)]
            if ct.get("role"): parts.append(c(f"({ct['role']})", C.DIM))
            if ct.get("phone"): parts.append(ct["phone"])
            if ct.get("email"): parts.append(ct["email"])
            if ct.get("url"): parts.append(ct["url"])
            print(f"  👤 {' '.join(parts)}")

def cmd_link(args):
    """Add or list links for a quest."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    if args.url:
        link = {"url": args.url, "label": args.label or args.url}
        quest["links"].append(link)
        quest["updated"] = now_iso()
        save_quests(quests)
        print(f"  {c('🔗', C.BOLD)} Link added: {link['label']}")
    else:
        if not quest["links"]:
            print(c("  No links.", C.DIM)); return
        for lk in quest["links"]:
            print(f"  🔗 {c(lk['label'], C.BOLD)} — {c(lk['url'], C.CYAN)}")

def cmd_log_view(args):
    """View activity log."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    log = quest.get("log", [])
    if not log:
        print(c("  No activity.", C.DIM)); return
    try:
        limit = int(args.limit) if args.limit else 20
    except ValueError:
        limit = 20
    entries = log[-limit:]
    print(f"\n{c('Activity Log', C.BOLD)} ({len(log)} total, showing last {len(entries)})\n")
    for entry in entries:
        evt = entry["event"]
        color = C.GREEN if "done" in evt or "completed" in evt else C.BLUE if "added" in evt or "created" in evt else C.YELLOW if "blocked" in evt or "risk" in evt else C.DIM
        time_short = entry["time"][5:16].replace("T", " ")
        print(f"  {c(time_short, C.DIM)} {c(evt, color, C.BOLD)} {entry.get('detail', '')}")
    print()

# ── Commands: Context (the killer feature) ──────────────────────────────────

def cmd_context(args):
    """Generate compact context blob — designed for minimal token usage.
    This is what the agent loads to understand the quest state instantly."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)

    d, t = count_done(quest)
    cur, _ = current_step(quest)
    lines = []

    # Header
    lines.append(f"QUEST: {quest['name']} [{quest['status']}] {d}/{t}")
    if quest.get("priority") != "medium":
        lines.append(f"PRIORITY: {quest['priority']}")
    if quest.get("deadline"):
        lines.append(f"DEADLINE: {quest['deadline']}")
    if quest.get("tags"):
        lines.append(f"TAGS: {', '.join(quest['tags'])}")

    # Summary
    if quest["context"].get("summary"):
        lines.append(f"\nSUMMARY: {quest['context']['summary']}")

    # Key facts
    if quest["context"].get("keyFacts"):
        lines.append("\nKEY FACTS:")
        for f in quest["context"]["keyFacts"]:
            lines.append(f"- {f}")

    # Decisions
    if quest["context"].get("decisions"):
        lines.append("\nDECISIONS:")
        for dc in quest["context"]["decisions"]:
            r = f" ({dc['reason']})" if dc.get("reason") else ""
            lines.append(f"- {dc['decision']}{r}")

    # Risks
    if quest["context"].get("risks"):
        lines.append("\nRISKS:")
        for r in quest["context"]["risks"]:
            lines.append(f"- {r}")

    # Contacts
    if quest.get("contacts"):
        lines.append("\nCONTACTS:")
        for ct in quest["contacts"]:
            parts = [ct["name"]]
            if ct.get("role"): parts[0] += f" ({ct['role']})"
            if ct.get("phone"): parts.append(ct["phone"])
            if ct.get("email"): parts.append(ct["email"])
            lines.append(f"- {' | '.join(parts)}")

    # Current step
    if cur:
        blocked = f" [BLOCKED: {cur.get('blockedReason', '')}]" if cur["status"] == "blocked" else ""
        lines.append(f"\nCURRENT STEP {cur['id']}: {cur['title']}{blocked}")
        if cur.get("description"):
            lines.append(f"  {cur['description']}")
        for sub in cur.get("substeps", []):
            mark = "✓" if sub["status"] == "done" else "○"
            lines.append(f"  {mark} {sub['id']} {sub['title']}")
        if cur.get("notes"):
            for n in cur["notes"]:
                lines.append(f"  📝 {n['text']}")

    # Steps overview (compact)
    lines.append(f"\nSTEPS:")
    for step in quest["steps"]:
        mark = {"done": "✓", "active": "●", "pending": "○",
                "skipped": "⊘", "blocked": "✗"}.get(step["status"], "?")
        extra = ""
        if step["status"] == "blocked":
            extra = f" [BLOCKED: {step.get('blockedReason', '')}]"
        elif step["status"] == "done" and step.get("completedAt"):
            extra = f" [{step['completedAt'][:10]}]"
        lines.append(f"  {mark} {step['id']}. {step['title']}{extra}")

    # Recent log (last 5)
    recent = quest.get("log", [])[-5:]
    if recent:
        lines.append(f"\nRECENT:")
        for e in recent:
            lines.append(f"  {e['time'][:16]} {e['event']}: {e.get('detail', '')}")

    output = "\n".join(lines)

    if args.json:
        # JSON mode: structured context for programmatic use
        ctx = {
            "quest": quest["id"], "name": quest["name"],
            "status": quest["status"], "progress": f"{d}/{t}",
            "priority": quest.get("priority"), "deadline": quest.get("deadline"),
            "summary": quest["context"].get("summary", ""),
            "keyFacts": quest["context"].get("keyFacts", []),
            "decisions": quest["context"].get("decisions", []),
            "risks": quest["context"].get("risks", []),
            "contacts": quest.get("contacts", []),
            "currentStep": {"id": cur["id"], "title": cur["title"],
                           "status": cur["status"],
                           "substeps": cur.get("substeps", []),
                           "notes": cur.get("notes", [])} if cur else None,
            "steps": [{"id": s["id"], "title": s["title"], "status": s["status"]}
                     for s in quest["steps"]],
        }
        print(json.dumps(ctx, indent=2, ensure_ascii=False))
    else:
        print(output)

# ── Commands: Display ───────────────────────────────────────────────────────

def cmd_next(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    d, t = count_done(quest)
    print(f"\n{c(quest['name'], C.BOLD, C.CYAN)}  {progress_bar(d, t)}")
    print()
    step, _ = current_step(quest)
    if not step:
        if quest["status"] == "completed":
            print(c("  🎉 Quest completed!", C.GREEN, C.BOLD))
        else:
            print(c("  No active steps.", C.YELLOW))
        return
    status_label = ""
    if step["status"] == "blocked":
        reason = step.get("blockedReason", "?")
        status_label = c(f" [BLOCKED: {reason}]", C.RED, C.BOLD)
    step_id = step["id"]
    print(f"  {c(f'Step {step_id}', C.BLUE, C.BOLD)}{status_label}")
    print(f"  {c(step['title'], C.BOLD, C.WHITE)}")
    if step.get("description"):
        print(f"  {c(step['description'], C.DIM)}")
    print()
    for sub in step.get("substeps", []):
        print(f"    {icon_step(sub['status'])} {sub['id']}  {sub['title']}")
    if step.get("substeps"): print()
    if step.get("notes"):
        for n in step["notes"]:
            print(f"  {c('📝', C.DIM)} {n['text']}")
        print()
    # Context hints for the agent
    facts = quest["context"].get("keyFacts", [])
    if facts:
        print(f"  {c('Context:', C.DIM)}")
        for f in facts[-3:]:
            print(f"    {c('•', C.DIM)} {f}")
        print()
    qref = quest["id"]
    if step.get("substeps"):
        pending = [s for s in step["substeps"] if s["status"] not in ("done", "skipped")]
        if pending:
            print(f"  {c('Next:', C.DIM)} quest done {qref} {pending[0]['id']}")
    else:
        print(f"  {c('Done:', C.DIM)} quest done {qref}")

def cmd_show(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    d, t = count_done(quest)
    print(f"\n{icon_quest(quest['status'])} {c(quest['name'], C.BOLD, C.CYAN)}  [{c(quest['id'], C.DIM)}]")
    if quest.get("description"):
        print(f"  {c(quest['description'], C.DIM)}")
    print(f"  {progress_bar(d, t)}  {c(quest['status'], C.BOLD)}")
    meta_parts = []
    if quest.get("priority") and quest["priority"] != "medium":
        meta_parts.append(f"priority:{quest['priority']}")
    if quest.get("deadline"):
        meta_parts.append(f"deadline:{quest['deadline']}")
    if quest.get("tags"):
        meta_parts.append(f"tags:{','.join(quest['tags'])}")
    if meta_parts:
        print(f"  {c(' | '.join(meta_parts), C.DIM)}")
    print()
    cur, _ = current_step(quest)
    for step in quest["steps"]:
        is_cur = (step == cur)
        prefix = c("▸ ", C.BLUE, C.BOLD) if is_cur else "  "
        ts = (C.BOLD, C.WHITE) if is_cur else ((C.DIM,) if step["status"] == "done" else (C.RESET,))
        bl = c(f" ⚠ {step.get('blockedReason', '')}", C.RED) if step["status"] == "blocked" else ""
        print(f"  {prefix}{icon_step(step['status'])} {c(step['id'], C.BOLD)}. {c(step['title'], *ts)}{bl}")
        if step.get("description") and is_cur:
            print(f"       {c(step['description'], C.DIM)}")
        for sub in step.get("substeps", []):
            ss = (C.DIM,) if sub["status"] == "done" else (C.RESET,)
            print(f"       {icon_step(sub['status'])} {c(sub['id'], C.DIM)}  {c(sub['title'], *ss)}")
        if step.get("notes") and (is_cur or args.verbose):
            for n in step["notes"]:
                print(f"       {c('📝', C.DIM)} {n['text']}")
    # Context section
    ctx = quest.get("context", {})
    if ctx.get("keyFacts") or ctx.get("decisions") or ctx.get("risks"):
        print(f"\n  {c('── Context ──', C.DIM)}")
        for f in ctx.get("keyFacts", []):
            print(f"  {c('💡', C.DIM)} {f}")
        for dc in ctx.get("decisions", []):
            r = f" — {dc['reason']}" if dc.get("reason") else ""
            print(f"  {c('⚖', C.DIM)} {dc['decision']}{r}")
        for r in ctx.get("risks", []):
            print(f"  {c('⚠', C.YELLOW)} {r}")
    if quest.get("contacts"):
        print(f"\n  {c('── Contacts ──', C.DIM)}")
        for ct in quest["contacts"]:
            parts = [c(ct["name"], C.BOLD)]
            if ct.get("role"): parts.append(c(f"({ct['role']})", C.DIM))
            if ct.get("phone"): parts.append(ct["phone"])
            print(f"  👤 {' '.join(parts)}")
    print()

def cmd_status(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    d, t = count_done(quest)
    blocked = sum(1 for s in quest["steps"] if s["status"] == "blocked")
    print(f"\n{c(quest['name'], C.BOLD, C.CYAN)}")
    print(f"  Progress: {progress_bar(d, t)}")
    if blocked: print(f"  Blocked:  {c(blocked, C.RED, C.BOLD)} step(s)")
    cur, _ = current_step(quest)
    if cur:
        bl = c(" [BLOCKED]", C.RED) if cur["status"] == "blocked" else ""
        cur_id = cur["id"]
        print(f"  Current:  {c(f'Step {cur_id}', C.BLUE)} — {cur['title']}{bl}")
    elif quest["status"] == "completed":
        print(f"  {c('🎉 Completed!', C.GREEN, C.BOLD)}")
    print()

def cmd_brief(args):
    """Human-friendly summary for messaging to the user."""
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    d, t = count_done(quest)
    cur, _ = current_step(quest)
    lines = [f"**{quest['name']}** — {d}/{t} steps done"]
    if quest["context"].get("summary"):
        lines.append(quest["context"]["summary"])
    if cur:
        bl = f" ⚠️ BLOCKED: {cur.get('blockedReason', '')}" if cur["status"] == "blocked" else ""
        lines.append(f"\n**Current:** Step {cur['id']} — {cur['title']}{bl}")
        if cur.get("substeps"):
            done_s = sum(1 for s in cur["substeps"] if s["status"] == "done")
            lines.append(f"Substeps: {done_s}/{len(cur['substeps'])} done")
            pending = [s for s in cur["substeps"] if s["status"] not in ("done", "skipped")]
            if pending:
                lines.append(f"Next up: {pending[0]['title']}")
    if quest["context"].get("risks"):
        lines.append(f"\n**Risks:** {'; '.join(quest['context']['risks'][:3])}")
    print("\n".join(lines))

# ── Commands: Templates ─────────────────────────────────────────────────────

def cmd_template(args):
    if args.sub == "save":
        quests = load_quests()
        quest = require_quest(quests, args.quest)
        templates = load_templates()
        tmpl = {
            "name": args.template_name or quest["name"],
            "description": quest.get("description", ""),
            "steps": [],
        }
        for step in quest["steps"]:
            s = {"title": step["title"], "description": step.get("description", ""),
                 "substeps": [{"title": sub["title"]} for sub in step.get("substeps", [])]}
            tmpl["steps"].append(s)
        templates[slugify(tmpl["name"])] = tmpl
        save_templates(templates)
        print(f"  {c('📦', C.BOLD)} Template saved: {tmpl['name']}")

    elif args.sub == "list":
        templates = load_templates()
        if not templates:
            print(c("  No templates.", C.DIM)); return
        for tid, t in templates.items():
            print(f"  📦 {c(tid, C.CYAN, C.BOLD)} — {t['name']} ({len(t['steps'])} steps)")

    elif args.sub == "use":
        templates = load_templates()
        tid = args.template
        if tid not in templates:
            matches = [t for t in templates if tid in t]
            if len(matches) == 1: tid = matches[0]
            else:
                print(c(f"Template not found: {tid}", C.RED)); sys.exit(1)
        tmpl = templates[tid]
        # Create quest from template
        quest_name = args.name or tmpl["name"]
        quests = load_quests()
        qid = slugify(quest_name)
        if qid in quests:
            print(c(f"Quest '{qid}' already exists.", C.RED)); sys.exit(1)
        quest = {
            "id": qid, "name": quest_name, "description": tmpl.get("description", ""),
            "status": "active", "created": now_iso(), "updated": now_iso(),
            "tags": [], "priority": "medium", "deadline": None,
            "contacts": [], "links": [],
            "context": {"summary": "", "keyFacts": [], "decisions": [], "risks": []},
            "log": [{"time": now_iso(), "event": "created", "detail": f"From template: {tid}"}],
            "steps": [],
        }
        for i, st in enumerate(tmpl["steps"]):
            step = {
                "id": i + 1, "title": st["title"], "description": st.get("description", ""),
                "status": "active" if i == 0 else "pending",
                "substeps": [], "notes": [], "blockedReason": None, "completedAt": None,
            }
            for j, sub in enumerate(st.get("substeps", [])):
                step["substeps"].append({
                    "id": f"{i+1}.{j+1}", "title": sub["title"],
                    "status": "pending", "completedAt": None,
                })
            quest["steps"].append(step)
        quests[qid] = quest
        save_quests(quests)
        print(f"{c('✓', C.GREEN, C.BOLD)} Quest created from template: {c(qid, C.CYAN)}")

# ── Commands: Data ──────────────────────────────────────────────────────────

def cmd_export(args):
    quests = load_quests()
    quest = require_quest(quests, args.quest)
    ensure_quest_fields(quest)
    d, t = count_done(quest)
    lines = [f"# {quest['name']}"]
    if quest.get("description"): lines.append(f"\n{quest['description']}")
    lines.append(f"\n**Progress:** {d}/{t} | **Priority:** {quest.get('priority','medium')} | **Status:** {quest['status']}")
    if quest.get("deadline"): lines.append(f"**Deadline:** {quest['deadline']}")
    if quest.get("tags"): lines.append(f"**Tags:** {', '.join(quest['tags'])}")
    # Context
    ctx = quest.get("context", {})
    if ctx.get("summary"): lines.extend(["", f"## Summary", ctx["summary"]])
    if ctx.get("keyFacts"):
        lines.extend(["", "## Key Facts"])
        for f in ctx["keyFacts"]: lines.append(f"- {f}")
    if ctx.get("decisions"):
        lines.extend(["", "## Decisions"])
        for dc in ctx["decisions"]:
            r = f" — {dc['reason']}" if dc.get("reason") else ""
            lines.append(f"- {dc['decision']}{r}")
    if ctx.get("risks"):
        lines.extend(["", "## Risks"])
        for r in ctx["risks"]: lines.append(f"- {r}")
    # Contacts
    if quest.get("contacts"):
        lines.extend(["", "## Contacts"])
        for ct in quest["contacts"]:
            parts = [ct["name"]]
            if ct.get("role"): parts[0] += f" ({ct['role']})"
            if ct.get("phone"): parts.append(ct["phone"])
            if ct.get("email"): parts.append(ct["email"])
            lines.append(f"- {' | '.join(parts)}")
    # Steps
    lines.extend(["", "## Steps", ""])
    for step in quest["steps"]:
        check = "x" if step["status"] == "done" else " "
        if step["status"] == "skipped": check = "-"
        bl = f" ⚠️ BLOCKED: {step.get('blockedReason', '')}" if step["status"] == "blocked" else ""
        lines.append(f"- [{check}] **Step {step['id']}:** {step['title']}{bl}")
        if step.get("description"): lines.append(f"  {step['description']}")
        for sub in step.get("substeps", []):
            sc = "x" if sub["status"] == "done" else ("-" if sub["status"] == "skipped" else " ")
            lines.append(f"  - [{sc}] {sub['id']}: {sub['title']}")
        for n in step.get("notes", []):
            lines.append(f"  - 📝 {n['text']} ({n['time'][:10]})")
    output = "\n".join(lines)
    if args.file:
        with open(args.file, "w") as f: f.write(output)
        print(c(f"Exported to {args.file}", C.GREEN))
    else:
        print(output)

def cmd_json(args):
    quests = load_quests()
    if args.quest:
        quest = require_quest(quests, args.quest)
        print(json.dumps(quest, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(quests, indent=2, ensure_ascii=False))

# ── Parser ──────────────────────────────────────────────────────────────────

def build_parser():
    p = argparse.ArgumentParser(prog="quest", description="Multi-step quest tracker for AI-guided processes.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
        workflow:
          quest new "Fix car" --priority high --deadline 2026-03-01
          quest add car "Get docs" && quest substep car 1 "Find CoC"
          quest learn car "Tax exemption requires 12 months abroad"
          quest decide car "Use contract end dates as return proof" --reason "No PERE registration"
          quest contact car "Tres Mares" --phone "942 751 885" --role "Insurance"
          quest next car                    # Show current step to human
          quest done car 1.1                # Mark substep done
          quest context car                 # Full context in minimal tokens
          quest brief car                   # Human-friendly summary
          quest template save car "Vehicle registration EU"
        """))
    sub = p.add_subparsers(dest="command")

    # Lifecycle
    s = sub.add_parser("new", help="Create quest")
    s.add_argument("name"); s.add_argument("--desc", "-d"); s.add_argument("--tags")
    s.add_argument("--priority", choices=["low", "medium", "high"]); s.add_argument("--deadline")

    s = sub.add_parser("list", help="List quests"); s.add_argument("--all", "-a", action="store_true")
    s = sub.add_parser("delete", help="Delete/archive"); s.add_argument("quest"); s.add_argument("--archive", action="store_true")

    # Steps
    s = sub.add_parser("add", help="Add step"); s.add_argument("quest"); s.add_argument("title"); s.add_argument("--desc", "-d")
    s = sub.add_parser("insert", help="Insert step at position"); s.add_argument("quest"); s.add_argument("position"); s.add_argument("title"); s.add_argument("--desc", "-d")
    s = sub.add_parser("remove", help="Remove step/substep"); s.add_argument("quest"); s.add_argument("step")
    s = sub.add_parser("substep", help="Add substep"); s.add_argument("quest"); s.add_argument("step"); s.add_argument("title")
    s = sub.add_parser("done", help="Complete step"); s.add_argument("quest", nargs="?"); s.add_argument("step", nargs="?")
    s = sub.add_parser("skip", help="Skip step"); s.add_argument("quest", nargs="?"); s.add_argument("step", nargs="?")
    s = sub.add_parser("block", help="Block step"); s.add_argument("quest"); s.add_argument("step"); s.add_argument("reason")
    s = sub.add_parser("unblock", help="Unblock step"); s.add_argument("quest"); s.add_argument("step")
    s = sub.add_parser("edit", help="Edit step or quest"); s.add_argument("quest"); s.add_argument("step", nargs="?"); s.add_argument("--title", "-t"); s.add_argument("--desc", "-d")
    s = sub.add_parser("reorder", help="Move step"); s.add_argument("quest"); s.add_argument("step"); s.add_argument("position")

    # Context & Memory
    s = sub.add_parser("note", help="Add note to step"); s.add_argument("quest"); s.add_argument("step"); s.add_argument("text")
    s = sub.add_parser("learn", help="Record key fact"); s.add_argument("quest"); s.add_argument("fact")
    s = sub.add_parser("decide", help="Record decision"); s.add_argument("quest"); s.add_argument("decision"); s.add_argument("--reason", "-r")
    s = sub.add_parser("risk", help="Note a risk"); s.add_argument("quest"); s.add_argument("risk")
    s = sub.add_parser("summarize", help="Update context summary"); s.add_argument("quest"); s.add_argument("text")
    s = sub.add_parser("context", help="Compact context dump"); s.add_argument("quest", nargs="?"); s.add_argument("--json", action="store_true")
    s = sub.add_parser("brief", help="Human-friendly summary"); s.add_argument("quest", nargs="?")
    s = sub.add_parser("log", help="View activity log"); s.add_argument("quest", nargs="?"); s.add_argument("--limit", "-n")

    # Metadata
    s = sub.add_parser("meta", help="Set metadata"); s.add_argument("quest")
    s.add_argument("--priority", choices=["low", "medium", "high"]); s.add_argument("--deadline"); s.add_argument("--tags"); s.add_argument("--remove", action="store_true")
    s = sub.add_parser("contact", help="Add/list contacts"); s.add_argument("quest"); s.add_argument("name", nargs="?")
    s.add_argument("--phone"); s.add_argument("--email"); s.add_argument("--role"); s.add_argument("--url")
    s = sub.add_parser("link", help="Add/list links"); s.add_argument("quest"); s.add_argument("url", nargs="?"); s.add_argument("--label")

    # Templates
    s = sub.add_parser("template", help="Manage templates")
    ts = s.add_subparsers(dest="sub")
    t = ts.add_parser("save"); t.add_argument("quest"); t.add_argument("template_name", nargs="?")
    t = ts.add_parser("list")
    t = ts.add_parser("use"); t.add_argument("template"); t.add_argument("name", nargs="?")

    # Display
    s = sub.add_parser("next", help="Current step only"); s.add_argument("quest", nargs="?")
    s = sub.add_parser("show", help="Full quest view"); s.add_argument("quest", nargs="?"); s.add_argument("--verbose", "-v", action="store_true")
    s = sub.add_parser("status", help="Quick status"); s.add_argument("quest", nargs="?")

    # Data
    s = sub.add_parser("export", help="Export markdown"); s.add_argument("quest"); s.add_argument("--file", "-f")
    s = sub.add_parser("json", help="Raw JSON"); s.add_argument("quest", nargs="?")

    return p

def main():
    try:
        parser = build_parser()
        args = parser.parse_args()
        cmds = {
            "new": cmd_new, "list": cmd_list, "delete": cmd_delete,
            "add": cmd_add, "insert": cmd_insert, "remove": cmd_remove,
            "substep": cmd_substep, "done": cmd_done, "skip": cmd_skip,
            "block": cmd_block, "unblock": cmd_unblock, "edit": cmd_edit, "reorder": cmd_reorder,
            "note": cmd_note, "learn": cmd_learn, "decide": cmd_decide,
            "risk": cmd_risk, "summarize": cmd_summarize,
            "context": cmd_context, "brief": cmd_brief, "log": cmd_log_view,
            "meta": cmd_meta, "contact": cmd_contact, "link": cmd_link,
            "template": cmd_template,
            "next": cmd_next, "show": cmd_show, "status": cmd_status,
            "export": cmd_export, "json": cmd_json,
        }
        if not args.command: parser.print_help(); return
        fn = cmds.get(args.command)
        if fn: fn(args)
        else: parser.print_help()
    except KeyboardInterrupt:
        sys.exit(130)
    except SystemExit:
        raise
    except Exception as e:
        print(c(f"Error: {e}", C.RED), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
