import sys
import os
from datetime import datetime
import csv
import json

# add ux path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ux')))
from parser import parse
from interactive import DialogManager
from templates import render_confirmation

# simple emoji helpers
EMOJI = {
    'buy': '🟢',
    'sell': '🔴',
    'check': '✅',
    'cross': '❌',
}

DM = DialogManager(__import__('parser'))


def format_order_table(order: dict) -> str:
    """Return a simple monospaced table for Telegram messages."""
    side = order.get('side', '—')
    qty = order.get('quantity', '—')
    sym = order.get('symbol', order.get('base_asset') and order.get('quote_asset') and f"{order['base_asset']}{order['quote_asset']}" or '—')
    otype = order.get('order_type', '—')
    price = order.get('price', '')
    emoji = EMOJI['buy'] if side == 'BUY' else EMOJI['sell']
    lines = []
    lines.append(f"{emoji} <b>Ордeр</b>")
    lines.append(f"<code>Side:   {side}</code>")
    lines.append(f"<code>Qty:    {qty}</code>")
    lines.append(f"<code>Symbol: {sym}</code>")
    lines.append(f"<code>Type:   {otype}</code>")
    if price:
        lines.append(f"<code>Price:  {price}</code>")
    lines.append(f"\nДля подтверждения используйте кнопки ниже.")
    return '\n'.join(lines)


def parse_nl(text: str) -> dict:
    return parse(text)


def build_confirmation(order: dict) -> str:
    return render_confirmation(order)


def pretty_timestamp(ts=None):
    if ts is None:
        ts = datetime.utcnow()
    if isinstance(ts, (int, float)):
        ts = datetime.utcfromtimestamp(ts)
    return ts.strftime('%Y-%m-%d %H:%M:%S')


def export_csv(rows, path):
    keys = set()
    for r in rows:
        keys.update(r.keys())
    keys = sorted(keys)
    with open(path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)


def export_json(rows, path):
    with open(path, 'w') as f:
        json.dump(rows, f, indent=2, default=str)


def export_excel(rows, path):
    try:
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        if not rows:
            wb.save(path)
            return
        keys = sorted(set().union(*[set(r.keys()) for r in rows]))
        ws.append(keys)
        for r in rows:
            ws.append([r.get(k) for k in keys])
        wb.save(path)
    except Exception:
        # fallback: write CSV with .xlsx extension (not a real xlsx but acceptable for prototype)
        export_csv(rows, path)
