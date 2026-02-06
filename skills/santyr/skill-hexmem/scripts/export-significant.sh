#!/usr/bin/env bash
# export-significant.sh — export recent/significant memories for signing + vault backup
# Output: exports/hexmem-significant-YYYYMMDD-HHMMSS.json

set -euo pipefail

DB="${HEXMEM_DB:-$HOME/clawd/hexmem/hexmem.db}"
OUTDIR="${HEXMEM_EXPORT_DIR:-$HOME/clawd/hexmem/exports}"
SINCE_HOURS="${HEXMEM_EXPORT_SINCE_HOURS:-168}"  # default 7 days

mkdir -p "$OUTDIR"
TS=$(date +%Y%m%d-%H%M%S)
OUT="$OUTDIR/hexmem-significant-$TS.json"

# Export significant events + emotionally salient facts. Keep this conservative.
# IMPORTANT: output a single JSON document (not sqlite3 -json array wrapper)
sqlite3 -noheader -batch "$DB" "
WITH params AS (
  SELECT datetime('now', '-' || $SINCE_HOURS || ' hours') AS since
)
SELECT json_object(
  'meta', json_object(
    'schema', 'hexmem-significant-export',
    'version', 1,
    'created_at', datetime('now'),
    'since_hours', $SINCE_HOURS
  ),
  'events', COALESCE((
    SELECT json_group_array(json_object(
      'id', e.id,
      'occurred_at', e.occurred_at,
      'event_type', e.event_type,
      'category', e.category,
      'summary', e.summary,
      'details', e.details,
      'significance', e.significance,
      'emotional_valence', e.emotional_valence,
      'emotional_arousal', e.emotional_arousal,
      'emotional_tags', e.emotional_tags
    ))
    FROM events e, params p
    WHERE e.occurred_at >= p.since
      AND (e.significance >= 8 OR e.emotional_arousal >= 0.7)
    ORDER BY e.occurred_at DESC
  ), '[]'),
  'facts', COALESCE((
    SELECT json_group_array(json_object(
      'id', f.id,
      'subject_entity_id', f.subject_entity_id,
      'subject_text', f.subject_text,
      'predicate', f.predicate,
      'object_text', f.object_text,
      'source', f.source,
      'status', f.status,
      'superseded_by', f.superseded_by,
      'created_at', f.created_at,
      'last_accessed_at', f.last_accessed_at,
      'access_count', f.access_count,
      'emotional_valence', f.emotional_valence,
      'emotional_arousal', f.emotional_arousal
    ))
    FROM facts f, params p
    WHERE f.created_at >= p.since
      AND f.status IN ('active','superseded')
      AND (f.emotional_arousal >= 0.7 OR (ABS(f.emotional_valence) + f.emotional_arousal) >= 1.2)
    ORDER BY f.created_at DESC
  ), '[]')
);
" > "$OUT"

echo "$OUT"