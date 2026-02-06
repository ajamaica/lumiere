#!/usr/bin/env python3
"""
Flask-based webhook receiver for Telegram + simple HTTP API for exports and webhook management.
This is a prototype server. For production, run behind a proper WSGI server and secure endpoints.
"""
import os
import sys
import hmac
import hashlib
import json
from flask import Flask, request, jsonify, send_file
import requests

# adjust path to import ux modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ux')))
from parser import parse
from interactive import DialogManager
from templates import render_confirmation
from utils import format_order_table, parse_nl, build_confirmation, pretty_timestamp, export_csv, export_excel, export_json
from storage import save_order, list_orders, register_webhook, list_webhooks

app = Flask(__name__)
BOT_TOKEN = os.environ.get('BOT_TOKEN')
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', 'dev-secret')
DM = DialogManager(__import__('parser'))


def verify_telegram_request(req):
    # optional: Telegram doesn't sign webhooks by default for bots. This function left as placeholder.
    return True


@app.route('/webhook', methods=['POST'])
def webhook():
    if not verify_telegram_request(request):
        return '', 403
    data = request.get_json(force=True)
    # minimal handling: message text and callback_query
    if 'message' in data and data['message'].get('text'):
        msg = data['message']
        chat_id = msg['chat']['id']
        user_id = msg['from']['id']
        text = msg['text']
        # start dialog and possibly ask for missing fields
        state = DM.start(text)
        missing = DM.next_prompt(state)
        if missing:
            send_message(chat_id, missing)
            return jsonify({'ok': True})
        err = DM.validate(state)
        if err:
            send_message(chat_id, err)
            return jsonify({'ok': True})
        # save draft order to DB first so we can reference it in callbacks
        oid = save_order(chat_id, user_id, state)
        # send confirmation with inline keyboard (include order id in callbacks)
        confirmation = format_order_table(state)
        msg_id = send_message(chat_id, confirmation, parse_mode='HTML', buttons=build_inline_buttons(state, oid))
        return jsonify({'ok': True, 'order_id': oid})
    if 'callback_query' in data:
        cb = data['callback_query']
        chat_id = cb['message']['chat']['id']
        data_str = cb['data']
        # handle simple callbacks: confirm:<id>, edit:<id>, cancel:<id>
        if data_str.startswith('confirm:'):
            oid = int(data_str.split(':',1)[1])
            send_message(chat_id, 'Ордeр подтверждён. (Прототип — не отправляет на биржу)')
            notify_webhooks({'event':'order_confirmed','order_id': oid})
            return jsonify({'ok': True})
        if data_str.startswith('cancel:'):
            oid = int(data_str.split(':',1)[1])
            send_message(chat_id, 'Операция отменена.')
            return jsonify({'ok': True})
        if data_str.startswith('edit:'):
            oid = int(data_str.split(':',1)[1])
            send_message(chat_id, 'Откройте диалог для редактирования. (Прототип)')
            return jsonify({'ok': True})
    return jsonify({'ok': True})


@app.route('/set_webhook', methods=['GET'])
def set_webhook():
    if not BOT_TOKEN:
        return 'BOT_TOKEN not set', 400
    webhook_url = os.environ.get('WEBHOOK_URL')
    if not webhook_url:
        return 'WEBHOOK_URL not set', 400
    r = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/setWebhook', params={'url': webhook_url})
    return (r.text, r.status_code, {'Content-Type': 'application/json'})


@app.route('/exports/orders.csv')
def export_orders_csv():
    rows = list_orders(1000)
    path = os.path.join(os.path.dirname(__file__), 'orders_export.csv')
    export_csv(rows, path)
    return send_file(path, as_attachment=True, mimetype='text/csv')


@app.route('/exports/orders.xlsx')
def export_orders_xlsx():
    rows = list_orders(1000)
    path = os.path.join(os.path.dirname(__file__), 'orders_export.xlsx')
    export_excel(rows, path)
    return send_file(path, as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@app.route('/exports/orders.json')
def export_orders_json():
    rows = list_orders(1000)
    path = os.path.join(os.path.dirname(__file__), 'orders_export.json')
    export_json(rows, path)
    return send_file(path, as_attachment=True, mimetype='application/json')


@app.route('/webhooks/register', methods=['POST'])
def register_webhook_endpoint():
    # expects JSON {name, url, token}
    data = request.get_json(force=True)
    name = data.get('name')
    url = data.get('url')
    token = data.get('token')
    if not name or not url:
        return jsonify({'error':'name and url required'}), 400
    wid = register_webhook(name, url, token)
    return jsonify({'ok': True, 'id': wid})


@app.route('/webhooks/list')
def webhooks_list():
    wh = list_webhooks()
    return jsonify(wh)


def build_inline_buttons(state, order_id=0):
    # buttons with callback data referencing the saved order id.
    return [
        {'text':'✅ Подтвердить', 'callback_data':f'confirm:{order_id}'},
        {'text':'✏️ Редактировать', 'callback_data':f'edit:{order_id}'},
        {'text':'❌ Отменить', 'callback_data':f'cancel:{order_id}'},
    ]


def send_message(chat_id, text, parse_mode=None, buttons=None):
    if not BOT_TOKEN:
        print('BOT_TOKEN not set — message to', chat_id, text)
        return None
    payload = {'chat_id': chat_id, 'text': text}
    if parse_mode:
        payload['parse_mode'] = parse_mode
    if buttons:
        # convert to Telegram inline keyboard format
        keyboard = {'inline_keyboard': [[b] for b in buttons]}
        payload['reply_markup'] = json.dumps({'inline_keyboard': keyboard['inline_keyboard']})
    r = requests.post(f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage', data=payload)
    if r.status_code == 200:
        resp = r.json()
        return resp.get('result', {}).get('message_id')
    else:
        print('send message failed', r.status_code, r.text)
        return None


def notify_webhooks(payload):
    # send POST to all registered webhooks
    whs = list_webhooks()
    for w in whs:
        try:
            headers = {}
            if w.get('token'):
                headers['Authorization'] = f"Bearer {w['token']}"
            requests.post(w['url'], json=payload, headers=headers, timeout=5)
        except Exception as e:
            print('webhook notify failed', e)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
