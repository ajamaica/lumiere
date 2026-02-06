import sqlite3
import os
import uuid
import json
import sys

# Path to the research database
DEFAULT_DB_PATH = os.path.expanduser("~/.researchvault/research_vault.db")
LEGACY_DB_PATH = os.path.expanduser("~/.openclaw/workspace/memory/research_vault.db")

def get_db_path():
    """Resolve the database path with env override and legacy fallback."""
    env_path = os.environ.get("RESEARCHVAULT_DB")
    if env_path:
        return os.path.expanduser(env_path)
    if os.path.exists(LEGACY_DB_PATH):
        return LEGACY_DB_PATH
    return DEFAULT_DB_PATH

def get_connection():
    """Returns a connection to the SQLite database."""
    db_path = get_db_path()
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return sqlite3.connect(db_path)

def init_db():
    """Initialize the database and run versioned migrations."""
    conn = get_connection()
    c = conn.cursor()
    
    # Ensure schema_version table exists
    c.execute('''CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)''')
    
    _run_migrations(c)
    
    conn.commit()
    conn.close()

def _run_migrations(cursor):
    """Run pending versioned migrations."""
    cursor.execute("SELECT version FROM schema_version")
    row = cursor.fetchone()
    current_version = row[0] if row else 0

    migrations = [
        _migration_v1, # Initial schema
        _migration_v2, # Add artifacts, findings, links
        _migration_v3, # Backfill insights -> findings
        _migration_v4, # Divergent reasoning: branches + hypotheses + branch_id backfill
        _migration_v5, # Synthesis engine: local embeddings + synthesis link constraints
        _migration_v6, # Active verification: missions table
        _migration_v7  # Watchdog mode: watch targets + run state
    ]

    for i, migration_fn in enumerate(migrations):
        version = i + 1
        if version > current_version:
            print(f"Running migration v{version}...", file=sys.stderr)
            migration_fn(cursor)
            if current_version == 0:
                cursor.execute("INSERT INTO schema_version (version) VALUES (?)", (version,))
                current_version = version
            else:
                cursor.execute("UPDATE schema_version SET version = ?", (version,))
                current_version = version

def _migration_v1(cursor):
    """Initial schema baseline."""
    cursor.execute('''CREATE TABLE IF NOT EXISTS projects
                 (id TEXT PRIMARY KEY, name TEXT, objective TEXT, status TEXT, created_at TEXT, priority INTEGER DEFAULT 0)''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS events
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT, event_type TEXT, 
                  step INTEGER, payload TEXT, confidence REAL DEFAULT 1.0, source TEXT DEFAULT 'unknown', 
                  tags TEXT DEFAULT '', timestamp TEXT,
                  FOREIGN KEY(project_id) REFERENCES projects(id))''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS search_cache
                 (query_hash TEXT PRIMARY KEY, query TEXT, result TEXT, timestamp TEXT)''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS insights
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT, title TEXT, 
                  content TEXT, source_url TEXT, tags TEXT, timestamp TEXT,
                  FOREIGN KEY(project_id) REFERENCES projects(id))''')

def _migration_v2(cursor):
    """Add artifacts, findings, and links tables."""
    cursor.execute('''CREATE TABLE IF NOT EXISTS artifacts
                 (id TEXT PRIMARY KEY, project_id TEXT, type TEXT, path TEXT, 
                  metadata TEXT, created_at TEXT,
                  FOREIGN KEY(project_id) REFERENCES projects(id))''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS findings
                 (id TEXT PRIMARY KEY, project_id TEXT, title TEXT, 
                  content TEXT, evidence TEXT, confidence REAL, 
                  tags TEXT, created_at TEXT,
                  FOREIGN KEY(project_id) REFERENCES projects(id))''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS links
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT, target_id TEXT, 
                  link_type TEXT, metadata TEXT, created_at TEXT)''')

def _migration_v3(cursor):
    """Backfill insights to findings."""
    cursor.execute("SELECT project_id, title, content, source_url, tags, timestamp FROM insights")
    insights = cursor.fetchall()
    
    for ins in insights:
        project_id, title, content, source_url, tags, timestamp = ins
        # Generate a semi-stable ID for the finding
        import uuid
        import json
        finding_id = f"fnd_{uuid.uuid4().hex[:8]}"
        evidence = json.dumps({"source_url": source_url})
        
        cursor.execute('''INSERT INTO findings (id, project_id, title, content, evidence, confidence, tags, created_at)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                       (finding_id, project_id, title, content, evidence, 1.0, tags, timestamp))

def _migration_v4(cursor):
    """Add branches/hypotheses and branch_id columns for divergent reasoning."""
    import re
    from datetime import datetime

    def _safe(s: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_-]", "_", (s or "").strip())

    def _default_branch_id(project_id: str) -> str:
        # Deterministic to allow safe re-runs and easy interoperability.
        return f"br_{_safe(project_id)}_main"

    now = datetime.now().isoformat()

    cursor.execute(
        """CREATE TABLE IF NOT EXISTS branches (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            parent_id TEXT,
            hypothesis TEXT DEFAULT '',
            status TEXT DEFAULT 'active',
            created_at TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id),
            FOREIGN KEY(parent_id) REFERENCES branches(id),
            UNIQUE(project_id, name)
        )"""
    )

    cursor.execute(
        """CREATE TABLE IF NOT EXISTS hypotheses (
            id TEXT PRIMARY KEY,
            branch_id TEXT NOT NULL,
            statement TEXT NOT NULL,
            rationale TEXT DEFAULT '',
            confidence REAL DEFAULT 0.5,
            status TEXT DEFAULT 'open',
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY(branch_id) REFERENCES branches(id)
        )"""
    )

    def _add_column_if_missing(table: str, column: str, decl: str) -> None:
        cursor.execute(f"PRAGMA table_info({table})")
        existing = {r[1] for r in cursor.fetchall()}
        if column in existing:
            return
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")

    _add_column_if_missing("events", "branch_id", "TEXT")
    _add_column_if_missing("findings", "branch_id", "TEXT")
    _add_column_if_missing("artifacts", "branch_id", "TEXT")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_branches_project ON branches(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hypotheses_branch ON hypotheses(branch_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_project_branch ON events(project_id, branch_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_project_branch ON findings(project_id, branch_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_artifacts_project_branch ON artifacts(project_id, branch_id)")

    # Create a default "main" branch per existing project and backfill NULL branch_id.
    cursor.execute("SELECT id FROM projects")
    for (project_id,) in cursor.fetchall():
        branch_id = _default_branch_id(project_id)
        cursor.execute(
            "INSERT OR IGNORE INTO branches (id, project_id, name, parent_id, hypothesis, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (branch_id, project_id, "main", None, "", "active", now),
        )
        cursor.execute(
            "UPDATE events SET branch_id = ? WHERE project_id = ? AND (branch_id IS NULL OR branch_id = '')",
            (branch_id, project_id),
        )
        cursor.execute(
            "UPDATE findings SET branch_id = ? WHERE project_id = ? AND (branch_id IS NULL OR branch_id = '')",
            (branch_id, project_id),
        )
        cursor.execute(
            "UPDATE artifacts SET branch_id = ? WHERE project_id = ? AND (branch_id IS NULL OR branch_id = '')",
            (branch_id, project_id),
        )

def _migration_v5(cursor):
    """Add embeddings storage and synthesis link constraints."""
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            model TEXT NOT NULL,
            dims INTEGER NOT NULL,
            vector BLOB NOT NULL,
            content_hash TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(entity_type, entity_id, model)
        )"""
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_type, entity_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_embeddings_model ON embeddings(model)")

    # Uniqueness only for the new synthesis link type to avoid breaking legacy datasets.
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uniq_links_synthesis_pair ON links(source_id, target_id) WHERE link_type='SYNTHESIS_SIMILARITY'"
    )

def _migration_v6(cursor):
    """Add verification mission queue for low-confidence findings."""
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS verification_missions (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            branch_id TEXT NOT NULL,
            finding_id TEXT NOT NULL,
            mission_type TEXT NOT NULL,
            query TEXT NOT NULL,
            query_hash TEXT NOT NULL,
            question TEXT DEFAULT '',
            rationale TEXT DEFAULT '',
            status TEXT DEFAULT 'open',
            priority INTEGER DEFAULT 0,
            result_meta TEXT DEFAULT '',
            last_error TEXT DEFAULT '',
            created_at TEXT,
            updated_at TEXT,
            completed_at TEXT,
            dedup_hash TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id),
            FOREIGN KEY(branch_id) REFERENCES branches(id),
            FOREIGN KEY(finding_id) REFERENCES findings(id),
            UNIQUE(dedup_hash)
        )"""
    )

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_missions_project_status ON verification_missions(project_id, status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_missions_branch_status ON verification_missions(branch_id, status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_missions_finding ON verification_missions(finding_id)")

def _migration_v7(cursor):
    """Add watch targets for background scuttling/search."""
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS watch_targets (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            branch_id TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target TEXT NOT NULL,
            tags TEXT DEFAULT '',
            interval_s INTEGER DEFAULT 3600,
            status TEXT DEFAULT 'active',
            last_run_at TEXT,
            last_result_hash TEXT DEFAULT '',
            last_error TEXT DEFAULT '',
            created_at TEXT,
            updated_at TEXT,
            dedup_hash TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id),
            FOREIGN KEY(branch_id) REFERENCES branches(id),
            UNIQUE(dedup_hash)
        )"""
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_watch_project_status ON watch_targets(project_id, status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_watch_branch_status ON watch_targets(branch_id, status)")
