#!/bin/bash
set -e

#######################################
# Ecto Connection Setup Script
# Exposes OpenClaw via Tailscale Funnel
#######################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDENTIALS_FILE="$HOME/.openclaw/ecto-credentials.json"
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"
GATEWAY_LOG="/tmp/openclaw-gateway.log"
GATEWAY_PORT=18789

# Global variables set during setup
FUNNEL_URL=""
AUTH_TOKEN=""
TAILSCALE_HOSTNAME=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_banner() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     🔌 Ecto Connection Setup 🔌       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""
}

#######################################
# Step 1: Check/Install Homebrew
#######################################
check_homebrew() {
    print_step "Checking Homebrew..."
    if ! command -v brew &> /dev/null; then
        print_error "Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    print_success "Homebrew ready"
}

#######################################
# Step 2: Install Tailscale
#######################################
install_tailscale() {
    print_step "Checking Tailscale..."
    if ! command -v tailscale &> /dev/null; then
        print_warning "Tailscale not found. Installing via Homebrew..."
        brew install tailscale
    fi
    print_success "Tailscale installed ($(tailscale version | head -1))"
}

#######################################
# Step 3: Start Tailscale Service
#######################################
start_tailscale_service() {
    print_step "Starting Tailscale service..."
    
    # Check if already running
    if sudo tailscale status &> /dev/null; then
        print_success "Tailscale service already running"
        return 0
    fi
    
    # Try to start via brew services first
    if brew services list | grep -q tailscale; then
        sudo brew services start tailscale 2>/dev/null || true
        sleep 2
    fi
    
    # If still not running, start manually
    if ! sudo tailscale status &> /dev/null; then
        print_warning "Starting tailscaled manually..."
        sudo /opt/homebrew/bin/tailscaled --state=/var/lib/tailscale/tailscaled.state &
        sleep 3
    fi
    
    print_success "Tailscale service started"
}

#######################################
# Step 4: Tailscale Login
#######################################
tailscale_login() {
    print_step "Checking Tailscale authentication..."
    
    # Check if already logged in
    if sudo tailscale status 2>/dev/null | grep -q "@"; then
        TAILSCALE_HOSTNAME=$(sudo tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//')
        print_success "Already logged in as: $TAILSCALE_HOSTNAME"
        return 0
    fi
    
    print_warning "Tailscale login required..."
    echo ""
    echo -e "${YELLOW}A browser window will open. Please log in to your Tailscale account.${NC}"
    echo -e "${YELLOW}If no browser opens, visit the URL shown below.${NC}"
    echo ""
    
    sudo tailscale up
    
    # Get hostname after login
    TAILSCALE_HOSTNAME=$(sudo tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//')
    print_success "Logged in as: $TAILSCALE_HOSTNAME"
}

#######################################
# Step 5: Enable Funnel
#######################################
enable_funnel() {
    print_step "Enabling Tailscale Funnel on port $GATEWAY_PORT..."
    
    # Check if funnel is already running
    if sudo tailscale funnel status 2>/dev/null | grep -q "$GATEWAY_PORT"; then
        print_success "Funnel already enabled"
    else
        # Enable funnel in background
        sudo tailscale funnel --bg $GATEWAY_PORT 2>&1 || {
            echo ""
            print_warning "Funnel may need to be enabled on your tailnet."
            echo -e "${YELLOW}If prompted, visit the URL to enable Funnel for this machine.${NC}"
            echo ""
            sudo tailscale funnel --bg $GATEWAY_PORT
        }
        print_success "Funnel enabled"
    fi
    
    # Get the Tailscale hostname
    TAILSCALE_HOSTNAME=$(sudo tailscale status --json 2>/dev/null | jq -r '.Self.DNSName' | sed 's/\.$//')

    # Get the public URL from funnel status
    FUNNEL_URL=$(sudo tailscale funnel status 2>/dev/null | grep -oE 'https://[^/]+' | head -1)

    # Fallback to constructing URL from hostname if extraction failed
    if [ -z "$FUNNEL_URL" ]; then
        FUNNEL_URL="https://${TAILSCALE_HOSTNAME}"
    fi

    print_success "Public URL: $FUNNEL_URL"
}

#######################################
# Step 6: Generate Auth Token
#######################################
generate_auth_token() {
    print_step "Generating secure auth token..."
    
    # Check if we should regenerate
    if [ -f "$CREDENTIALS_FILE" ] && [ "$1" != "--regenerate-token" ]; then
        AUTH_TOKEN=$(jq -r '.token' "$CREDENTIALS_FILE" 2>/dev/null || echo "")
        if [ -n "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "null" ]; then
            print_success "Using existing auth token"
            return 0
        fi
    fi
    
    # Generate new token
    AUTH_TOKEN=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
    
    # Save credentials
    mkdir -p "$(dirname "$CREDENTIALS_FILE")"
    cat > "$CREDENTIALS_FILE" << EOF
{
  "token": "$AUTH_TOKEN",
  "url": "$FUNNEL_URL",
  "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "port": $GATEWAY_PORT
}
EOF
    chmod 600 "$CREDENTIALS_FILE"
    
    print_success "Auth token generated and saved to $CREDENTIALS_FILE"
}

#######################################
# Step 7: Configure OpenClaw Gateway
#######################################
configure_gateway() {
    print_step "Configuring OpenClaw gateway..."
    
    # Check if openclaw CLI exists
    if ! command -v openclaw &> /dev/null; then
        print_error "OpenClaw CLI not found. Please install OpenClaw first."
        exit 1
    fi
    
    # Use openclaw to patch config
    openclaw config set gateway.bind loopback 2>/dev/null || true
    openclaw config set gateway.http.endpoints.chatCompletions.enabled true 2>/dev/null || true
    openclaw config set gateway.auth.mode password 2>/dev/null || true
    openclaw config set gateway.auth.password "$AUTH_TOKEN" 2>/dev/null || true
    openclaw config set gateway.tailscale.mode funnel 2>/dev/null || true

    # If openclaw config commands don't work, patch JSON directly
    if [ -f "$OPENCLAW_CONFIG" ]; then
        # Backup
        cp "$OPENCLAW_CONFIG" "${OPENCLAW_CONFIG}.backup"

        # Patch with jq
        jq --arg password "$AUTH_TOKEN" '
          .gateway.bind = "loopback" |
          .gateway.http.endpoints.chatCompletions.enabled = true |
          .gateway.http.endpoints.responses.enabled = true |
          .gateway.auth.mode = "password" |
          .gateway.auth.password = $password |
          .gateway.tailscale.mode = "funnel"
        ' "$OPENCLAW_CONFIG" > "${OPENCLAW_CONFIG}.tmp" && mv "${OPENCLAW_CONFIG}.tmp" "$OPENCLAW_CONFIG"
    fi
    
    print_success "Gateway configured"
}

#######################################
# Step 8: Restart Gateway
#######################################
restart_gateway() {
    print_step "Restarting OpenClaw gateway..."

    # Kill existing gateway
    pkill -9 -f "openclaw.*gateway" 2>/dev/null || true
    pkill -9 -f "openclaw-gateway" 2>/dev/null || true
    sleep 1

    # Start gateway
    nohup openclaw gateway run --port $GATEWAY_PORT --force > "$GATEWAY_LOG" 2>&1 &

    # Wait for startup
    sleep 5

    # Verify it's running
    if curl -s "http://localhost:$GATEWAY_PORT/health" > /dev/null 2>&1 || \
       curl -s "http://localhost:$GATEWAY_PORT/" > /dev/null 2>&1; then
        print_success "Gateway started (PID: $(pgrep -f 'openclaw.*gateway' | head -1))"
    else
        print_warning "Gateway may still be starting. Check logs with: tail -f $GATEWAY_LOG"
        echo ""
        print_step "Recent gateway logs:"
        tail -20 "$GATEWAY_LOG" 2>/dev/null || echo "No logs yet"
    fi
}

#######################################
# Print Final Summary
#######################################
print_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    🎉 Setup Complete! 🎉                      ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Your OpenClaw API is now publicly accessible:${NC}"
    echo ""
    echo -e "  ${YELLOW}URL:${NC}   ${FUNNEL_URL}/v1/chat/completions"
    echo -e "  ${YELLOW}Token:${NC} $AUTH_TOKEN"
    echo ""
    echo -e "${BLUE}Test with:${NC}"
    echo ""
    echo -e "  curl ${FUNNEL_URL}/v1/chat/completions \\"
    echo -e "    -H \"Authorization: Bearer $AUTH_TOKEN\" \\"
    echo -e "    -H \"Content-Type: application/json\" \\"
    echo -e "    -d '{\"messages\":[{\"role\":\"user\",\"content\":\"Hello!\"}]}'"
    echo ""
    echo -e "${BLUE}Credentials saved to:${NC} $CREDENTIALS_FILE"
    echo -e "${BLUE}Gateway logs:${NC} $GATEWAY_LOG"
    echo ""
}

#######################################
# Main
#######################################
main() {
    print_banner
    
    # Parse arguments
    REGENERATE_TOKEN=""
    RESTART_ONLY=""
    for arg in "$@"; do
        case $arg in
            --regenerate-token) REGENERATE_TOKEN="--regenerate-token" ;;
            --restart) RESTART_ONLY="true" ;;
        esac
    done
    
    # Restart only mode
    if [ "$RESTART_ONLY" = "true" ]; then
        restart_gateway
        exit 0
    fi
    
    # Full setup
    check_homebrew
    install_tailscale
    start_tailscale_service
    tailscale_login
    enable_funnel
    generate_auth_token $REGENERATE_TOKEN
    configure_gateway
    restart_gateway
    print_summary
}

main "$@"
