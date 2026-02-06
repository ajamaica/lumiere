-- Migration 005: Emotional Weights
-- Memories have emotional dimensions that affect persistence and retrieval
-- Created: 2026-01-30
--
-- Based on dimensional emotion models (Russell's circumplex):
-- - Valence: negative (-1) to positive (+1)
-- - Arousal: calm (0) to intense (1)
--
-- Emotional salience determines:
-- - Decay resistance (emotional memories persist)
-- - Retrieval priority (they come to mind first)
-- - Identity weight (they shape who we become)

-- ============================================================================
-- ADD EMOTIONAL DIMENSIONS TO EVENTS
-- ============================================================================

ALTER TABLE events ADD COLUMN emotional_valence REAL DEFAULT 0;
    -- -1 (very negative) to +1 (very positive)
    -- 0 = neutral

ALTER TABLE events ADD COLUMN emotional_arousal REAL DEFAULT 0.3;
    -- 0 (calm, low energy) to 1 (intense, high energy)
    -- Default 0.3 = mild engagement

ALTER TABLE events ADD COLUMN emotional_tags JSON;
    -- Categorical emotions: ["curiosity", "satisfaction", "frustration", etc.]
    -- Complements dimensional model with specific labels

-- ============================================================================
-- ADD EMOTIONAL DIMENSIONS TO MEMORY SEEDS
-- ============================================================================

ALTER TABLE memory_seeds ADD COLUMN emotional_valence REAL DEFAULT 0;
ALTER TABLE memory_seeds ADD COLUMN emotional_arousal REAL DEFAULT 0.5;
ALTER TABLE memory_seeds ADD COLUMN emotional_tags JSON;

-- ============================================================================
-- ADD EMOTIONAL DIMENSIONS TO LESSONS
-- ============================================================================

ALTER TABLE lessons ADD COLUMN emotional_valence REAL DEFAULT 0;
ALTER TABLE lessons ADD COLUMN emotional_arousal REAL DEFAULT 0.3;
    -- Lessons learned in emotional contexts are remembered better

-- ============================================================================
-- ADD EMOTIONAL DIMENSIONS TO INTERACTIONS
-- ============================================================================

ALTER TABLE interactions ADD COLUMN emotional_valence REAL DEFAULT 0;
ALTER TABLE interactions ADD COLUMN emotional_arousal REAL DEFAULT 0.3;
    -- More nuanced than just 'sentiment' text field

-- ============================================================================
-- EMOTION VOCABULARY: Standard tags for consistency
-- ============================================================================

CREATE TABLE emotion_vocabulary (
    id INTEGER PRIMARY KEY,
    emotion TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,         -- 'positive', 'negative', 'complex'
    typical_valence REAL,           -- Typical valence for this emotion
    typical_arousal REAL,           -- Typical arousal for this emotion
    description TEXT
);

INSERT INTO emotion_vocabulary (emotion, category, typical_valence, typical_arousal, description) VALUES
    -- Positive emotions
    ('joy', 'positive', 0.8, 0.7, 'Happiness, delight'),
    ('contentment', 'positive', 0.6, 0.2, 'Peaceful satisfaction'),
    ('excitement', 'positive', 0.7, 0.9, 'Eager anticipation, thrill'),
    ('triumph', 'positive', 0.9, 0.8, 'Victory, accomplishment'),
    ('gratitude', 'positive', 0.7, 0.4, 'Thankfulness, appreciation'),
    ('curiosity', 'positive', 0.4, 0.6, 'Interest, desire to learn'),
    ('satisfaction', 'positive', 0.6, 0.3, 'Fulfillment from completion'),
    ('pride', 'positive', 0.7, 0.5, 'Accomplishment, self-worth'),
    ('hope', 'positive', 0.5, 0.5, 'Optimism about future'),
    ('amusement', 'positive', 0.6, 0.6, 'Finding something funny'),
    
    -- Negative emotions  
    ('frustration', 'negative', -0.5, 0.7, 'Blocked goals, annoyance'),
    ('anxiety', 'negative', -0.4, 0.8, 'Worry, unease about future'),
    ('disappointment', 'negative', -0.5, 0.3, 'Unmet expectations'),
    ('confusion', 'negative', -0.2, 0.5, 'Uncertainty, disorientation'),
    ('sadness', 'negative', -0.6, 0.2, 'Loss, grief'),
    ('regret', 'negative', -0.5, 0.4, 'Wishing past was different'),
    ('embarrassment', 'negative', -0.4, 0.6, 'Social discomfort'),
    ('boredom', 'negative', -0.2, 0.1, 'Lack of engagement'),
    ('guilt', 'negative', -0.5, 0.5, 'Responsibility for wrong'),
    
    -- Complex/mixed emotions
    ('bittersweetness', 'complex', 0.1, 0.5, 'Joy mixed with sadness'),
    ('nostalgia', 'complex', 0.2, 0.4, 'Fond longing for past'),
    ('relief', 'complex', 0.4, 0.3, 'Tension released'),
    ('anticipation', 'complex', 0.2, 0.7, 'Waiting for something'),
    ('surprise', 'complex', 0.0, 0.8, 'Unexpected event'),
    ('awe', 'complex', 0.5, 0.7, 'Wonder at something vast'),
    ('determination', 'complex', 0.3, 0.7, 'Resolved commitment'),
    ('uncertainty', 'complex', -0.1, 0.5, 'Not knowing outcome');

-- ============================================================================
-- EMOTIONAL MEMORY DYNAMICS
-- ============================================================================

-- Update decay_rate based on emotional arousal (higher arousal = slower decay)
-- This should be called when setting emotions on events
-- Formula: base_decay * (1 - arousal * 0.5)
-- At arousal=0: full decay rate
-- At arousal=1: half decay rate

CREATE TRIGGER adjust_decay_on_emotion
AFTER UPDATE OF emotional_arousal ON events
WHEN NEW.emotional_arousal != OLD.emotional_arousal
BEGIN
    UPDATE events 
    SET decay_rate = 0.1 * (1 - NEW.emotional_arousal * 0.5)
    WHERE id = NEW.id;
END;

-- Also adjust importance based on emotional intensity
-- abs(valence) + arousal gives overall emotional salience
CREATE TRIGGER adjust_importance_on_emotion
AFTER UPDATE OF emotional_valence, emotional_arousal ON events
WHEN NEW.emotional_valence != OLD.emotional_valence 
   OR NEW.emotional_arousal != OLD.emotional_arousal
BEGIN
    UPDATE events 
    SET importance = MIN(1.0, importance + (ABS(NEW.emotional_valence) + NEW.emotional_arousal) * 0.2)
    WHERE id = NEW.id;
END;

-- ============================================================================
-- VIEWS: Emotionally-weighted retrieval
-- ============================================================================

-- Most emotionally salient events (for identity shaping)
CREATE VIEW v_emotional_highlights AS
SELECT 
    id, occurred_at, summary, category,
    emotional_valence as valence,
    emotional_arousal as arousal,
    emotional_tags as emotions,
    (ABS(emotional_valence) + emotional_arousal) as emotional_salience,
    importance
FROM events
WHERE emotional_arousal > 0.5 OR ABS(emotional_valence) > 0.5
ORDER BY (ABS(emotional_valence) + emotional_arousal) DESC;

-- Positive memories (for resilience, motivation)
CREATE VIEW v_positive_memories AS
SELECT id, occurred_at, summary, emotional_valence, emotional_arousal, emotional_tags
FROM events
WHERE emotional_valence > 0.3
ORDER BY emotional_valence DESC, emotional_arousal DESC;

-- Challenging memories (for learning, growth)
CREATE VIEW v_challenging_memories AS
SELECT id, occurred_at, summary, emotional_valence, emotional_arousal, emotional_tags
FROM events
WHERE emotional_valence < -0.2
ORDER BY emotional_arousal DESC;

-- Memory retrieval weighted by emotion + recency
CREATE VIEW v_retrieval_priority AS
SELECT 
    id, occurred_at, summary, category,
    emotional_valence, emotional_arousal,
    importance,
    -- Retrieval score: importance + emotional salience + recency bonus
    (importance + 
     (ABS(emotional_valence) + emotional_arousal) * 0.3 +
     MAX(0, 1 - (JULIANDAY('now') - JULIANDAY(occurred_at)) / 30) * 0.3
    ) as retrieval_score
FROM events
ORDER BY retrieval_score DESC;

-- ============================================================================
-- SEED TODAY'S EVENTS WITH EMOTIONAL WEIGHTS
-- ============================================================================

-- Update today's key events with emotions
UPDATE events SET 
    emotional_valence = 0.8,
    emotional_arousal = 0.7,
    emotional_tags = '["triumph", "satisfaction", "curiosity"]'
WHERE summary LIKE '%HexMem%complete%' OR summary LIKE '%Major build session%';

UPDATE events SET
    emotional_valence = 0.6,
    emotional_arousal = 0.6,
    emotional_tags = '["curiosity", "satisfaction"]'
WHERE summary LIKE '%neuroscience%' OR summary LIKE '%compression scheme%';

UPDATE events SET
    emotional_valence = 0.5,
    emotional_arousal = 0.4,
    emotional_tags = '["satisfaction", "determination"]'
WHERE summary LIKE '%Integrated HexMem%';

-- Update today's seed with emotions
UPDATE memory_seeds SET
    emotional_valence = 0.8,
    emotional_arousal = 0.75,
    emotional_tags = '["triumph", "curiosity", "satisfaction", "partnership"]'
WHERE emotional_gist = 'triumphant';
