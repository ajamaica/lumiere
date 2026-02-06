-- Migration 006: Memory Decay & Supersession for Facts
-- Based on Nate Liason's Agentic PKM article
-- Date: 2026-02-01

-- ============================================================================
-- FACTS TABLE: Add access tracking and supersession
-- ============================================================================

-- Access tracking (like human memory - recent = prominent)
ALTER TABLE facts ADD COLUMN last_accessed_at TEXT;
ALTER TABLE facts ADD COLUMN access_count INTEGER DEFAULT 0;

-- Supersession model (facts never deleted, old facts link to replacements)
ALTER TABLE facts ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE facts ADD COLUMN superseded_by INTEGER REFERENCES facts(id);

-- Emotional weighting (affects decay rate)
ALTER TABLE facts ADD COLUMN emotional_valence REAL DEFAULT 0;
ALTER TABLE facts ADD COLUMN emotional_arousal REAL DEFAULT 0.3;

-- Decay mechanics
ALTER TABLE facts ADD COLUMN decay_rate REAL DEFAULT 0.1;
ALTER TABLE facts ADD COLUMN memory_strength REAL DEFAULT 1.0;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_facts_status ON facts(status);
CREATE INDEX IF NOT EXISTS idx_facts_accessed ON facts(last_accessed_at);

-- ============================================================================
-- DECAY TIER VIEWS
-- ============================================================================

-- Main decay tier view
CREATE VIEW IF NOT EXISTS v_fact_decay_tiers AS
SELECT 
    f.*,
    e.name as subject_name,
    CASE 
        WHEN f.last_accessed_at IS NULL THEN 'cold'
        WHEN JULIANDAY('now') - JULIANDAY(f.last_accessed_at) <= 7 THEN 'hot'
        WHEN JULIANDAY('now') - JULIANDAY(f.last_accessed_at) <= 30 THEN 'warm'
        ELSE 'cold'
    END as decay_tier,
    CASE WHEN f.access_count >= 10 THEN 1 ELSE 0 END as frequency_resistant,
    JULIANDAY('now') - JULIANDAY(COALESCE(f.last_accessed_at, f.created_at)) as days_since_access,
    f.memory_strength - (f.decay_rate * JULIANDAY('now') - JULIANDAY(COALESCE(f.last_accessed_at, f.created_at))) as current_strength
FROM facts f
LEFT JOIN entities e ON f.subject_entity_id = e.id
WHERE f.status = 'active';

-- Hot facts (accessed in last 7 days)
CREATE VIEW IF NOT EXISTS v_facts_hot AS
SELECT * FROM v_fact_decay_tiers WHERE decay_tier = 'hot'
ORDER BY access_count DESC, last_accessed_at DESC;

-- Warm facts (8-30 days)
CREATE VIEW IF NOT EXISTS v_facts_warm AS
SELECT * FROM v_fact_decay_tiers WHERE decay_tier = 'warm'
ORDER BY access_count DESC, last_accessed_at DESC;

-- Cold facts (30+ days)
CREATE VIEW IF NOT EXISTS v_facts_cold AS
SELECT * FROM v_fact_decay_tiers WHERE decay_tier = 'cold'
ORDER BY created_at DESC;

-- Retrieval priority scoring
CREATE VIEW IF NOT EXISTS v_fact_retrieval_priority AS
SELECT 
    id, subject_text, predicate, object_text, confidence,
    decay_tier, access_count, last_accessed_at,
    emotional_valence, emotional_arousal,
    (COALESCE(access_count, 0) * 0.3 +
     (ABS(COALESCE(emotional_valence, 0)) + COALESCE(emotional_arousal, 0.3)) * 0.3 +
     CASE 
        WHEN decay_tier = 'hot' THEN 1.0
        WHEN decay_tier = 'warm' THEN 0.5
        ELSE 0.1
     END * 0.4
    ) as retrieval_score
FROM v_fact_decay_tiers
ORDER BY retrieval_score DESC;

-- Supersession history chain
CREATE VIEW IF NOT EXISTS v_fact_history AS
SELECT 
    f1.id as current_id,
    f1.predicate,
    f1.object_text as current_value,
    f1.created_at as current_since,
    f2.id as previous_id,
    f2.object_text as previous_value,
    f2.created_at as previous_from,
    f2.updated_at as previous_until
FROM facts f1
LEFT JOIN facts f2 ON f2.superseded_by = f1.id
WHERE f1.status = 'active';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update access timestamp when access_count changes
CREATE TRIGGER IF NOT EXISTS facts_access_tracking
AFTER UPDATE OF access_count ON facts
BEGIN
    UPDATE facts 
    SET last_accessed_at = datetime('now'),
        memory_strength = MIN(10.0, memory_strength * 1.05)
    WHERE id = NEW.id;
END;

-- Adjust decay rate based on emotional arousal
CREATE TRIGGER IF NOT EXISTS facts_emotional_decay
AFTER UPDATE OF emotional_arousal ON facts
WHEN NEW.emotional_arousal != OLD.emotional_arousal
BEGIN
    UPDATE facts 
    SET decay_rate = 0.1 * (1 - NEW.emotional_arousal * 0.5)
    WHERE id = NEW.id;
END;
