import sqlite3
import os
from typing import List

DB_PATH = os.path.join(os.path.dirname(__file__), 'bot_storage.db')

SCHEMA = '''
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    user_id TEXT,
    raw_text TEXT,
    side TEXT,
    quantity REAL,
    symbol TEXT,
    base_asset TEXT,
    quote_asset TEXT,
    order_type TEXT,
    price REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    url TEXT,
    token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
'''


def get_conn():
    first = not os.path.exists(DB_PATH)
    c = sqlite3.connect(DB_PATH)
    if first:
        c.executescript(SCHEMA)
        c.commit()
    return c


def save_order(chat_id, user_id, order: dict):
    c = get_conn()
    with c:
        c.execute('''INSERT INTO orders (chat_id,user_id,raw_text,side,quantity,symbol,base_asset,quote_asset,order_type,price) VALUES (?,?,?,?,?,?,?,?,?,?)''', (
            str(chat_id), str(user_id), order.get('raw_text'), order.get('side'), order.get('quantity'), order.get('symbol'), order.get('base_asset'), order.get('quote_asset'), order.get('order_type'), order.get('price')
        ))
        return c.lastrowid


def list_orders(limit=100):
    c = get_conn()
    c.row_factory = sqlite3.Row
    cur = c.execute('SELECT * FROM orders ORDER BY id DESC LIMIT ?', (limit,))
    return [dict(r) for r in cur.fetchall()]


def register_webhook(name, url, token):
    c = get_conn()
    with c:
        c.execute('INSERT INTO webhooks (name,url,token) VALUES (?,?,?)', (name, url, token))
        return c.lastrowid


def list_webhooks():
    c = get_conn()
    c.row_factory = sqlite3.Row
    cur = c.execute('SELECT * FROM webhooks ORDER BY id DESC')
    return [dict(r) for r in cur.fetchall()]
