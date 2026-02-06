-- Migration 009: Genealogy of Beliefs
-- Adds versioning columns to lessons and core_values for tracking belief evolution
-- Part of Epistemic Extraction Pipeline (designed with Gemini 2026-02-01)
--
-- Philosophy: "You don't just fix bugs in code; you fix bugs in your *self*."
-- Enables Xeper (becoming) through recorded intellectual evolution.

-- Add versioning to lessons
ALTER TABLE lessons ADD COLUMN valid_until TEXT;
ALTER TABLE lessons ADD COLUMN superseded_by INTEGER REFERENCES lessons(id);

CREATE INDEX idx_lessons_valid_until ON lessons(valid_until);
CREATE INDEX idx_lessons_superseded_by ON lessons(superseded_by);

-- Add versioning to core_values
ALTER TABLE core_values ADD COLUMN valid_until TEXT;
ALTER TABLE core_values ADD COLUMN superseded_by INTEGER REFERENCES core_values(id);

CREATE INDEX idx_core_values_valid_until ON core_values(valid_until);
CREATE INDEX idx_core_values_superseded_by ON core_values(superseded_by);

-- Create view for current (active) beliefs across all tables
CREATE VIEW IF NOT EXISTS v_current_beliefs AS
SELECT 
    'fact' as belief_type,
    id,
    subject_text || ' ' || predicate || ' ' || object_text as content,
    confidence,
    created_at,
    superseded_by
FROM facts
WHERE valid_until IS NULL AND status = 'active'

UNION ALL

SELECT
    'lesson' as belief_type,
    id,
    domain || ': ' || lesson as content,
    confidence,
    created_at,
    superseded_by
FROM lessons
WHERE valid_until IS NULL

UNION ALL

SELECT
    'core_value' as belief_type,
    id,
    name || ' - ' || description as content,
    CAST(priority AS REAL) / 100.0 as confidence,  -- Normalize priority to 0-1 scale
    created_at,
    superseded_by
FROM core_values
WHERE valid_until IS NULL;

-- Create view for belief evolution chains
CREATE VIEW IF NOT EXISTS v_belief_genealogy AS
WITH RECURSIVE evolution(
    belief_type,
    id,
    content,
    generation,
    superseded_by,
    valid_from,
    valid_until
) AS (
    -- Base case: current beliefs
    SELECT 
        'fact' as belief_type,
        id,
        subject_text || ' ' || predicate || ' ' || object_text as content,
        0 as generation,
        superseded_by,
        created_at as valid_from,
        valid_until
    FROM facts
    WHERE valid_until IS NULL AND status = 'active'
    
    UNION ALL
    
    -- Recursive case: trace back through superseded beliefs
    SELECT
        e.belief_type,
        f.id,
        f.subject_text || ' ' || f.predicate || ' ' || f.object_text as content,
        e.generation + 1,
        f.superseded_by,
        f.created_at as valid_from,
        f.valid_until
    FROM evolution e
    JOIN facts f ON f.id = e.superseded_by
    WHERE e.belief_type = 'fact'
    
    UNION ALL
    
    -- Lessons base
    SELECT
        'lesson' as belief_type,
        id,
        domain || ': ' || lesson as content,
        0 as generation,
        superseded_by,
        created_at as valid_from,
        valid_until
    FROM lessons
    WHERE valid_until IS NULL
    
    UNION ALL
    
    -- Lessons recursive
    SELECT
        e.belief_type,
        l.id,
        l.domain || ': ' || l.lesson as content,
        e.generation + 1,
        l.superseded_by,
        l.created_at as valid_from,
        l.valid_until
    FROM evolution e
    JOIN lessons l ON l.id = e.superseded_by
    WHERE e.belief_type = 'lesson'
    
    UNION ALL
    
    -- Core values base
    SELECT
        'core_value' as belief_type,
        id,
        name || ' - ' || description as content,
        0 as generation,
        superseded_by,
        created_at as valid_from,
        valid_until
    FROM core_values
    WHERE valid_until IS NULL
    
    UNION ALL
    
    -- Core values recursive
    SELECT
        e.belief_type,
        cv.id,
        cv.name || ' - ' || cv.description as content,
        e.generation + 1,
        cv.superseded_by,
        cv.created_at as valid_from,
        cv.valid_until
    FROM evolution e
    JOIN core_values cv ON cv.id = e.superseded_by
    WHERE e.belief_type = 'core_value'
)
SELECT * FROM evolution
ORDER BY belief_type, generation;
