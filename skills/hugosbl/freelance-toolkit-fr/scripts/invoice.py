#!/usr/bin/env python3
"""Génération de factures HTML pour freelances."""

import argparse
import json
import os
import sys
import webbrowser
from datetime import datetime, timedelta
from pathlib import Path

DATA_DIR = Path.home() / ".freelance"
INVOICES_DIR = DATA_DIR / "invoices"
CLIENTS_FILE = DATA_DIR / "clients.json"
CONFIG_FILE = DATA_DIR / "config.json"


def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def load_clients():
    if CLIENTS_FILE.exists():
        with open(CLIENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def find_client(name):
    clients = load_clients()
    name_lower = name.lower()
    for c in clients:
        if c["name"].lower() == name_lower:
            return c
    return None


def get_next_number():
    """Auto-incrémente le numéro de facture YYYY-NNN."""
    year = datetime.now().strftime("%Y")
    INVOICES_DIR.mkdir(parents=True, exist_ok=True)

    existing = []
    for f in INVOICES_DIR.glob(f"{year}-*.json"):
        try:
            num = int(f.stem.split("-")[1])
            existing.append(num)
        except (IndexError, ValueError):
            pass

    next_num = max(existing, default=0) + 1
    return f"{year}-{next_num:03d}"


def parse_item(item_str):
    """Parse 'description:quantité:prix_unitaire'."""
    parts = item_str.rsplit(":", 2)
    if len(parts) != 3:
        print(f"Erreur : format d'item invalide « {item_str} ». Attendu: 'description:quantité:prix'", file=sys.stderr)
        sys.exit(1)
    desc = parts[0]
    try:
        qty = float(parts[1])
        price = float(parts[2])
    except ValueError:
        print(f"Erreur : quantité ou prix non numérique dans « {item_str} »", file=sys.stderr)
        sys.exit(1)
    return {"description": desc, "quantity": qty, "unit_price": price, "total": round(qty * price, 2)}


def format_euro(amount):
    """Format en français : 2 900,00 €"""
    s = f"{abs(amount):,.2f}".replace(",", "\u00a0").replace(".", ",")
    sign = "-" if amount < 0 else ""
    return f"{sign}{s}\u00a0€"


def get_initials(name):
    """Extrait les initiales d'un nom."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return parts[0][0].upper() if parts else "F"


def generate_html(invoice_data):
    """Génère le HTML de la facture."""
    provider = invoice_data.get("provider", {})
    client = invoice_data.get("client", {})
    items = invoice_data.get("items", [])
    subtotal = invoice_data["subtotal"]
    tva_rate = invoice_data["tva_rate"]
    tva_amount = invoice_data["tva_amount"]
    total_ttc = invoice_data["total_ttc"]
    micro = invoice_data.get("micro_entreprise", True)

    items_html = ""
    for item in items:
        items_html += f"""
        <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">{item['description']}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center;">{item['quantity']:g}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: right;">{format_euro(item['unit_price'])}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">{format_euro(item['total'])}</td>
        </tr>"""

    tva_line = ""
    if not micro and tva_rate > 0:
        tva_line = f"""
        <tr>
            <td colspan="3" style="padding: 8px 12px; text-align: right; color: #666;">TVA ({tva_rate*100:.0f}%)</td>
            <td style="padding: 8px 12px; text-align: right;">{format_euro(tva_amount)}</td>
        </tr>"""

    tva_mention = ""
    if micro:
        tva_mention = '<p style="margin: 4px 0; font-style: italic;">TVA non applicable, article 293 B du Code général des impôts</p>'

    payment_method = invoice_data.get("payment_method", "Virement bancaire")
    iban = invoice_data.get("iban", "")
    iban_line = f'<p style="margin: 4px 0;">IBAN : {iban}</p>' if iban else ""
    due_date = invoice_data.get("due_date", "")

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Facture {invoice_data['number']}</title>
<style>
  @media print {{
    body {{ margin: 0; padding: 20px; }}
    .container {{ box-shadow: none !important; max-width: 100% !important; }}
    .no-print {{ display: none; }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #f5f5f5;
    margin: 0;
    padding: 40px 20px;
    color: #333;
    line-height: 1.5;
  }}
  .container {{
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
    padding: 50px;
    box-shadow: 0 2px 20px rgba(0,0,0,0.08);
    border-radius: 4px;
  }}
</style>
</head>
<body>
<div class="container">
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid transparent; border-image: linear-gradient(90deg, #2563eb, #7c3aed) 1; padding-bottom: 30px;">
    <div>
      <div style="width: 60px; height: 60px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; margin-bottom: 12px;">
        {get_initials(provider.get('name', 'F'))}
      </div>
      <h2 style="margin: 0 0 4px 0; color: #1a1a1a;">{provider.get('name', 'Prestataire')}</h2>
      <p style="margin: 2px 0; color: #666; font-size: 14px;">{provider.get('address', '')}</p>
      <p style="margin: 2px 0; color: #666; font-size: 14px;">SIRET : {provider.get('siret', 'Non renseigné')}</p>
      {f'<p style="margin: 2px 0; color: #666; font-size: 14px;">{provider.get("email", "")}</p>' if provider.get("email") else ""}
      {f'<p style="margin: 2px 0; color: #666; font-size: 14px;">{provider.get("phone", "")}</p>' if provider.get("phone") else ""}
    </div>
    <div style="text-align: right;">
      <h1 style="margin: 0; color: #2563eb; font-size: 32px; font-weight: 700;">FACTURE</h1>
      <p style="margin: 8px 0 2px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">N° {invoice_data['number']}</p>
      <p style="margin: 2px 0; color: #666;">Date : {invoice_data['date']}</p>
      <p style="margin: 2px 0; color: #666;">Échéance : {due_date}</p>
    </div>
  </div>

  <!-- Client -->
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
    <p style="margin: 0 0 8px 0; text-transform: uppercase; font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 1px;">Facturé à</p>
    <p style="margin: 4px 0; font-weight: 600; font-size: 16px;">{client.get('name', 'Client')}</p>
    <p style="margin: 4px 0; color: #666;">{client.get('address', '')}</p>
    {f'<p style="margin: 4px 0; color: #666;">SIRET : {client.get("siret")}</p>' if client.get("siret") else ""}
  </div>

  <!-- Lignes de facture -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
    <thead>
      <tr style="background: #f8fafc;">
        <th style="padding: 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Description</th>
        <th style="padding: 12px; text-align: center; font-weight: 600; font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Qté</th>
        <th style="padding: 12px; text-align: right; font-weight: 600; font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Prix unit. HT</th>
        <th style="padding: 12px; text-align: right; font-weight: 600; font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      {items_html}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding: 12px 12px 6px; text-align: right; font-weight: 600;">Sous-total HT</td>
        <td style="padding: 12px 12px 6px; text-align: right; font-weight: 600;">{format_euro(subtotal)}</td>
      </tr>
      {tva_line}
      <tr style="background: #2563eb; color: white;">
        <td colspan="3" style="padding: 14px 12px; text-align: right; font-weight: 700; font-size: 16px; border-radius: 0 0 0 6px;">Total {'TTC' if not micro else ''}</td>
        <td style="padding: 14px 12px; text-align: right; font-weight: 700; font-size: 18px; border-radius: 0 0 6px 0;">{format_euro(total_ttc)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Paiement -->
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
    <p style="margin: 0 0 8px 0; font-weight: 700; color: #166534;">💳 Conditions de paiement</p>
    <p style="margin: 4px 0;">Mode de paiement : {payment_method}</p>
    <p style="margin: 4px 0;">Date d'échéance : {due_date}</p>
    {iban_line}
  </div>

  <!-- Mentions légales -->
  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; line-height: 1.6;">
    <p style="margin: 4px 0; font-weight: 600; color: #64748b;">Mentions légales</p>
    {tva_mention}
    <p style="margin: 4px 0;">Pas d'escompte pour paiement anticipé.</p>
    <p style="margin: 4px 0;">En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement (Art. D441-5 du Code de commerce).</p>
  </div>
</div>

<div class="no-print" style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 13px;">
  <p>Pour exporter en PDF : Fichier → Imprimer → Enregistrer au format PDF</p>
</div>
</body>
</html>"""
    return html


def cmd_generate(args):
    config = load_config()
    provider = config.get("provider", {})
    micro = config.get("micro_entreprise", True)
    tva_rate = 0 if micro else config.get("tva_rate", 0.20)

    # Client info
    client_data = find_client(args.client) or {}
    client_info = {
        "name": args.client,
        "address": client_data.get("address", ""),
        "siret": client_data.get("siret", ""),
    }

    # Items
    items = [parse_item(i) for i in args.items]
    subtotal = round(sum(i["total"] for i in items), 2)
    tva_amount = round(subtotal * tva_rate, 2)
    total_ttc = round(subtotal + tva_amount, 2)

    # Numéro
    number = args.number or get_next_number()

    # Date
    inv_date = args.date or datetime.now().strftime("%Y-%m-%d")
    due_days = args.due_days or config.get("payment_delay_days", 30)
    due_date = (datetime.strptime(inv_date, "%Y-%m-%d") + timedelta(days=due_days)).strftime("%Y-%m-%d")

    invoice_data = {
        "number": number,
        "date": inv_date,
        "due_date": due_date,
        "provider": provider,
        "client": client_info,
        "items": items,
        "subtotal": subtotal,
        "tva_rate": tva_rate,
        "tva_amount": tva_amount,
        "total_ttc": total_ttc,
        "micro_entreprise": micro,
        "payment_method": config.get("payment_method", "Virement bancaire"),
        "iban": config.get("iban", ""),
        "paid": False,
    }

    # Generate HTML
    html = generate_html(invoice_data)

    # Save
    INVOICES_DIR.mkdir(parents=True, exist_ok=True)
    html_path = INVOICES_DIR / f"{number}.html"
    json_path = INVOICES_DIR / f"{number}.json"

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(invoice_data, f, ensure_ascii=False, indent=2)

    if args.json:
        print(json.dumps({
            "number": number,
            "date": inv_date,
            "client": args.client,
            "subtotal": subtotal,
            "tva": tva_amount,
            "total_ttc": total_ttc,
            "html_path": str(html_path),
            "json_path": str(json_path),
        }, ensure_ascii=False, indent=2))
    else:
        print(f"✓ Facture {number} générée")
        print(f"  Client : {args.client}")
        print(f"  Montant : {format_euro(total_ttc)}")
        print(f"  Fichier : {html_path}")

    # Open in browser
    if not args.no_open:
        webbrowser.open(f"file://{html_path}")


def cmd_list(args):
    INVOICES_DIR.mkdir(parents=True, exist_ok=True)
    invoices = []

    for json_file in sorted(INVOICES_DIR.glob("*.json")):
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        invoices.append({
            "number": data["number"],
            "date": data["date"],
            "client": data["client"]["name"],
            "total_ttc": data["total_ttc"],
            "paid": data.get("paid", False),
        })

    if args.json:
        print(json.dumps(invoices, ensure_ascii=False, indent=2))
        return

    if not invoices:
        print("Aucune facture.")
        return

    print(f"{'N°':<12} {'Date':<12} {'Client':<25} {'Total':<14} {'Statut':<10}")
    print("─" * 73)
    for inv in invoices:
        statut = "✅ Payée" if inv["paid"] else "⏳ En attente"
        print(f"{inv['number']:<12} {inv['date']:<12} {inv['client']:<25} {format_euro(inv['total_ttc']):<14} {statut}")


def cmd_show(args):
    json_path = INVOICES_DIR / f"{args.number}.json"
    html_path = INVOICES_DIR / f"{args.number}.html"

    if not json_path.exists():
        print(f"Erreur : facture {args.number} introuvable.", file=sys.stderr)
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(f"Facture : {data['number']}")
        print(f"Date    : {data['date']}")
        print(f"Client  : {data['client']['name']}")
        print(f"Total   : {data['total_ttc']:.2f}€")
        print(f"Fichier : {html_path}")


def cmd_paid(args):
    json_path = INVOICES_DIR / f"{args.number}.json"
    if not json_path.exists():
        print(f"Erreur : facture {args.number} introuvable.", file=sys.stderr)
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["paid"] = True
    data["paid_date"] = datetime.now().strftime("%Y-%m-%d")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    if args.json:
        print(json.dumps({"number": args.number, "paid": True, "paid_date": data["paid_date"]}, ensure_ascii=False, indent=2))
    else:
        print(f"✓ Facture {args.number} marquée comme payée.")


def main():
    parser = argparse.ArgumentParser(description="Génération de factures HTML")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")
    sub = parser.add_subparsers(dest="command")

    # generate
    p_gen = sub.add_parser("generate", help="Générer une facture")
    p_gen.add_argument("--client", required=True, help="Nom du client")
    p_gen.add_argument("--items", nargs="+", required=True, help="Items (desc:qté:prix)")
    p_gen.add_argument("--number", default=None, help="Numéro (auto si omis)")
    p_gen.add_argument("--date", default=None, help="Date (YYYY-MM-DD, today si omis)")
    p_gen.add_argument("--due-days", type=int, default=None, help="Délai de paiement en jours")
    p_gen.add_argument("--no-open", action="store_true", help="Ne pas ouvrir dans le navigateur")

    # list
    sub.add_parser("list", help="Lister les factures")

    # show
    p_show = sub.add_parser("show", help="Détails d'une facture")
    p_show.add_argument("number", help="Numéro de facture")

    # paid
    p_paid = sub.add_parser("paid", help="Marquer une facture comme payée")
    p_paid.add_argument("number", help="Numéro de facture")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cmds = {
        "generate": cmd_generate,
        "list": cmd_list,
        "show": cmd_show,
        "paid": cmd_paid,
    }
    cmds[args.command](args)


if __name__ == "__main__":
    main()
