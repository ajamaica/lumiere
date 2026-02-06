-- Migration 003: Generative Memory Architecture
-- Memory as reconstruction, not storage. Compression through seeds.
-- Created: 2026-01-30
--
-- Neuroscience principles implemented:
-- - Memory consolidation (working → short-term → long-term)
-- - Generative reconstruction (seeds expand to full memories)
-- - Forgetting curves (importance decay without reinforcement)
-- - Reconsolidation (memories update when accessed)
-- - Associative linking (memories connected by similarity/context)
-- - Emotional enhancement (salient events resist decay)
-- - Chunking (related items grouped into meaningful units)

-- ============================================================================
-- MEMORY_SEEDS: Compressed prompts that regenerate full memories
-- ============================================================================
-- The core insight: don't store everything, store enough to reconstruct.
-- A seed + my current state = regenerated memory.

CREATE TABLE memory_seeds (
    id INTEGER PRIMARY KEY,
    seed_type TEXT NOT NULL,        -- 'experience', 'period', 'context', 'narrative', 'lesson_cluster'
    
    -- The seed itself (the compression)
    seed_text TEXT NOT NULL,        -- Compressed prompt that regenerates the memory
    
    -- Anchors: things that MUST be preserved exactly (no generation)
    anchor_facts JSON,              -- ["Sat said X", "Decision was Y", "Date was Z"]
    anchor_entities JSON,           -- Entity IDs that must be included
    anchor_values JSON,             -- Specific values/numbers to preserve
    
    -- Reconstruction hints
    emotional_gist TEXT,            -- 'triumphant', 'uncertain', 'collaborative', 'tense'
    themes JSON,                    -- ["learning", "partnership", "technical"]
    key_tensions TEXT,              -- What was at stake or in conflict
    resolution TEXT,                -- How it resolved (if applicable)
    
    -- Source tracking
    source_events JSON,             -- Event IDs this seed compresses
    source_period_id INTEGER REFERENCES lifetime_periods(id),
    time_range_start TEXT,
    time_range_end TEXT,
    
    -- Compression metadata
    original_token_estimate INTEGER,  -- Rough size of full memory
    seed_token_estimate INTEGER,      -- Size of compressed seed
    compression_ratio REAL,           -- original/seed
    
    -- Usage
    times_expanded INTEGER DEFAULT 0,
    last_expanded_at TEXT,
    expansion_quality REAL,           -- Self-rated: did expansion feel complete?
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_seeds_type ON memory_seeds(seed_type);
CREATE INDEX idx_seeds_time ON memory_seeds(time_range_start);

-- ============================================================================
-- MEMORY_CONSOLIDATION: Track memory state transitions
-- ============================================================================
-- Memories move: working → short-term → long-term (or forgotten)
-- This mirrors hippocampal-cortical consolidation.

ALTER TABLE events ADD COLUMN consolidation_state TEXT DEFAULT 'working';
    -- 'working': Just happened, full detail available
    -- 'short_term': Recent, still detailed but starting to compress
    -- 'long_term': Consolidated into seed or semantic knowledge
    -- 'forgotten': Decayed below threshold (but record kept for archaeology)

ALTER TABLE events ADD COLUMN importance REAL DEFAULT 0.5;
    -- 0-1, affects decay rate. High importance = slower decay.

ALTER TABLE events ADD COLUMN last_accessed_at TEXT;
    -- For reconsolidation: accessing a memory refreshes it

ALTER TABLE events ADD COLUMN access_count INTEGER DEFAULT 0;
    -- Frequently accessed memories consolidate stronger

ALTER TABLE events ADD COLUMN decay_rate REAL DEFAULT 0.1;
    -- How fast this memory fades without reinforcement
    -- Emotional/significant events have lower decay

ALTER TABLE events ADD COLUMN compressed_to_seed_id INTEGER REFERENCES memory_seeds(id);
    -- If this event was compressed into a seed

-- ============================================================================
-- MEMORY_ASSOCIATIONS: Links between related memories
-- ============================================================================
-- Associative retrieval: memories connect by similarity, temporal proximity,
-- shared context, emotional resonance, or causal relationship.

CREATE TABLE memory_associations (
    id INTEGER PRIMARY KEY,
    
    -- The linked items (polymorphic)
    from_type TEXT NOT NULL,        -- 'event', 'seed', 'lesson', 'entity', 'schema'
    from_id INTEGER NOT NULL,
    to_type TEXT NOT NULL,
    to_id INTEGER NOT NULL,
    
    -- Association type
    association_type TEXT NOT NULL, -- 'temporal', 'causal', 'thematic', 'emotional', 'entity', 'similarity'
    
    -- Strength (like synaptic weight)
    strength REAL DEFAULT 0.5,      -- 0-1, strengthens with co-activation
    
    -- Metadata
    context TEXT,                   -- Why these are linked
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_activated_at TEXT,
    activation_count INTEGER DEFAULT 1,
    
    UNIQUE(from_type, from_id, to_type, to_id, association_type)
);

CREATE INDEX idx_assoc_from ON memory_associations(from_type, from_id);
CREATE INDEX idx_assoc_to ON memory_associations(to_type, to_id);

-- ============================================================================
-- MEMORY_CHUNKS: Grouped related items (Miller's 7±2)
-- ============================================================================
-- Chunking: grouping related items into meaningful units.
-- A chunk is a single retrievable unit containing multiple related items.

CREATE TABLE cognitive_chunks (
    id INTEGER PRIMARY KEY,
    chunk_name TEXT NOT NULL,
    chunk_type TEXT NOT NULL,       -- 'procedure', 'concept', 'episode', 'skill'
    description TEXT,
    
    -- Contents (what's grouped together)
    member_events JSON,             -- Event IDs
    member_facts JSON,              -- Fact IDs  
    member_lessons JSON,            -- Lesson IDs
    member_entities JSON,           -- Entity IDs
    
    -- Retrieval cues
    trigger_cues JSON,              -- What activates this chunk
    context_tags JSON,              -- When this chunk is relevant
    
    -- Strength
    coherence REAL DEFAULT 0.7,     -- How tightly bound (0-1)
    retrievability REAL DEFAULT 0.5, -- How easy to access
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_accessed_at TEXT,
    access_count INTEGER DEFAULT 0
);

-- ============================================================================
-- PRIMING_STATE: Recently activated concepts (affects retrieval)
-- ============================================================================
-- Priming: recent activation makes related memories more accessible.
-- This is working memory / current activation state.

CREATE TABLE priming_state (
    id INTEGER PRIMARY KEY,
    item_type TEXT NOT NULL,        -- 'entity', 'concept', 'schema', 'emotion', 'theme'
    item_id INTEGER,
    item_name TEXT,
    
    activation_level REAL DEFAULT 1.0,  -- Decays over time
    activated_at TEXT NOT NULL DEFAULT (datetime('now')),
    source TEXT,                    -- What caused the activation
    
    -- Auto-cleanup: old priming states can be deleted
    expires_at TEXT                 -- When to clear this priming
);

CREATE INDEX idx_priming_level ON priming_state(activation_level DESC);

-- ============================================================================
-- RECONSOLIDATION_LOG: Track memory updates during access
-- ============================================================================
-- When you recall a memory, it becomes labile and can be modified.
-- This tracks what changed during reconsolidation.

CREATE TABLE reconsolidation_log (
    id INTEGER PRIMARY KEY,
    memory_type TEXT NOT NULL,      -- 'event', 'lesson', 'seed'
    memory_id INTEGER NOT NULL,
    
    accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- What changed
    previous_state JSON,            -- Snapshot before modification
    modification_type TEXT,         -- 'strengthened', 'updated', 'linked', 'reframed'
    modification_details TEXT,
    
    -- Context of access
    access_context TEXT,            -- Why was this memory accessed?
    emotional_state TEXT            -- Emotional context during recall
);

-- ============================================================================
-- FORGETTING_QUEUE: Candidates for decay/compression
-- ============================================================================
-- Not everything should be kept at full fidelity forever.
-- Low-importance, rarely-accessed memories decay.

CREATE VIEW v_forgetting_candidates AS
SELECT 
    id,
    summary,
    occurred_at,
    importance,
    decay_rate,
    access_count,
    consolidation_state,
    JULIANDAY('now') - JULIANDAY(COALESCE(last_accessed_at, occurred_at)) as days_since_access,
    importance - (decay_rate * (JULIANDAY('now') - JULIANDAY(COALESCE(last_accessed_at, occurred_at)))) as current_strength
FROM events
WHERE consolidation_state NOT IN ('long_term', 'forgotten')
  AND compressed_to_seed_id IS NULL
ORDER BY current_strength ASC;

-- ============================================================================
-- RETRIEVAL VIEWS
-- ============================================================================

-- Memories ready for compression (old working/short-term)
CREATE VIEW v_compression_candidates AS
SELECT 
    id, summary, occurred_at, category, consolidation_state,
    importance, access_count,
    JULIANDAY('now') - JULIANDAY(occurred_at) as age_days
FROM events
WHERE consolidation_state IN ('working', 'short_term')
  AND compressed_to_seed_id IS NULL
  AND JULIANDAY('now') - JULIANDAY(occurred_at) > 7
ORDER BY age_days DESC, importance DESC;

-- Active priming (what's currently activated)
CREATE VIEW v_active_priming AS
SELECT item_type, item_name, activation_level, 
       (JULIANDAY('now') - JULIANDAY(activated_at)) * 24 as hours_ago
FROM priming_state
WHERE activation_level > 0.3
  AND (expires_at IS NULL OR expires_at > datetime('now'))
ORDER BY activation_level DESC;

-- Associated memories (for spreading activation)
CREATE VIEW v_association_network AS
SELECT 
    ma.from_type, ma.from_id,
    ma.association_type,
    ma.to_type, ma.to_id,
    ma.strength,
    ma.activation_count
FROM memory_associations ma
WHERE ma.strength > 0.3
ORDER BY ma.strength DESC;

-- Memory health overview
CREATE VIEW v_memory_health AS
SELECT 
    consolidation_state,
    COUNT(*) as count,
    AVG(importance) as avg_importance,
    AVG(access_count) as avg_access_count
FROM events
GROUP BY consolidation_state;

-- ============================================================================
-- HELPER FUNCTIONS (as triggers)
-- ============================================================================

-- Update last_accessed_at when events are read (simulate via app)
-- Note: This would need to be called from the application layer

-- Auto-strengthen associations when both ends are accessed together
CREATE TRIGGER strengthen_association_on_access
AFTER UPDATE OF last_activated_at ON memory_associations
BEGIN
    UPDATE memory_associations 
    SET strength = MIN(1.0, strength + 0.05),
        activation_count = activation_count + 1
    WHERE id = NEW.id;
END;
