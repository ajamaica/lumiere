import scripts.db as db
import pytest
import sqlite3

def test_init_db_schema(db_conn):
    """
    Test that init_db creates all required tables with correct columns.
    """
    c = db_conn.cursor()
    
    # Check Projects table
    c.execute("PRAGMA table_info(projects)")
    columns = {r[1] for r in c.fetchall()}
    assert "priority" in columns
    assert "status" in columns
    
    # Check Events table
    c.execute("PRAGMA table_info(events)")
    columns = {r[1] for r in c.fetchall()}
    assert "confidence" in columns
    assert "source" in columns
    assert "tags" in columns

    # Check Artifacts table (v2)
    c.execute("PRAGMA table_info(artifacts)")
    columns = {r[1] for r in c.fetchall()}
    assert "id" in columns
    assert "project_id" in columns
    assert "type" in columns

    # Check Findings table (v2)
    c.execute("PRAGMA table_info(findings)")
    columns = {r[1] for r in c.fetchall()}
    assert "id" in columns
    assert "evidence" in columns

    # Check Links table (v2)
    c.execute("PRAGMA table_info(links)")
    columns = {r[1] for r in c.fetchall()}
    assert "source_id" in columns
    assert "target_id" in columns

    # Divergent reasoning tables (v4)
    c.execute("PRAGMA table_info(branches)")
    columns = {r[1] for r in c.fetchall()}
    assert "project_id" in columns
    assert "name" in columns
    assert "parent_id" in columns

    c.execute("PRAGMA table_info(hypotheses)")
    columns = {r[1] for r in c.fetchall()}
    assert "branch_id" in columns
    assert "statement" in columns
    assert "confidence" in columns

    # Branch scoping columns (v4)
    c.execute("PRAGMA table_info(events)")
    columns = {r[1] for r in c.fetchall()}
    assert "branch_id" in columns

    c.execute("PRAGMA table_info(findings)")
    columns = {r[1] for r in c.fetchall()}
    assert "branch_id" in columns

    c.execute("PRAGMA table_info(artifacts)")
    columns = {r[1] for r in c.fetchall()}
    assert "branch_id" in columns

    # Synthesis embeddings table (v5)
    c.execute("PRAGMA table_info(embeddings)")
    columns = {r[1] for r in c.fetchall()}
    assert "entity_type" in columns
    assert "entity_id" in columns
    assert "model" in columns
    assert "vector" in columns

    # Verification missions (v6)
    c.execute("PRAGMA table_info(verification_missions)")
    columns = {r[1] for r in c.fetchall()}
    assert "finding_id" in columns
    assert "query" in columns
    assert "status" in columns

    # Watch targets (v7)
    c.execute("PRAGMA table_info(watch_targets)")
    columns = {r[1] for r in c.fetchall()}
    assert "target_type" in columns
    assert "target" in columns
    assert "interval_s" in columns

def test_migrations_are_idempotent(db_conn):
    """
    Test that running init_db (and thus migrations) multiple times is safe.
    """
    # db_conn fixture ALREADY runs init_db once.
    # Run it again to ensure no error.
    try:
        db.init_db()
    except Exception as e:
        pytest.fail(f"init_db raised exception on re-run: {e}")

def test_migration_v3_backfill(db_conn):
    """
    Test that migration v3 correctly backfills insights to findings.
    """
    c = db_conn.cursor()
    
    # Insert a dummy project
    c.execute("INSERT INTO projects (id, name) VALUES ('p1', 'Project 1')")
    
    # Insert a dummy insight
    c.execute('''INSERT INTO insights (project_id, title, content, source_url, tags, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?)''',
              ('p1', 'Insight Title', 'Insight Content', 'https://example.com', 'tag1,tag2', '2026-02-02 12:00:00'))
    db_conn.commit()
    
    # We need to trigger the migration. Since db_conn fixture already ran init_db,
    # we might need a way to run a specific migration or re-run init_db if we can reset the version.
    
    # For testing purpose, let's manually reset the schema version and call _run_migrations
    c.execute("UPDATE schema_version SET version = 2")
    db_conn.commit()
    
    db.init_db() # This should run v3
    
    c.execute("SELECT * FROM findings WHERE project_id = 'p1'")
    finding = c.fetchone()
    assert finding is not None
    assert finding[2] == 'Insight Title'
    assert finding[3] == 'Insight Content'
    assert 'https://example.com' in finding[4] # evidence JSON
    assert finding[6] == 'tag1,tag2'
    assert finding[7] == '2026-02-02 12:00:00'
