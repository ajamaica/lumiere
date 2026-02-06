#!/usr/bin/env python3
"""Dashboard revenus freelance."""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

def _get_duration(e):
    if 'duration_seconds' in e:
        return e['duration_seconds']
    from datetime import datetime
    s = datetime.fromisoformat(e['start'])
    en = datetime.fromisoformat(e['end'])
    return (en - s).total_seconds()



DATA_DIR = Path.home() / ".freelance"
INVOICES_DIR = DATA_DIR / "invoices"
TIMETRACK_FILE = DATA_DIR / "timetrack.json"
CONFIG_FILE = DATA_DIR / "config.json"


def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def load_invoices(year=None):
    invoices = []
    if not INVOICES_DIR.exists():
        return invoices

    for json_file in sorted(INVOICES_DIR.glob("*.json")):
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        if year and not data["date"].startswith(str(year)):
            continue
        invoices.append(data)
    return invoices


def load_timetrack(year=None):
    if not TIMETRACK_FILE.exists():
        return []

    with open(TIMETRACK_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    entries = data.get("entries", [])
    if year:
        entries = [e for e in entries if e["start"].startswith(str(year))]
    return entries


def cmd_summary(args):
    year = args.year or datetime.now().year
    invoices = load_invoices(year)
    entries = load_timetrack(year)

    # CA total
    total_ca = sum(inv["total_ttc"] for inv in invoices)

    # Paid vs unpaid
    paid_invoices = [inv for inv in invoices if inv.get("paid", False)]
    unpaid_invoices = [inv for inv in invoices if not inv.get("paid", False)]
    paid_total = sum(inv["total_ttc"] for inv in paid_invoices)
    unpaid_total = sum(inv["total_ttc"] for inv in unpaid_invoices)

    # CA par client
    ca_by_client = defaultdict(float)
    for inv in invoices:
        ca_by_client[inv["client"]["name"]] += inv["total_ttc"]

    # CA par mois
    ca_by_month = defaultdict(float)
    for inv in invoices:
        month = inv["date"][:7]
        ca_by_month[month] += inv["total_ttc"]

    # Heures
    total_seconds = sum(_get_duration(e) for e in entries)
    total_hours = total_seconds / 3600
    working_days = round(total_hours / 7, 1)

    # Taux effectif : ne compter que les heures des mois avec CA
    months_with_ca = set(ca_by_month.keys())
    relevant_seconds = sum(_get_duration(e) for e in entries if e["start"][:7] in months_with_ca)
    relevant_hours = relevant_seconds / 3600
    effective_rate = total_ca / relevant_hours if relevant_hours >= 0.1 else 0

    # Nombre de factures
    nb_invoices = len(invoices)

    if args.json:
        result = {
            "year": year,
            "total_ca": round(total_ca, 2),
            "nb_invoices": nb_invoices,
            "paid_count": len(paid_invoices),
            "paid_total": round(paid_total, 2),
            "unpaid_count": len(unpaid_invoices),
            "unpaid_total": round(unpaid_total, 2),
            "ca_by_client": {k: round(v, 2) for k, v in sorted(ca_by_client.items(), key=lambda x: -x[1])},
            "ca_by_month": {k: round(v, 2) for k, v in sorted(ca_by_month.items())},
            "total_hours": round(total_hours, 2),
            "working_days": working_days,
            "effective_rate": round(effective_rate, 2),
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    print(f"📊 Résumé — {year}")
    print("═" * 50)

    # CA
    print(f"\n💰 Chiffre d'affaires : {total_ca:,.2f}€")
    print(f"📄 Factures : {nb_invoices} ({len(paid_invoices)} payée(s), {len(unpaid_invoices)} en attente)")
    if unpaid_total > 0:
        print(f"   💸 Payé : {paid_total:,.2f}€  |  ⏳ Impayé : {unpaid_total:,.2f}€")

    # Par client
    if ca_by_client:
        print(f"\n👥 CA par client :")
        for client, ca in sorted(ca_by_client.items(), key=lambda x: -x[1]):
            pct = (ca / total_ca * 100) if total_ca > 0 else 0
            bar = "█" * int(pct / 5)
            print(f"  {client:<25} {ca:>10,.2f}€  {pct:>5.1f}%  {bar}")

    # Heures
    if total_hours > 0:
        print(f"\n⏱ Heures travaillées : {total_hours:.1f}h ({working_days} jours ouvrés)")
        print(f"💶 Taux horaire effectif : {effective_rate:.2f}€/h")

    # Résumé mensuel compact
    if ca_by_month:
        print(f"\n📅 CA mensuel :")
        for month, ca in sorted(ca_by_month.items()):
            bar = "█" * max(1, int(ca / max(ca_by_month.values()) * 20)) if ca > 0 else ""
            print(f"  {month}  {ca:>10,.2f}€  {bar}")


def cmd_monthly(args):
    year = args.year or datetime.now().year
    invoices = load_invoices(year)
    entries = load_timetrack(year)

    # Agrégation par mois
    months_data = {}
    for m in range(1, 13):
        month_key = f"{year}-{m:02d}"
        month_invoices = [inv for inv in invoices if inv["date"][:7] == month_key]
        month_entries = [e for e in entries if e["start"][:7] == month_key]

        ca = sum(inv["total_ttc"] for inv in month_invoices)
        hours = sum(_get_duration(e) for e in month_entries) / 3600
        nb = len(month_invoices)

        if ca > 0 or hours > 0:
            months_data[month_key] = {
                "ca": round(ca, 2),
                "hours": round(hours, 2),
                "invoices": nb,
                "effective_rate": round(ca / hours, 2) if hours >= 0.1 else 0,
            }

    if args.json:
        print(json.dumps({"year": year, "months": months_data}, ensure_ascii=False, indent=2))
        return

    print(f"📅 Détail mensuel — {year}")
    print("═" * 65)
    print(f"{'Mois':<10} {'CA':>12} {'Factures':>10} {'Heures':>10} {'Taux eff.':>12}")
    print("─" * 65)

    total_ca = 0
    total_hours = 0
    total_inv = 0

    for m in range(1, 13):
        month_key = f"{year}-{m:02d}"
        d = months_data.get(month_key)
        if d:
            total_ca += d["ca"]
            total_hours += d["hours"]
            total_inv += d["invoices"]
            rate_str = f"{d['effective_rate']:.0f}€/h" if d["effective_rate"] > 0 else "—"
            print(f"{month_key:<10} {d['ca']:>11,.2f}€ {d['invoices']:>10} {d['hours']:>9.1f}h {rate_str:>12}")
        else:
            print(f"{month_key:<10} {'—':>12} {'—':>10} {'—':>10} {'—':>12}")

    print("─" * 65)
    eff_rate = total_ca / total_hours if total_hours > 0 else 0
    print(f"{'TOTAL':<10} {total_ca:>11,.2f}€ {total_inv:>10} {total_hours:>9.1f}h {eff_rate:>11.0f}€/h")


def main():
    parser = argparse.ArgumentParser(description="Dashboard revenus freelance")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")
    sub = parser.add_subparsers(dest="command")

    # summary
    p_sum = sub.add_parser("summary", help="Résumé annuel")
    p_sum.add_argument("--year", type=int, default=None, help="Année (défaut: courante)")

    # monthly
    p_month = sub.add_parser("monthly", help="Détail mensuel")
    p_month.add_argument("--year", type=int, default=None, help="Année (défaut: courante)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cmds = {
        "summary": cmd_summary,
        "monthly": cmd_monthly,
    }
    cmds[args.command](args)


if __name__ == "__main__":
    main()
