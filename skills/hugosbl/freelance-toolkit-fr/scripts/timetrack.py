#!/usr/bin/env python3
"""Time tracking pour freelances."""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

DATA_DIR = Path.home() / ".freelance"
TIMETRACK_FILE = DATA_DIR / "timetrack.json"
CONFIG_FILE = DATA_DIR / "config.json"


def load_data():
    if TIMETRACK_FILE.exists():
        with open(TIMETRACK_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"current": None, "entries": []}


def save_data(data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(TIMETRACK_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def load_clients():
    clients_file = DATA_DIR / "clients.json"
    if clients_file.exists():
        with open(clients_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def format_duration(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    return f"{h}h{m:02d}"


def cmd_start(args):
    data = load_data()
    if data["current"]:
        proj = data["current"]["project"]
        print(f"Erreur : un timer est déjà actif pour « {proj} ».", file=sys.stderr)
        print("Utilisez 'stop' pour l'arrêter d'abord.", file=sys.stderr)
        sys.exit(1)

    now = datetime.now().isoformat()
    current = {"project": args.project, "start": now}
    if args.client:
        current["client"] = args.client
    data["current"] = current
    save_data(data)

    client_info = f" (client: {args.client})" if args.client else ""
    if args.json:
        result = {"action": "start", "project": args.project, "start": now}
        if args.client:
            result["client"] = args.client
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"▶ Timer démarré pour « {args.project} »{client_info} à {datetime.now().strftime('%H:%M')}")


def cmd_stop(args):
    data = load_data()
    if not data["current"]:
        print("Erreur : aucun timer actif.", file=sys.stderr)
        sys.exit(1)

    start = datetime.fromisoformat(data["current"]["start"])
    end = datetime.now()
    duration = (end - start).total_seconds()

    entry = {
        "project": data["current"]["project"],
        "start": data["current"]["start"],
        "end": end.isoformat(),
        "duration_seconds": round(duration),
    }
    if data["current"].get("client"):
        entry["client"] = data["current"]["client"]
    data["entries"].append(entry)
    data["current"] = None
    save_data(data)

    if args.json:
        print(json.dumps(entry, ensure_ascii=False, indent=2))
    else:
        print(f"⏹ Timer arrêté pour « {entry['project']} »")
        print(f"  Durée : {format_duration(duration)}")


def cmd_status(args):
    data = load_data()
    if not data["current"]:
        if args.json:
            print(json.dumps({"active": False}, ensure_ascii=False))
        else:
            print("Aucun timer actif.")
        return

    start = datetime.fromisoformat(data["current"]["start"])
    elapsed = (datetime.now() - start).total_seconds()

    if args.json:
        print(json.dumps({
            "active": True,
            "project": data["current"]["project"],
            "start": data["current"]["start"],
            "elapsed_seconds": round(elapsed),
        }, ensure_ascii=False, indent=2))
    else:
        print(f"▶ Timer actif : « {data['current']['project']} »")
        print(f"  Démarré à : {start.strftime('%H:%M')}")
        print(f"  Durée : {format_duration(elapsed)}")


def cmd_log(args):
    data = load_data()
    entries = data["entries"]

    # Filtrage
    if args.project:
        proj_lower = args.project.lower()
        entries = [e for e in entries if proj_lower in e["project"].lower()]
    if getattr(args, "from_date", None):
        entries = [e for e in entries if e["start"][:10] >= args.from_date]
    if args.to:
        entries = [e for e in entries if e["start"][:10] <= args.to]

    if args.json:
        print(json.dumps(entries, ensure_ascii=False, indent=2))
        return

    if not entries:
        print("Aucune entrée trouvée.")
        return

    print(f"{'Date':<12} {'Projet':<30} {'Début':<6} {'Fin':<6} {'Durée':<8}")
    print("─" * 62)
    total = 0
    for e in entries:
        start = datetime.fromisoformat(e["start"])
        end = datetime.fromisoformat(e["end"])
        dur = e.get("duration_seconds", (end - start).total_seconds())
        total += dur
        print(f"{start.strftime('%Y-%m-%d'):<12} {e['project']:<30} {start.strftime('%H:%M'):<6} {end.strftime('%H:%M'):<6} {format_duration(dur):<8}")
    print("─" * 62)
    print(f"{'Total':<50} {format_duration(total)}")


def cmd_report(args):
    data = load_data()
    config = load_config()
    entries = data["entries"]

    # Filtre par mois
    if args.month:
        entries = [e for e in entries if e["start"][:7] == args.month]
    else:
        # Mois courant
        current_month = datetime.now().strftime("%Y-%m")
        entries = [e for e in entries if e["start"][:7] == current_month]
        args.month = current_month

    # Agrégation par projet + client associé
    projects = {}
    project_clients = {}
    for e in entries:
        proj = e["project"]
        if proj not in projects:
            projects[proj] = 0
        dur = e.get("duration_seconds")
        if dur is None:
            s = datetime.fromisoformat(e["start"])
            en = datetime.fromisoformat(e["end"])
            dur = (en - s).total_seconds()
        projects[proj] += dur
        if e.get("client") and proj not in project_clients:
            project_clients[proj] = e["client"]

    total_seconds = sum(projects.values())
    total_hours = total_seconds / 3600
    default_rate = config.get("default_rate", 0)

    # Client rates lookup
    clients = load_clients()
    client_rates = {c["name"].lower(): c.get("rate", 0) for c in clients}

    if args.json:
        proj_data = {}
        for p, s in projects.items():
            h = round(s / 3600, 2)
            d = {"seconds": s, "hours": h}
            client_name = project_clients.get(p)
            if client_name:
                d["client"] = client_name
                rate = client_rates.get(client_name.lower(), 0)
                if rate:
                    d["rate"] = rate
                    d["estimated_revenue"] = round(h * rate, 2)
            proj_data[p] = d
        result = {
            "month": args.month,
            "projects": proj_data,
            "total_seconds": total_seconds,
            "total_hours": round(total_hours, 2),
        }
        if default_rate:
            result["rate"] = default_rate
            result["estimated_revenue"] = round(total_hours * default_rate, 2)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    print(f"📊 Rapport — {args.month}")
    print("─" * 65)

    if not projects:
        print("Aucune entrée pour cette période.")
        return

    for proj, secs in sorted(projects.items(), key=lambda x: -x[1]):
        hours = secs / 3600
        client_name = project_clients.get(proj)
        rate = client_rates.get(client_name.lower(), 0) if client_name else 0
        rate_info = f"  → {rate}€/h ≈ {rate * hours:.0f}€" if rate else ""
        print(f"  {proj:<30} {format_duration(secs):>8}  ({hours:.1f}h){rate_info}")

    print("─" * 65)
    print(f"  {'Total':<30} {format_duration(total_seconds):>8}  ({total_hours:.1f}h)")

    if default_rate:
        revenue = total_hours * default_rate
        print(f"\n  💰 Taux horaire : {default_rate}€/h")
        print(f"  💰 Revenu estimé : {revenue:.2f}€")


def main():
    parser = argparse.ArgumentParser(description="Time tracking freelance")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")
    sub = parser.add_subparsers(dest="command")

    # start
    p_start = sub.add_parser("start", help="Démarrer un timer")
    p_start.add_argument("project", help="Nom du projet")
    p_start.add_argument("--client", default=None, help="Client associé")

    # stop
    sub.add_parser("stop", help="Arrêter le timer")

    # status
    sub.add_parser("status", help="État du timer")

    # log
    p_log = sub.add_parser("log", help="Journal des entrées")
    p_log.add_argument("--from", dest="from_date", default=None, help="Date début (YYYY-MM-DD)")
    p_log.add_argument("--to", default=None, help="Date fin (YYYY-MM-DD)")
    p_log.add_argument("--project", default=None, help="Filtrer par projet")

    # report
    p_report = sub.add_parser("report", help="Rapport mensuel")
    p_report.add_argument("--month", default=None, help="Mois (YYYY-MM)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cmds = {
        "start": cmd_start,
        "stop": cmd_stop,
        "status": cmd_status,
        "log": cmd_log,
        "report": cmd_report,
    }
    cmds[args.command](args)


if __name__ == "__main__":
    main()
