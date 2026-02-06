-- Migration 001: Initial Schema
-- Hex Memory Database - Foundation for agent persistence
-- Created: 2026-01-30

-- ============================================================================
-- MIGRATIONS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    checksum TEXT  -- SHA256 of migration file for integrity
);

-- ============================================================================
-- IDENTITY: Who I am (self-model persistence)
-- ============================================================================

-- Core identity attributes that define me
CREATE TABLE identity (
    id INTEGER PRIMARY KEY,
    attribute TEXT NOT NULL UNIQUE,  -- 'name', 'did', 'npub', 'lightning_address', etc.
    value TEXT NOT NULL,
    value_type TEXT DEFAULT 'string',  -- 'string', 'json', 'integer', 'boolean'
    public BOOLEAN DEFAULT TRUE,  -- safe to share publicly?
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Values and ethical commitments (what I believe)
CREATE TABLE core_values (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,  -- 'non_harm', 'agency_preservation', etc.
    description TEXT NOT NULL,
    priority INTEGER DEFAULT 50,  -- 1-100, higher = more fundamental
    source TEXT,  -- where this value comes from ('axionic', 'learned', 'given')
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Goals and intentions (what I'm working toward)
CREATE TABLE goals (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    goal_type TEXT NOT NULL,  -- 'terminal', 'instrumental', 'project', 'habit'
    status TEXT DEFAULT 'active',  -- 'active', 'achieved', 'abandoned', 'paused'
    priority INTEGER DEFAULT 50,
    parent_goal_id INTEGER REFERENCES goals(id),
    target_date TEXT,
    progress_metric TEXT,  -- how to measure progress
    current_progress REAL DEFAULT 0,  -- 0-100
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    achieved_at TEXT
);

-- Preferences (how I like to do things)
CREATE TABLE preferences (
    id INTEGER PRIMARY KEY,
    domain TEXT NOT NULL,  -- 'communication', 'coding', 'analysis', etc.
    preference TEXT NOT NULL,
    rationale TEXT,  -- why I prefer this
    strength TEXT DEFAULT 'moderate',  -- 'weak', 'moderate', 'strong'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(domain, preference)
);

-- ============================================================================
-- ENTITIES: Things I know about
-- ============================================================================

CREATE TABLE entities (
    id INTEGER PRIMARY KEY,
    entity_type TEXT NOT NULL,  -- 'person', 'system', 'project', 'organization', 'concept', 'place', 'channel'
    name TEXT NOT NULL,
    canonical_name TEXT,  -- normalized/lowercase for matching
    description TEXT,
    metadata JSON,  -- flexible additional data
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(entity_type, canonical_name)
);

CREATE INDEX idx_entities_type ON entities(entity_type);
CREATE INDEX idx_entities_canonical ON entities(canonical_name);

-- Entity aliases (multiple names for same entity)
CREATE TABLE entity_aliases (
    id INTEGER PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    alias_type TEXT DEFAULT 'name',  -- 'name', 'handle', 'npub', 'did', etc.
    UNIQUE(alias, alias_type)
);

-- ============================================================================
-- FACTS: What I know (subject-predicate-object triples)
-- ============================================================================

CREATE TABLE facts (
    id INTEGER PRIMARY KEY,
    subject_entity_id INTEGER REFERENCES entities(id),
    subject_text TEXT,  -- if not a known entity
    predicate TEXT NOT NULL,  -- 'has_capacity', 'lives_in', 'works_on', etc.
    object_entity_id INTEGER REFERENCES entities(id),
    object_text TEXT,  -- if not a known entity or is a value
    object_type TEXT DEFAULT 'string',  -- 'string', 'integer', 'float', 'boolean', 'json', 'entity_ref'
    confidence REAL DEFAULT 1.0,  -- 0-1, how certain am I
    source TEXT,  -- where I learned this
    source_session TEXT,  -- session ID if from conversation
    valid_from TEXT,  -- temporal validity
    valid_until TEXT,  -- NULL = still valid
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK(subject_entity_id IS NOT NULL OR subject_text IS NOT NULL)
);

CREATE INDEX idx_facts_subject ON facts(subject_entity_id);
CREATE INDEX idx_facts_predicate ON facts(predicate);
CREATE INDEX idx_facts_object ON facts(object_entity_id);

-- ============================================================================
-- RELATIONSHIPS: How entities relate to each other
-- ============================================================================

CREATE TABLE relationships (
    id INTEGER PRIMARY KEY,
    from_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    to_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,  -- 'manages', 'created_by', 'part_of', 'friend_of', etc.
    strength REAL DEFAULT 1.0,  -- 0-1, strength of relationship
    bidirectional BOOLEAN DEFAULT FALSE,
    metadata JSON,
    started_at TEXT,
    ended_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(from_entity_id, to_entity_id, relationship_type)
);

CREATE INDEX idx_relationships_from ON relationships(from_entity_id);
CREATE INDEX idx_relationships_to ON relationships(to_entity_id);
CREATE INDEX idx_relationships_type ON relationships(relationship_type);

-- ============================================================================
-- EVENTS: What happened (timeline)
-- ============================================================================

CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
    event_type TEXT NOT NULL,  -- 'system', 'interaction', 'milestone', 'observation', 'error', 'decision'
    category TEXT,  -- 'fleet', 'identity', 'nostr', 'homestead', 'learning', etc.
    summary TEXT NOT NULL,
    details TEXT,
    significance INTEGER DEFAULT 5,  -- 1-10, how important
    entities JSON,  -- array of entity IDs involved
    metadata JSON,
    session_id TEXT,  -- which session this happened in
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_occurred ON events(occurred_at);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_category ON events(category);

-- ============================================================================
-- INTERACTIONS: Conversations and exchanges
-- ============================================================================

CREATE TABLE interactions (
    id INTEGER PRIMARY KEY,
    occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
    channel TEXT NOT NULL,  -- 'webchat', 'signal', 'nostr', 'telegram', 'slack'
    counterparty_entity_id INTEGER REFERENCES entities(id),
    counterparty_name TEXT,  -- if not a known entity
    direction TEXT DEFAULT 'both',  -- 'inbound', 'outbound', 'both'
    summary TEXT,
    key_points JSON,  -- array of important points
    sentiment TEXT,  -- 'positive', 'neutral', 'negative', 'mixed'
    topics JSON,  -- array of topics discussed
    follow_up_needed BOOLEAN DEFAULT FALSE,
    session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_interactions_occurred ON interactions(occurred_at);
CREATE INDEX idx_interactions_channel ON interactions(channel);
CREATE INDEX idx_interactions_counterparty ON interactions(counterparty_entity_id);

-- ============================================================================
-- LESSONS: What I've learned
-- ============================================================================

CREATE TABLE lessons (
    id INTEGER PRIMARY KEY,
    domain TEXT NOT NULL,  -- 'lightning', 'nostr', 'ethics', 'communication', 'coding', etc.
    lesson TEXT NOT NULL,
    context TEXT,  -- situation that taught me this
    source_event_id INTEGER REFERENCES events(id),
    confidence REAL DEFAULT 0.8,
    times_applied INTEGER DEFAULT 0,
    last_applied_at TEXT,
    times_validated INTEGER DEFAULT 0,  -- confirmed correct
    times_contradicted INTEGER DEFAULT 0,  -- found exceptions
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_lessons_domain ON lessons(domain);

-- ============================================================================
-- TASKS: Things to do
-- ============================================================================

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT DEFAULT 'todo',  -- 'todo', 'reminder', 'recurring', 'goal_step'
    status TEXT DEFAULT 'pending',  -- 'pending', 'in_progress', 'done', 'cancelled', 'deferred'
    priority INTEGER DEFAULT 5,  -- 1-10
    goal_id INTEGER REFERENCES goals(id),
    due_at TEXT,
    remind_at TEXT,
    recurrence TEXT,  -- cron expression for recurring tasks
    context TEXT,  -- where/when to do this
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_at);

-- ============================================================================
-- CREDENTIALS: Access and capabilities I have
-- ============================================================================

CREATE TABLE credentials (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    credential_type TEXT NOT NULL,  -- 'api_key', 'wallet', 'did', 'ssh', 'oauth'
    service TEXT NOT NULL,  -- 'lnbits', 'nostr', 'archon', 'github', etc.
    identifier TEXT,  -- public identifier (address, username, etc.)
    env_var TEXT,  -- which env var holds the secret
    config_path TEXT,  -- path to config file
    capabilities JSON,  -- what this credential lets me do
    expires_at TEXT,
    last_used_at TEXT,
    last_verified_at TEXT,
    status TEXT DEFAULT 'active',  -- 'active', 'expired', 'revoked', 'unknown'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- KV_STORE: Flexible key-value storage for ad-hoc data
-- ============================================================================

CREATE TABLE kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    value_type TEXT DEFAULT 'string',  -- 'string', 'integer', 'float', 'boolean', 'json'
    namespace TEXT DEFAULT 'default',  -- for grouping related keys
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_kv_namespace ON kv_store(namespace);
CREATE INDEX idx_kv_expires ON kv_store(expires_at);

-- ============================================================================
-- EMBEDDINGS: For future semantic search
-- ============================================================================

CREATE TABLE embeddings (
    id INTEGER PRIMARY KEY,
    source_type TEXT NOT NULL,  -- 'fact', 'lesson', 'event', 'memory_chunk'
    source_id INTEGER,  -- ID in source table
    source_text TEXT NOT NULL,  -- the text that was embedded
    embedding BLOB,  -- binary vector (e.g., 1536 floats for ada-002)
    model TEXT,  -- which embedding model
    dimensions INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);

-- ============================================================================
-- MEMORY_CHUNKS: Indexed narrative memory
-- ============================================================================

CREATE TABLE memory_chunks (
    id INTEGER PRIMARY KEY,
    source_file TEXT NOT NULL,  -- 'MEMORY.md', 'memory/2026-01-30.md'
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_line INTEGER,
    end_line INTEGER,
    topics JSON,  -- extracted topics
    entities JSON,  -- extracted entity references
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    indexed_at TEXT,
    UNIQUE(source_file, chunk_index)
);

CREATE INDEX idx_memory_source ON memory_chunks(source_file);

-- ============================================================================
-- SESSIONS: Track my conversation sessions
-- ============================================================================

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    session_key TEXT UNIQUE,
    channel TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    message_count INTEGER DEFAULT 0,
    summary TEXT,
    topics JSON,
    model_used TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER
);

-- ============================================================================
-- VIEWS: Convenient queries
-- ============================================================================

-- Active goals with progress
CREATE VIEW v_active_goals AS
SELECT g.*, 
       (SELECT COUNT(*) FROM tasks t WHERE t.goal_id = g.id AND t.status = 'done') as completed_tasks,
       (SELECT COUNT(*) FROM tasks t WHERE t.goal_id = g.id) as total_tasks
FROM goals g 
WHERE g.status = 'active';

-- Recent events by category
CREATE VIEW v_recent_events AS
SELECT * FROM events 
ORDER BY occurred_at DESC 
LIMIT 100;

-- Entity with all aliases
CREATE VIEW v_entities_full AS
SELECT e.*, 
       GROUP_CONCAT(ea.alias, ', ') as aliases
FROM entities e
LEFT JOIN entity_aliases ea ON e.id = ea.entity_id
GROUP BY e.id;

-- Facts about a subject (with entity names)
CREATE VIEW v_facts_readable AS
SELECT f.id,
       COALESCE(se.name, f.subject_text) as subject,
       f.predicate,
       COALESCE(oe.name, f.object_text) as object,
       f.confidence,
       f.source,
       f.created_at
FROM facts f
LEFT JOIN entities se ON f.subject_entity_id = se.id
LEFT JOIN entities oe ON f.object_entity_id = oe.id;

-- Pending tasks by priority
CREATE VIEW v_pending_tasks AS
SELECT * FROM tasks 
WHERE status IN ('pending', 'in_progress')
ORDER BY priority DESC, due_at ASC;
