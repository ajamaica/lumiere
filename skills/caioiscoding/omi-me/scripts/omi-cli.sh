#!/bin/bash
# Omi.me CLI Wrapper for OpenClaw Skill
# Full CRUD + Search capabilities

# Load environment variables from default locations
export OMI_API_TOKEN="${OMI_API_TOKEN:-$(cat ~/.config/omi-me/token 2>/dev/null)}"
export OMI_API_URL="${OMI_API_URL:-https://api.omi.me/v1/dev}"

if [ -z "$OMI_API_TOKEN" ]; then
    echo "Error: OMI_API_TOKEN not set."
    echo "Options:"
    echo "  1. echo 'your-token' > ~/.config/omi-me/token"
    echo "  2. export OMI_API_TOKEN='your-token'"
    exit 1
fi

# Helper function for API calls
omi_api() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    curl -s -X "$method" \
        -H "Authorization: Bearer $OMI_API_TOKEN" \
        -H "Content-Type: application/json" \
        "${API_URL}/$endpoint" \
        ${data:+-d "$data"}
}

# Pretty print JSON with syntax highlighting
omi_json() {
    if command -v jq &> /dev/null; then
        jq '.'
    else
        cat
    fi
}

# Parse command
case "$1" in
    # === MEMORIES ===
    memories|memory)
        case "$2" in
            list|ls)
                echo "📚 Memories:"
                omi_api GET "user/memories" | omi_json
                ;;
            get)
                if [ -z "$3" ]; then echo "Usage: omi memories get <id>"; exit 1; fi
                echo "📖 Memory $3:"
                omi_api GET "user/memories/$3" | omi_json
                ;;
            create|add)
                shift 2
                if [ -z "$*" ]; then echo "Usage: omi memories create \"content\" [--type <type>]"; exit 1; fi
                # Parse optional type
                local type="fact"
                if [ "$1" = "--type" ]; then
                    type="$2"
                    shift 2
                fi
                echo "➕ Creating memory..."
                omi_api POST "user/memories" "{\"content\": \"$*\", \"type\": \"$type\"}" | omi_json
                ;;
            update|edit)
                shift 2
                if [ -z "$2" ]; then echo "Usage: omi memories update <id> \"new content\""; exit 1; fi
                local id="$1"
                shift
                echo "✏️  Updating memory $id..."
                omi_api PATCH "user/memories/$id" "{\"content\": \"$*\"}" | omi_json
                ;;
            delete|rm|remove)
                if [ -z "$3" ]; then echo "Usage: omi memories delete <id>"; exit 1; fi
                echo "🗑️  Deleting memory $3..."
                omi_api DELETE "user/memories/$3"
                echo "Memory $3 deleted"
                ;;
            search|find)
                if [ -z "$3" ]; then echo "Usage: omi memories search \"query\""; exit 1; fi
                echo "🔍 Searching memories for: $3"
                omi_api GET "user/memories" | jq -r ".[] | select(.content | contains(\"$3\")) | \"  - \(.id): \(.content[0:70])\""
                ;;
            help|--help|-h)
                echo "🧠 Memory Commands:"
                echo "  omi memories list                    - List all memories"
                echo "  omi memories get <id>                - Get specific memory"
                echo "  omi memories create \"content\" [--type <type>]"
                echo "  omi memories update <id> \"new content\""
                echo "  omi memories delete <id>            - Delete a memory"
                echo "  omi memories search \"query\"         - Search memories"
                ;;
            *)
                echo "Unknown command: omi memories $2"
                echo "Run 'omi memories help' for usage"
                ;;
        esac
        ;;
    # === ACTION ITEMS / TASKS ===
    tasks|task|actions|action)
        case "$2" in
            list|ls|today)
                echo "📋 Action Items:"
                omi_api GET "user/action-items" | omi_json
                ;;
            get)
                if [ -z "$3" ]; then echo "Usage: omi tasks get <id>"; exit 1; fi
                echo "📖 Task $3:"
                omi_api GET "user/action-items/$3" | omi_json
                ;;
            create|add)
                shift 2
                if [ -z "$*" ]; then echo "Usage: omi tasks create \"title\" [--desc \"description\"] [--due <date>]"; exit 1; fi
                # Parse options
                local title="$*"
                local desc=""
                local due=""
                if [ "$1" = "--desc" ]; then
                    desc="$2"
                    shift 2
                    title="$*"
                fi
                if [ "$1" = "--due" ]; then
                    due="$2"
                    shift 2
                fi
                echo "➕ Creating action item..."
                local data="{\"title\": \"$title\"}"
                [ -n "$desc" ] && data="{\"title\": \"$title\", \"description\": \"$desc\"}"
                [ -n "$due" ] && data=$(echo "$data" | jq -c ". + {\"due_date\": \"$due\"}")
                omi_api POST "user/action-items" "$data" | omi_json
                ;;
            update|edit)
                shift 2
                if [ -z "$2" ]; then echo "Usage: omi tasks update <id> [--title \"title\"] [--desc \"desc\"] [--due <date>] [--status <pending|completed|cancelled>]"; exit 1; fi
                local id="$1"
                shift
                local data="{}"
                while [ $# -gt 0 ]; do
                    case "$1" in
                        --title) data=$(echo "$data" | jq -c ". + {\"title\": \"$2\"}"); shift 2 ;;
                        --desc|--description) data=$(echo "$data" | jq -c ". + {\"description\": \"$2\"}"); shift 2 ;;
                        --due) data=$(echo "$data" | jq -c ". + {\"due_date\": \"$2\"}"); shift 2 ;;
                        --status) data=$(echo "$data" | jq -c ". + {\"status\": \"$2\"}"); shift 2 ;;
                        *) shift ;;
                    esac
                done
                echo "✏️  Updating task $id..."
                omi_api PATCH "user/action-items/$id" "$data" | omi_json
                ;;
            complete|done)
                if [ -z "$3" ]; then echo "Usage: omi tasks complete <id>"; exit 1; fi
                echo "✅ Marking task $3 as complete..."
                omi_api PATCH "user/action-items/$3" '{"status": "completed"}' | omi_json
                ;;
            pending|todo)
                if [ -z "$3" ]; then echo "Usage: omi tasks pending <id>"; exit 1; fi
                echo "⏳ Marking task $3 as pending..."
                omi_api PATCH "user/action-items/$3" '{"status": "pending"}' | omi_json
                ;;
            delete|rm|remove)
                if [ -z "$3" ]; then echo "Usage: omi tasks delete <id>"; exit 1; fi
                echo "🗑️  Deleting task $3..."
                omi_api DELETE "user/action-items/$3"
                echo "Task $3 deleted"
                ;;
            help|--help|-h)
                echo "📋 Action Item Commands:"
                echo "  omi tasks list                       - List all tasks"
                echo "  omi tasks get <id>                   - Get specific task"
                echo "  omi tasks create \"title\" [--desc \"desc\"] [--due <date>]"
                echo "  omi tasks update <id> [--title \"t\"] [--desc \"d\"] [--due <date>] [--status <pending|completed>]"
                echo "  omi tasks complete <id>              - Mark task as completed"
                echo "  omi tasks pending <id>               - Mark task as pending"
                echo "  omi tasks delete <id>               - Delete a task"
                ;;
            *)
                echo "Unknown command: omi tasks $2"
                echo "Run 'omi tasks help' for usage"
                ;;
        esac
        ;;
    # === CONVERSATIONS ===
    conversations|conversation|chats|chat)
        case "$2" in
            list|ls)
                echo "💬 Conversations:"
                omi_api GET "user/conversations" | omi_json
                ;;
            get)
                if [ -z "$3" ]; then echo "Usage: omi conversations get <id>"; exit 1; fi
                echo "💬 Conversation $3:"
                omi_api GET "user/conversations/$3" | omi_json
                ;;
            create|add)
                shift 2
                if [ -z "$*" ]; then echo "Usage: omi conversations create [--title \"t\"] [--participants \"p1,p2\"] [--message \"m\"]"; exit 1; fi
                # Parse options
                local title=""
                local participants=""
                local message=""
                while [ $# -gt 0 ]; do
                    case "$1" in
                        --title) title="$2"; shift 2 ;;
                        --participants|-p) participants="$2"; shift 2 ;;
                        --message|-m) message="$2"; shift 2 ;;
                        *) shift ;;
                    esac
                done
                if [ -z "$participants" ]; then echo "Error: --participants is required"; exit 1; fi
                # Convert comma-separated to JSON array
                local participants_json=$(echo "$participants" | jq -R 'split(",") | map(trim)')
                local data="{\"participants\": $participants_json}"
                [ -n "$title" ] && data=$(echo "$data" | jq -c ". + {\"title\": \"$title\"}")
                [ -n "$message" ] && data=$(echo "$data" | jq -c ". + {\"initial_message\": \"$message\"}")
                echo "➕ Creating conversation..."
                omi_api POST "user/conversations" "$data" | omi_json
                ;;
            update|edit)
                shift 2
                if [ -z "$2" ]; then echo "Usage: omi conversations update <id> [--title \"t\"] [--participants \"p1,p2\"]"; exit 1; fi
                local id="$1"
                shift
                local data="{}"
                while [ $# -gt 0 ]; do
                    case "$1" in
                        --title) data=$(echo "$data" | jq -c ". + {\"title\": \"$2\"}"); shift 2 ;;
                        --participants|-p)
                            local p_json=$(echo "$2" | jq -R 'split(",") | map(trim)')
                            data=$(echo "$data" | jq -c ". + {\"participants\": $p_json}")
                            shift 2
                            ;;
                        *) shift ;;
                    esac
                done
                echo "✏️  Updating conversation $id..."
                # Note: Omi API may not support PATCH for conversations
                echo "⚠️  Note: Conversation updates may not be fully supported by API"
                omi_api PATCH "user/conversations/$id" "$data" 2>/dev/null || echo "Update attempted"
                ;;
            delete|rm|remove)
                if [ -z "$3" ]; then echo "Usage: omi conversations delete <id>"; exit 1; fi
                echo "🗑️  Deleting conversation $3..."
                omi_api DELETE "user/conversations/$3"
                echo "Conversation $3 deleted"
                ;;
            add-message|msg)
                shift 2
                if [ -z "$3" ]; then echo "Usage: omi conversations add-message <conv_id> <role> \"content\""; exit 1; fi
                local conv_id="$1"
                local role="$2"
                shift 2
                local content="$*"
                if [ -z "$content" ]; then echo "Error: message content required"; exit 1; fi
                echo "💬 Adding message to conversation $conv_id..."
                omi_api POST "messages" "{\"conversation_id\": \"$conv_id\", \"role\": \"$role\", \"content\": \"$content\"}" | omi_json
                ;;
            search|find)
                if [ -z "$3" ]; then echo "Usage: omi conversations search \"query\""; exit 1; fi
                echo "🔍 Searching conversations for: $3"
                omi_api GET "user/conversations" | jq -r ".[] | select(.title // \"\" | contains(\"$3\")) | \"  - \(.id): \(.title // \"Untitled\")\""
                ;;
            help|--help|-h)
                echo "💬 Conversation Commands:"
                echo "  omi conversations list              - List all conversations"
                echo "  omi conversations get <id>         - Get specific conversation"
                echo "  omi conversations create [--title \"t\"] [--participants \"p1,p2\"] [--message \"m\"]"
                echo "  omi conversations update <id> [--title \"t\"] [--participants \"p1,p2\"]"
                echo "  omi conversations delete <id>       - Delete a conversation"
                echo "  omi conversations add-message <id> <role> \"content\""
                echo "  omi conversations search \"query\"   - Search conversations"
                ;;
            *)
                echo "Unknown command: omi conversations $2"
                echo "Run 'omi conversations help' for usage"
                ;;
        esac
        ;;
    # === SYNC ===
    sync)
        case "$2" in
            memories)
                echo "🧠 Syncing memories from Omi.me..."
                echo ""
                omi_api GET "user/memories" | jq -r '.[] | "  - \(.id): \(.content[0:70])..."'
                echo ""
                echo "💡 Tip: These memories are available via MCP server in OpenClaw!"
                ;;
            tasks|action-items)
                echo "📋 Syncing action items from Omi.me..."
                echo ""
                omi_api GET "user/action-items" | jq -r '.[] | "  - \(.id): [\(.status)] \(.title)"'
                echo ""
                echo "💡 Tip: These tasks are available via MCP server in OpenClaw!"
                ;;
            conversations)
                echo "💬 Syncing conversations from Omi.me..."
                echo ""
                omi_api GET "user/conversations" | jq -r '.[] | "  - \(.id): \(.title // \"Untitled\") (\(.participants | length) participants)"'
                echo ""
                echo "💡 Tip: These conversations are available via MCP server in OpenClaw!"
                ;;
            all)
                echo "🔄 Syncing ALL data from Omi.me..."
                echo ""
                echo "🧠 Memories:"
                omi_api GET "user/memories" | jq -r '.[] | "  - \(.id): \(.content[0:50])..."'
                echo ""
                echo "📋 Action Items:"
                omi_api GET "user/action-items" | jq -r '.[] | "  - \(.id): \(.title)"'
                echo ""
                echo "💬 Conversations:"
                omi_api GET "user/conversations" | jq -r '.[] | "  - \(.id): \(.title // \"Untitled\")"'
                ;;
            help|--help|-h)
                echo "🔄 Sync Commands:"
                echo "  omi sync memories        - Sync memories"
                echo "  omi sync tasks          - Sync action items"
                echo "  omi sync conversations  - Sync conversations"
                echo "  omi sync all            - Sync all data"
                ;;
            *)
                echo "Unknown sync command: $2"
                echo "Run 'omi sync help' for usage"
                ;;
        esac
        ;;
    # === HELP ===
    help|--help|-h)
        echo "🧠 Omi.me CLI for OpenClaw"
        echo ""
        echo "COMMANDS:"
        echo ""
        echo "  🧠 Memories:"
        echo "    omi memories list"
        echo "    omi memories get <id>"
        echo "    omi memories create \"content\" [--type <type>]"
        echo "    omi memories update <id> \"new content\""
        echo "    omi memories delete <id>"
        echo "    omi memories search \"query\""
        echo ""
        echo "  📋 Action Items (Tasks):"
        echo "    omi tasks list"
        echo "    omi tasks get <id>"
        echo "    omi tasks create \"title\" [--desc \"desc\"] [--due <date>]"
        echo "    omi tasks update <id> [--title \"t\"] [--desc \"d\"]"
        echo "    omi tasks complete <id>"
        echo "    omi tasks pending <id>"
        echo "    omi tasks delete <id>"
        echo ""
        echo "  💬 Conversations:"
        echo "    omi conversations list"
        echo "    omi conversations get <id>"
        echo "    omi conversations create [--title \"t\"] [--participants \"p1,p2\"]"
        echo "    omi conversations update <id> [--title \"t\"]"
        echo "    omi conversations delete <id>"
        echo "    omi conversations add-message <id> <role> \"content\""
        echo "    omi conversations search \"query\""
        echo ""
        echo "  🔄 Sync with OpenClaw:"
        echo "    omi sync memories"
        echo "    omi sync tasks"
        echo "    omi sync conversations"
        echo "    omi sync all"
        echo ""
        echo "ENVIRONMENT VARIABLES:"
        echo "  OMI_API_TOKEN  - Your Omi.me developer API token"
        echo "  OMI_API_URL    - API URL (default: https://api.omi.me/v1/dev)"
        echo ""
        echo "FILES:"
        echo "  ~/.config/omi-me/token  - Default location for API token"
        echo ""
        echo "MCP SERVER:"
        echo "  Already configured in openclaw.json"
        echo "  Use 'openclaw gateway restart' to activate"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run 'omi help' for usage"
        ;;
esac
