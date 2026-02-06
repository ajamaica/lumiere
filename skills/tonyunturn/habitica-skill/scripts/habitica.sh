#!/usr/bin/env bash
set -euo pipefail

# Habitica API CLI - Full Featured
# Usage: habitica.sh <command> [args...]

BASE_URL="https://habitica.com/api/v3"
CONFIG_FILE="${HABITICA_CONFIG:-$HOME/.habitica}"

# Load credentials
load_creds() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
    fi
    
    if [[ -z "${HABITICA_USER_ID:-}" ]] || [[ -z "${HABITICA_API_TOKEN:-}" ]]; then
        echo "Error: Habitica credentials not found." >&2
        echo "Set HABITICA_USER_ID and HABITICA_API_TOKEN in $CONFIG_FILE or environment." >&2
        exit 1
    fi
}

# Make API request
api_request() {
    local method="$1"
    local endpoint="$2"
    shift 2
    local data="${1:-}"
    
    local args=(
        -s -X "$method"
        -H "x-api-user: $HABITICA_USER_ID"
        -H "x-api-key: $HABITICA_API_TOKEN"
        -H "x-client: $HABITICA_USER_ID-clawdbot"
        -H "Content-Type: application/json"
    )
    
    if [[ -n "$data" ]]; then
        args+=(-d "$data")
    fi
    
    curl "${args[@]}" "${BASE_URL}${endpoint}"
}

# ===== FORMATTERS =====

format_tasks() {
    jq -r '.data[] | "[\(.type)] \(.id)\n  \(.text)\(.notes | if . and . != "" then "\n  Notes: \(.)" else "" end)\(.value | if . then " (value: \(. | tonumber | floor))" else "" end)"'
}

format_task() {
    jq -r '.data | "[\(.type)] \(.id)\n  \(.text)\(.notes | if . and . != "" then "\n  Notes: \(.)" else "" end)"'
}

format_user() {
    jq -r '.data | "User: \(.profile.name)\nClass: \(.stats.class)\nLevel: \(.stats.lvl)\nHP: \(.stats.hp | floor)/\(.stats.maxHealth)\nMP: \(.stats.mp | floor)/\(.stats.maxMP)\nXP: \(.stats.exp | floor)/\(.stats.toNextLevel)\nGold: \(.stats.gp | floor)"'
}

format_user_full() {
    jq -r '.data | "═══ \(.profile.name) ═══\nClass: \(.stats.class | ascii_upcase) | Level \(.stats.lvl)\n\n❤️  HP: \(.stats.hp | floor)/\(.stats.maxHealth)\n⚡ MP: \(.stats.mp | floor)/\(.stats.maxMP)\n✨ XP: \(.stats.exp | floor)/\(.stats.toNextLevel)\n💰 Gold: \(.stats.gp | floor)\n💎 Gems: \((.balance // 0) * 4 | floor)\n\nSTR: \(.stats.str) | INT: \(.stats.int) | CON: \(.stats.con) | PER: \(.stats.per)"'
}

format_pets() {
    jq -r '.data.items.pets | to_entries | map(select(.value > 0)) | .[] | "\(.key): \(.value)"'
}

format_mounts() {
    jq -r '.data.items.mounts | to_entries | map(select(.value == true)) | .[].key'
}

format_achievements() {
    jq -r '.data.achievements | to_entries | map(select(.value != null and .value != false and .value != 0)) | .[] | "\(.key): \(.value)"'
}

format_party() {
    jq -r '.data | "═══ Party: \(.name) ═══\nMembers: \(.memberCount)\n\nQuest: \(.quest.key // "None active")\(.quest.progress.hp | if . then "\nBoss HP: \(. | floor)" else "" end)\n\n--- Recent Chat ---" , (.chat[:5][] | "[\(.user // "system")]: \(.unformattedText[:100])")'
}

format_challenges() {
    jq -r '.data[] | "\(.id)\n  \(.name) (\(.memberCount) members)"'
}

# ===== TASK COMMANDS =====

cmd_list() {
    local type="${1:-all}"
    
    case "$type" in
        habits|dailys|todos|rewards)
            api_request GET "/tasks/user?type=$type" | format_tasks
            ;;
        completedTodos)
            api_request GET "/tasks/user?type=completedTodos" | format_tasks
            ;;
        all)
            api_request GET "/tasks/user" | format_tasks
            ;;
        *)
            echo "Unknown type: $type" >&2
            echo "Valid types: habits, dailys, todos, rewards, completedTodos, all" >&2
            exit 1
            ;;
    esac
}

cmd_create() {
    local type="$1"
    local text="$2"
    local notes="${3:-}"
    
    if [[ -z "$type" ]] || [[ -z "$text" ]]; then
        echo "Usage: habitica.sh create <type> \"text\" [\"notes\"]" >&2
        exit 1
    fi
    
    local payload
    payload=$(jq -n \
        --arg type "$type" \
        --arg text "$text" \
        --arg notes "$notes" \
        '{type: $type, text: $text, notes: $notes}')
    
    api_request POST "/tasks/user" "$payload" | format_task
    echo "✅ Task created!"
}

cmd_score() {
    local task_id="$1"
    local direction="${2:-up}"
    
    if [[ -z "$task_id" ]]; then
        echo "Usage: habitica.sh score <task-id> [up|down]" >&2
        exit 1
    fi
    
    local result
    result=$(api_request POST "/tasks/$task_id/score/$direction")
    
    local delta hp exp gp lvl
    delta=$(echo "$result" | jq -r '.data.delta // 0')
    hp=$(echo "$result" | jq -r '.data.hp // 0 | floor')
    exp=$(echo "$result" | jq -r '.data.exp // 0 | floor')
    gp=$(echo "$result" | jq -r '.data.gp // 0 | floor')
    lvl=$(echo "$result" | jq -r '.data.lvl // 0')
    
    echo "✅ Scored $direction! Delta: $delta"
    echo "Stats: Lv$lvl | HP=$hp | XP=$exp | Gold=$gp"
}

cmd_delete() {
    local task_id="$1"
    
    if [[ -z "$task_id" ]]; then
        echo "Usage: habitica.sh delete <task-id>" >&2
        exit 1
    fi
    
    api_request DELETE "/tasks/$task_id" | jq -r '.message // "Task deleted"'
}

cmd_update() {
    local task_id="$1"
    shift
    
    if [[ -z "$task_id" ]]; then
        echo "Usage: habitica.sh update <task-id> [--text \"new text\"] [--notes \"new notes\"]" >&2
        exit 1
    fi
    
    local text="" notes="" priority=""
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --text) text="$2"; shift 2 ;;
            --notes) notes="$2"; shift 2 ;;
            --priority) priority="$2"; shift 2 ;;
            *) echo "Unknown option: $1" >&2; exit 1 ;;
        esac
    done
    
    local payload="{}"
    [[ -n "$text" ]] && payload=$(echo "$payload" | jq --arg t "$text" '. + {text: $t}')
    [[ -n "$notes" ]] && payload=$(echo "$payload" | jq --arg n "$notes" '. + {notes: $n}')
    [[ -n "$priority" ]] && payload=$(echo "$payload" | jq --arg p "$priority" '. + {priority: ($p | tonumber)}')
    
    api_request PUT "/tasks/$task_id" "$payload" | format_task
    echo "✅ Task updated!"
}

# ===== USER COMMANDS =====

cmd_user() {
    local verbose="${1:-}"
    if [[ "$verbose" == "-v" ]] || [[ "$verbose" == "--verbose" ]]; then
        api_request GET "/user" | format_user_full
    else
        api_request GET "/user" | format_user
    fi
}

cmd_stats() {
    api_request GET "/user" | format_user_full
}

# ===== COLLECTION COMMANDS =====

cmd_pets() {
    echo "═══ Your Pets ═══"
    local result
    result=$(api_request GET "/user")
    local current
    current=$(echo "$result" | jq -r '.data.items.currentPet // "None"')
    echo "Current Pet: $current"
    echo ""
    echo "$result" | format_pets | head -20
    local total
    total=$(echo "$result" | jq '[.data.items.pets | to_entries | map(select(.value > 0))] | .[0] | length')
    echo "... (Total: $total pets)"
}

cmd_mounts() {
    echo "═══ Your Mounts ═══"
    local result
    result=$(api_request GET "/user")
    local current
    current=$(echo "$result" | jq -r '.data.items.currentMount // "None"')
    echo "Current Mount: $current"
    echo ""
    echo "$result" | format_mounts | head -20
    local total
    total=$(echo "$result" | jq '[.data.items.mounts | to_entries | map(select(.value == true))] | .[0] | length')
    echo "... (Total: $total mounts)"
}

cmd_achievements() {
    echo "═══ Achievements ═══"
    api_request GET "/user" | format_achievements
}

cmd_inventory() {
    echo "═══ Inventory ═══"
    local result
    result=$(api_request GET "/user")
    
    echo "--- Eggs ---"
    echo "$result" | jq -r '.data.items.eggs | to_entries | map(select(.value > 0)) | .[] | "  \(.key): \(.value)"'
    
    echo ""
    echo "--- Hatching Potions ---"
    echo "$result" | jq -r '.data.items.hatchingPotions | to_entries | map(select(.value > 0)) | .[] | "  \(.key): \(.value)"'
    
    echo ""
    echo "--- Food ---"
    echo "$result" | jq -r '.data.items.food | to_entries | map(select(.value > 0)) | .[] | "  \(.key): \(.value)"'
    
    echo ""
    echo "--- Quest Scrolls ---"
    echo "$result" | jq -r '.data.items.quests | to_entries | map(select(.value > 0)) | .[] | "  \(.key): \(.value)"'
    
    echo ""
    echo "--- Special Items ---"
    echo "$result" | jq -r '.data.items.special | to_entries | map(select(.value > 0)) | .[] | "  \(.key): \(.value)"'
}

# ===== PARTY/SOCIAL COMMANDS =====

cmd_party() {
    api_request GET "/groups/party" | format_party
}

cmd_party_chat() {
    local limit="${1:-10}"
    api_request GET "/groups/party" | jq -r ".chat[:$limit][] | \"[\(.user // \"system\")]: \(.unformattedText)\""
}

cmd_party_send() {
    local message="$1"
    if [[ -z "$message" ]]; then
        echo "Usage: habitica.sh party-send \"message\"" >&2
        exit 1
    fi
    
    local payload
    payload=$(jq -n --arg msg "$message" '{message: $msg}')
    api_request POST "/groups/party/chat" "$payload" | jq -r '.message // "Message sent!"'
}

cmd_guilds() {
    echo "═══ Your Guilds ═══"
    api_request GET "/user" | jq -r '.data.guilds[]'
}

# ===== SKILLS COMMANDS =====

cmd_skills() {
    echo "═══ Available Skills ═══"
    local class
    class=$(api_request GET "/user" | jq -r '.data.stats.class')
    
    case "$class" in
        rogue)
            echo "Rogue Skills:"
            echo "  pickPocket    - Gain gold (self)"
            echo "  backStab      - Damage + gold (task)"
            echo "  toolsOfTrade  - Buff party perception"
            echo "  stealth       - Avoid damage (self)"
            ;;
        warrior)
            echo "Warrior Skills:"
            echo "  smash         - Damage task"
            echo "  defensiveStance - Buff constitution (self)"
            echo "  valorousPresence - Buff party strength"
            echo "  intimidate    - Buff party constitution"
            ;;
        wizard|mage)
            echo "Mage Skills:"
            echo "  fireball      - Damage + XP (task)"
            echo "  mpheal        - Restore party MP"
            echo "  earth         - Buff party intelligence"
            echo "  frost         - Streak freeze (self)"
            ;;
        healer)
            echo "Healer Skills:"
            echo "  heal          - Heal self"
            echo "  healAll       - Heal party"
            echo "  protectAura   - Buff party constitution"
            echo "  brightness    - Buff self intelligence"
            ;;
    esac
}

cmd_cast() {
    local skill="$1"
    local target="${2:-}"
    
    if [[ -z "$skill" ]]; then
        echo "Usage: habitica.sh cast <skill> [target-task-id]" >&2
        echo "Run 'habitica.sh skills' to see available skills." >&2
        exit 1
    fi
    
    local endpoint="/user/class/cast/$skill"
    if [[ -n "$target" ]]; then
        endpoint="$endpoint?targetId=$target"
    fi
    
    local result
    result=$(api_request POST "$endpoint")
    
    local success
    success=$(echo "$result" | jq -r '.success')
    
    if [[ "$success" == "true" ]]; then
        echo "✨ Cast $skill successfully!"
        echo "$result" | jq -r '.data.user.stats | "MP: \(.mp | floor)/\(.maxMP) | HP: \(.hp | floor)/\(.maxHealth)"'
    else
        echo "❌ Failed to cast skill"
        echo "$result" | jq -r '.message // .error // "Unknown error"'
    fi
}

# ===== QUEST COMMANDS =====

cmd_quest() {
    echo "═══ Current Quest ═══"
    api_request GET "/groups/party" | jq -r '.data.quest | if .key then "Quest: \(.key)\nProgress: \(.progress.hp // .progress.collect | if type == "number" then "\(. | floor) HP remaining" else "Collecting items" end)\nActive: \(.active)" else "No active quest" end'
}

cmd_quest_accept() {
    # Check for pending quest invitations (RSVPNeeded)
    local user_data
    user_data=$(api_request GET "/user")
    
    local rsvp_needed
    rsvp_needed=$(echo "$user_data" | jq -r '.data.party.quest.RSVPNeeded // false')
    
    if [[ "$rsvp_needed" == "true" ]]; then
        echo "📜 Found pending quest invitation. Accepting..."
        local result
        result=$(api_request POST "/groups/party/quest/accept")
        echo "$result" | jq -r '.message // "Quest accepted successfully!"'
    else
        echo "✅ No pending quest invitations."
    fi
}

# ===== HISTORY/STATS COMMANDS =====

cmd_history() {
    local type="${1:-exp}"
    echo "═══ History: $type ═══"
    api_request GET "/user" | jq -r ".data.history.$type | if . then .[-10:][] | \"\(.date | split(\"T\")[0]): \(.value | floor)\" else \"No history available\" end"
}

# ===== CRON =====

cmd_cron() {
    echo "Running daily cron (start new day)..."
    api_request POST "/cron" | jq -r '.message // "Cron executed"'
}

# ===== MAIN =====

main() {
    load_creds
    
    local cmd="${1:-help}"
    shift || true
    
    case "$cmd" in
        # Tasks
        list)       cmd_list "$@" ;;
        create)     cmd_create "$@" ;;
        score)      cmd_score "$@" ;;
        delete)     cmd_delete "$@" ;;
        update)     cmd_update "$@" ;;
        
        # User
        user)       cmd_user "$@" ;;
        stats)      cmd_stats "$@" ;;
        
        # Collections
        pets)       cmd_pets "$@" ;;
        mounts)     cmd_mounts "$@" ;;
        achievements) cmd_achievements "$@" ;;
        inventory)  cmd_inventory "$@" ;;
        
        # Party/Social
        party)      cmd_party "$@" ;;
        party-chat) cmd_party_chat "$@" ;;
        party-send) cmd_party_send "$@" ;;
        guilds)     cmd_guilds "$@" ;;
        
        # Skills
        skills)     cmd_skills "$@" ;;
        cast)       cmd_cast "$@" ;;
        
        # Quest
        quest)      cmd_quest "$@" ;;
        quest-accept) cmd_quest_accept "$@" ;;
        
        # History
        history)    cmd_history "$@" ;;
        
        # Cron
        cron)       cmd_cron "$@" ;;
        
        help|--help|-h)
            cat << 'EOF'
Habitica CLI - Full Featured

TASK COMMANDS:
  list [type]              List tasks (habits|dailys|todos|rewards|all)
  create <type> <text>     Create task (habit|daily|todo|reward)
  score <id> [up|down]     Score/complete a task
  update <id> [options]    Update task (--text, --notes)
  delete <id>              Delete task

USER COMMANDS:
  user [-v]                Show user stats (verbose with -v)
  stats                    Full stats display

COLLECTION COMMANDS:
  pets                     List your pets
  mounts                   List your mounts
  achievements             Show achievements
  inventory                Show eggs, potions, food, quests

PARTY/SOCIAL:
  party                    Party info + recent chat
  party-chat [limit]       Show party chat (default 10)
  party-send "message"     Send message to party
  guilds                   List your guilds

SKILLS:
  skills                   List available skills for your class
  cast <skill> [taskId]    Cast a skill

QUEST:
  quest                    Show current quest status
  quest-accept             Check and accept pending quest invitations

OTHER:
  history [exp|todos]      Show history
  cron                     Run daily cron

EOF
            ;;
        *)
            echo "Unknown command: $cmd" >&2
            echo "Run 'habitica.sh help' for usage." >&2
            exit 1
            ;;
    esac
}

main "$@"
