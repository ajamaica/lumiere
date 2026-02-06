#!/usr/bin/env python3
"""Gestion des clients freelance."""

import argparse
import json
import os
import sys
from pathlib import Path

DATA_DIR = Path.home() / ".freelance"
CLIENTS_FILE = DATA_DIR / "clients.json"


def load_clients():
    if CLIENTS_FILE.exists():
        with open(CLIENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_clients(clients):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CLIENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(clients, f, ensure_ascii=False, indent=2)


def find_client(clients, name):
    name_lower = name.lower()
    for i, c in enumerate(clients):
        if c["name"].lower() == name_lower:
            return i, c
    return None, None


def cmd_add(args):
    clients = load_clients()
    _, existing = find_client(clients, args.name)
    if existing:
        print(f"Erreur : le client « {args.name} » existe déjà.", file=sys.stderr)
        sys.exit(1)

    client = {
        "name": args.name,
        "email": args.email or "",
        "phone": args.phone or "",
        "address": args.address or "",
        "siret": args.siret or "",
        "rate": args.rate or 0,
        "notes": args.notes or "",
    }
    clients.append(client)
    save_clients(clients)

    if args.json:
        print(json.dumps(client, ensure_ascii=False, indent=2))
    else:
        print(f"✓ Client « {args.name} » ajouté.")


def cmd_list(args):
    clients = load_clients()
    if args.json:
        print(json.dumps(clients, ensure_ascii=False, indent=2))
        return

    if not clients:
        print("Aucun client enregistré.")
        return

    print(f"{'Nom':<25} {'Email':<30} {'Taux (€/h)':<12} {'SIRET':<18}")
    print("─" * 85)
    for c in clients:
        rate = f"{c['rate']}€" if c.get("rate") else "—"
        print(f"{c['name']:<25} {c.get('email', ''):<30} {rate:<12} {c.get('siret', ''):<18}")


def cmd_show(args):
    clients = load_clients()
    _, client = find_client(clients, args.name)
    if not client:
        print(f"Erreur : client « {args.name} » introuvable.", file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(client, ensure_ascii=False, indent=2))
        return

    print(f"Nom       : {client['name']}")
    print(f"Email     : {client.get('email', '—')}")
    print(f"Téléphone : {client.get('phone', '—')}")
    print(f"Adresse   : {client.get('address', '—')}")
    print(f"SIRET     : {client.get('siret', '—')}")
    print(f"Taux (€/h): {client.get('rate', '—')}")
    print(f"Notes     : {client.get('notes', '—')}")


def cmd_edit(args):
    clients = load_clients()
    idx, client = find_client(clients, args.name)
    if client is None:
        print(f"Erreur : client « {args.name} » introuvable.", file=sys.stderr)
        sys.exit(1)

    if args.email is not None:
        client["email"] = args.email
    if args.phone is not None:
        client["phone"] = args.phone
    if args.address is not None:
        client["address"] = args.address
    if args.siret is not None:
        client["siret"] = args.siret
    if args.rate is not None:
        client["rate"] = args.rate
    if args.notes is not None:
        client["notes"] = args.notes
    if args.new_name is not None:
        client["name"] = args.new_name

    clients[idx] = client
    save_clients(clients)

    if args.json:
        print(json.dumps(client, ensure_ascii=False, indent=2))
    else:
        print(f"✓ Client « {client['name'] } » mis à jour.")


def cmd_remove(args):
    clients = load_clients()
    idx, client = find_client(clients, args.name)
    if client is None:
        print(f"Erreur : client « {args.name} » introuvable.", file=sys.stderr)
        sys.exit(1)

    clients.pop(idx)
    save_clients(clients)

    if args.json:
        print(json.dumps({"removed": args.name}, ensure_ascii=False))
    else:
        print(f"✓ Client « {args.name} » supprimé.")


def main():
    parser = argparse.ArgumentParser(description="Gestion des clients freelance")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")
    sub = parser.add_subparsers(dest="command")

    # add
    p_add = sub.add_parser("add", help="Ajouter un client")
    p_add.add_argument("--name", required=True)
    p_add.add_argument("--email", default=None)
    p_add.add_argument("--phone", default=None)
    p_add.add_argument("--address", default=None)
    p_add.add_argument("--siret", default=None)
    p_add.add_argument("--rate", type=float, default=None)
    p_add.add_argument("--notes", default=None)

    # list
    sub.add_parser("list", help="Lister les clients")

    # show
    p_show = sub.add_parser("show", help="Détails d'un client")
    p_show.add_argument("name")

    # edit
    p_edit = sub.add_parser("edit", help="Modifier un client")
    p_edit.add_argument("name")
    p_edit.add_argument("--new-name", default=None)
    p_edit.add_argument("--email", default=None)
    p_edit.add_argument("--phone", default=None)
    p_edit.add_argument("--address", default=None)
    p_edit.add_argument("--siret", default=None)
    p_edit.add_argument("--rate", type=float, default=None)
    p_edit.add_argument("--notes", default=None)

    # remove
    p_remove = sub.add_parser("remove", help="Supprimer un client")
    p_remove.add_argument("name")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cmds = {
        "add": cmd_add,
        "list": cmd_list,
        "show": cmd_show,
        "edit": cmd_edit,
        "remove": cmd_remove,
    }
    cmds[args.command](args)


if __name__ == "__main__":
    main()
