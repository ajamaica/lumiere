Overview

This folder contains a prototype Telegram bot and supporting modules that integrate the UX natural-language parser and dialog manager from ../ux/. It's designed as a drop-in prototype for the Binance skill: inline keyboards, callbacks, command menu, webhook notification system, and data export endpoints (CSV/Excel/JSON API).

Files

- bot.py — Flask-based webhook receiver and HTTP API. Accepts Telegram updates at /webhook and provides endpoints to set webhook, register notification webhooks, and exports.
- storage.py — Simple SQLite storage for captured orders and registered notification endpoints. Implements CSV/Excel/JSON exports.
- utils.py — Formatting helpers (tables, emojis) and wrappers around UX templates and parser.
- **init**.py — package marker.

Quick start (prototype)

1. Install dependencies (example):

   pip install flask requests openpyxl

2. Set environment variables:

   export BOT_TOKEN=<your_telegram_bot_token>
   export WEBHOOK_URL=https://your-public-url.example.com/webhook

3. Run the server:

   python3 bot.py

4. Set webhook (if running on public URL):

   GET /set_webhook will call Telegram setWebhook for you (needs BOT_TOKEN and WEBHOOK_URL env vars set).

Notes

- This is a prototype. The parser and dialog manager live in ../ux and are imported at runtime by adjusting sys.path. The bot DOES NOT execute any real trades — orders are stored for demonstration only.
- Excel export uses openpyxl if available; otherwise an Excel file is still produced by a simple xlsx writer fallback.
- Security: registration endpoint for notification webhooks uses a simple token mechanism. For production harden authentication and validate inputs.
