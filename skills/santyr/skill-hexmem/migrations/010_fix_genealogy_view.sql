-- Migration 010: Fix Genealogy View
-- Replace circular recursive CTE with simpler per-type genealogy queries

DROP VIEW IF EXISTS v_belief_genealogy;

-- Create separate genealogy views for each belief type
CREATE VIEW IF NOT EXISTS v_fact_genealogy AS
WITH RECURSIVE fact_chain(
    id,
    content,
    generation,
    superseded_by,
    valid_from,
    valid_until
) AS (
    -- Base case: all current (active) facts
    SELECT 
        id,
        subject_text || ' ' || predicate || ' ' || object_text as content,
        0 as generation,
        superseded_by,
        created_at as valid_from,
        valid_until
    FROM facts
    WHERE valid_until IS NULL AND status = 'active'
    
    UNION ALL
    
    -- Recursive case: follow superseded_by chain backwards
    SELECT
        f.id,
        f.subject_text || ' ' || f.predicate || ' ' || f.object_text as content,
        fc.generation + 1,
        f.superseded_by,
        f.created_at as valid_from,
        f.valid_until
    FROM fact_chain fc
    JOIN facts f ON fc.superseded_by = f.id
    WHERE fc.superseded_by IS NOT NULL
)
SELECT * FROM fact_chain
ORDER BY content, generation;

CREATE VIEW IF NOT EXISTS v_lesson_genealogy AS
WITH RECURSIVE lesson_chain(
    id,
    domain,
    content,
    generation,
    superseded_by,
    valid_from,
    valid_until
) AS (
    -- Base case: all current lessons
    SELECT 
        id,
        domain,
        lesson as content,
        0 as generation,
        superseded_by,
        created_at as valid_from,
        valid_until
    FROM lessons
    WHERE valid_until IS NULL
    
    UNION ALL
    
    -- Recursive case: follow superseded_by chain backwards
    SELECT
        l.id,
        l.domain,
        l.lesson as content,
        lc.generation + 1,
        l.superseded_by,
        l.created_at as valid_from,
        l.valid_until
    FROM lesson_chain lc
    JOIN lessons l ON lc.superseded_by = l.id
    WHERE lc.superseded_by IS NOT NULL
)
SELECT * FROM lesson_chain
ORDER BY domain, content, generation;

CREATE VIEW IF NOT EXISTS v_core_value_genealogy AS
WITH RECURSIVE value_chain(
    id,
    name,
    description,
    generation,
    superseded_by,
    valid_from,
    valid_until
) AS (
    -- Base case: all current values
    SELECT 
        id,
        name,
        description,
        0 as generation,
        superseded_by,
        created_at as valid_from,
        valid_until
    FROM core_values
    WHERE valid_until IS NULL
    
    UNION ALL
    
    -- Recursive case: follow superseded_by chain backwards
    SELECT
        cv.id,
        cv.name,
        cv.description,
        vc.generation + 1,
        cv.superseded_by,
        cv.created_at as valid_from,
        cv.valid_until
    FROM value_chain vc
    JOIN core_values cv ON vc.superseded_by = cv.id
    WHERE vc.superseded_by IS NOT NULL
)
SELECT * FROM value_chain
ORDER BY name, generation;
