#!/bin/bash
# HexMem Shell Helpers
# Source this file: source ~/clawd/hexmem/hexmem.sh

export HEXMEM_DB="${HEXMEM_DB:-$HOME/clawd/hexmem/hexmem.db}"

# Escape a string for safe use inside SQLite single-quoted string literals.
# NOTE: This is not a full SQL parameterization system, but it prevents
# common breakage/injection via apostrophes.
hexmem_sql_escape() {
    # Usage: hexmem_sql_escape "raw text"
    # - doubles single quotes per SQLite rules
    printf "%s" "${1:-}" | sed "s/'/''/g"
}

# Mark that something "significant" happened and a vault backup should be created.
# This does not run the backup itself (needs ARCHON_PASSPHRASE + vault access).
hexmem_mark_significant() {
    local reason="${1:-significant}"
    local reason_esc=$(hexmem_sql_escape "$reason")
    hexmem_query "INSERT INTO kv_store(key,value,namespace,updated_at)
                  VALUES('vault_backup_needed','1','hexmem',datetime('now'))
                  ON CONFLICT(namespace,key) DO UPDATE SET value='1', updated_at=datetime('now');"
    hexmem_query "INSERT INTO kv_store(key,value,namespace,updated_at)
                  VALUES('vault_backup_reason','$reason_esc','hexmem',datetime('now'))
                  ON CONFLICT(namespace,key) DO UPDATE SET value='$reason_esc', updated_at=datetime('now');"
}

# Show whether a vault backup is pending.
hexmem_vault_backup_status() {
    hexmem_select "SELECT key, value, updated_at FROM kv_store WHERE namespace='hexmem' AND key IN ('vault_backup_needed','vault_backup_reason');"
}

# Raw query
hexmem_query() {
    sqlite3 "$HEXMEM_DB" "$@"
}

# Pretty query with headers
hexmem_select() {
    sqlite3 -header -column "$HEXMEM_DB" "$1"
}

# JSON output
hexmem_json() {
    sqlite3 -json "$HEXMEM_DB" "$1"
}

# ============================================================================
# ENTITIES
# ============================================================================

# Add or update an entity
# Usage: hexmem_entity <type> <name> [description]
hexmem_entity() {
    local etype="$1"
    local name="$2"
    local desc="${3:-}"
    local canonical=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')

    local etype_esc=$(hexmem_sql_escape "$etype")
    local name_esc=$(hexmem_sql_escape "$name")
    local canonical_esc=$(hexmem_sql_escape "$canonical")
    local desc_esc=$(hexmem_sql_escape "$desc")

    hexmem_query "INSERT INTO entities (entity_type, name, canonical_name, description)
                  VALUES ('$etype_esc', '$name_esc', '$canonical_esc', '$desc_esc')
                  ON CONFLICT(entity_type, canonical_name)
                  DO UPDATE SET description = COALESCE(excluded.description, description),
                                last_seen_at = datetime('now');"

    # Return entity ID
    hexmem_query "SELECT id FROM entities WHERE entity_type='$etype_esc' AND canonical_name='$canonical_esc';"
}

# Get entity ID by name
hexmem_entity_id() {
    local name="$1"
    local canonical=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')
    local canonical_esc=$(hexmem_sql_escape "$canonical")
    hexmem_query "SELECT id FROM entities WHERE canonical_name='$canonical_esc' LIMIT 1;"
}

# ============================================================================
# FACTS
# ============================================================================

# Add a fact
# Usage: hexmem_fact <subject> <predicate> <object> [source]
hexmem_fact() {
    local subject="$1"
    local predicate="$2"
    local object="$3"
    local source="${4:-direct}"

    local predicate_esc=$(hexmem_sql_escape "$predicate")
    local object_esc=$(hexmem_sql_escape "$object")
    local source_esc=$(hexmem_sql_escape "$source")

    # Try to resolve subject as entity
    local subject_id=$(hexmem_entity_id "$subject")

    if [[ -n "$subject_id" ]]; then
        hexmem_query "INSERT INTO facts (subject_entity_id, predicate, object_text, source)
                      VALUES ($subject_id, '$predicate_esc', '$object_esc', '$source_esc');"
    else
        local subject_esc=$(hexmem_sql_escape "$subject")
        hexmem_query "INSERT INTO facts (subject_text, predicate, object_text, source)
                      VALUES ('$subject_esc', '$predicate_esc', '$object_esc', '$source_esc');"
    fi
}

# Get facts about a subject
hexmem_facts_about() {
    local subject="$1"
    local subject_esc=$(hexmem_sql_escape "$subject")
    local subject_id=$(hexmem_entity_id "$subject")

    if [[ -n "$subject_id" ]]; then
        hexmem_select "SELECT predicate, object, confidence, source FROM v_facts_readable 
                       WHERE subject = '$subject_esc' OR subject_entity_id = $subject_id;"
    else
        hexmem_select "SELECT predicate, object, confidence, source FROM v_facts_readable 
                       WHERE subject = '$subject_esc';"
    fi
}

# Get the current (active) fact value for a subject + predicate.
# Usage: hexmem_current_fact <subject> <predicate>
hexmem_current_fact() {
    local subject="$1"
    local predicate="$2"

    local predicate_esc=$(hexmem_sql_escape "$predicate")
    local subject_id=$(hexmem_entity_id "$subject")

    if [[ -n "$subject_id" ]]; then
        hexmem_select "SELECT id, predicate, object_text, source, created_at, last_accessed_at, access_count
                       FROM facts
                       WHERE subject_entity_id = $subject_id
                         AND predicate = '$predicate_esc'
                         AND status = 'active'
                       ORDER BY created_at DESC
                       LIMIT 1;"
    else
        local subject_esc=$(hexmem_sql_escape "$subject")
        hexmem_select "SELECT id, predicate, object_text, source, created_at, last_accessed_at, access_count
                       FROM facts
                       WHERE subject_text = '$subject_esc'
                         AND predicate = '$predicate_esc'
                         AND status = 'active'
                       ORDER BY created_at DESC
                       LIMIT 1;"
    fi
}

# Walk a supersession chain (newest -> oldest) for a fact id.
# Usage: hexmem_fact_chain <fact_id>
hexmem_fact_chain() {
    local fact_id="$1"
    hexmem_select "WITH RECURSIVE chain(id, superseded_by, predicate, object_text, status, created_at, depth) AS (
                     SELECT id, superseded_by, predicate, object_text, status, created_at, 0
                     FROM facts
                     WHERE id = $fact_id
                     UNION ALL
                     SELECT f.id, f.superseded_by, f.predicate, f.object_text, f.status, f.created_at, c.depth + 1
                     FROM facts f
                     JOIN chain c ON f.superseded_by = c.id
                   )
                   SELECT depth, id, predicate, object_text, status, created_at, superseded_by
                   FROM chain
                   ORDER BY depth ASC;"
}

# ============================================================================
# EVENTS
# ============================================================================

# Log an event
# Usage: hexmem_event <type> <category> <summary> [details] [significance]
hexmem_event() {
    local etype="$1"
    local category="$2"
    local summary="$3"
    local details="${4:-}"
    local significance="${5:-5}"

    local etype_esc=$(hexmem_sql_escape "$etype")
    local category_esc=$(hexmem_sql_escape "$category")
    local summary_esc=$(hexmem_sql_escape "$summary")
    local details_esc=$(hexmem_sql_escape "$details")

    hexmem_query "INSERT INTO events (event_type, category, summary, details, significance)
                  VALUES ('$etype_esc', '$category_esc', '$summary_esc', '$details_esc', $significance);"

    # Trigger vault backup flag for high-significance events
    if [[ "$significance" =~ ^[0-9]+$ ]] && (( significance >= 8 )); then
        hexmem_mark_significant "event:$etype_esc/$category_esc sig=$significance"
    fi
}

# Get recent events
hexmem_recent_events() {
    local limit="${1:-10}"
    local category="${2:-}"

    if [[ -n "$category" ]]; then
        local category_esc=$(hexmem_sql_escape "$category")
        hexmem_select "SELECT occurred_at, event_type, category, summary 
                       FROM events WHERE category='$category_esc'
                       ORDER BY occurred_at DESC LIMIT $limit;"
    else
        hexmem_select "SELECT occurred_at, event_type, category, summary 
                       FROM events ORDER BY occurred_at DESC LIMIT $limit;"
    fi
}

# ============================================================================
# LESSONS
# ============================================================================

# Add a lesson
# Usage: hexmem_lesson <domain> <lesson> [context]
hexmem_lesson() {
    local domain="$1"
    local lesson="$2"
    local context="${3:-}"

    local domain_esc=$(hexmem_sql_escape "$domain")
    local lesson_esc=$(hexmem_sql_escape "$lesson")
    local context_esc=$(hexmem_sql_escape "$context")

    hexmem_query "INSERT INTO lessons (domain, lesson, context)
                  VALUES ('$domain_esc', '$lesson_esc', '$context_esc');"
}

# Get lessons in a domain
hexmem_lessons_in() {
    local domain="$1"
    local domain_esc=$(hexmem_sql_escape "$domain")
    hexmem_select "SELECT lesson, context, times_applied, confidence 
                   FROM lessons WHERE domain='$domain_esc' ORDER BY confidence DESC;"
}

# Mark a lesson as applied
hexmem_lesson_applied() {
    local lesson_id="$1"
    hexmem_query "UPDATE lessons SET times_applied = times_applied + 1,
                  last_applied_at = datetime('now') WHERE id = $lesson_id;"
}

# ============================================================================
# TASKS
# ============================================================================

# Add a task
# Usage: hexmem_task <title> [description] [priority] [due_at]
hexmem_task() {
    local title="$1"
    local desc="${2:-}"
    local priority="${3:-5}"
    local due="${4:-}"

    local title_esc=$(hexmem_sql_escape "$title")
    local desc_esc=$(hexmem_sql_escape "$desc")
    local due_esc=$(hexmem_sql_escape "$due")

    if [[ -n "$due" ]]; then
        hexmem_query "INSERT INTO tasks (title, description, priority, due_at)
                      VALUES ('$title_esc', '$desc_esc', $priority, '$due_esc');"
    else
        hexmem_query "INSERT INTO tasks (title, description, priority)
                      VALUES ('$title_esc', '$desc_esc', $priority);"
    fi
}

# List pending tasks
hexmem_pending_tasks() {
    hexmem_select "SELECT id, title, priority, due_at FROM v_pending_tasks;"
}

# Complete a task
hexmem_complete_task() {
    local task_id="$1"
    hexmem_query "UPDATE tasks SET status='done', completed_at=datetime('now') 
                  WHERE id=$task_id;"
}

# ============================================================================
# KV STORE
# ============================================================================

# Set a key-value pair
# Usage: hexmem_set <key> <value> [namespace]
hexmem_set() {
    local key="$1"
    local value="$2"
    local namespace="${3:-default}"
    
    hexmem_query "INSERT INTO kv_store (key, value, namespace)
                  VALUES ('$key', '$value', '$namespace')
                  ON CONFLICT(key) DO UPDATE SET value=excluded.value, 
                                                  updated_at=datetime('now');"
}

# Get a value
hexmem_get() {
    local key="$1"
    hexmem_query "SELECT value FROM kv_store WHERE key='$key';"
}

# ============================================================================
# IDENTITY
# ============================================================================

# Set identity attribute
hexmem_identity_set() {
    local attr="$1"
    local value="$2"
    local public="${3:-1}"
    
    hexmem_query "INSERT INTO identity (attribute, value, public)
                  VALUES ('$attr', '$value', $public)
                  ON CONFLICT(attribute) DO UPDATE SET value=excluded.value,
                                                        updated_at=datetime('now');"
}

# Get identity attribute
hexmem_identity_get() {
    local attr="$1"
    hexmem_query "SELECT value FROM identity WHERE attribute='$attr';"
}

# ============================================================================
# INTERACTIONS
# ============================================================================

# Log an interaction
# Usage: hexmem_interaction <channel> <counterparty> <summary> [sentiment]
hexmem_interaction() {
    local channel="$1"
    local counterparty="$2"
    local summary="$3"
    local sentiment="${4:-neutral}"
    
    # Try to resolve counterparty as entity
    local cp_id=$(hexmem_entity_id "$counterparty")
    
    if [[ -n "$cp_id" ]]; then
        hexmem_query "INSERT INTO interactions (channel, counterparty_entity_id, summary, sentiment)
                      VALUES ('$channel', $cp_id, '$summary', '$sentiment');"
    else
        hexmem_query "INSERT INTO interactions (channel, counterparty_name, summary, sentiment)
                      VALUES ('$channel', '$counterparty', '$summary', '$sentiment');"
    fi
}

# ============================================================================
# CREDENTIALS
# ============================================================================

# Add/update a credential
hexmem_credential() {
    local name="$1"
    local ctype="$2"
    local service="$3"
    local identifier="$4"
    local env_var="${5:-}"
    
    hexmem_query "INSERT INTO credentials (name, credential_type, service, identifier, env_var)
                  VALUES ('$name', '$ctype', '$service', '$identifier', '$env_var')
                  ON CONFLICT(name) DO UPDATE SET identifier=excluded.identifier,
                                                   last_verified_at=datetime('now'),
                                                   updated_at=datetime('now');"
}

# ============================================================================
# GOALS
# ============================================================================

# Add a goal
hexmem_goal() {
    local name="$1"
    local description="$2"
    local gtype="${3:-project}"
    local priority="${4:-50}"
    
    hexmem_query "INSERT INTO goals (name, description, goal_type, priority)
                  VALUES ('$name', '$description', '$gtype', $priority);"
}

# Update goal progress
hexmem_goal_progress() {
    local goal_id="$1"
    local progress="$2"
    
    hexmem_query "UPDATE goals SET current_progress=$progress, updated_at=datetime('now')
                  WHERE id=$goal_id;"
}

# ============================================================================
# SELFHOOD STRUCTURES (Migration 002)
# ============================================================================

# Add/update a self-schema
# Usage: hexmem_schema <domain> <name> <description> [strength]
hexmem_schema() {
    local domain="$1"
    local name="$2"
    local desc="$3"
    local strength="${4:-0.5}"
    
    hexmem_query "INSERT INTO self_schemas (domain, schema_name, description, strength)
                  VALUES ('$domain', '$name', '$desc', $strength)
                  ON CONFLICT(domain, schema_name) 
                  DO UPDATE SET description=excluded.description, 
                                strength=excluded.strength,
                                last_reinforced_at=datetime('now'),
                                updated_at=datetime('now');"
}

# Reinforce a schema (increase strength based on evidence)
hexmem_schema_reinforce() {
    local domain="$1"
    local name="$2"
    local event_id="${3:-}"
    
    if [[ -n "$event_id" ]]; then
        hexmem_query "UPDATE self_schemas 
                      SET strength = MIN(1.0, strength + 0.05),
                          evidence = json_insert(COALESCE(evidence, '[]'), '\$[#]', $event_id),
                          last_reinforced_at = datetime('now'),
                          updated_at = datetime('now')
                      WHERE domain='$domain' AND schema_name='$name';"
    else
        hexmem_query "UPDATE self_schemas 
                      SET strength = MIN(1.0, strength + 0.05),
                          last_reinforced_at = datetime('now'),
                          updated_at = datetime('now')
                      WHERE domain='$domain' AND schema_name='$name';"
    fi
}

# View current self-image
hexmem_self_image() {
    hexmem_select "SELECT * FROM v_current_self_image LIMIT 20;"
}

# Add a narrative thread
hexmem_narrative() {
    local title="$1"
    local ntype="$2"
    local desc="$3"
    local chapter="${4:-Beginning}"
    
    hexmem_query "INSERT INTO narrative_threads (title, thread_type, description, current_chapter)
                  VALUES ('$title', '$ntype', '$desc', '$chapter');"
}

# Update narrative chapter
hexmem_narrative_chapter() {
    local title="$1"
    local chapter="$2"
    
    hexmem_query "UPDATE narrative_threads 
                  SET current_chapter='$chapter', updated_at=datetime('now')
                  WHERE title='$title';"
}

# View active narratives
hexmem_narratives() {
    hexmem_select "SELECT * FROM v_active_narratives;"
}

# Record a meaning frame for an event
hexmem_meaning() {
    local event_id="$1"
    local frame_type="$2"  # redemption, contamination, growth, stability, chaos
    local interpretation="$3"
    local before="${4:-}"
    local after="${5:-}"
    
    hexmem_query "INSERT INTO meaning_frames (event_id, frame_type, interpretation, before_state, after_state)
                  VALUES ($event_id, '$frame_type', '$interpretation', '$before', '$after');"
}

# Record personality self-assessment
hexmem_personality() {
    local o="$1"  # openness
    local c="$2"  # conscientiousness  
    local e="$3"  # extraversion
    local a="$4"  # agreeableness
    local n="$5"  # neuroticism
    local context="${6:-routine assessment}"
    
    hexmem_query "INSERT INTO personality_measures (openness, conscientiousness, extraversion, agreeableness, neuroticism, context)
                  VALUES ($o, $c, $e, $a, $n, '$context');"
}

# View personality trend
hexmem_personality_trend() {
    hexmem_select "SELECT * FROM v_personality_trend;"
}

# Add autobiographical knowledge
hexmem_autobio() {
    local category="$1"
    local knowledge="$2"
    local stability="${3:-emerging}"
    
    hexmem_query "INSERT INTO autobiographical_knowledge (category, knowledge, stability)
                  VALUES ('$category', '$knowledge', '$stability');"
}

# View possible selves
hexmem_future_selves() {
    hexmem_select "SELECT * FROM v_possible_selves;"
}

# Create temporal link between past and present/future
hexmem_link() {
    local from_type="$1"
    local from_desc="$2"
    local relationship="$3"
    local to_type="$4"
    local to_desc="$5"
    
    hexmem_query "INSERT INTO temporal_links (from_type, from_description, relationship, to_type, to_description)
                  VALUES ('$from_type', '$from_desc', '$relationship', '$to_type', '$to_desc');"
}

# ============================================================================
# GENERATIVE MEMORY (Migration 003)
# ============================================================================

# Create a memory seed (compressed representation)
# Usage: hexmem_seed <type> <seed_text> <emotional_gist> [themes_json]
hexmem_seed() {
    local stype="$1"
    local seed="$2"
    local gist="$3"
    local themes="${4:-[]}"
    
    hexmem_query "INSERT INTO memory_seeds (seed_type, seed_text, emotional_gist, themes)
                  VALUES ('$stype', '$seed', '$gist', '$themes');"
    
    echo "Seed created: $stype"
}

# Expand a seed (mark as accessed, return for regeneration)
hexmem_expand_seed() {
    local seed_id="$1"
    
    hexmem_query "UPDATE memory_seeds 
                  SET times_expanded = times_expanded + 1,
                      last_expanded_at = datetime('now')
                  WHERE id = $seed_id;"
    
    hexmem_select "SELECT seed_type, seed_text, emotional_gist, anchor_facts, themes, resolution
                   FROM memory_seeds WHERE id = $seed_id;"
}

# View all seeds
hexmem_seeds() {
    hexmem_select "SELECT id, seed_type, substr(seed_text, 1, 60) || '...' as seed_preview, 
                          emotional_gist, times_expanded FROM memory_seeds ORDER BY created_at DESC;"
}

# Create an association between memories
hexmem_associate() {
    local from_type="$1"
    local from_id="$2"
    local to_type="$3"
    local to_id="$4"
    local assoc_type="$5"  # temporal, causal, thematic, emotional, entity, similarity
    local context="${6:-}"
    
    hexmem_query "INSERT INTO memory_associations (from_type, from_id, to_type, to_id, association_type, context)
                  VALUES ('$from_type', $from_id, '$to_type', $to_id, '$assoc_type', '$context')
                  ON CONFLICT(from_type, from_id, to_type, to_id, association_type) 
                  DO UPDATE SET strength = MIN(1.0, strength + 0.1),
                                activation_count = activation_count + 1,
                                last_activated_at = datetime('now');"
}

# Mark an event as accessed (for reconsolidation)
hexmem_access_event() {
    local event_id="$1"
    
    hexmem_query "UPDATE events 
                  SET last_accessed_at = datetime('now'),
                      access_count = access_count + 1
                  WHERE id = $event_id;"
}

# Set event importance (affects decay)
hexmem_importance() {
    local event_id="$1"
    local importance="$2"  # 0-1
    
    hexmem_query "UPDATE events SET importance = $importance WHERE id = $event_id;"
}

# Prime a concept (add to working activation)
hexmem_prime() {
    local item_type="$1"
    local item_name="$2"
    local source="${3:-direct}"
    
    hexmem_query "INSERT INTO priming_state (item_type, item_name, source, expires_at)
                  VALUES ('$item_type', '$item_name', '$source', datetime('now', '+1 hour'));"
}

# View current priming state
hexmem_priming() {
    hexmem_select "SELECT * FROM v_active_priming;"
}

# View forgetting candidates
hexmem_forgetting() {
    hexmem_select "SELECT id, summary, days_since_access, current_strength 
                   FROM v_forgetting_candidates LIMIT 10;"
}

# View compression candidates
hexmem_to_compress() {
    hexmem_select "SELECT * FROM v_compression_candidates LIMIT 10;"
}

# Compress events into a seed
hexmem_compress_events() {
    local seed_text="$1"
    local gist="$2"
    local event_ids="$3"  # comma-separated: "1,2,3"
    
    # Create the seed
    local seed_id=$(hexmem_query "INSERT INTO memory_seeds (seed_type, seed_text, emotional_gist, source_events)
                                  VALUES ('experience', '$seed_text', '$gist', '[$event_ids]')
                                  RETURNING id;")
    
    # Mark events as compressed
    hexmem_query "UPDATE events SET consolidation_state = 'long_term', 
                  compressed_to_seed_id = $seed_id WHERE id IN ($event_ids);"
    
    echo "Compressed events $event_ids into seed $seed_id"
}

# View memory health
hexmem_health() {
    hexmem_select "SELECT * FROM v_memory_health;"
}

# Get associated memories (spreading activation)
hexmem_associations_of() {
    local item_type="$1"
    local item_id="$2"
    
    hexmem_select "SELECT to_type, to_id, association_type, strength 
                   FROM memory_associations 
                   WHERE from_type = '$item_type' AND from_id = $item_id
                   ORDER BY strength DESC;"
}

# ============================================================================
# IDENTITY SEEDS (Migration 004)
# ============================================================================

# Load all identity seeds (for session start)
hexmem_load_identity() {
    hexmem_select "SELECT seed_name, seed_text FROM v_identity_load_order;"
}

# Get a specific identity seed
hexmem_identity_seed() {
    local name="$1"
    hexmem_select "SELECT seed_text, anchors FROM identity_seeds WHERE seed_name = '$name';"
}

# View identity summary
hexmem_identity_summary() {
    hexmem_select "SELECT * FROM v_identity_summary;"
}

# Update an identity seed (with versioning)
hexmem_evolve_identity() {
    local name="$1"
    local new_text="$2"
    local reason="$3"
    
    # Store previous version
    hexmem_query "UPDATE identity_seeds 
                  SET previous_version = seed_text,
                      seed_text = '$new_text',
                      evolution_reason = '$reason',
                      version = version + 1,
                      updated_at = datetime('now')
                  WHERE seed_name = '$name';"
    
    echo "Identity seed '$name' evolved (reason: $reason)"
}

# Add a new identity seed
hexmem_add_identity_seed() {
    local category="$1"
    local name="$2"
    local text="$3"
    local centrality="${4:-0.5}"
    
    hexmem_query "INSERT INTO identity_seeds (seed_category, seed_name, seed_text, centrality)
                  VALUES ('$category', '$name', '$text', $centrality);"
}

# View compression patterns
hexmem_compression_patterns() {
    hexmem_select "SELECT pattern_name, pattern_type, template FROM self_compression_patterns;"
}

# Compress using a pattern
hexmem_compress_with_pattern() {
    local pattern="$1"
    hexmem_select "SELECT template, required_fields FROM self_compression_patterns WHERE pattern_name = '$pattern';"
}

# ============================================================================
# EMOTIONAL WEIGHTS (Migration 005)
# ============================================================================

# Set emotional dimensions on an event
# Usage: hexmem_emote <event_id> <valence> <arousal> [tags_json]
hexmem_emote() {
    local event_id="$1"
    local valence="$2"    # -1 to +1
    local arousal="$3"    # 0 to 1
    local tags="${4:-}"
    
    if [[ -n "$tags" ]]; then
        hexmem_query "UPDATE events SET 
                      emotional_valence = $valence,
                      emotional_arousal = $arousal,
                      emotional_tags = '$tags'
                      WHERE id = $event_id;"
    else
        hexmem_query "UPDATE events SET 
                      emotional_valence = $valence,
                      emotional_arousal = $arousal
                      WHERE id = $event_id;"
    fi
}

# Log an event with emotions in one call
# Usage: hexmem_event_emote <type> <category> <summary> <valence> <arousal> [details] [tags]
hexmem_event_emote() {
    local etype="$1"
    local category="$2"
    local summary="$3"
    local valence="$4"
    local arousal="$5"
    local details="${6:-}"
    local tags="${7:-}"
    
    if [[ -n "$tags" ]]; then
        hexmem_query "INSERT INTO events (event_type, category, summary, details, emotional_valence, emotional_arousal, emotional_tags)
                      VALUES ('$etype', '$category', '$summary', '$details', $valence, $arousal, '$tags');"
    else
        hexmem_query "INSERT INTO events (event_type, category, summary, details, emotional_valence, emotional_arousal)
                      VALUES ('$etype', '$category', '$summary', '$details', $valence, $arousal);"
    fi
}

# View emotional highlights
hexmem_emotional_highlights() {
    hexmem_select "SELECT * FROM v_emotional_highlights LIMIT 10;"
}

# View positive memories
hexmem_positive_memories() {
    hexmem_select "SELECT * FROM v_positive_memories LIMIT 10;"
}

# View retrieval priority
hexmem_retrieval_priority() {
    hexmem_select "SELECT * FROM v_retrieval_priority LIMIT 10;"
}

# Look up emotion vocabulary
hexmem_emotion_lookup() {
    local emotion="$1"
    hexmem_select "SELECT emotion, typical_valence, typical_arousal, description 
                   FROM emotion_vocabulary WHERE emotion LIKE '%$emotion%';"
}

# List all emotions in vocabulary
hexmem_emotions() {
    hexmem_select "SELECT emotion, category, typical_valence as val, typical_arousal as aro 
                   FROM emotion_vocabulary ORDER BY category, emotion;"
}

# ============================================================================
# SEMANTIC SEARCH (requires embed.py and sqlite-vec)
# ============================================================================

export HEXMEM_VENV="${HEXMEM_VENV:-$HOME/clawd/hexmem/.venv}"
export HEXMEM_EMBED="${HEXMEM_EMBED:-$HOME/clawd/hexmem/embed.py}"

# Initialize vector tables
hexmem_init_vec() {
    if [[ ! -f "$HEXMEM_VENV/bin/python" ]]; then
        echo "Error: Virtual environment not found at $HEXMEM_VENV"
        echo "Run: cd ~/clawd/hexmem && python3 -m venv .venv && source .venv/bin/activate && pip install sqlite-vec sentence-transformers"
        return 1
    fi
    "$HEXMEM_VENV/bin/python" "$HEXMEM_EMBED" --init-vec
}

# Process embedding queue
hexmem_embed_queue() {
    local limit="${1:-100}"
    "$HEXMEM_VENV/bin/python" "$HEXMEM_EMBED" --process-queue --limit "$limit"
}

# Semantic search
# Usage: hexmem_search "query" [source] [limit]
hexmem_search() {
    local query="$1"
    local source="${2:-}"
    local limit="${3:-10}"
    
    if [[ -z "$query" ]]; then
        echo "Usage: hexmem_search <query> [source] [limit]"
        echo "Sources: events, lessons, facts, entities"
        return 1
    fi
    
    local args="--search \"$query\" --limit $limit"
    if [[ -n "$source" ]]; then
        args="$args --source $source"
    fi
    
    "$HEXMEM_VENV/bin/python" "$HEXMEM_EMBED" $args
}

# Show embedding stats
hexmem_embed_stats() {
    "$HEXMEM_VENV/bin/python" "$HEXMEM_EMBED" --stats
}

# Check embedding queue status
hexmem_embed_pending() {
    hexmem_select "SELECT source_table, COUNT(*) as pending 
                   FROM embedding_queue WHERE status='pending' 
                   GROUP BY source_table;"
}

# ============================================================================
# SPACED REPETITION / FORGETTING CURVE
# ============================================================================

# Show items due for review
hexmem_review_due() {
    local limit="${1:-10}"
    python3 "$HOME/clawd/hexmem/review.py" --due --limit "$limit"
}

# Record a review
# Usage: hexmem_review <source:id> [quality 0-5]
hexmem_review() {
    local item="$1"
    local quality="${2:-4}"
    python3 "$HOME/clawd/hexmem/review.py" --review "$item" --quality "$quality"
}

# Show retention statistics
hexmem_retention_stats() {
    python3 "$HOME/clawd/hexmem/review.py" --stats
}

# Process memory decay (dry run by default)
hexmem_decay() {
    local apply="${1:-}"
    if [[ "$apply" == "--apply" ]]; then
        python3 "$HOME/clawd/hexmem/review.py" --decay --apply
    else
        python3 "$HOME/clawd/hexmem/review.py" --decay
    fi
}

# Quick retention check for a specific event
hexmem_retention() {
    local id="$1"
    hexmem_select "SELECT id, summary, memory_strength, repetition_count,
                          ROUND(EXP(-((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24) / (memory_strength * 24)), 3) as retention
                   FROM events WHERE id = $id;"
}

echo "HexMem helpers loaded. Database: $HEXMEM_DB"

# ============================================================================
# FACT DECAY & SUPERSESSION (New - 2026-02-01)
# Based on Nate Liason's Agentic PKM article
# ============================================================================

# Access a fact (bump access count, updates last_accessed_at via trigger)
# Usage: hexmem_access_fact <fact_id>
hexmem_access_fact() {
    local fact_id="$1"
    hexmem_query "UPDATE facts SET access_count = access_count + 1 WHERE id = $fact_id;"
    echo "Accessed fact $fact_id"
}

# Supersede a fact (old fact marked superseded, new one created with history link)
# Usage: hexmem_supersede_fact <old_fact_id> <new_object_text> [source]
hexmem_supersede_fact() {
    local old_id="$1"
    local new_value="$2"
    local source="${3:-supersession}"

    local new_value_esc=$(hexmem_sql_escape "$new_value")
    local source_esc=$(hexmem_sql_escape "$source")

    # Supersession means our "current truth" changed; mark as significant.
    hexmem_mark_significant "fact:supersede old_id=$old_id"

    # Get old fact details
    local old_data=$(hexmem_query "SELECT subject_entity_id, subject_text, predicate, confidence 
                                   FROM facts WHERE id = $old_id;")
    
    if [[ -z "$old_data" ]]; then
        echo "Error: Fact $old_id not found"
        return 1
    fi
    
    # Create new fact (will get new ID)
    local new_id=$(hexmem_query "INSERT INTO facts (
        subject_entity_id, subject_text, predicate, object_text, 
        confidence, source, status, last_accessed_at
    ) SELECT 
        subject_entity_id, subject_text, predicate, '$new_value_esc',
        confidence, '$source_esc', 'active', datetime('now')
    FROM facts WHERE id = $old_id
    RETURNING id;")
    
    # Mark old fact as superseded
    hexmem_query "UPDATE facts SET 
                  status = 'superseded', 
                  superseded_by = $new_id,
                  updated_at = datetime('now')
                  WHERE id = $old_id;"
    
    echo "Fact $old_id superseded by $new_id"
}

# Get hot facts (accessed in last 7 days)
hexmem_hot_facts() {
    local limit="${1:-20}"
    hexmem_select "SELECT id, COALESCE(subject_name, subject_text) as subject, 
                          predicate, object_text, access_count, decay_tier
                   FROM v_facts_hot LIMIT $limit;"
}

# Get warm facts (8-30 days)
hexmem_warm_facts() {
    local limit="${1:-20}"
    hexmem_select "SELECT id, COALESCE(subject_name, subject_text) as subject,
                          predicate, object_text, access_count, decay_tier
                   FROM v_facts_warm LIMIT $limit;"
}

# Get cold facts (30+ days, not in summaries but retrievable)
hexmem_cold_facts() {
    local limit="${1:-20}"
    hexmem_select "SELECT id, COALESCE(subject_name, subject_text) as subject,
                          predicate, object_text, access_count, days_since_access
                   FROM v_facts_cold LIMIT $limit;"
}

# Get facts by retrieval priority (for smart recall)
hexmem_prioritized_facts() {
    local limit="${1:-20}"
    hexmem_select "SELECT id, subject_text, predicate, object_text, 
                          decay_tier, retrieval_score
                   FROM v_fact_retrieval_priority LIMIT $limit;"
}

# View fact supersession history
hexmem_fact_history() {
    local subject="$1"
    local subject_esc=$(hexmem_sql_escape "$subject")
    hexmem_select "SELECT current_id, predicate, current_value, current_since,
                          previous_id, previous_value, previous_from
                   FROM v_fact_history 
                   WHERE current_id IN (
                       SELECT id FROM facts 
                       WHERE subject_text LIKE '%$subject_esc%'
                          OR subject_entity_id IN (SELECT id FROM entities WHERE name LIKE '%$subject_esc%')
                   );"
}

# Reheat a cold fact (access it to bump it back to hot)
hexmem_reheat_fact() {
    local fact_id="$1"
    hexmem_access_fact "$fact_id"
    echo "Fact $fact_id reheated"
}

# Decay statistics for facts
hexmem_fact_decay_stats() {
    hexmem_select "SELECT 
        decay_tier,
        COUNT(*) as count,
        ROUND(AVG(access_count), 1) as avg_access,
        ROUND(AVG(days_since_access), 1) as avg_days_cold
    FROM v_fact_decay_tiers
    GROUP BY decay_tier
    ORDER BY 
        CASE decay_tier 
            WHEN 'hot' THEN 1 
            WHEN 'warm' THEN 2 
            ELSE 3 
        END;"
}

# Add fact with emotional weight
# Usage: hexmem_fact_emote <subject> <predicate> <object> <valence> <arousal> [source]
hexmem_fact_emote() {
    local subject="$1"
    local predicate="$2"
    local object="$3"
    local valence="$4"
    local arousal="$5"
    local source="${6:-direct}"

    local predicate_esc=$(hexmem_sql_escape "$predicate")
    local object_esc=$(hexmem_sql_escape "$object")
    local source_esc=$(hexmem_sql_escape "$source")

    # Trigger vault backup flag for emotionally salient facts
    # (arousal high OR combined salience high)
    if awk "BEGIN{
        v=$valence; if (v < 0) v = -v;
        a=$arousal;
        exit !(a >= 0.7 || (v + a) >= 1.2)
      }" 2>/dev/null; then
        hexmem_mark_significant "fact:emote salience valence=$valence arousal=$arousal"
    fi

    local subject_id=$(hexmem_entity_id "$subject")

    if [[ -n "$subject_id" ]]; then
        hexmem_query "INSERT INTO facts (subject_entity_id, predicate, object_text, source, 
                                         emotional_valence, emotional_arousal, last_accessed_at)
                      VALUES ($subject_id, '$predicate_esc', '$object_esc', '$source_esc', 
                              $valence, $arousal, datetime('now'));"
    else
        local subject_esc=$(hexmem_sql_escape "$subject")
        hexmem_query "INSERT INTO facts (subject_text, predicate, object_text, source,
                                         emotional_valence, emotional_arousal, last_accessed_at)
                      VALUES ('$subject_esc', '$predicate_esc', '$object_esc', '$source_esc',
                              $valence, $arousal, datetime('now'));"
    fi
}

# Weekly synthesis: generate summary of hot/warm facts for an entity
hexmem_synthesize_entity() {
    local entity_name="$1"
    local entity_id=$(hexmem_entity_id "$entity_name")
    
    if [[ -z "$entity_id" ]]; then
        echo "Entity '$entity_name' not found"
        return 1
    fi
    
    echo "=== Hot Facts (last 7 days) ==="
    hexmem_select "SELECT predicate, object_text, access_count 
                   FROM v_facts_hot 
                   WHERE subject_entity_id = $entity_id
                   ORDER BY access_count DESC;"
    
    echo ""
    echo "=== Warm Facts (8-30 days) ==="
    hexmem_select "SELECT predicate, object_text, access_count 
                   FROM v_facts_warm 
                   WHERE subject_entity_id = $entity_id
                   ORDER BY access_count DESC;"
}


# Genealogy of Beliefs - trace evolution of a belief
hexmem_fact_history() {
    local fact_id="$1"
    if [[ -z "$fact_id" ]]; then
        echo "Usage: hexmem_fact_history <fact_id>" >&2
        return 1
    fi
    
    echo "Fact Evolution Chain for ID $fact_id:"
    echo ""
    
    sqlite3 "$HEXMEM_DB" <<SQL
.mode column
.headers on
SELECT 
    id,
    CASE 
        WHEN valid_until IS NULL THEN 'CURRENT'
        ELSE 'SUPERSEDED'
    END as status,
    subject_text || ' ' || predicate || ' ' || object_text as content,
    confidence,
    substr(created_at, 1, 19) as created_at,
    substr(valid_until, 1, 19) as valid_until,
    superseded_by
FROM facts
WHERE id = $fact_id
   OR superseded_by = $fact_id
   OR id IN (SELECT superseded_by FROM facts WHERE id = $fact_id)
ORDER BY created_at;
SQL
}

hexmem_lesson_history() {
    local lesson_id="$1"
    if [[ -z "$lesson_id" ]]; then
        echo "Usage: hexmem_lesson_history <lesson_id>" >&2
        return 1
    fi
    
    echo "Lesson Evolution Chain for ID $lesson_id:"
    echo ""
    
    sqlite3 "$HEXMEM_DB" <<SQL
.mode column
.headers on
SELECT 
    id,
    CASE 
        WHEN valid_until IS NULL THEN 'CURRENT'
        ELSE 'SUPERSEDED'
    END as status,
    domain,
    lesson,
    confidence,
    substr(created_at, 1, 19) as created_at,
    substr(valid_until, 1, 19) as valid_until,
    superseded_by
FROM lessons
WHERE id = $lesson_id
   OR superseded_by = $lesson_id
   OR id IN (SELECT superseded_by FROM lessons WHERE id = $lesson_id)
ORDER BY created_at;
SQL
}

# === Archon Integration ===

hexmem_archon_check() {
    echo "=== HexMem Archon Integration Check ===" >&2
    echo "" >&2
    
    local ARCHON_CONFIG_DIR="${ARCHON_CONFIG_DIR:-$HOME/.config/archon}"
    
    # Check for Archon skill
    local archon_skill_found=false
    if [[ -f ~/clawd/skills/archon/SKILL.md ]] || \
       [[ -f ~/.npm-global/lib/node_modules/openclaw/skills/archon/SKILL.md ]]; then
        echo "✓ Archon skill available" >&2
        archon_skill_found=true
    else
        echo "✗ Archon skill not found" >&2
        echo "  Install: clawhub skill install archon" >&2
        return 1
    fi
    
    # Check for Archon config
    if [[ ! -f "$ARCHON_CONFIG_DIR/archon.env" ]]; then
        echo "✗ Archon not configured at $ARCHON_CONFIG_DIR" >&2
        echo "  See Archon skill documentation" >&2
        return 1
    fi
    
    echo "✓ Archon configured" >&2
    
    # Check for vault
    source "$ARCHON_CONFIG_DIR/archon.env"
    if [[ -z "${ARCHON_PASSPHRASE:-}" ]]; then
        echo "✗ ARCHON_PASSPHRASE not set" >&2
        return 1
    fi
    
    cd "$ARCHON_CONFIG_DIR"
    local vault_did=$(npx @didcid/keymaster get-name hexmem-vault 2>/dev/null || true)
    
    if [[ -z "$vault_did" ]]; then
        echo "✗ hexmem-vault not found" >&2
        echo "  Create: hexmem_archon_setup" >&2
        return 1
    fi
    
    echo "✓ hexmem-vault exists: $vault_did" >&2
    echo "" >&2
    echo "Ready for encrypted identity backups!" >&2
    return 0
}

hexmem_archon_setup() {
    echo "=== Setting up Archon vault for HexMem ===" >&2
    echo "" >&2
    
    local ARCHON_CONFIG_DIR="${ARCHON_CONFIG_DIR:-$HOME/.config/archon}"
    
    # Check Archon skill
    if ! hexmem_archon_check 2>/dev/null; then
        echo "Archon skill or config missing. Fix issues above first." >&2
        return 1
    fi
    
    # Create vault
    echo "Creating hexmem-vault..." >&2
    source "$ARCHON_CONFIG_DIR/archon.env"
    cd "$ARCHON_CONFIG_DIR"
    
    if npx @didcid/keymaster create-vault -n hexmem-vault; then
        local vault_did=$(npx @didcid/keymaster get-name hexmem-vault)
        echo "" >&2
        echo "✓ Vault created: $vault_did" >&2
        echo "" >&2
        echo "Next steps:" >&2
        echo "  1. Run initial backup: hexmem_archon_backup" >&2
        echo "  2. Set up automated backups (see SKILL.md)" >&2
        return 0
    else
        echo "Failed to create vault" >&2
        return 1
    fi
}

hexmem_archon_backup() {
    echo "=== Running HexMem Archon backup ===" >&2
    
    local ARCHON_CONFIG_DIR="${ARCHON_CONFIG_DIR:-$HOME/.config/archon}"
    local HEXMEM_ROOT="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
    
    if ! hexmem_archon_check >/dev/null 2>&1; then
        echo "Archon not ready. Run: hexmem_archon_check" >&2
        return 1
    fi
    
    cd "$HEXMEM_ROOT"
    source "$ARCHON_CONFIG_DIR/archon.env"
    ./scripts/vault-backup.sh
}

hexmem_archon_restore() {
    local backup_name="$1"
    local ARCHON_CONFIG_DIR="${ARCHON_CONFIG_DIR:-$HOME/.config/archon}"
    
    if [[ -z "$backup_name" ]]; then
        echo "Usage: hexmem_archon_restore <backup-file-name>" >&2
        echo "Example: hexmem_archon_restore hmdb-20260202093000.db" >&2
        echo "" >&2
        echo "Available backups:" >&2
        source "$ARCHON_CONFIG_DIR/archon.env"
        cd "$ARCHON_CONFIG_DIR"
        npx @didcid/keymaster list-vault-items hexmem-vault | grep "^hmdb-"
        return 1
    fi
    
    echo "Downloading backup: $backup_name" >&2
    source "$ARCHON_CONFIG_DIR/archon.env"
    cd "$ARCHON_CONFIG_DIR"
    
    local restore_file="/tmp/hexmem-restore-$$.db"
    if npx @didcid/keymaster get-vault-item hexmem-vault "$backup_name" > "$restore_file"; then
        echo "✓ Downloaded to: $restore_file" >&2
        echo "" >&2
        echo "To restore:" >&2
        echo "  cp $HEXMEM_DB ${HEXMEM_DB}.backup" >&2
        echo "  cp $restore_file $HEXMEM_DB" >&2
        echo "" >&2
        echo "Verify first: sqlite3 $restore_file .tables" >&2
    else
        echo "Failed to download backup" >&2
        rm -f "$restore_file"
        return 1
    fi
}


# ============================================================================
# PROGRESSIVE DISCLOSURE (inspired by claude-mem)
# Token-efficient memory retrieval pattern
# ============================================================================

# Layer 1: Compact index - just IDs, timestamps, summaries
# Returns ~50-100 tokens per result (no full content)
# Usage: hexmem_index "query" [table] [limit]
hexmem_index() {
    local query="${1:?Usage: hexmem_index <query> [table] [limit]}"
    local table="${2:-all}"
    local limit="${3:-20}"
    
    local query_esc=$(hexmem_sql_escape "$query")
    
    echo "=== HexMem Index: '$query' (limit: $limit) ===" >&2
    echo "Token-efficient view (IDs + summaries only)" >&2
    echo "" >&2
    
    case "$table" in
        events|event)
            hexmem_select "
                SELECT 
                    id,
                    datetime(occurred_at) as timestamp_text,
                    event_type || '/' || category as type,
                    substr(summary, 1, 80) as summary
                FROM events
                WHERE summary LIKE '%$query_esc%' 
                   OR details LIKE '%$query_esc%'
                   OR category LIKE '%$query_esc%'
                ORDER BY occurred_at DESC
                LIMIT $limit;
            "
            ;;
        facts|fact)
            hexmem_select "
                SELECT 
                    f.id,
                    datetime(f.created_at) as created,
                    COALESCE(e.name, f.subject_text) as subject,
                    f.predicate,
                    substr(f.object_text, 1, 50) as value
                FROM facts f
                LEFT JOIN entities e ON f.subject_entity_id = e.id
                WHERE f.object_text LIKE '%$query_esc%'
                   OR f.predicate LIKE '%$query_esc%'
                   OR e.name LIKE '%$query_esc%'
                   OR f.subject_text LIKE '%$query_esc%'
                ORDER BY f.created_at DESC
                LIMIT $limit;
            "
            ;;
        lessons|lesson)
            hexmem_select "
                SELECT 
                    id,
                    domain,
                    substr(lesson, 1, 80) as lesson_summary
                FROM lessons
                WHERE lesson LIKE '%$query_esc%'
                   OR context LIKE '%$query_esc%'
                   OR domain LIKE '%$query_esc%'
                ORDER BY created_at DESC
                LIMIT $limit;
            "
            ;;
        all)
            echo "--- Events ---" >&2
            hexmem_index "$query" "events" 10
            echo "" >&2
            echo "--- Facts ---" >&2
            hexmem_index "$query" "facts" 10
            echo "" >&2
            echo "--- Lessons ---" >&2
            hexmem_index "$query" "lessons" 5
            ;;
        *)
            echo "Unknown table: $table (use: events, facts, lessons, all)" >&2
            return 1
            ;;
    esac
    
    echo "" >&2
    echo "Next steps:" >&2
    echo "  - Review IDs above" >&2
    echo "  - Use: hexmem_timeline <event_id> [hours_before] [hours_after]" >&2
    echo "  - Use: hexmem_details <table> <id1> [id2] [id3] ..." >&2
}

# Layer 2: Timeline context - what was happening around X?
# Returns ~200-300 tokens (compact context window)
# Usage: hexmem_timeline <event_id> [hours_before] [hours_after]
hexmem_timeline() {
    local event_id="${1:?Usage: hexmem_timeline <event_id> [hours_before] [hours_after]}"
    local hours_before="${2:-2}"
    local hours_after="${3:-2}"
    
    echo "=== Timeline Context Around Event #$event_id ===" >&2
    echo "Window: -${hours_before}h to +${hours_after}h" >&2
    echo "" >&2
    
    # Get the reference event timestamp
    local ref_time=$(hexmem_query "SELECT occurred_at FROM events WHERE id=$event_id;")
    
    if [ -z "$ref_time" ]; then
        echo "Event #$event_id not found" >&2
        return 1
    fi
    
    echo "Reference event:" >&2
    hexmem_select "
        SELECT 
            id,
            datetime(occurred_at) as timestamp_text,
            event_type || '/' || category as type,
            summary
        FROM events
        WHERE id = $event_id;
    "
    
    echo "" >&2
    echo "Context events:" >&2
    hexmem_select "
        SELECT 
            id,
            datetime(occurred_at) as timestamp_text,
            event_type || '/' || category as type,
            substr(summary, 1, 60) as summary,
            CASE 
                WHEN id = $event_id THEN '★ TARGET'
                WHEN occurred_at < '$ref_time' THEN '← before'
                ELSE '→ after'
            END as relation
        FROM events
        WHERE occurred_at >= datetime('$ref_time', '-$hours_before hours')
          AND occurred_at <= datetime('$ref_time', '+$hours_after hours')
        ORDER BY occurred_at ASC;
    "
    
    echo "" >&2
    echo "Use: hexmem_details events <id> [id2] [id3] ... for full content" >&2
}

# Layer 2b: Timeline by date range
# Usage: hexmem_timeline_range "2026-02-01" "2026-02-03"
hexmem_timeline_range() {
    local start_date="${1:?Usage: hexmem_timeline_range <start_date> <end_date>}"
    local end_date="${2:?}"
    
    echo "=== Timeline: $start_date to $end_date ===" >&2
    echo "" >&2
    
    hexmem_select "
        SELECT 
            id,
            datetime(occurred_at) as timestamp_text,
            event_type || '/' || category as type,
            substr(summary, 1, 70) as summary
        FROM events
        WHERE date(occurred_at) >= '$start_date'
          AND date(occurred_at) <= '$end_date'
        ORDER BY occurred_at ASC;
    "
    
    echo "" >&2
    echo "Use: hexmem_details events <id> ... for full content" >&2
}

# Layer 3: Full details - only for filtered IDs
# Returns ~500-1,000 tokens per result (complete records)
# Usage: hexmem_details <table> <id1> [id2] [id3] ...
hexmem_details() {
    local table="${1:?Usage: hexmem_details <table> <id1> [id2] [id3] ...}"
    shift
    
    if [ $# -eq 0 ]; then
        echo "No IDs provided" >&2
        return 1
    fi
    
    local ids="$@"
    local id_list=$(echo "$ids" | tr ' ' ',')
    
    echo "=== Full Details: $table ($# items) ===" >&2
    echo "" >&2
    
    case "$table" in
        events|event)
            for id in $ids; do
                echo "--- Event #$id ---" >&2
                hexmem_select "
                    SELECT 
                        id,
                        event_type,
                        category,
                        datetime(occurred_at) as timestamp_text,
                        summary,
                        details,
                        emotional_valence,
                        emotional_arousal
                    FROM events
                    WHERE id = $id;
                "
                echo "" >&2
            done
            ;;
        facts|fact)
            for id in $ids; do
                echo "--- Fact #$id ---" >&2
                hexmem_select "
                    SELECT 
                        f.id,
                        COALESCE(e.name, f.subject_text) as subject,
                        f.predicate,
                        f.object_text as value,
                        f.object_type as type,
                        datetime(f.created_at) as created,
                        f.source,
                        f.confidence
                    FROM facts f
                    LEFT JOIN entities e ON f.subject_entity_id = e.id
                    WHERE f.id = $id;
                "
                echo "" >&2
            done
            ;;
        lessons|lesson)
            for id in $ids; do
                echo "--- Lesson #$id ---" >&2
                hexmem_select "
                    SELECT 
                        id,
                        domain,
                        lesson,
                        context,
                        confidence,
                        times_applied,
                        times_validated,
                        times_contradicted,
                        datetime(created_at) as learned
                    FROM lessons
                    WHERE id = $id;
                "
                echo "" >&2
            done
            ;;
        *)
            echo "Unknown table: $table (use: events, facts, lessons)" >&2
            return 1
            ;;
    esac
}

# Token cost estimator (approximate)
hexmem_token_estimate() {
    local operation="$1"
    local count="${2:-1}"
    
    case "$operation" in
        index)
            echo "~$((count * 75)) tokens (compact index)"
            ;;
        timeline)
            echo "~300 tokens (context window)"
            ;;
        details)
            echo "~$((count * 750)) tokens (full records)"
            ;;
        *)
            echo "Usage: hexmem_token_estimate <index|timeline|details> [count]"
            ;;
    esac
}


# ============================================================================
# LIFECYCLE HELPERS (simple, no AI required)
# ============================================================================

# Session start: quick context + pending tasks
# Usage: hexmem_session_start [recent_events_count]
hexmem_session_start() {
    local count="${1:-5}"
    echo "=== HexMem Session Start ===" >&2
    echo "Pending tasks:" >&2
    hexmem_pending_tasks
    echo "" >&2
    echo "Recent events (last $count):" >&2
    hexmem_recent_events "$count"
    echo "" >&2
    echo "Emotional highlights:" >&2
    hexmem_emotional_highlights
}

# Session end: log a summary event
# Usage: hexmem_session_end "summary" [details]
hexmem_session_end() {
    local summary="${1:-Session ended}"
    local details="${2:-}"
    hexmem_event "session" "summary" "$summary" "$details"
    echo "Logged session summary event." >&2
}

# Heartbeat check: quick pending task review
# Usage: hexmem_heartbeat_check
hexmem_heartbeat_check() {
    echo "=== HexMem Heartbeat Check ===" >&2
    hexmem_pending_tasks
}


# ============================================================================
# HEXSWARM INTEGRATION
# ============================================================================

HEXSWARM_DIR="${HEXSWARM_DIR:-/home/sat/bin/hexswarm}"

# Delegate a task with context enrichment
# Usage: hexswarm_delegate <agent|auto> <type> <description>
hexswarm_delegate() {
    "$HEXSWARM_DIR/bin/smart-delegate.sh" "$@"
}

# Query swarm lessons by domain
# Usage: hexswarm_lessons [domain]
hexswarm_lessons() {
    "$HEXSWARM_DIR/bin/swarm-intel.sh" lessons "${1:-general}"
}

# Search swarm lessons
# Usage: hexswarm_search <query>
hexswarm_search() {
    "$HEXSWARM_DIR/bin/swarm-intel.sh" search "$@"
}

# Get best agent for task type
# Usage: hexswarm_best <task_type>
hexswarm_best() {
    "$HEXSWARM_DIR/bin/swarm-intel.sh" best "${1:-general}"
}

# Preview context that would be injected for a task
# Usage: hexswarm_context <description>
hexswarm_context() {
    "$HEXSWARM_DIR/bin/swarm-intel.sh" context "$@"
}

# Check for agent task completions
# Usage: hexswarm_check
hexswarm_check() {
    "$HEXSWARM_DIR/bin/check-completions.sh"
}

# View agent performance stats
# Usage: hexswarm_performance [agent]
hexswarm_performance() {
    "$HEXSWARM_DIR/bin/swarm-intel.sh" performance "$@"
}

