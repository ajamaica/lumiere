-- Migration 007: Ebbinghaus Forgetting Curve Implementation
-- 
-- Adds spaced repetition and realistic memory decay based on the
-- Ebbinghaus forgetting curve research.
--
-- Key insight: Memory retention follows R = e^(-t/S) where:
--   R = retention (0-1)
--   t = time since learning
--   S = memory strength (affected by repetition, importance, emotion)

-- Add spaced repetition tracking to events
ALTER TABLE events ADD COLUMN repetition_count INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN next_review_at TEXT;  -- When to review for optimal retention
ALTER TABLE events ADD COLUMN last_reviewed_at TEXT;
ALTER TABLE events ADD COLUMN memory_strength REAL DEFAULT 1.0;  -- S in the formula, increases with review
ALTER TABLE events ADD COLUMN retention_estimate REAL DEFAULT 1.0;  -- Current estimated retention

-- Add same fields to lessons (they're also subject to forgetting)
ALTER TABLE lessons ADD COLUMN repetition_count INTEGER DEFAULT 0;
ALTER TABLE lessons ADD COLUMN next_review_at TEXT;
ALTER TABLE lessons ADD COLUMN last_reviewed_at TEXT;
ALTER TABLE lessons ADD COLUMN memory_strength REAL DEFAULT 1.0;
ALTER TABLE lessons ADD COLUMN retention_estimate REAL DEFAULT 1.0;

-- Spaced repetition intervals (in hours) - based on SuperMemo SM-2 algorithm
-- After each successful review, interval increases
CREATE TABLE IF NOT EXISTS spaced_repetition_intervals (
    repetition_number INTEGER PRIMARY KEY,
    interval_hours REAL NOT NULL,
    description TEXT
);

INSERT INTO spaced_repetition_intervals (repetition_number, interval_hours, description) VALUES
    (0, 0.33, '20 minutes - initial review'),
    (1, 1, '1 hour'),
    (2, 24, '1 day'),
    (3, 72, '3 days'),
    (4, 168, '1 week'),
    (5, 336, '2 weeks'),
    (6, 720, '1 month'),
    (7, 2160, '3 months'),
    (8, 4320, '6 months'),
    (9, 8760, '1 year');

-- Review log for tracking what was reviewed and when
CREATE TABLE IF NOT EXISTS review_log (
    id INTEGER PRIMARY KEY,
    source_table TEXT NOT NULL,  -- 'events', 'lessons', 'facts'
    source_id INTEGER NOT NULL,
    reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    retention_before REAL,  -- Estimated retention at review time
    quality INTEGER,  -- 0-5 rating of recall quality (SM-2 style)
    time_since_last_review_hours REAL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_review_log_source ON review_log(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_review_log_date ON review_log(reviewed_at);

-- View: Items due for review (retention dropping below threshold)
CREATE VIEW IF NOT EXISTS v_review_due AS
SELECT 
    'events' as source_table,
    id as source_id,
    summary as content_preview,
    category,
    importance,
    memory_strength,
    retention_estimate,
    repetition_count,
    next_review_at,
    last_reviewed_at,
    occurred_at,
    -- Calculate hours since last review or creation
    ROUND((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24, 1) as hours_since_review,
    -- Estimate current retention using forgetting curve: R = e^(-t/S)
    -- where t = hours since review, S = memory_strength * 24 (base strength in hours)
    ROUND(EXP(-((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24) / (memory_strength * 24)), 3) as current_retention
FROM events
WHERE consolidation_state != 'forgotten'
  AND (
    -- Either past due date
    (next_review_at IS NOT NULL AND datetime('now') > next_review_at)
    -- Or retention estimate below 50%
    OR EXP(-((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24) / (memory_strength * 24)) < 0.5
  )
ORDER BY current_retention ASC
LIMIT 20;

-- View: Items at risk of being forgotten (retention < 30%)
CREATE VIEW IF NOT EXISTS v_forgetting_soon AS
SELECT 
    'events' as source_table,
    id as source_id,
    summary as content_preview,
    importance,
    memory_strength,
    repetition_count,
    ROUND(EXP(-((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24) / (memory_strength * 24)), 3) as current_retention
FROM events
WHERE consolidation_state != 'forgotten'
  AND importance > 0.3  -- Only care about somewhat important memories
  AND EXP(-((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24) / (memory_strength * 24)) < 0.3
ORDER BY importance DESC, current_retention ASC;

-- View: Memory retention statistics
CREATE VIEW IF NOT EXISTS v_retention_stats AS
SELECT
    consolidation_state,
    COUNT(*) as count,
    ROUND(AVG(memory_strength), 2) as avg_strength,
    ROUND(AVG(repetition_count), 1) as avg_repetitions,
    ROUND(AVG(importance), 2) as avg_importance,
    SUM(CASE WHEN next_review_at IS NOT NULL AND datetime('now') > next_review_at THEN 1 ELSE 0 END) as overdue_count
FROM events
GROUP BY consolidation_state;

-- Trigger: When an event is accessed, update retention tracking
CREATE TRIGGER IF NOT EXISTS update_retention_on_access
AFTER UPDATE OF last_accessed_at ON events
BEGIN
    UPDATE events 
    SET 
        -- Increment access count
        access_count = access_count + 1,
        -- Boost memory strength slightly on access (not as much as deliberate review)
        memory_strength = MIN(10.0, memory_strength * 1.05)
    WHERE id = NEW.id;
END;

-- Function to calculate next review interval (SM-2 inspired)
-- Call this after a review with quality 0-5
-- Quality: 0-2 = forget, repeat soon; 3 = hard; 4 = good; 5 = easy
-- Note: SQLite doesn't have stored procedures, so this logic goes in the application layer

-- View: Suggested review schedule for today
CREATE VIEW IF NOT EXISTS v_today_reviews AS
SELECT 
    source_table,
    source_id,
    content_preview,
    importance,
    current_retention,
    hours_since_review,
    CASE 
        WHEN current_retention < 0.3 THEN 'URGENT'
        WHEN current_retention < 0.5 THEN 'DUE'
        ELSE 'OPTIONAL'
    END as priority
FROM v_review_due
WHERE current_retention < 0.7
ORDER BY 
    CASE WHEN current_retention < 0.3 THEN 0 WHEN current_retention < 0.5 THEN 1 ELSE 2 END,
    importance DESC
LIMIT 10;

-- Update existing events to have reasonable initial memory_strength based on importance and emotion
UPDATE events 
SET memory_strength = 1.0 + (importance * 2) + (ABS(emotional_valence) * 1.5)
WHERE memory_strength = 1.0;

-- Update existing lessons similarly
UPDATE lessons
SET memory_strength = 1.0 + (confidence * 2)
WHERE memory_strength = 1.0;
