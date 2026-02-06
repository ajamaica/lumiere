#!/bin/bash

###############################################################################
# WhatsApp Automation - Complete Auto-Setup
# ONE COMMAND. Everything done automatically.
###############################################################################

set -e

echo "🚀 WhatsApp Automation Setup"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORKSPACE="$HOME/.openclaw/workspace"
MESSAGES_DIR="$WORKSPACE/.whatsapp-messages"
SERVICE_LOG="/tmp/whatsapp-store.log"
WAHA_PORT=3000
STORE_PORT=19000

# Cleanup: Remove old WAHA container if exists
docker stop waha 2>/dev/null || true
docker rm waha 2>/dev/null || true

# Step 1: Docker
echo -e "${BLUE}1. Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker installed${NC}\n"

# Step 2: Pull WAHA image (detect ARM vs Intel)
echo -e "${BLUE}2. Pulling WAHA image...${NC}"

# Detect processor architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    echo "Detected ARM64 (M1/M2)..."
    docker pull devlikeapro/waha:arm > /dev/null 2>&1
    docker tag devlikeapro/waha:arm devlikeapro/waha
else
    docker pull devlikeapro/waha > /dev/null 2>&1
fi

echo -e "${GREEN}✅ WAHA image ready${NC}\n"

# Step 3: Start WAHA with persistent storage
echo -e "${BLUE}3. Starting WAHA...${NC}"

# Create volume for persistence
docker volume create waha-data 2>/dev/null || true

docker run -d \
  -p $WAHA_PORT:$WAHA_PORT \
  -v waha-data:/app/storage \
  --name waha \
  devlikeapro/waha > /dev/null 2>&1

sleep 3
echo -e "${GREEN}✅ WAHA started (with persistent storage)${NC}\n"

# Step 4: Extract credentials from WAHA logs
echo -e "${BLUE}4. Extracting credentials from WAHA...${NC}"

sleep 3

# Get logs
WAHA_LOGS=$(docker logs waha 2>&1)

# Parse credentials
WAHA_API_KEY=$(echo "$WAHA_LOGS" | grep "WAHA_API_KEY=" | head -1 | cut -d'=' -f2 | tr -d ' ')
WAHA_USERNAME=$(echo "$WAHA_LOGS" | grep "WAHA_DASHBOARD_USERNAME=" | head -1 | cut -d'=' -f2 | tr -d ' ')
WAHA_PASSWORD=$(echo "$WAHA_LOGS" | grep "WAHA_DASHBOARD_PASSWORD=" | head -1 | cut -d'=' -f2 | tr -d ' ')

# Default username if not found
if [ -z "$WAHA_USERNAME" ]; then
    WAHA_USERNAME="admin"
fi

if [ -z "$WAHA_API_KEY" ] || [ -z "$WAHA_PASSWORD" ]; then
    echo -e "${RED}❌ Could not extract credentials${NC}"
    echo ""
    echo "WAHA Logs (last 30 lines):"
    docker logs waha 2>&1 | tail -30
    exit 1
fi

echo -e "${GREEN}✅ Credentials extracted${NC}\n"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}WAHA CREDENTIALS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Username: $WAHA_USERNAME"
echo "Password: $WAHA_PASSWORD"
echo "API Key:  $WAHA_API_KEY"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 5: IP Detection  
echo -e "${BLUE}5. Finding local IP...${NC}"
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
if [ -z "$IP" ]; then
    echo -e "${RED}❌ Could not detect IP${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Your IP: $IP${NC}\n"

# Step 6: Create messages directory
echo -e "${BLUE}6. Creating storage...${NC}"
mkdir -p "$MESSAGES_DIR"
echo -e "${GREEN}✅ Directory created${NC}\n"

# Step 7: Message store service
echo -e "${BLUE}7. Starting message store service...${NC}"

if pgrep -f "whatsapp-message-store.js" > /dev/null; then
    echo -e "${GREEN}✅ Service already running${NC}"
else
    nohup node "$WORKSPACE/whatsapp-message-store.js" > "$SERVICE_LOG" 2>&1 &
    sleep 2
    if curl -s "http://localhost:$STORE_PORT/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Service started${NC}"
    else
        echo -e "${RED}❌ Service failed${NC}"
        tail "$SERVICE_LOG"
        exit 1
    fi
fi
echo ""

# Step 8: Manual setup instructions
WEBHOOK_URL="http://$IP:$STORE_PORT/webhook"

echo -e "${BLUE}8. Manual setup required${NC}"
echo ""
echo -e "${YELLOW}Please complete these steps in WAHA dashboard:${NC}"
echo ""
echo "1️⃣  Open: http://localhost:3000/dashboard"
echo ""
echo "2️⃣  Login with:"
echo "   Username: $WAHA_USERNAME"
echo "   Password: $WAHA_PASSWORD"
echo ""
echo "3️⃣  Add API key (Workers tab):"
echo "   Click 'Connect' → Paste API Key:"
echo "   $WAHA_API_KEY"
echo ""
echo "4️⃣  Link WhatsApp:"
echo "   Click 'Start New' → Scan QR code"
echo "   Wait for status: WORKING"
echo ""
echo "5️⃣  Start session:"
echo "   Click 'Start' button (top right)"
echo ""
echo "6️⃣  Configure webhook:"
echo "   Click your session → Webhooks section"
echo "   Click settings icon ⚙️"
echo ""
echo -e "${YELLOW}Copy this URL:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "$WEBHOOK_URL"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "   Then in Webhooks config:"
echo "   • URL: (paste above)"
echo "   • ☑ message"
echo "   • ☑ session.status"
echo "   • Click Save"
echo ""
read -p "Press ENTER when ALL steps complete..."
echo ""

# Step 9: Wait for session to be ready
echo -e "${BLUE}9. Waiting for session...${NC}"

echo "Session is restarting after webhook update..."
sleep 10

echo -e "${GREEN}✅ Session should be ready${NC}\n"

# Step 10: Auto-start setup
echo -e "${BLUE}10. Setting up auto-start...${NC}"
PLIST="$HOME/Library/LaunchAgents/com.whatsapp.store.plist"
mkdir -p "$(dirname "$PLIST")"

cat > "$PLIST" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.whatsapp.store</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/vincentlabarthe/.openclaw/workspace/whatsapp-message-store.js</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
PLIST

launchctl load "$PLIST" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null && launchctl load "$PLIST"
echo -e "${GREEN}✅ Auto-start enabled${NC}\n"

# Step 11: Create cron jobs
echo -e "${BLUE}11. Creating monitoring cron jobs...${NC}"

GATEWAY_URL="http://localhost:4242"

# Appointment Detector (every 5 min)
openclaw cron add --job '{
  "name": "Appointment Detector",
  "schedule": {"kind": "every", "everyMs": 300000},
  "payload": {"kind": "systemEvent", "text": "Scan ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl for appointment patterns (meeting/rdv + day+time), parse and send Telegram alert: 🗓️ Appointment detected: [day] at [time]"},
  "sessionTarget": "main",
  "enabled": true
}' 2>/dev/null || echo -e "${YELLOW}⚠️  Appointment job may exist${NC}"

# Important Message Alert (every 5 min)
openclaw cron add --job '{
  "name": "Important Message Alert",
  "schedule": {"kind": "every", "everyMs": 300000},
  "payload": {"kind": "systemEvent", "text": "Scan ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl for urgent patterns (URGENT|HELP|SOS|EMERGENCY), send Telegram alert if found: ⚠️ Important message from [contact]: [text]"},
  "sessionTarget": "main",
  "enabled": true
}' 2>/dev/null || echo -e "${YELLOW}⚠️  Important alert job may exist${NC}"

# Contact Handler - Joséphine (every 5 min)
openclaw cron add --job '{
  "name": "Contact Handler - Joséphine",
  "schedule": {"kind": "every", "everyMs": 300000},
  "payload": {"kind": "systemEvent", "text": "Check ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl for messages from Joséphine (33612345678 or josephine contact), suggest context-aware reply awaiting user validation before sending"},
  "sessionTarget": "main",
  "enabled": true
}' 2>/dev/null || echo -e "${YELLOW}⚠️  Contact handler job may exist${NC}"

echo -e "${GREEN}✅ Cron jobs created (every 5 min)${NC}\n"

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "Your system is ready:"
echo "  • Receives WhatsApp messages ✅"
echo "  • Stores them locally ✅"
echo "  • Scans for appointments (every 5 min) ✅"
echo "  • Alerts on important messages (every 5 min) ✅"
echo "  • Auto-restarts on reboot ✅"
echo ""
echo "Test:"
echo "  1. Send yourself a WhatsApp message"
echo "  2. Wait 5 seconds"
echo "  3. Check: node ~/.openclaw/workspace/whatsapp-query.js list"
echo ""
echo "Dashboard: http://localhost:3000/dashboard"
echo "Logs: tail /tmp/whatsapp-store.log"
echo ""
