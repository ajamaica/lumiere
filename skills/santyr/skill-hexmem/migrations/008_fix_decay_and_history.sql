-- Migration 008: Fix fact decay strength math + strengthen history support
-- Date: 2026-02-01

-- Fix incorrect decay math in v_fact_decay_tiers.current_strength
-- Previous formula effectively did: strength - (decay_rate*now - then)
-- Correct formula is: strength - decay_rate*(now - then)

-- Drop dependent views first
DROP VIEW IF EXISTS v_fact_retrieval_priority;
DROP VIEW IF EXISTS v_facts_hot;
DROP VIEW IF EXISTS v_facts_warm;
DROP VIEW IF EXISTS v_facts_cold;
DROP VIEW IF EXISTS v_fact_history;
DROP VIEW IF EXISTS v_fact_decay_tiers;

-- Recreate v_fact_decay_tiers with corrected math
CREATE VIEW v_fact_decay_tiers AS
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
    (
      f.memory_strength - (
        f.decay_rate * (
          JULIANDAY('now') - JULIANDAY(COALESCE(f.last_accessed_at, f.created_at))
        )
      )
    ) as current_strength
FROM facts f
LEFT JOIN entities e ON f.subject_entity_id = e.id
WHERE f.status = 'active';

-- Hot facts (accessed in last 7 days)
CREATE VIEW v_facts_hot AS
SELECT * FROM v_fact_decay_tiers WHERE decay_tier = 'hot'
ORDER BY access_count DESC, last_accessed_at DESC;

-- Warm facts (8-30 days)
CREATE VIEW v_facts_warm AS
SELECT * FROM v_fact_decay_tiers WHERE decay_tier = 'warm'
ORDER BY access_count DESC, last_accessed_at DESC;

-- Cold facts (30+ days)
CREATE VIEW v_facts_cold AS
SELECT * FROM v_fact_decay_tiers WHERE decay_tier = 'cold'
ORDER BY created_at DESC;

-- Retrieval priority scoring
CREATE VIEW v_fact_retrieval_priority AS
SELECT 
    id, subject_text, predicate, object_text, confidence,
    decay_tier, access_count, last_accessed_at,
    emotional_valence, emotional_arousal,
    (
      COALESCE(access_count, 0) * 0.3 +
      (ABS(COALESCE(emotional_valence, 0)) + COALESCE(emotional_arousal, 0.3)) * 0.3 +
      CASE 
          WHEN decay_tier = 'hot' THEN 1.0
          WHEN decay_tier = 'warm' THEN 0.5
          ELSE 0.1
      END * 0.4
    ) as retrieval_score
FROM v_fact_decay_tiers
ORDER BY retrieval_score DESC;

-- One-hop supersession view (kept for compatibility; use recursive helpers for full chains)
CREATE VIEW v_fact_history AS
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

-- Indexes to speed supersession/history queries
CREATE INDEX IF NOT EXISTS idx_facts_superseded_by ON facts(superseded_by);
