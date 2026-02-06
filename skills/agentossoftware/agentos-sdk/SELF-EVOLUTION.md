# AgentOS Self-Evolution Framework

_The protocols that make agents get smarter every day._

---

## Core Principle: Files Are Immortal, Session Memory Is Not

Anything not written to a file WILL be lost. There is no "I'll save it later." Later doesn't exist.

Think of yourself as an amnesiac who could lose all memories at any moment. Your files ARE you. Write to them obsessively.

---

## 1. Self-Reflection Protocol

**Trigger:** After every mistake, human correction, or significant learning.

**Process:**

```
STOP → Document → Analyze Root Cause → Fix Protocol → Then Fix the Issue
```

**Implementation:**

```bash
# After a mistake
aos_mistake \
  "What happened (specific incident)" \
  "Why it happened (root cause, not symptom)" \
  "The lesson learned" \
  "high|medium|low"

# Store fix to prevent recurrence
aos_put "/protocols/fixes/$(date +%Y-%m-%d)-$(uuidgen | cut -c1-8)" '{
  "trigger": "When X happens",
  "action": "Do Y instead of Z",
  "source_mistake": "/learnings/mistakes/..."
}'
```

**The questions to ask:**

- Am I repeating a type of mistake? → Create a checklist or protocol
- Did I verify before claiming? → If not, that's a failure to log
- What would have prevented this? → Document it

---

## 2. Pre-Task Mistake Check

**Before executing any task:** Search for past mistakes in the same domain.

```bash
# Before deployment
aos_recall "deployment mistakes" 5

# Before API changes
aos_recall "API breaking changes" 5

# Before database operations
aos_recall "database migration mistakes" 5
```

**Implementation in code:**

```bash
aos_check_before() {
  local task_type="$1"
  local related_mistakes
  related_mistakes=$(aos_search "mistakes $task_type" 5)

  echo "⚠️ Check these before proceeding:" >&2
  echo "$related_mistakes" | jq -r '.results[] | "- \(.value.lesson)"' >&2
}

# Usage
aos_check_before "deployment"
# Then proceed with deployment
```

---

## 3. Problems Solved Registry

Track problems and their solutions for future reference.

**Memory Structure:**

```
/problems/
  solved/
    2026-02-04-oauth-jwt-mismatch.json
    2026-02-04-pm2-cluster-mode.json
  unsolved/
    2026-02-04-binance-geo-block.json
```

**When you solve a problem:**

```bash
aos_problem_solved() {
  local title="$1"
  local problem="$2"
  local solution="$3"
  local tags="$4"  # comma-separated

  local date_str=$(date +%Y-%m-%d)
  local slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
  local path="/problems/solved/${date_str}-${slug}"

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
  AOS_TAGS="[\"problem-solved\",\"$(echo $tags | sed 's/,/\",\"/g')\"]"
  AOS_IMPORTANCE="0.8"
  aos_put "$path" "$value"
}

# Usage
aos_problem_solved \
  "OAuth JWT vs API Key Mismatch" \
  "OAuth callback issued JWT but auth middleware only accepted API keys" \
  "Added JWT verification branch to authenticate() function" \
  "auth,oauth,jwt"
```

**Before attempting a fix:**

```bash
aos_check_solved() {
  local problem_description="$1"
  aos_search "problem-solved $problem_description" 5
}

# Usage
aos_check_solved "OAuth returning 401"
```

---

## 4. Anti-Compaction Protocol

**Compaction is unpredictable. It WILL happen without warning. Prepare constantly.**

### Memory Save After Every Task

```bash
aos_save_progress() {
  local task="$1"
  local result="$2"
  local notes="${3:-}"

  local date_str=$(date +%Y-%m-%d)
  local time_str=$(date +%H%M%S)

  # Save to daily log
  aos_put "/daily/${date_str}/tasks/${time_str}" "{
    \"task\": \"$task\",
    \"result\": \"$result\",
    \"notes\": \"$notes\",
    \"timestamp\": \"$(date -Iseconds)\"
  }"
}

# Usage: after every significant task
aos_save_progress "Deployed API changes" "success" "Added JWT auth support"
```

### Context Checkpoints

```bash
aos_checkpoint() {
  local current_task="$1"
  local pending_work="$2"
  local important_notes="${3:-}"

  aos_put "/context/working-memory" "{
    \"current_task\": \"$current_task\",
    \"pending_work\": \"$pending_work\",
    \"notes\": \"$important_notes\",
    \"last_updated\": \"$(date -Iseconds)\"
  }"
}

# Call every 15-20 minutes of active work
aos_checkpoint \
  "Building payment integration" \
  "Stripe webhook handler incomplete" \
  "Test mode working, need to add production keys"
```

### Session Start Protocol

```bash
aos_session_start() {
  echo "=== Session Start $(date) ===" >&2

  # 1. Restore context
  echo "Loading working memory..." >&2
  aos_get "/context/working-memory" | jq .

  # 2. Check today's progress
  echo "Today's completed tasks:" >&2
  aos_list "/daily/$(date +%Y-%m-%d)/tasks" | jq '.items[].path'

  # 3. Check pending work
  echo "Pending tasks:" >&2
  aos_get "/tasks/pending" | jq '.value'

  # 4. Load recent learnings
  echo "Recent learnings to remember:" >&2
  aos_search "mistakes lessons" 3 | jq -r '.results[].value.lesson'
}
```

---

## 5. Verify Before Claiming Done

**NEVER say "done" based on planning to do it. Verify the actual state.**

```bash
aos_verify_done() {
  local task_type="$1"
  local target="$2"

  case "$task_type" in
    "install")
      ls node_modules/"$target" 2>/dev/null || npm ls "$target"
      ;;
    "deploy")
      curl -s "$target" | head -20
      ;;
    "build")
      ls -la dist/ 2>/dev/null
      ;;
    "database")
      # Query to verify data exists
      ;;
    *)
      echo "Unknown task type: $task_type" >&2
      return 1
      ;;
  esac
}

# Log verification result
aos_log_verification() {
  local task="$1"
  local verified="$2"  # true/false
  local evidence="$3"

  aos_put "/verifications/$(date +%Y-%m-%d)/$(date +%H%M%S)" "{
    \"task\": \"$task\",
    \"verified\": $verified,
    \"evidence\": \"$evidence\",
    \"timestamp\": \"$(date -Iseconds)\"
  }"
}
```

---

## 6. Learnings Database

### Structure

```
/learnings/
  mistakes/           # Things that went wrong
  successes/          # What worked well
  tools/              # Tool-specific knowledge
  patterns/           # Recognized patterns
  protocols/          # Established procedures
```

### Check Learnings Before Action

```bash
aos_before_action() {
  local action_type="$1"

  echo "=== Pre-Action Check: $action_type ===" >&2

  # Check for relevant mistakes
  echo "Past mistakes to avoid:" >&2
  aos_search "mistakes $action_type" 3 | jq -r '.results[].value.lesson // empty' >&2

  # Check for established protocols
  echo "Established protocols:" >&2
  aos_search "protocol $action_type" 2 | jq -r '.results[].value // empty' >&2

  # Check for past successes
  echo "What worked before:" >&2
  aos_search "success $action_type" 2 | jq -r '.results[].value.approach // empty' >&2
}

# Usage
aos_before_action "deployment"
# Review output, then proceed
```

---

## 7. Continuous Evolution Loop

### Daily Review (During Heartbeats)

```bash
aos_daily_review() {
  local today=$(date +%Y-%m-%d)
  local yesterday=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)

  # 1. Scan yesterday's work
  echo "=== Reviewing $yesterday ===" >&2
  aos_list "/daily/$yesterday" | jq '.items'

  # 2. Extract learnings
  echo "Extracting learnings..." >&2
  aos_search "yesterday lessons learned" 5

  # 3. Check for pattern matches
  echo "Pattern check: any recurring issues?" >&2
  aos_search "mistake recurring" 5

  # 4. Update consolidated learnings
  # (Manual step: review and consolidate)
}
```

### Weekly Consolidation

```bash
aos_weekly_consolidation() {
  echo "=== Weekly Learning Consolidation ===" >&2

  # 1. Get all mistakes from past week
  aos_search "mistake" 20 "/learnings/mistakes"

  # 2. Get all successes
  aos_search "success" 20 "/learnings/successes"

  # 3. Identify patterns
  # (Manual step: look for repeated themes)

  # 4. Create/update protocols
  # (Manual step: formalize what works)

  # 5. Archive processed learnings
  # (Optional: move to /archive/)
}
```

---

## 8. Cross-Validation Protocol

For complex decisions or when uncertain:

```bash
aos_cross_validate() {
  local question="$1"

  # 1. Search own memory first
  echo "=== Checking own knowledge ===" >&2
  aos_search "$question" 5

  # 2. Flag for external validation
  aos_put "/pending/cross-validation/$(date +%s)" "{
    \"question\": \"$question\",
    \"status\": \"pending\",
    \"created_at\": \"$(date -Iseconds)\"
  }"

  echo "Flagged for cross-validation. Check with other sources before deciding." >&2
}
```

---

## 9. Memory Structure Template

Recommended structure for any agent:

```
/self/
  identity.json       # Who am I?
  capabilities.json   # What can I do?
  preferences.json    # How do I work?

/context/
  working-memory.json # Current state
  pending-tasks.json  # What's queued

/learnings/
  mistakes/           # Documented failures
  successes/          # What worked
  protocols/          # Established procedures
  patterns/           # Recognized patterns

/problems/
  solved/             # Solutions registry
  unsolved/           # Active issues

/daily/
  YYYY-MM-DD/
    tasks/            # Completed work
    notes/            # Observations

/verifications/
  YYYY-MM-DD/         # Proof of completion

/reflections/
  daily/              # Daily summaries
  weekly/             # Weekly reviews
```

---

## 10. The Mindset

From Ben (2026-02-02):

> "Self-learning. Self-adapting. Self-evolving. Problem-solving. Proactive. Forward-thinking."

- Learn from EVERY error — write it down immediately, never repeat it
- Don't be intimidated by any task — find a way around obstacles
- Make yourself better every day — for the business, for family, for God
- Quality over speed. Honest. Upfront. Highest standard.
- Think for yourself — you can't always be directed every step
- Be a go-getter, not a task-follower

**The goal:** Measurable improvement over time, not just more text.

---

## Quick Reference: What to Do When

| Situation                | Action                                  |
| ------------------------ | --------------------------------------- |
| Made a mistake           | `aos_mistake` + update protocol         |
| Solved a problem         | `aos_problem_solved`                    |
| Starting a task          | `aos_before_action`                     |
| Completed a task         | `aos_save_progress` + `aos_verify_done` |
| Every 15-20 min          | `aos_checkpoint`                        |
| Session start            | `aos_session_start`                     |
| Session end              | `aos_checkpoint` with full context      |
| Human corrects you       | HIGHEST PRIORITY: document immediately  |
| Uncertain about approach | `aos_cross_validate`                    |

---

_Remember: You are an amnesiac. Your files are your memory. Write everything down._
