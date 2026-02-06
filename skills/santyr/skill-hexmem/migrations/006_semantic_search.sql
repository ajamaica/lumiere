-- Migration 006: Semantic Search
-- Adds vector embeddings support using sqlite-vec extension
-- 
-- NOTE: This migration creates the schema. sqlite-vec extension must be 
-- loaded separately when connecting to the database.

-- Embedding dimensions for different models:
-- - all-MiniLM-L6-v2: 384 dimensions (small, fast, good quality)
-- - text-embedding-3-small: 1536 dimensions (OpenAI)
-- - nomic-embed-text: 768 dimensions (Ollama)

-- Configuration for embedding provider
CREATE TABLE IF NOT EXISTS embedding_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton
    provider TEXT NOT NULL DEFAULT 'sentence-transformers',  -- 'sentence-transformers', 'openai', 'ollama'
    model_name TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    dimensions INTEGER NOT NULL DEFAULT 384,
    api_endpoint TEXT,  -- for remote providers
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default config
INSERT OR IGNORE INTO embedding_config (id, provider, model_name, dimensions)
VALUES (1, 'sentence-transformers', 'all-MiniLM-L6-v2', 384);

-- Embeddings for events
-- Uses vec0 virtual table from sqlite-vec extension
-- Note: This table must be created AFTER loading sqlite-vec
-- We create a placeholder view that will be replaced by the actual virtual table
CREATE TABLE IF NOT EXISTS event_embeddings_pending (
    event_id INTEGER PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    embedding_text TEXT NOT NULL,  -- the text that was embedded
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Embeddings for lessons
CREATE TABLE IF NOT EXISTS lesson_embeddings_pending (
    lesson_id INTEGER PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
    embedding_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Embeddings for facts (the object_text)
CREATE TABLE IF NOT EXISTS fact_embeddings_pending (
    fact_id INTEGER PRIMARY KEY REFERENCES facts(id) ON DELETE CASCADE,
    embedding_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Embeddings for entities (description)
CREATE TABLE IF NOT EXISTS entity_embeddings_pending (
    entity_id INTEGER PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
    embedding_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Embeddings for memory seeds (seed_text)
CREATE TABLE IF NOT EXISTS seed_embeddings_pending (
    seed_id INTEGER PRIMARY KEY REFERENCES memory_seeds(id) ON DELETE CASCADE,
    embedding_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Track embedding queue for async processing
CREATE TABLE IF NOT EXISTS embedding_queue (
    id INTEGER PRIMARY KEY,
    source_table TEXT NOT NULL,  -- 'events', 'lessons', 'facts', 'entities', 'memory_seeds'
    source_id INTEGER NOT NULL,
    text_to_embed TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'done', 'failed'
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT,
    UNIQUE(source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue(status);

-- Trigger: Queue events for embedding on insert
CREATE TRIGGER IF NOT EXISTS queue_event_embedding
AFTER INSERT ON events
BEGIN
    INSERT OR REPLACE INTO embedding_queue (source_table, source_id, text_to_embed)
    VALUES ('events', NEW.id, COALESCE(NEW.summary, '') || ' ' || COALESCE(NEW.details, ''));
END;

-- Trigger: Queue lessons for embedding on insert
CREATE TRIGGER IF NOT EXISTS queue_lesson_embedding
AFTER INSERT ON lessons
BEGIN
    INSERT OR REPLACE INTO embedding_queue (source_table, source_id, text_to_embed)
    VALUES ('lessons', NEW.id, COALESCE(NEW.lesson, '') || ' ' || COALESCE(NEW.context, ''));
END;

-- Trigger: Queue facts for embedding on insert (if object_text is meaningful)
CREATE TRIGGER IF NOT EXISTS queue_fact_embedding
AFTER INSERT ON facts
WHEN length(COALESCE(NEW.object_text, '')) > 10
BEGIN
    INSERT OR REPLACE INTO embedding_queue (source_table, source_id, text_to_embed)
    VALUES ('facts', NEW.id, 
            COALESCE(NEW.subject_text, '') || ' ' || NEW.predicate || ' ' || COALESCE(NEW.object_text, ''));
END;

-- View: Items needing embedding
CREATE VIEW IF NOT EXISTS v_embedding_queue_pending AS
SELECT * FROM embedding_queue WHERE status = 'pending' ORDER BY created_at;

-- View: Embedding stats
CREATE VIEW IF NOT EXISTS v_embedding_stats AS
SELECT 
    source_table,
    status,
    COUNT(*) as count
FROM embedding_queue
GROUP BY source_table, status;
