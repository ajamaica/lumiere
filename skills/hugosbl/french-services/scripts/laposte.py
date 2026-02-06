#!/usr/bin/env python3
"""La Poste — Suivi de colis via l'API Suivi v2.

Usage:
    python3 laposte.py track 6A12345678901
    python3 laposte.py track 6A12345678901 8R98765432109
    python3 laposte.py track 6A12345678901 --json

Nécessite LAPOSTE_API_KEY (gratuit sur https://developer.laposte.fr).
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime

API_BASE = "https://api.laposte.fr/suivi/v2/idships"


def get_api_key():
    key = os.environ.get("LAPOSTE_API_KEY")
    if not key:
        print("❌ Variable d'environnement LAPOSTE_API_KEY non définie.", file=sys.stderr)
        print("   Inscris-toi gratuitement sur https://developer.laposte.fr", file=sys.stderr)
        print("   Puis : export LAPOSTE_API_KEY=ta-clé", file=sys.stderr)
        sys.exit(1)
    return key


def track_parcel(tracking_id):
    """Récupère les infos de suivi d'un colis."""
    key = get_api_key()
    url = f"{API_BASE}/{tracking_id}"

    req = urllib.request.Request(url, headers={
        "X-Okapi-Key": key,
        "Accept": "application/json",
        "User-Agent": "french-services/1.0",
    })

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"error": f"Colis introuvable : {tracking_id}"}
        elif e.code == 401:
            return {"error": "Clé API invalide. Vérifie LAPOSTE_API_KEY."}
        elif e.code == 400:
            return {"error": f"Numéro de suivi invalide : {tracking_id}"}
        else:
            body = e.read().decode() if e.fp else ""
            return {"error": f"Erreur API ({e.code}): {body[:200]}"}
    except urllib.error.URLError as e:
        return {"error": f"Erreur réseau : {e}"}


# Codes de contexte La Poste → description
STATUS_LABELS = {
    "LIVRE": "📦✅ Livré",
    "EN_LIVRAISON": "🚚 En cours de livraison",
    "A_RETIRER": "📬 À retirer",
    "EN_COURS_ACHEMINEMENT": "🚛 En cours d'acheminement",
    "PRIS_EN_CHARGE": "📋 Pris en charge",
    "TRI_EFFECTUE": "🏭 Tri effectué",
    "RETOURNE_EXPEDITEUR": "↩️ Retourné à l'expéditeur",
    "DESTINATAIRE_INFORME": "📧 Destinataire informé",
    "INSTANCE_DEDOUANEMENT": "🛃 En cours de dédouanement",
    "ANOMALIE": "⚠️ Anomalie",
}


def format_date(date_str):
    """Formate une date ISO en format lisible."""
    if not date_str:
        return "?"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y à %H:%M")
    except (ValueError, AttributeError):
        return date_str


def format_parcel(data):
    """Formate les données de suivi en texte lisible."""
    if "error" in data:
        return f"❌ {data['error']}"

    shipment = data.get("shipment", data)
    if isinstance(shipment, dict):
        idship = shipment.get("idShip", "?")
        product = shipment.get("product", "")
        is_final = shipment.get("isFinal", False)

        # Contexte / statut actuel
        context = shipment.get("contextData", {})
        arrival_country = context.get("arrivalCountry", "")
        origin_country = context.get("originCountry", "")

        # Événements
        events = shipment.get("event", [])
        timeline = shipment.get("timeline", [])

        lines = []
        lines.append(f"📦 Colis : {idship}")
        if product:
            lines.append(f"   Type : {product}")

        # Statut actuel depuis la timeline
        current_status = None
        for step in timeline:
            if step.get("status"):
                short_label = step.get("shortLabel", "")
                status = step.get("id", "").upper()
                current_status = STATUS_LABELS.get(status, short_label or status)
                if step.get("date"):
                    current_status += f" ({format_date(step['date'])})"

        if current_status:
            lines.append(f"   Statut : {current_status}")

        if is_final:
            lines.append("   ✅ Livraison terminée")

        # Derniers événements
        if events:
            lines.append("")
            lines.append("   📋 Historique :")
            for evt in events[:8]:  # Max 8 derniers événements
                date = format_date(evt.get("date", ""))
                label = evt.get("label", "?")
                lines.append(f"      {date} — {label}")

        return "\n".join(lines)

    return f"❌ Réponse inattendue : {json.dumps(data, ensure_ascii=False)[:200]}"


def cmd_track(args):
    """Suivi d'un ou plusieurs colis."""
    results = []

    for tracking_id in args.tracking_ids:
        # Nettoyer le numéro de suivi
        tid = tracking_id.strip().replace(" ", "")
        data = track_parcel(tid)
        results.append({"tracking_id": tid, "data": data})

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    for i, r in enumerate(results):
        if i > 0:
            print("\n" + "-" * 40 + "\n")
        print(format_parcel(r["data"]))


def main():
    parser = argparse.ArgumentParser(
        description="La Poste — Suivi de colis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Exemples:\n  python3 laposte.py track 6A12345678901\n  python3 laposte.py track 6A123 8R987 --json",
    )
    sub = parser.add_subparsers(dest="command", help="Commande")

    # track
    p_track = sub.add_parser("track", help="Suivre un ou plusieurs colis")
    p_track.add_argument("tracking_ids", nargs="+", help="Numéro(s) de suivi")
    p_track.add_argument("--json", action="store_true", help="Sortie JSON")

    args = parser.parse_args()

    if args.command == "track":
        cmd_track(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
