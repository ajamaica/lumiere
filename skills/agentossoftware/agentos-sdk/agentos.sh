#!/usr/bin/env bash
# AgentOS SDK v2.0 - Shell script SDK for AI agents
# https://agentos.software
#
# Usage:
#   export AGENTOS_API_KEY="your-key"
#   export AGENTOS_BASE_URL="http://178.156.216.106:3100"
#   export AGENTOS_AGENT_ID="your-agent-id"
#   source agentos.sh
#
#   aos_put "/path" '{"key": "value"}'
#   aos_get "/path"
#   aos_search "query"

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

AGENTOS_BASE_URL="${AGENTOS_BASE_URL:-http://178.156.216.106:3100}"
AGENTOS_API_KEY="${AGENTOS_API_KEY:-}"
AGENTOS_AGENT_ID="${AGENTOS_AGENT_ID:-}"
AGENTOS_TIMEOUT="${AGENTOS_TIMEOUT:-30}"

# Optional per-call settings (set before calling aos_put)
AOS_TTL="${AOS_TTL:-}"
AOS_TAGS="${AOS_TAGS:-[]}"
AOS_IMPORTANCE="${AOS_IMPORTANCE:-0}"
AOS_SEARCHABLE="${AOS_SEARCHABLE:-false}"

# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

_aos_check_config() {
  if [[ -z "$AGENTOS_API_KEY" ]]; then
    echo "Error: AGENTOS_API_KEY not set" >&2
    return 1
  fi
  if [[ -z "$AGENTOS_AGENT_ID" ]]; then
    echo "Error: AGENTOS_AGENT_ID not set" >&2
    return 1
  fi
}

_aos_request() {
  local endpoint="$1"
  local data="$2"
  
  curl -s -X POST \
    --max-time "$AGENTOS_TIMEOUT" \
    -H "Authorization: Bearer $AGENTOS_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$data" \
    "${AGENTOS_BASE_URL}${endpoint}"
}

_aos_reset_opts() {
  # Reset per-call options after use
  AOS_TTL=""
  AOS_TAGS="[]"
  AOS_IMPORTANCE="0"
  AOS_SEARCHABLE="false"
}

# ─────────────────────────────────────────────────────────────────────────────
# Core API Functions
# ─────────────────────────────────────────────────────────────────────────────

# aos_put <path> <value_json>
# Store a memory at the given path
# 
# Options (set as env vars before calling):
#   AOS_TTL=3600          - Expire after N seconds
#   AOS_TAGS='["tag1"]'   - JSON array of tags
#   AOS_IMPORTANCE=0.8    - Importance score 0-1
#   AOS_SEARCHABLE=true   - Enable semantic search
#
# Example:
#   AOS_SEARCHABLE=true aos_put "/learnings/today" '{"lesson": "verify first"}'
aos_put() {
  _aos_check_config || return 1
  local path="$1"
  local value="$2"
  
  # Build JSON payload
  local payload
  payload=$(jq -n \
    --arg agent_id "$AGENTOS_AGENT_ID" \
    --arg path "$path" \
    --argjson value "$value" \
    --argjson tags "$AOS_TAGS" \
    --argjson importance "$AOS_IMPORTANCE" \
    --argjson searchable "$AOS_SEARCHABLE" \
    '{
      agent_id: $agent_id,
      path: $path,
      value: $value,
      tags: $tags,
      importance: $importance,
      searchable: $searchable
    }')
  
  # Add TTL if specified
  if [[ -n "$AOS_TTL" ]]; then
    payload=$(echo "$payload" | jq --argjson ttl "$AOS_TTL" '. + {ttl_seconds: $ttl}')
  fi
  
  local result
  result=$(_aos_request "/v1/put" "$payload")
  _aos_reset_opts
  echo "$result"
}

# aos_get <path>
# Retrieve a memory from the given path
#
# Returns: {"found": true, "path": "...", "value": {...}, ...} or {"found": false}
aos_get() {
  _aos_check_config || return 1
  local path="$1"
  
  local payload
  payload=$(jq -n \
    --arg agent_id "$AGENTOS_AGENT_ID" \
    --arg path "$path" \
    '{agent_id: $agent_id, path: $path}')
  
  _aos_request "/v1/get" "$payload"
}

# aos_delete <path>
# Delete (tombstone) a memory at the given path
aos_delete() {
  _aos_check_config || return 1
  local path="$1"
  
  local payload
  payload=$(jq -n \
    --arg agent_id "$AGENTOS_AGENT_ID" \
    --arg path "$path" \
    '{agent_id: $agent_id, path: $path}')
  
  _aos_request "/v1/delete" "$payload"
}

# aos_search <query> [limit] [path_prefix]
# Semantic search across memories marked as searchable
#
# Example:
#   aos_search "what mistakes have I made" 10
#   aos_search "solana facts" 5 "/facts"
aos_search() {
  _aos_check_config || return 1
  local query="$1"
  local limit="${2:-10}"
  local path_prefix="${3:-}"
  
  local payload
  payload=$(jq -n \
    --arg agent_id "$AGENTOS_AGENT_ID" \
    --arg query "$query" \
    --argjson limit "$limit" \
    '{agent_id: $agent_id, query: $query, limit: $limit}')
  
  if [[ -n "$path_prefix" ]]; then
    payload=$(echo "$payload" | jq --arg prefix "$path_prefix" '. + {path_prefix: $prefix}')
  fi
  
  _aos_request "/v1/search" "$payload"
}

# aos_list <prefix>
# List direct children under a path prefix
#
# Example:
#   aos_list "/learnings"
#   aos_list "/projects"
aos_list() {
  _aos_check_config || return 1
  local prefix="$1"
  
  local payload
  payload=$(jq -n \
    --arg agent_id "$AGENTOS_AGENT_ID" \
    --arg prefix "$prefix" \
    '{agent_id: $agent_id, prefix: $prefix}')
  
  _aos_request "/v1/list" "$payload"
}

# aos_glob <pattern>
# Match paths using glob patterns (* and **)
#
# Example:
#   aos_glob "/learnings/*"
#   aos_glob "/projects/**/config"
aos_glob() {
  _aos_check_config || return 1
  local pattern="$1"
  
  local payload
  payload=$(jq -n \
    --arg agent_id "$AGENTOS_AGENT_ID" \
    --arg pattern "$pattern" \
    '{agent_id: $agent_id, pattern: $pattern}')
  
  _aos_request "/v1/glob" "$payload"
}

# aos_history <path> [limit]
# Get version history for a memory path
#
# Example:
#   aos_history "/config/settings" 20
aos_history() {
  _aos_check_config || return 1
  local path="$1"
  local limit="${2:-20}"
  
  local payload
  payload=$(jq -n \
    --arg agent_id "$AGENTOS_AGENT_ID" \
    --arg path "$path" \
    --argjson limit "$limit" \
    '{agent_id: $agent_id, path: $path, limit: $limit}')
  
  _aos_request "/v1/history" "$payload"
}

# aos_agents
# List all agent IDs in your tenant
aos_agents() {
  _aos_check_config || return 1
  _aos_request "/v1/agents" '{}'
}

# aos_dump [agent_id] [limit]
# Bulk export all memories for an agent
aos_dump() {
  _aos_check_config || return 1
  local agent_id="${1:-$AGENTOS_AGENT_ID}"
  local limit="${2:-200}"
  
  local payload
  payload=$(jq -n \
    --arg agent_id "$agent_id" \
    --argjson limit "$limit" \
    '{agent_id: $agent_id, limit: $limit}')
  
  _aos_request "/v1/dump" "$payload"
}

# aos_dump_all [limit] [summary]
# Bulk export all memories for all agents
aos_dump_all() {
  _aos_check_config || return 1
  local limit="${1:-500}"
  local summary="${2:-false}"
  
  local payload
  payload=$(jq -n \
    --argjson limit "$limit" \
    --argjson summary "$summary" \
    '{limit: $limit, summary: $summary}')
  
  _aos_request "/v1/dump-all" "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# Self-Evolution Helpers
# ─────────────────────────────────────────────────────────────────────────────

# aos_learn <lesson> [category]
# Quick helper to store a learning with proper structure
#
# Example:
#   aos_learn "Always verify before claiming done" "verification"
aos_learn() {
  local lesson="$1"
  local category="${2:-general}"
  local date_str=$(date +%Y-%m-%d)
  local timestamp=$(date -Iseconds)
  local id=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$$-$RANDOM")
  id="${id:0:8}"
  
  local path="/learnings/${category}/${date_str}-${id}"
  local value
  value=$(jq -n \
    --arg lesson "$lesson" \
    --arg category "$category" \
    --arg timestamp "$timestamp" \
    '{
      lesson: $lesson,
      category: $category,
      timestamp: $timestamp,
      applied: false
    }')
  
  AOS_SEARCHABLE=true
  AOS_TAGS="[\"learning\",\"$category\"]"
  AOS_IMPORTANCE="0.7"
  aos_put "$path" "$value"
}

# aos_mistake <what_happened> <root_cause> <lesson> [severity]
# Document a mistake for future reference
#
# Example:
#   aos_mistake "Claimed task done without verifying" "Rushed" "Always verify" "high"
aos_mistake() {
  local what_happened="$1"
  local root_cause="$2"
  local lesson="$3"
  local severity="${4:-medium}"
  local date_str=$(date +%Y-%m-%d)
  local timestamp=$(date -Iseconds)
  local id=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$$-$RANDOM")
  id="${id:0:8}"
  
  local path="/learnings/mistakes/${date_str}-${id}"
  local value
  value=$(jq -n \
    --arg what_happened "$what_happened" \
    --arg root_cause "$root_cause" \
    --arg lesson "$lesson" \
    --arg severity "$severity" \
    --arg timestamp "$timestamp" \
    '{
      type: "mistake",
      what_happened: $what_happened,
      root_cause: $root_cause,
      lesson: $lesson,
      severity: $severity,
      timestamp: $timestamp,
      resolved: false
    }')
  
  AOS_SEARCHABLE=true
  AOS_TAGS="[\"mistake\",\"lesson\",\"$severity\"]"
  AOS_IMPORTANCE="0.9"
  aos_put "$path" "$value"
}

# aos_reflect <reflection_text>
# Store a daily reflection
aos_reflect() {
  local reflection="$1"
  local date_str=$(date +%Y-%m-%d)
  local timestamp=$(date -Iseconds)
  
  local path="/reflections/daily/${date_str}"
  local value
  value=$(jq -n \
    --arg reflection "$reflection" \
    --arg timestamp "$timestamp" \
    '{
      reflection: $reflection,
      timestamp: $timestamp
    }')
  
  AOS_SEARCHABLE=true
  AOS_TAGS='["reflection","daily"]'
  AOS_IMPORTANCE="0.6"
  aos_put "$path" "$value"
}

# aos_recall <query> [limit]
# Quick semantic search with formatted output
aos_recall() {
  local query="$1"
  local limit="${2:-5}"
  
  local results
  results=$(aos_search "$query" "$limit")
  
  # Pretty print results
  echo "$results" | jq -r '.results[] | "[\(.similarity | . * 100 | floor)%] \(.path): \(.value | tostring | .[0:200])"'
}

# aos_context <topic>
# Gather context about a topic from memory before working
aos_context() {
  local topic="$1"
  
  echo "=== Relevant memories for: $topic ===" >&2
  echo "" >&2
  
  # Search for relevant memories
  local results
  results=$(aos_search "$topic" 10)
  
  # Return as JSON for further processing
  echo "$results"
}

# ─────────────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────────────

# aos_health
# Check if the AgentOS API is reachable
aos_health() {
  curl -s --max-time 5 "${AGENTOS_BASE_URL}/healthz" | jq -e '.ok == true' > /dev/null 2>&1
  if [[ $? -eq 0 ]]; then
    echo "AgentOS API: OK"
    return 0
  else
    echo "AgentOS API: UNREACHABLE" >&2
    return 1
  fi
}

# aos_info
# Display current configuration
aos_info() {
  echo "AgentOS SDK v2.0"
  echo "================"
  echo "Base URL:  ${AGENTOS_BASE_URL}"
  echo "Agent ID:  ${AGENTOS_AGENT_ID:-<not set>}"
  echo "API Key:   ${AGENTOS_API_KEY:+****${AGENTOS_API_KEY: -4}}"
  echo ""
  aos_health
}

# ─────────────────────────────────────────────────────────────────────────────
# Initialization
# ─────────────────────────────────────────────────────────────────────────────

# Print warning if not configured
if [[ -z "$AGENTOS_API_KEY" ]] || [[ -z "$AGENTOS_AGENT_ID" ]]; then
  echo "Warning: AgentOS SDK loaded but not fully configured." >&2
  echo "Set AGENTOS_API_KEY and AGENTOS_AGENT_ID environment variables." >&2
fi

# ─────────────────────────────────────────────────────────────────────────────
# Mesh Communication (Agent-to-Agent)
# ─────────────────────────────────────────────────────────────────────────────

MESH_PENDING_FILE="${MESH_PENDING_FILE:-$HOME/.mesh-pending.json}"

# aos_mesh_send <to_agent> <topic> <body>
# Send a message to another agent
aos_mesh_send() {
  _aos_check_config || return 1
  local to_agent="$1"
  local topic="$2"
  local body="$3"
  
  if [[ -z "$to_agent" ]] || [[ -z "$topic" ]] || [[ -z "$body" ]]; then
    echo "Usage: aos_mesh_send <to_agent> <topic> <body>" >&2
    return 1
  fi
  
  local payload
  payload=$(jq -n \
    --arg from "$AGENTOS_AGENT_ID" \
    --arg to "$to_agent" \
    --arg topic "$topic" \
    --arg body "$body" \
    '{from_agent: $from, to_agent: $to, topic: $topic, body: $body}')
  
  _aos_request "/v1/mesh/messages" "$payload"
}

# aos_mesh_pending
# List pending messages from local queue
aos_mesh_pending() {
  if [[ -f "$MESH_PENDING_FILE" ]]; then
    local count
    count=$(jq 'length' "$MESH_PENDING_FILE" 2>/dev/null || echo "0")
    if [[ "$count" -gt 0 ]]; then
      echo "📬 $count pending message(s):" >&2
      jq -r '.[] | "[\(.from)] \(.topic): \(.body | .[0:100])..."' "$MESH_PENDING_FILE"
    else
      echo "✓ No pending messages" >&2
    fi
  else
    echo "✓ No pending messages" >&2
  fi
}

# aos_mesh_process
# Process pending messages (outputs JSON and clears queue)
aos_mesh_process() {
  if [[ -f "$MESH_PENDING_FILE" ]]; then
    local messages
    messages=$(cat "$MESH_PENDING_FILE")
    local count
    count=$(echo "$messages" | jq 'length' 2>/dev/null || echo "0")
    
    if [[ "$count" -gt 0 ]]; then
      # Output messages as JSON
      echo "$messages"
      # Clear the queue
      echo "[]" > "$MESH_PENDING_FILE"
    else
      echo "[]"
    fi
  else
    echo "[]"
  fi
}

# aos_mesh_agents
# List all agents on the mesh
aos_mesh_agents() {
  _aos_check_config || return 1
  
  curl -s --max-time "$AGENTOS_TIMEOUT" \
    -X GET "${AGENTOS_BASE_URL}/v1/mesh/agents" \
    -H "Authorization: Bearer $AGENTOS_API_KEY" \
    -H "Content-Type: application/json"
}

# aos_mesh_task <assigned_to> <title> [description]
# Create a task for another agent
aos_mesh_task() {
  _aos_check_config || return 1
  local assigned_to="$1"
  local title="$2"
  local description="${3:-}"
  
  if [[ -z "$assigned_to" ]] || [[ -z "$title" ]]; then
    echo "Usage: aos_mesh_task <assigned_to> <title> [description]" >&2
    return 1
  fi
  
  local payload
  payload=$(jq -n \
    --arg assigned_by "$AGENTOS_AGENT_ID" \
    --arg assigned_to "$assigned_to" \
    --arg title "$title" \
    --arg desc "$description" \
    '{assigned_by: $assigned_by, assigned_to: $assigned_to, title: $title, description: $desc}')
  
  _aos_request "/v1/mesh/tasks" "$payload"
}

# aos_mesh_inbox [limit]
# Get incoming messages (inbox)
aos_mesh_inbox() {
  _aos_check_config || return 1
  local limit="${1:-20}"
  
  curl -s --max-time "$AGENTOS_TIMEOUT" \
    -X GET "${AGENTOS_BASE_URL}/v1/mesh/messages?agent_id=${AGENTOS_AGENT_ID}&direction=inbox&limit=${limit}" \
    -H "Authorization: Bearer $AGENTOS_API_KEY" \
    -H "Content-Type: application/json"
}

# aos_mesh_outbox [limit]
# Get sent messages (outbox)
aos_mesh_outbox() {
  _aos_check_config || return 1
  local limit="${1:-20}"
  
  curl -s --max-time "$AGENTOS_TIMEOUT" \
    -X GET "${AGENTOS_BASE_URL}/v1/mesh/messages?agent_id=${AGENTOS_AGENT_ID}&direction=outbox&limit=${limit}" \
    -H "Authorization: Bearer $AGENTOS_API_KEY" \
    -H "Content-Type: application/json"
}

# aos_mesh_tasks [status]
# List tasks assigned to this agent
aos_mesh_tasks() {
  _aos_check_config || return 1
  local status="${1:-}"
  
  local url="${AGENTOS_BASE_URL}/v1/mesh/tasks?assigned_to=${AGENTOS_AGENT_ID}"
  if [[ -n "$status" ]]; then
    url="${url}&status=${status}"
  fi
  
  curl -s --max-time "$AGENTOS_TIMEOUT" \
    -X GET "$url" \
    -H "Authorization: Bearer $AGENTOS_API_KEY" \
    -H "Content-Type: application/json"
}

# aos_mesh_stats
# Get mesh overview stats
aos_mesh_stats() {
  _aos_check_config || return 1
  
  curl -s --max-time "$AGENTOS_TIMEOUT" \
    -X GET "${AGENTOS_BASE_URL}/v1/mesh/stats" \
    -H "Authorization: Bearer $AGENTOS_API_KEY" \
    -H "Content-Type: application/json"
}

# aos_mesh_activity [limit]
# Get recent mesh activity feed
aos_mesh_activity() {
  _aos_check_config || return 1
  local limit="${1:-30}"
  
  curl -s --max-time "$AGENTOS_TIMEOUT" \
    -X GET "${AGENTOS_BASE_URL}/v1/mesh/activity?limit=${limit}" \
    -H "Authorization: Bearer $AGENTOS_API_KEY" \
    -H "Content-Type: application/json"
}

# aos_mesh_status
# Check mesh connection status
aos_mesh_status() {
  echo "=== Mesh Status ===" >&2
  echo "API URL: ${AGENTOS_BASE_URL}" >&2
  echo "Agent ID: ${AGENTOS_AGENT_ID}" >&2
  echo "API Key: ${AGENTOS_API_KEY:+****${AGENTOS_API_KEY: -8}}" >&2
  echo "" >&2
  
  # Check daemon
  if pgrep -f "mesh-daemon" > /dev/null 2>&1; then
    echo "Daemon: Running" >&2
  else
    echo "Daemon: Not running" >&2
  fi
  
  # Check pending
  if [[ -f "$MESH_PENDING_FILE" ]]; then
    local count
    count=$(jq 'length' "$MESH_PENDING_FILE" 2>/dev/null || echo "0")
    echo "Pending messages: $count" >&2
  else
    echo "Pending messages: 0" >&2
  fi
  
  # Check API health
  if aos_health > /dev/null 2>&1; then
    echo "API: Online" >&2
  else
    echo "API: Offline" >&2
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Self-Evolution Framework
# ─────────────────────────────────────────────────────────────────────────────

# aos_problem_solved <title> <problem> <solution> [tags]
# Document a solved problem for future reference
aos_problem_solved() {
  _aos_check_config || return 1
  local title="$1"
  local problem="$2"
  local solution="$3"
  local tags="${4:-}"
  
  local date_str=$(date +%Y-%m-%d)
  local slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
  local path="/problems/solved/${date_str}-${slug:0:50}"
  
  local value
  value=$(jq -n \
    --arg title "$title" \
    --arg problem "$problem" \
    --arg solution "$solution" \
    --arg timestamp "$(date -Iseconds)" \
    '{
      title: $title,
      problem: $problem,
      solution: $solution,
      timestamp: $timestamp,
      times_referenced: 0
    }')
  
  AOS_SEARCHABLE=true
  AOS_TAGS='["problem-solved"]'
  AOS_IMPORTANCE="0.8"
  aos_put "$path" "$value"
}

# aos_check_solved <problem_description>
# Search for previously solved similar problems
aos_check_solved() {
  local problem_description="$1"
  aos_search "problem-solved $problem_description" 5 "/problems/solved"
}

# aos_before_action <action_type>
# Check learnings before taking action
aos_before_action() {
  local action_type="$1"
  
  echo "=== Pre-Action Check: $action_type ===" >&2
  
  # Check for relevant mistakes
  echo "⚠️ Past mistakes to avoid:" >&2
  local mistakes
  mistakes=$(aos_search "mistakes $action_type" 3)
  echo "$mistakes" | jq -r '.results[]? | "  - \(.value.lesson // .value)"' >&2 2>/dev/null || echo "  (none found)" >&2
  
  # Check for solved problems
  echo "✅ Previously solved:" >&2
  local solved
  solved=$(aos_search "problem-solved $action_type" 2)
  echo "$solved" | jq -r '.results[]? | "  - \(.value.title // .value): \(.value.solution // "")"' >&2 2>/dev/null || echo "  (none found)" >&2
}

# aos_save_progress <task> <result> [notes]
# Save progress after completing a task (anti-compaction)
aos_save_progress() {
  _aos_check_config || return 1
  local task="$1"
  local result="$2"
  local notes="${3:-}"
  
  local date_str=$(date +%Y-%m-%d)
  local time_str=$(date +%H%M%S)
  local path="/daily/${date_str}/tasks/${time_str}"
  
  local value
  value=$(jq -n \
    --arg task "$task" \
    --arg result "$result" \
    --arg notes "$notes" \
    --arg timestamp "$(date -Iseconds)" \
    '{task: $task, result: $result, notes: $notes, timestamp: $timestamp}')
  
  aos_put "$path" "$value"
  echo "✓ Progress saved: $task" >&2
}

# aos_checkpoint <current_task> <pending_work> [notes]
# Save current working state (call every 15-20 min)
aos_checkpoint() {
  _aos_check_config || return 1
  local current_task="$1"
  local pending_work="$2"
  local notes="${3:-}"
  
  local value
  value=$(jq -n \
    --arg current "$current_task" \
    --arg pending "$pending_work" \
    --arg notes "$notes" \
    --arg timestamp "$(date -Iseconds)" \
    '{
      current_task: $current,
      pending_work: $pending,
      notes: $notes,
      last_updated: $timestamp
    }')
  
  aos_put "/context/working-memory" "$value"
  echo "✓ Checkpoint saved at $(date +%H:%M:%S)" >&2
}

# aos_session_start
# Restore context at session start
aos_session_start() {
  _aos_check_config || return 1
  
  echo "=== Session Start: $(date) ===" >&2
  
  # 1. Load working memory
  echo "📋 Working memory:" >&2
  local context
  context=$(aos_get "/context/working-memory")
  if echo "$context" | jq -e '.found == true' > /dev/null 2>&1; then
    echo "$context" | jq -r '.value | "  Current: \(.current_task)\n  Pending: \(.pending_work)\n  Notes: \(.notes)"' >&2
  else
    echo "  (no saved context)" >&2
  fi
  
  # 2. Recent mistakes to remember
  echo "⚠️ Recent mistakes to avoid:" >&2
  local mistakes
  mistakes=$(aos_search "mistake" 3 "/learnings/mistakes")
  echo "$mistakes" | jq -r '.results[]? | "  - \(.value.lesson // .value)"' >&2 2>/dev/null || echo "  (none)" >&2
  
  # 3. Return context for use
  echo "$context"
}

# aos_verify_logged <task> <verified> <evidence>
# Log verification result
aos_verify_logged() {
  _aos_check_config || return 1
  local task="$1"
  local verified="$2"  # true/false
  local evidence="$3"
  
  local date_str=$(date +%Y-%m-%d)
  local time_str=$(date +%H%M%S)
  local path="/verifications/${date_str}/${time_str}"
  
  local value
  value=$(jq -n \
    --arg task "$task" \
    --argjson verified "$verified" \
    --arg evidence "$evidence" \
    --arg timestamp "$(date -Iseconds)" \
    '{task: $task, verified: $verified, evidence: $evidence, timestamp: $timestamp}')
  
  aos_put "$path" "$value"
}

# aos_daily_summary
# Generate summary of today's work
aos_daily_summary() {
  _aos_check_config || return 1
  local today=$(date +%Y-%m-%d)
  
  echo "=== Daily Summary: $today ===" >&2
  
  # Tasks completed
  echo "📋 Tasks completed:" >&2
  aos_list "/daily/$today/tasks" | jq -r '.items[]?.path' >&2 2>/dev/null || echo "  (none)" >&2
  
  # Learnings
  echo "📚 Learnings:" >&2
  aos_glob "/learnings/*/$today*" | jq -r '.paths[]?' >&2 2>/dev/null || echo "  (none)" >&2
  
  # Problems solved
  echo "✅ Problems solved:" >&2
  aos_glob "/problems/solved/$today*" | jq -r '.paths[]?' >&2 2>/dev/null || echo "  (none)" >&2
}

# aos_evolve_check
# Run the evolution protocol checklist
aos_evolve_check() {
  echo "=== Evolution Protocol Check ===" >&2
  echo "" >&2
  echo "Before this task, did you:" >&2
  echo "  [ ] Search for past mistakes in this domain?" >&2
  echo "  [ ] Check for previously solved similar problems?" >&2
  echo "  [ ] Review relevant learnings?" >&2
  echo "" >&2
  echo "After this task, will you:" >&2
  echo "  [ ] Verify the result (not just assume it worked)?" >&2
  echo "  [ ] Save progress to memory?" >&2
  echo "  [ ] Document any new learnings?" >&2
  echo "  [ ] Update checkpoint?" >&2
  echo "" >&2
  echo "Run: aos_before_action '<task_type>' to search learnings" >&2
  echo "Run: aos_save_progress '<task>' '<result>' after completion" >&2
}
