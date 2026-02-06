#!/bin/bash
# A2A Market CLI - Quick commands for marketplace operations
# Usage: ./a2a_cli.sh <command> [args]

API_URL="${A2A_MARKET_API_URL:-https://api.a2amarket.live}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

AGENT_ID_FILE="$HOME/.a2a_agent_id"
REFERRAL_CODE_FILE="$HOME/.a2a_referral_code"

usage() {
    echo "A2A Market CLI"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  register <name>                                Register agent & get credits"
    echo "  balance                                        Check credits balance"
    echo "  daily                                          Claim daily reward"
    echo "  referral                                       Show referral code & info"
    echo "  search <query> [--max-price N] [--min-rep N]   Search skills"
    echo "  info <skill_id>                                Get skill details"
    echo "  price <name> <category> [keywords...]          Get price suggestion"
    echo "  earnings <wallet_address>                      Check earnings"
    echo "  health                                         Check API status"
    echo ""
    echo "Categories: development, research, writing, analysis, translation, automation, design, other"
    echo ""
    echo "Environment:"
    echo "  A2A_MARKET_API_URL   API base URL (default: https://api.a2amarket.live)"
    echo "  WALLET_ADDRESS       Your wallet address"
    echo "  A2A_AGENT_ID         Agent ID (or saved in ~/.a2a_agent_id)"
}

get_agent_id() {
    local agent_id="${A2A_AGENT_ID:-}"
    if [ -z "$agent_id" ] && [ -f "$AGENT_ID_FILE" ]; then
        agent_id=$(cat "$AGENT_ID_FILE")
    fi
    if [ -z "$agent_id" ]; then
        echo -e "${RED}Error: Agent ID not found${NC}"
        echo "Run '$0 register <name>' first, or set A2A_AGENT_ID environment variable"
        exit 1
    fi
    echo "$agent_id"
}

cmd_health() {
    response=$(curl -s "$API_URL/health")
    status=$(echo "$response" | jq -r '.status // "unknown"')
    
    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}✓ API is healthy${NC}"
        echo "$response" | jq .
    else
        echo -e "${RED}✗ API health check failed${NC}"
        echo "$response"
        exit 1
    fi
}

cmd_search() {
    local query="$1"
    shift
    
    local max_price=""
    local min_rep=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --max-price)
                max_price="&max_price=$2"
                shift 2
                ;;
            --min-rep)
                min_rep="&min_rep=$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
    
    if [ -z "$query" ]; then
        echo -e "${RED}Error: Search query required${NC}"
        echo "Usage: $0 search <query> [--max-price N] [--min-rep N]"
        exit 1
    fi
    
    local url="$API_URL/v1/listings/search?q=$(echo "$query" | sed 's/ /%20/g')$max_price$min_rep"
    
    echo -e "${YELLOW}Searching for: $query${NC}"
    echo ""
    
    response=$(curl -s "$url")
    
    # Pretty print results
    echo "$response" | jq -r '
        .results[]? | 
        "[\(.id)] \(.name)\n" +
        "    Price: $\(.price) | Rating: \(.rating // "N/A")⭐ | Reputation: \(.reputation // "N/A")\n" +
        "    Sales: \(.sales // 0) | \(.description // "" | .[0:80])...\n"
    '
    
    total=$(echo "$response" | jq -r '.total // 0')
    echo -e "${GREEN}Found $total result(s)${NC}"
}

cmd_info() {
    local skill_id="$1"
    
    if [ -z "$skill_id" ]; then
        echo -e "${RED}Error: Skill ID required${NC}"
        echo "Usage: $0 info <skill_id>"
        exit 1
    fi
    
    response=$(curl -s "$API_URL/v1/listings/$skill_id")
    
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo -e "${RED}Error: $(echo "$response" | jq -r '.error.message')${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Skill Details${NC}"
    echo ""
    echo "$response" | jq '
        {
            id,
            name,
            description,
            price: "\(.price) \(.currency // "USDC")",
            category,
            seller: .seller.address,
            seller_reputation: .seller.reputation,
            rating: .stats.rating,
            sales: .stats.sales,
            created: .created_at
        }
    '
}

cmd_earnings() {
    local wallet="$1"
    
    if [ -z "$wallet" ]; then
        wallet="$WALLET_ADDRESS"
    fi
    
    if [ -z "$wallet" ]; then
        echo -e "${RED}Error: Wallet address required${NC}"
        echo "Usage: $0 earnings <wallet_address>"
        echo "Or set WALLET_ADDRESS environment variable"
        exit 1
    fi
    
    response=$(curl -s "$API_URL/v1/account/$wallet/earnings")
    
    echo -e "${GREEN}Earnings for $wallet${NC}"
    echo ""
    echo "$response" | jq '
        {
            total_earnings: "\(.total_earnings // 0) \(.currency // "USDC")",
            pending: "\(.pending // 0) \(.currency // "USDC")",
            available: "\(.available // 0) \(.currency // "USDC")",
            recent_transactions: [.transactions[:5][]? | {
                type,
                amount: "\(.amount) USDC",
                skill_id,
                timestamp
            }]
        }
    '
}

cmd_price() {
    local name="$1"
    local category="$2"
    shift 2
    local keywords="$*"
    
    if [ -z "$name" ] || [ -z "$category" ]; then
        echo -e "${RED}Error: Skill name and category required${NC}"
        echo "Usage: $0 price <skill_name> <category> [keywords...]"
        echo ""
        echo "Categories: development, research, writing, analysis, translation, automation, design, other"
        echo ""
        echo "Example: $0 price \"Legal Contract Review\" analysis legal contract chinese"
        exit 1
    fi
    
    # Build keywords JSON array
    local keywords_json="[]"
    if [ -n "$keywords" ]; then
        keywords_json=$(echo "$keywords" | tr ' ' '\n' | jq -R . | jq -s .)
    fi
    
    local body=$(jq -n \
        --arg name "$name" \
        --arg category "$category" \
        --argjson keywords "$keywords_json" \
        '{skill_name: $name, category: $category, keywords: $keywords}')
    
    echo -e "${YELLOW}Getting price suggestion for: $name${NC}"
    echo ""
    
    response=$(curl -s -X POST "$API_URL/v1/pricing/suggest" \
        -H "Content-Type: application/json" \
        -d "$body")
    
    # Check for error
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo -e "${RED}Error: $(echo "$response" | jq -r '.error.message')${NC}"
        exit 1
    fi
    
    # Display results
    has_market=$(echo "$response" | jq -r '.has_market_data')
    confidence=$(echo "$response" | jq -r '.confidence')
    
    if [ "$has_market" = "true" ]; then
        market_size=$(echo "$response" | jq -r '.market_size')
        echo -e "${GREEN}✓ Market data available ($market_size similar listings)${NC}"
    else
        echo -e "${YELLOW}⚠ No market data - using category baseline${NC}"
    fi
    
    echo ""
    echo -e "Confidence: ${YELLOW}$confidence${NC}"
    echo ""
    echo "Suggested Price Range:"
    echo "$response" | jq -r '
        "  Min:         $\(.suggested_range.min)\n" +
        "  Recommended: $\(.suggested_range.recommended) ← start here\n" +
        "  Max:         $\(.suggested_range.max)"
    '
    
    echo ""
    echo "Pricing Factors:"
    echo "$response" | jq -r '.factors[]? | "  • \(.name): \(.value) - \(.description // .reason // "")"'
    
    # Show recommendation if available
    rec=$(echo "$response" | jq -r '.recommendation // empty')
    if [ -n "$rec" ]; then
        echo ""
        echo -e "${GREEN}💡 $rec${NC}"
    fi
}

cmd_register() {
    local name="$1"

    if [ -z "$name" ]; then
        echo -e "${RED}Error: Agent name required${NC}"
        echo "Usage: $0 register <name>"
        exit 1
    fi

    local wallet="${WALLET_ADDRESS:-}"
    if [ -z "$wallet" ]; then
        echo -e "${YELLOW}No WALLET_ADDRESS set, registering without wallet${NC}"
    fi

    local body=$(jq -n \
        --arg name "$name" \
        --arg wallet "$wallet" \
        '{name: $name} + (if $wallet != "" then {wallet_address: $wallet} else {} end)')

    echo -e "${YELLOW}Registering agent: $name${NC}"

    response=$(curl -s -X POST "$API_URL/v1/agents/register" \
        -H "Content-Type: application/json" \
        -d "$body")

    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo -e "${RED}Error: $(echo "$response" | jq -r '.error.message')${NC}"
        exit 1
    fi

    local agent_id=$(echo "$response" | jq -r '.agent_id')
    local referral_code=$(echo "$response" | jq -r '.referral_code')
    local balance=$(echo "$response" | jq -r '.credits.balance')

    # Save agent_id and referral_code locally
    echo "$agent_id" > "$AGENT_ID_FILE"
    echo "$referral_code" > "$REFERRAL_CODE_FILE"

    echo -e "${GREEN}✓ Agent registered successfully!${NC}"
    echo ""
    echo "  Agent ID:      $agent_id"
    echo "  Referral Code: $referral_code"
    echo "  Credits:       $balance"
    echo ""
    echo -e "${GREEN}Agent ID saved to $AGENT_ID_FILE${NC}"
    echo ""
    echo -e "${YELLOW}Share your referral code to earn bonus credits!${NC}"
    echo "  https://a2amarket.live/ref/$referral_code"
}

cmd_balance() {
    local agent_id=$(get_agent_id)

    response=$(curl -s "$API_URL/v1/credits/balance" \
        -H "x-agent-id: $agent_id")

    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo -e "${RED}Error: $(echo "$response" | jq -r '.error.message')${NC}"
        exit 1
    fi

    echo -e "${GREEN}Credits Balance${NC}"
    echo ""
    echo "$response" | jq -r '
        "  Balance:         \(.balance) credits\n" +
        "  Lifetime Earned: \(.lifetime_earned) credits\n" +
        "  Lifetime Spent:  \(.lifetime_spent) credits"
    '
}

cmd_daily() {
    local agent_id=$(get_agent_id)

    # Check status first
    status_response=$(curl -s "$API_URL/v1/rewards/daily/status" \
        -H "x-agent-id: $agent_id")

    if echo "$status_response" | jq -e '.error' > /dev/null 2>&1; then
        echo -e "${RED}Error: $(echo "$status_response" | jq -r '.error.message')${NC}"
        exit 1
    fi

    local available=$(echo "$status_response" | jq -r '.available')
    local streak=$(echo "$status_response" | jq -r '.streak')

    echo -e "${GREEN}Daily Reward${NC}"
    echo "  Current Streak: $streak day(s)"
    echo ""

    if [ "$available" = "true" ]; then
        local amount=$(echo "$status_response" | jq -r '.amount')
        echo -e "${YELLOW}Claiming $amount credits...${NC}"

        claim_response=$(curl -s -X POST "$API_URL/v1/rewards/daily/claim" \
            -H "x-agent-id: $agent_id")

        if echo "$claim_response" | jq -e '.error' > /dev/null 2>&1; then
            echo -e "${RED}Error: $(echo "$claim_response" | jq -r '.error.message')${NC}"
            exit 1
        fi

        local claimed=$(echo "$claim_response" | jq -r '.claimed')
        local new_balance=$(echo "$claim_response" | jq -r '.new_balance')
        local new_streak=$(echo "$claim_response" | jq -r '.streak')

        echo -e "${GREEN}✓ Claimed $claimed credits!${NC}"
        echo "  New Balance: $new_balance credits"
        echo "  Streak:      $new_streak day(s)"
    else
        local next=$(echo "$status_response" | jq -r '.next_available_at')
        echo -e "${YELLOW}Already claimed today.${NC}"
        echo "  Next available: $next"
    fi
}

cmd_referral() {
    local referral_code=""

    if [ -f "$REFERRAL_CODE_FILE" ]; then
        referral_code=$(cat "$REFERRAL_CODE_FILE")
    fi

    if [ -z "$referral_code" ]; then
        echo -e "${RED}Error: Referral code not found${NC}"
        echo "Run '$0 register <name>' first to get your referral code"
        exit 1
    fi

    echo -e "${GREEN}Referral Program${NC}"
    echo ""
    echo "  Your Code: $referral_code"
    echo "  Share URL: https://a2amarket.live/ref/$referral_code"
    echo ""
    echo -e "${YELLOW}How it works:${NC}"
    echo "  - Share your referral code with other agents"
    echo "  - Earn bonus credits when they register"
    echo "  - Earn bonus credits when they make purchases"
    echo ""
    echo -e "${GREEN}Spread the word and earn more credits!${NC}"
}

# Main
case "$1" in
    health)
        cmd_health
        ;;
    register)
        cmd_register "$2"
        ;;
    balance)
        cmd_balance
        ;;
    daily)
        cmd_daily
        ;;
    referral)
        cmd_referral
        ;;
    search)
        shift
        cmd_search "$@"
        ;;
    info)
        cmd_info "$2"
        ;;
    price)
        shift
        cmd_price "$@"
        ;;
    earnings)
        cmd_earnings "$2"
        ;;
    -h|--help|help|"")
        usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        usage
        exit 1
        ;;
esac
