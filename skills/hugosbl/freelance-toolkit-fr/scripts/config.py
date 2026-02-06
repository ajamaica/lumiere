#!/usr/bin/env python3
"""Configuration du prestataire freelance."""

import argparse
import json
import sys
from pathlib import Path

DATA_DIR = Path.home() / ".freelance"
CONFIG_FILE = DATA_DIR / "config.json"


def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_config(config):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def cmd_set(args):
    config = load_config()
    if "provider" not in config:
        config["provider"] = {}

    p = config["provider"]
    if args.name is not None:
        p["name"] = args.name
    if args.address is not None:
        p["address"] = args.address
    if args.siret is not None:
        p["siret"] = args.siret
    if args.email is not None:
        p["email"] = args.email
    if args.phone is not None:
        p["phone"] = args.phone
    if args.iban is not None:
        config["iban"] = args.iban
    if args.rate is not None:
        config["default_rate"] = args.rate
    if args.micro:
        config["micro_entreprise"] = True
    if args.no_micro:
        config["micro_entreprise"] = False

    save_config(config)

    if args.json:
        print(json.dumps(config, ensure_ascii=False, indent=2))
    else:
        print("✓ Configuration mise à jour.")
        _print_config(config)


def cmd_show(args):
    config = load_config()
    if args.json:
        print(json.dumps(config, ensure_ascii=False, indent=2))
        return

    if not config:
        print("Aucune configuration. Utilisez 'set' pour configurer.")
        return

    _print_config(config)


def _print_config(config):
    p = config.get("provider", {})
    micro = config.get("micro_entreprise")
    micro_str = "Oui" if micro else ("Non" if micro is False else "—")
    print(f"\n  Nom       : {p.get('name', '—')}")
    print(f"  Adresse   : {p.get('address', '—')}")
    print(f"  SIRET     : {p.get('siret', '—')}")
    print(f"  Email     : {p.get('email', '—')}")
    print(f"  Téléphone : {p.get('phone', '—')}")
    print(f"  IBAN      : {config.get('iban', '—')}")
    print(f"  Taux      : {config.get('default_rate', '—')}€/h")
    print(f"  Micro-ent.: {micro_str}")


def main():
    parser = argparse.ArgumentParser(description="Configuration prestataire freelance")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")
    sub = parser.add_subparsers(dest="command")

    # set
    p_set = sub.add_parser("set", help="Configurer les infos prestataire")
    p_set.add_argument("--name", default=None, help="Nom du prestataire")
    p_set.add_argument("--address", default=None, help="Adresse")
    p_set.add_argument("--siret", default=None, help="SIRET")
    p_set.add_argument("--email", default=None, help="Email")
    p_set.add_argument("--phone", default=None, help="Téléphone")
    p_set.add_argument("--iban", default=None, help="IBAN")
    p_set.add_argument("--rate", type=float, default=None, help="Taux horaire par défaut")
    p_set.add_argument("--micro", action="store_true", help="Micro-entreprise")
    p_set.add_argument("--no-micro", action="store_true", help="Pas micro-entreprise")

    # show
    sub.add_parser("show", help="Afficher la configuration")

    args = parser.parse_args()

    if not args.command:
        args.json = getattr(args, "json", False)
        cmd_show(args)
        return

    cmds = {
        "set": cmd_set,
        "show": cmd_show,
    }
    cmds[args.command](args)


if __name__ == "__main__":
    main()
