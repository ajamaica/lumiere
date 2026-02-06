UX improvements for the Binance skill — shared/ux

This folder contains a small prototype and UX-focused utilities to improve natural-language trading, dialog-based interaction, Telegram inline-button confirmations and symbol autocompletion.

Structure

- parser.py — Natural-language command parser (Russian + English). Parses orders like "купи 0.1 BTC по рынку", "Sell 2 ETH at 1800 limit".
- interactive.py — Dialog manager that guides the user, validates parsed commands and builds friendly confirmations.
- telegram_bot_prototype.py — Minimal Telegram bot prototype showing how to integrate parser + dialog with inline buttons (Confirm / Edit / Cancel). Uses python-telegram-bot style; meant as a template, not a running service in this repo.
- autocomplete.py — Symbol autocompletion helper, provides fast suggestions for pair symbols and base assets.
- templates.py — User-friendly message templates and confirmation layout examples.
- examples.md — Quick usage examples and sample commands.

How to use

1. Parse a natural-language command:
   python3 parser.py "купи 0.1 BTC по рынку"

2. Use DialogManager (interactive.py) to walk through missing fields and produce a confirmation message.

3. Use telegram_bot_prototype.py as a starting point to wire up a Telegram bot. The prototype uses InlineKeyboardButtons: Confirm / Edit / Cancel. It demonstrates safety rules (always show details before execution).

Design notes

- Conservative safety: parser returns a structured object but does NOT execute any trade. The dialog manager explicitly requires confirmation.
- Autocomplete uses a small curated list of popular symbols from SKILL.md and can be extended by fetching exchange metadata.
- Messages are designed to be short, clear and show all important details (pair, side, quantity, order type, price when relevant).

Where to save changes
Save UX iterations in this directory. If you want these components incorporated into the main skill, move or import the Python modules from here.

License: MIT
