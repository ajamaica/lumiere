import sqlite3
import os
import sys

DB_PATH = os.path.expanduser("~/.openclaw/workspace/skills/personal-finance/finance.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            budget REAL DEFAULT 0
        )
    ''')
    
    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            amount REAL NOT NULL,
            description TEXT,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    ''')
    
    # Recurring (EMIs) and One-time table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT CHECK(type IN ('EMI', 'ONE_TIME')),
            name TEXT NOT NULL,
            amount REAL,
            frequency TEXT,
            due_date TEXT,
            last_notified TEXT,
            FOREIGN KEY (name) REFERENCES categories (name)
        )
    ''')
    
    # Default Categories
    presets = ['Food', 'Rent', 'Utilities', 'Travel', 'Entertainment', 'Shopping', 'Health', 'Misc']
    for cat in presets:
        cursor.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (cat,))
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
