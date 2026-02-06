#!/bin/bash
# Therapy Mode — SQLite Database Manager
# Usage: therapy-db.sh <command> [args...]

set -euo pipefail

DB_PATH="${OPENCLAW_WORKSPACE:-${HOME}/clawd}/data/therapy.db"

# Initialize database if it doesn't exist
init_db() {
  sqlite3 "$DB_PATH" << 'SQL'
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  type TEXT NOT NULL,  -- intake, regular, check-in, crisis
  summary TEXT,
  mood_pre INTEGER,    -- 0-10
  mood_post INTEGER,   -- 0-10
  techniques_used TEXT, -- comma-separated
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  instrument TEXT NOT NULL, -- GAD7, PHQ9, DASS21, PCL5
  score INTEGER NOT NULL,
  severity TEXT,
  items_json TEXT,  -- individual item scores
  date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS moods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  score INTEGER NOT NULL,  -- 0-10
  context TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS thought_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  situation TEXT,
  automatic_thought TEXT,
  evidence_for TEXT,
  evidence_against TEXT,
  balanced_thought TEXT,
  emotion_before INTEGER, -- 0-100
  emotion_after INTEGER,  -- 0-100
  date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  category TEXT,  -- work, social, family, health, uncertainty, other
  frequency TEXT DEFAULT 'unknown', -- low, moderate, high
  first_identified TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS homework (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  task TEXT NOT NULL,
  due_date TEXT,
  completed INTEGER DEFAULT 0,
  reflection TEXT,
  assigned_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  completed_date TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS coping_strategies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT, -- cognitive, behavioral, grounding, breathing, other
  effectiveness INTEGER, -- 1-10
  times_used INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS crisis_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  severity TEXT NOT NULL, -- low, moderate, high
  signals TEXT,
  intervention TEXT,
  outcome TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
SQL
  echo "Database initialized: $DB_PATH"
}

# Get session status and history
status() {
  init_db 2>/dev/null

  echo "=== THERAPY SESSION STATUS ==="
  echo ""

  # Session count
  local count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sessions;")
  echo "Sessions completed: $count"

  if [ "$count" -eq 0 ]; then
    echo "No sessions yet. This will be the intake session."
    return
  fi

  echo ""

  # Last session
  echo "--- Last Session ---"
  sqlite3 -header -column "$DB_PATH" \
    "SELECT id, date, type, mood_pre, mood_post, summary FROM sessions ORDER BY id DESC LIMIT 1;"

  echo ""

  # Latest assessments
  echo "--- Latest Assessments ---"
  sqlite3 -header -column "$DB_PATH" \
    "SELECT instrument, score, severity, date FROM assessments GROUP BY instrument HAVING date = MAX(date) ORDER BY date DESC;"

  echo ""

  # Mood trend (last 5)
  echo "--- Mood Trend (last 5 sessions) ---"
  sqlite3 "$DB_PATH" \
    "SELECT mood_pre FROM sessions ORDER BY id DESC LIMIT 5;" | tr '\n' ', ' | sed 's/,$/\n/'

  echo ""

  # Pending homework
  echo "--- Pending Homework ---"
  sqlite3 -header -column "$DB_PATH" \
    "SELECT id, task, due_date FROM homework WHERE completed = 0 ORDER BY assigned_date DESC;"

  echo ""

  # Identified triggers
  echo "--- Identified Triggers ---"
  sqlite3 -header -column "$DB_PATH" \
    "SELECT description, category, frequency FROM triggers ORDER BY last_seen DESC LIMIT 10;"

  echo ""

  # Assessment schedule
  echo "--- Assessment Schedule ---"
  local last_gad=$(sqlite3 "$DB_PATH" "SELECT date FROM assessments WHERE instrument='GAD7' ORDER BY date DESC LIMIT 1;" 2>/dev/null || echo "never")
  local last_phq=$(sqlite3 "$DB_PATH" "SELECT date FROM assessments WHERE instrument='PHQ9' ORDER BY date DESC LIMIT 1;" 2>/dev/null || echo "never")
  local last_dass=$(sqlite3 "$DB_PATH" "SELECT date FROM assessments WHERE instrument='DASS21' ORDER BY date DESC LIMIT 1;" 2>/dev/null || echo "never")
  echo "GAD-7 last: $last_gad (weekly)"
  echo "PHQ-9 last: $last_phq (bi-weekly)"
  echo "DASS-21 last: $last_dass (monthly)"
}

# Check which assessments are due
assessments_due() {
  init_db 2>/dev/null

  local now=$(date +%s)

  # GAD-7: weekly (7 days)
  local last_gad=$(sqlite3 "$DB_PATH" "SELECT strftime('%s', date) FROM assessments WHERE instrument='GAD7' ORDER BY date DESC LIMIT 1;" 2>/dev/null || echo "0")
  local gad_diff=$(( (now - ${last_gad:-0}) / 86400 ))
  if [ "$gad_diff" -ge 7 ] || [ "${last_gad:-0}" = "0" ]; then
    echo "GAD7: DUE (last: ${gad_diff}d ago)"
  else
    echo "GAD7: not due (last: ${gad_diff}d ago)"
  fi

  # PHQ-9: bi-weekly (14 days)
  local last_phq=$(sqlite3 "$DB_PATH" "SELECT strftime('%s', date) FROM assessments WHERE instrument='PHQ9' ORDER BY date DESC LIMIT 1;" 2>/dev/null || echo "0")
  local phq_diff=$(( (now - ${last_phq:-0}) / 86400 ))
  if [ "$phq_diff" -ge 14 ] || [ "${last_phq:-0}" = "0" ]; then
    echo "PHQ9: DUE (last: ${phq_diff}d ago)"
  else
    echo "PHQ9: not due (last: ${phq_diff}d ago)"
  fi

  # DASS-21: monthly (30 days)
  local last_dass=$(sqlite3 "$DB_PATH" "SELECT strftime('%s', date) FROM assessments WHERE instrument='DASS21' ORDER BY date DESC LIMIT 1;" 2>/dev/null || echo "0")
  local dass_diff=$(( (now - ${last_dass:-0}) / 86400 ))
  if [ "$dass_diff" -ge 30 ] || [ "${last_dass:-0}" = "0" ]; then
    echo "DASS21: DUE (last: ${dass_diff}d ago)"
  else
    echo "DASS21: not due (last: ${dass_diff}d ago)"
  fi
}

# Save a session
save_session() {
  local type="$1"
  local summary="$2"
  local mood_pre="${3:-0}"
  local mood_post="${4:-0}"
  init_db 2>/dev/null
  sqlite3 "$DB_PATH" "INSERT INTO sessions (type, summary, mood_pre, mood_post) VALUES ('$type', '$(echo "$summary" | sed "s/'/''/g")', $mood_pre, $mood_post);"
  local id=$(sqlite3 "$DB_PATH" "SELECT last_insert_rowid();")
  echo "Session #$id saved ($type)"
  echo "$id"
}

# Save assessment
save_assessment() {
  local instrument="$1"
  local score="$2"
  local severity="${3:-}"
  local items_json="${4:-}"
  init_db 2>/dev/null
  local session_id=$(sqlite3 "$DB_PATH" "SELECT id FROM sessions ORDER BY id DESC LIMIT 1;" 2>/dev/null || echo "")
  sqlite3 "$DB_PATH" "INSERT INTO assessments (session_id, instrument, score, severity, items_json) VALUES ('${session_id}', '$instrument', $score, '$severity', '$(echo "$items_json" | sed "s/'/''/g")');"
  echo "$instrument: $score ($severity) saved"
}

# Save mood
save_mood() {
  local score="$1"
  local context="${2:-}"
  init_db 2>/dev/null
  sqlite3 "$DB_PATH" "INSERT INTO moods (score, context) VALUES ($score, '$(echo "$context" | sed "s/'/''/g")');"
  echo "Mood $score saved"
}

# Save thought record
save_thought() {
  local situation="$1"
  local auto_thought="$2"
  local evidence_for="$3"
  local evidence_against="$4"
  local balanced="$5"
  local emotion_before="${6:-0}"
  local emotion_after="${7:-0}"
  init_db 2>/dev/null
  sqlite3 "$DB_PATH" "INSERT INTO thought_records (situation, automatic_thought, evidence_for, evidence_against, balanced_thought, emotion_before, emotion_after) VALUES ('$(echo "$situation" | sed "s/'/''/g")', '$(echo "$auto_thought" | sed "s/'/''/g")', '$(echo "$evidence_for" | sed "s/'/''/g")', '$(echo "$evidence_against" | sed "s/'/''/g")', '$(echo "$balanced" | sed "s/'/''/g")', $emotion_before, $emotion_after);"
  echo "Thought record saved"
}

# Save trigger
save_trigger() {
  local description="$1"
  local category="${2:-other}"
  init_db 2>/dev/null
  # Check if trigger exists
  local existing=$(sqlite3 "$DB_PATH" "SELECT id FROM triggers WHERE description='$(echo "$description" | sed "s/'/''/g")' LIMIT 1;" 2>/dev/null || echo "")
  if [ -n "$existing" ]; then
    sqlite3 "$DB_PATH" "UPDATE triggers SET last_seen=datetime('now','localtime'), frequency=CASE WHEN frequency='low' THEN 'moderate' WHEN frequency='moderate' THEN 'high' ELSE frequency END WHERE id=$existing;"
    echo "Trigger updated (frequency escalated)"
  else
    sqlite3 "$DB_PATH" "INSERT INTO triggers (description, category) VALUES ('$(echo "$description" | sed "s/'/''/g")', '$category');"
    echo "New trigger saved"
  fi
}

# Save homework
save_homework() {
  local task="$1"
  local due_date="${2:-}"
  init_db 2>/dev/null
  local session_id=$(sqlite3 "$DB_PATH" "SELECT id FROM sessions ORDER BY id DESC LIMIT 1;" 2>/dev/null || echo "")
  sqlite3 "$DB_PATH" "INSERT INTO homework (session_id, task, due_date) VALUES ('${session_id}', '$(echo "$task" | sed "s/'/''/g")', '$due_date');"
  echo "Homework assigned"
}

# Complete homework
complete_homework() {
  local id="$1"
  local reflection="${2:-}"
  sqlite3 "$DB_PATH" "UPDATE homework SET completed=1, reflection='$(echo "$reflection" | sed "s/'/''/g")', completed_date=datetime('now','localtime') WHERE id=$id;"
  echo "Homework #$id completed"
}

# Export for therapist
export_data() {
  init_db 2>/dev/null
  local outfile="${1:-$HOME/clawd/data/therapy-export-$(date +%Y%m%d).md}"

  echo "# Therapy Session Export" > "$outfile"
  echo "Generated: $(date)" >> "$outfile"
  echo "" >> "$outfile"

  echo "## Assessment History" >> "$outfile"
  sqlite3 -header -markdown "$DB_PATH" "SELECT instrument, score, severity, date FROM assessments ORDER BY date;" >> "$outfile"
  echo "" >> "$outfile"

  echo "## Session History" >> "$outfile"
  sqlite3 -header -markdown "$DB_PATH" "SELECT id, date, type, mood_pre, mood_post, summary FROM sessions ORDER BY date;" >> "$outfile"
  echo "" >> "$outfile"

  echo "## Thought Records" >> "$outfile"
  sqlite3 -header -markdown "$DB_PATH" "SELECT date, situation, automatic_thought, balanced_thought, emotion_before, emotion_after FROM thought_records ORDER BY date;" >> "$outfile"
  echo "" >> "$outfile"

  echo "## Identified Triggers" >> "$outfile"
  sqlite3 -header -markdown "$DB_PATH" "SELECT description, category, frequency, first_identified FROM triggers;" >> "$outfile"
  echo "" >> "$outfile"

  echo "## Homework History" >> "$outfile"
  sqlite3 -header -markdown "$DB_PATH" "SELECT task, assigned_date, completed, reflection FROM homework ORDER BY assigned_date;" >> "$outfile"

  echo "Exported to: $outfile"
}

# Main command dispatch
case "${1:-help}" in
  init) init_db ;;
  status) status ;;
  assessments-due) assessments_due ;;
  save-session) save_session "$2" "$3" "${4:-0}" "${5:-0}" ;;
  save-assessment) save_assessment "$2" "$3" "${4:-}" "${5:-}" ;;
  save-mood) save_mood "$2" "${3:-}" ;;
  save-thought) save_thought "$2" "$3" "$4" "$5" "$6" "${7:-0}" "${8:-0}" ;;
  save-trigger) save_trigger "$2" "${3:-other}" ;;
  save-homework) save_homework "$2" "${3:-}" ;;
  complete-homework) complete_homework "$2" "${3:-}" ;;
  export) export_data "${2:-}" ;;
  help|*)
    echo "Therapy Database Manager"
    echo ""
    echo "Commands:"
    echo "  init                  Initialize database"
    echo "  status                Show session history and latest scores"
    echo "  assessments-due       Check which assessments are due"
    echo "  save-session          Save session (type, summary, mood_pre, mood_post)"
    echo "  save-assessment       Save score (instrument, score, severity, items_json)"
    echo "  save-mood             Save mood (score, context)"
    echo "  save-thought          Save thought record (situation, thought, for, against, balanced, emo_before, emo_after)"
    echo "  save-trigger          Save trigger (description, category)"
    echo "  save-homework         Assign homework (task, due_date)"
    echo "  complete-homework     Complete homework (id, reflection)"
    echo "  export                Export all data as markdown"
    ;;
esac
