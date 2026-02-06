#!/usr/bin/env python3
"""SNCF — Recherche de trains via l'API Navitia.

Usage:
    python3 sncf.py search Paris Lyon
    python3 sncf.py search Paris Marseille --date 2025-01-15 --time 08:00
    python3 sncf.py departures Paris
    python3 sncf.py disruptions

Nécessite SNCF_API_KEY (token Navitia — gratuit sur https://navitia.io).
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta

API_BASE = "https://api.navitia.io/v1"
COVERAGE = "fr-sw"  # couverture nationale SNCF

# Alias de gares courantes
GARE_ALIASES = {
    "paris": "Paris",
    "gare de lyon": "Paris Gare de Lyon",
    "gare du nord": "Paris Gare du Nord",
    "gare montparnasse": "Paris Montparnasse",
    "gare de l'est": "Paris Gare de l'Est",
    "gare saint-lazare": "Paris Saint-Lazare",
    "lyon": "Lyon",
    "marseille": "Marseille Saint-Charles",
    "toulouse": "Toulouse Matabiau",
    "bordeaux": "Bordeaux Saint-Jean",
    "lille": "Lille",
    "strasbourg": "Strasbourg",
    "nantes": "Nantes",
    "nice": "Nice",
    "montpellier": "Montpellier Saint-Roch",
    "rennes": "Rennes",
}


def get_api_key():
    key = os.environ.get("SNCF_API_KEY")
    if not key:
        print("❌ Variable d'environnement SNCF_API_KEY non définie.", file=sys.stderr)
        print("   Obtiens un token gratuit sur https://navitia.io", file=sys.stderr)
        print("   Puis : export SNCF_API_KEY=ton-token", file=sys.stderr)
        sys.exit(1)
    return key


def api_call(endpoint, params=None):
    """Appel authentifié à l'API Navitia."""
    key = get_api_key()
    url = f"{API_BASE}{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    # Navitia utilise l'auth Basic avec la clé comme username
    auth = base64.b64encode(f"{key}:".encode()).decode()
    req = urllib.request.Request(url, headers={
        "Authorization": f"Basic {auth}",
        "User-Agent": "french-services/1.0",
    })

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        if e.code == 401:
            print("❌ Clé API invalide. Vérifie SNCF_API_KEY.", file=sys.stderr)
        elif e.code == 404:
            print(f"❌ Ressource non trouvée : {endpoint}", file=sys.stderr)
        else:
            print(f"❌ Erreur API ({e.code}): {body[:200]}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"❌ Erreur réseau : {e}", file=sys.stderr)
        sys.exit(1)


def resolve_place(name):
    """Résout un nom de lieu en identifiant Navitia."""
    alias = GARE_ALIASES.get(name.lower(), name)
    data = api_call("/places", {"q": alias, "type[]": "stop_area", "count": 1})
    places = data.get("places", [])
    if not places:
        print(f"❌ Lieu introuvable : {name}", file=sys.stderr)
        sys.exit(1)
    return places[0]


def parse_datetime(date_str, time_str=None):
    """Parse une date et heure en format Navitia (YYYYMMDDTHHmmss)."""
    now = datetime.now()

    if date_str == "demain":
        dt = now + timedelta(days=1)
    elif date_str == "après-demain":
        dt = now + timedelta(days=2)
    elif date_str == "aujourd'hui" or date_str == "aujourdhui":
        dt = now
    else:
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            try:
                dt = datetime.strptime(date_str, "%d/%m/%Y")
            except ValueError:
                print(f"❌ Format de date invalide : {date_str}", file=sys.stderr)
                print("   Formats acceptés : YYYY-MM-DD, DD/MM/YYYY, demain, après-demain", file=sys.stderr)
                sys.exit(1)

    if time_str:
        try:
            t = datetime.strptime(time_str, "%H:%M")
            dt = dt.replace(hour=t.hour, minute=t.minute, second=0)
        except ValueError:
            print(f"❌ Format d'heure invalide : {time_str} (attendu HH:MM)", file=sys.stderr)
            sys.exit(1)
    else:
        if date_str not in ("aujourd'hui", "aujourdhui") and dt.date() != now.date():
            dt = dt.replace(hour=8, minute=0, second=0)

    return dt.strftime("%Y%m%dT%H%M%S")


def format_duration(seconds):
    """Formate une durée en heures et minutes."""
    h = seconds // 3600
    m = (seconds % 3600) // 60
    if h > 0:
        return f"{h}h{m:02d}"
    return f"{m} min"


def format_time(iso_str):
    """Formate un datetime ISO Navitia en heure lisible."""
    try:
        dt = datetime.strptime(iso_str, "%Y%m%dT%H%M%S")
        return dt.strftime("%H:%M")
    except (ValueError, TypeError):
        return iso_str or "?"


def cmd_search(args):
    """Recherche d'itinéraire."""
    from_place = resolve_place(args.origin)
    to_place = resolve_place(args.destination)

    params = {
        "from": from_place["id"],
        "to": to_place["id"],
        "count": args.count,
    }

    if args.date:
        params["datetime"] = parse_datetime(args.date, args.time)

    data = api_call("/journeys", params)

    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    journeys = data.get("journeys", [])
    if not journeys:
        print("❌ Aucun trajet trouvé.")
        return

    from_name = from_place.get("name", args.origin)
    to_name = to_place.get("name", args.destination)
    print(f"🚄 Trajets {from_name} → {to_name}")
    print("=" * 50)

    for i, j in enumerate(journeys, 1):
        dep = format_time(j.get("departure_date_time"))
        arr = format_time(j.get("arrival_date_time"))
        dur = j.get("duration", 0)
        nb_transfers = j.get("nb_transfers", 0)

        sections = j.get("sections", [])
        modes = []
        for s in sections:
            if s.get("type") == "public_transport":
                display = s.get("display_informations", {})
                name = display.get("commercial_mode", "")
                code = display.get("code", "")
                headsign = display.get("headsign", "")
                if name or code:
                    label = f"{name} {code}".strip()
                    if headsign:
                        label += f" ({headsign})"
                    modes.append(label)

        print(f"\n  🕐 {dep} → {arr}  ({format_duration(dur)})")
        if modes:
            print(f"     {' → '.join(modes)}")
        if nb_transfers > 0:
            print(f"     🔄 {nb_transfers} correspondance{'s' if nb_transfers > 1 else ''}")

        # Prix si disponible
        fare = j.get("fare", {})
        total = fare.get("total", {}).get("value")
        if total and total != "0":
            print(f"     💰 {total} €")


def cmd_departures(args):
    """Prochains départs depuis une gare."""
    place = resolve_place(args.station)

    params = {"count": args.count}
    if args.date:
        params["from_datetime"] = parse_datetime(args.date, args.time)

    stop_id = place["id"]
    data = api_call(f"/coverage/fr-sw/stop_areas/{stop_id}/departures", params)

    # Fallback sur fr-idf si rien trouvé
    departures = data.get("departures", [])
    if not departures:
        try:
            data = api_call(f"/coverage/fr-idf/stop_areas/{stop_id}/departures", params)
            departures = data.get("departures", [])
        except SystemExit:
            pass

    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    if not departures:
        print(f"❌ Aucun départ trouvé depuis {place.get('name', args.station)}.")
        return

    print(f"🚄 Prochains départs — {place.get('name', args.station)}")
    print("=" * 50)

    for dep in departures:
        dt_info = dep.get("stop_date_time", {})
        dep_time = format_time(dt_info.get("departure_date_time"))
        base_time = format_time(dt_info.get("base_departure_date_time"))

        display = dep.get("display_informations", {})
        mode = display.get("commercial_mode", "")
        code = display.get("code", "")
        direction = display.get("direction", "")
        headsign = display.get("headsign", "")

        label = f"{mode} {code}".strip()
        delay = ""
        if base_time and dep_time and base_time != dep_time:
            delay = f" ⚠️ (prévu {base_time})"

        dest = direction.split(" (")[0] if direction else headsign
        print(f"  {dep_time}{delay}  {label:15s} → {dest}")


def cmd_disruptions(args):
    """Perturbations en cours."""
    params = {"count": args.count}
    data = api_call(f"/coverage/fr-sw/disruptions", params)

    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    disruptions = data.get("disruptions", [])
    if not disruptions:
        print("✅ Aucune perturbation en cours.")
        return

    print("⚠️ Perturbations SNCF en cours")
    print("=" * 50)

    for d in disruptions:
        cause = d.get("cause", "Inconnu")
        severity = d.get("severity", {}).get("name", "")
        messages = d.get("messages", [])
        text = ""
        for m in messages:
            if m.get("channel", {}).get("name") == "titre":
                text = m.get("text", "")
                break
        if not text and messages:
            text = messages[0].get("text", "")

        # Lignes impactées
        impacted = d.get("impacted_objects", [])
        lines = []
        for obj in impacted:
            pt = obj.get("pt_object", {})
            if pt.get("embedded_type") == "line":
                lines.append(pt.get("name", ""))

        print(f"\n  ⚠️ {severity}: {cause}")
        if text:
            # Nettoyer le HTML basique
            import re
            text_clean = re.sub(r'<[^>]+>', '', text)[:200]
            print(f"     {text_clean}")
        if lines:
            print(f"     Lignes : {', '.join(lines[:5])}")


def main():
    parser = argparse.ArgumentParser(
        description="SNCF — Recherche de trains via l'API Navitia",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", help="Commande")

    # search
    p_search = sub.add_parser("search", help="Rechercher un itinéraire")
    p_search.add_argument("origin", help="Ville/gare de départ")
    p_search.add_argument("destination", help="Ville/gare d'arrivée")
    p_search.add_argument("--date", help="Date (YYYY-MM-DD, DD/MM/YYYY, demain, après-demain)")
    p_search.add_argument("--time", help="Heure de départ (HH:MM)")
    p_search.add_argument("--count", type=int, default=5, help="Nombre de résultats (défaut: 5)")
    p_search.add_argument("--json", action="store_true", help="Sortie JSON")

    # departures
    p_dep = sub.add_parser("departures", help="Prochains départs depuis une gare")
    p_dep.add_argument("station", help="Nom de la gare")
    p_dep.add_argument("--date", help="Date")
    p_dep.add_argument("--time", help="Heure")
    p_dep.add_argument("--count", type=int, default=10, help="Nombre de résultats")
    p_dep.add_argument("--json", action="store_true", help="Sortie JSON")

    # disruptions
    p_dis = sub.add_parser("disruptions", help="Perturbations en cours")
    p_dis.add_argument("--count", type=int, default=10, help="Nombre de résultats")
    p_dis.add_argument("--json", action="store_true", help="Sortie JSON")

    args = parser.parse_args()

    if args.command == "search":
        cmd_search(args)
    elif args.command == "departures":
        cmd_departures(args)
    elif args.command == "disruptions":
        cmd_disruptions(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
