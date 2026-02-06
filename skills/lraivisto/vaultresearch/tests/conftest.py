import pytest
import sqlite3
import os
import scripts.db as db

class ConnectionProxy:
    def __init__(self, conn):
        self.conn = conn
    
    def cursor(self):
        return self.conn.cursor()
        
    def commit(self):
        return self.conn.commit()
        
    def close(self):
        # Do nothing to keep the connection open for tests
        pass

@pytest.fixture
def db_conn(monkeypatch):
    """
    Creates an in-memory SQLite database for testing.
    Monkeypatches scripts.db.get_connection to return a proxy that ignores close().
    """
    conn = sqlite3.connect(":memory:")
    proxy = ConnectionProxy(conn)
    
    def mock_get_connection():
        return proxy
        
    monkeypatch.setattr(db, "get_connection", mock_get_connection)
    
    # Initialize schema using the proxy (which won't actually close it)
    db.init_db()
    
    yield conn
    
    conn.close()

@pytest.fixture
def reset_db(db_conn):
    """
    Fixture to ensure DB is clean. 
    (In-memory DB with yield teardown usually handles this, 
    but this provides a clean slate point if needed).
    """
    cursor = db_conn.cursor()
    cursor.execute("DELETE FROM projects")
    cursor.execute("DELETE FROM events")
    cursor.execute("DELETE FROM search_cache")
    cursor.execute("DELETE FROM insights")
    db_conn.commit()
    return db_conn
