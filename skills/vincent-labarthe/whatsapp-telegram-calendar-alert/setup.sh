#!/bin/bash
#
# WhatsApp Analyzer - Full Auto Setup
# 
# Usage: ./setup.sh [TELEGRAM_CHAT_ID]
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORK_DIR="$HOME/.openclaw/workspace/.whatsapp-messages"
WAHA_CONTAINER="whatsapp-waha"
WAHA_PORT=3000
MESSAGE_STORE_PORT=3001
TELEGRAM_CHAT_ID="${1:-}"

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  WhatsApp Analyzer - Auto Setup                            ║"
echo "║  WhatsApp → Detect RDV/Urgent → Telegram → Calendar        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get Telegram Chat ID
if [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo -e "${YELLOW}Enter your Telegram Chat ID (message @userinfobot to get it):${NC}"
  read -p "> " TELEGRAM_CHAT_ID
fi
[ -z "$TELEGRAM_CHAT_ID" ] && echo -e "${RED}❌ Telegram Chat ID required${NC}" && exit 1

mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

#═══════════════════════════════════════════════════════════════
# 1. WAHA Docker
#═══════════════════════════════════════════════════════════════
echo -e "\n${BLUE}[1/7]${NC} Starting WAHA Docker..."
docker stop $WAHA_CONTAINER 2>/dev/null || true
docker rm $WAHA_CONTAINER 2>/dev/null || true
docker run -d --name $WAHA_CONTAINER \
  -p $WAHA_PORT:3000 \
  --restart unless-stopped \
  devlikeapro/waha:latest > /dev/null
echo "   Waiting for WAHA to initialize..."
sleep 12

#═══════════════════════════════════════════════════════════════
# 2. Get Credentials
#═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[2/7]${NC} Extracting credentials..."
WAHA_API_KEY=$(docker logs $WAHA_CONTAINER 2>&1 | grep "WAHA_API_KEY=" | tail -1 | cut -d'=' -f2)
[ -z "$WAHA_API_KEY" ] && echo -e "${RED}❌ Could not get API key. Check: docker logs $WAHA_CONTAINER${NC}" && exit 1

cat > "$WORK_DIR/.env" << EOF
WAHA_API_KEY=$WAHA_API_KEY
WAHA_PORT=$WAHA_PORT
MESSAGE_STORE_PORT=$MESSAGE_STORE_PORT
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
EOF
echo -e "   ${GREEN}✓${NC} API Key: ${WAHA_API_KEY:0:12}..."

#═══════════════════════════════════════════════════════════════
# 3. Create Message Store
#═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[3/7]${NC} Creating message store..."
cat > "$WORK_DIR/message-store.js" << 'NODEJS'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.MESSAGE_STORE_PORT || 3001;
const MESSAGES_FILE = path.join(__dirname, 'messages.jsonl');

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        if (event.event?.includes('message')) {
          const msg = {
            timestamp: Date.now(),
            contact: event.payload?.from || 'unknown',
            contactName: event.payload?.notifyName || event.payload?._data?.notifyName || '',
            text: event.payload?.body || event.payload?.text || '',
            fromMe: event.payload?.fromMe || false
          };
          // Only save incoming messages (not our own)
          if (!msg.fromMe && msg.text) {
            fs.appendFileSync(MESSAGES_FILE, JSON.stringify(msg) + '\n');
            console.log(`[${new Date().toISOString()}] ${msg.contactName || msg.contact}: ${msg.text.substring(0, 50)}`);
          }
        }
        res.writeHead(200);
        res.end('OK');
      } catch (e) {
        res.writeHead(400);
        res.end(e.message);
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(200);
    res.end('WhatsApp Message Store - POST /webhook');
  }
}).listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Message store running on port ${PORT}`);
});
NODEJS
echo -e "   ${GREEN}✓${NC} message-store.js created"

#═══════════════════════════════════════════════════════════════
# 4. Create LaunchAgent (auto-start on boot)
#═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[4/7]${NC} Setting up auto-start on boot..."
NODE_PATH=$(which node)
PLIST="$HOME/Library/LaunchAgents/ai.openclaw.whatsapp-store.plist"

cat > "$PLIST" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.whatsapp-store</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$WORK_DIR/message-store.js</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>MESSAGE_STORE_PORT</key>
        <string>$MESSAGE_STORE_PORT</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/whatsapp-store.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/whatsapp-store.log</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
sleep 2

if curl -s "http://localhost:$MESSAGE_STORE_PORT/health" 2>/dev/null | grep -q "OK"; then
  echo -e "   ${GREEN}✓${NC} Message store running (auto-starts on boot)"
else
  echo -e "   ${YELLOW}⚠${NC} Starting manually..."
  nohup $NODE_PATH "$WORK_DIR/message-store.js" > /tmp/whatsapp-store.log 2>&1 &
  sleep 2
fi

#═══════════════════════════════════════════════════════════════
# 5. Configure WAHA Webhook
#═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[5/7]${NC} Configuring WAHA webhook..."
curl -s -X PUT \
  -H "X-Api-Key: $WAHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"config\":{\"webhooks\":[{\"url\":\"http://host.docker.internal:$MESSAGE_STORE_PORT/webhook\",\"events\":[\"message.any\"]}]}}" \
  "http://localhost:$WAHA_PORT/api/sessions/default" > /dev/null 2>&1

curl -s -X POST \
  -H "X-Api-Key: $WAHA_API_KEY" \
  "http://localhost:$WAHA_PORT/api/sessions/default/start" > /dev/null 2>&1
echo -e "   ${GREEN}✓${NC} Webhook configured"

#═══════════════════════════════════════════════════════════════
# 6. Initialize Tracker
#═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[6/7]${NC} Initializing message tracker..."
echo "$(date +%s)000" > "$WORK_DIR/.last-ts"
touch "$WORK_DIR/messages.jsonl"
echo -e "   ${GREEN}✓${NC} Tracker ready"

#═══════════════════════════════════════════════════════════════
# 7. Update HEARTBEAT.md
#═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[7/7]${NC} Configuring OpenClaw integration..."
HEARTBEAT="$HOME/.openclaw/workspace/HEARTBEAT.md"
SECTION="
## WhatsApp Analyzer (Auto-configured)
Check \`~/.openclaw/workspace/.whatsapp-messages/messages.jsonl\` for new messages.
- Read \`.last-ts\` for last processed timestamp
- For each message with timestamp > last-ts:
  - If RDV/meeting/appointment detected → Send Telegram to $TELEGRAM_CHAT_ID asking to add to calendar
  - If urgent/important → Send Telegram alert
- Update \`.last-ts\` with latest timestamp after processing
"

if [ -f "$HEARTBEAT" ]; then
  if ! grep -q "WhatsApp Analyzer" "$HEARTBEAT"; then
    echo "$SECTION" >> "$HEARTBEAT"
    echo -e "   ${GREEN}✓${NC} HEARTBEAT.md updated"
  else
    echo -e "   ${GREEN}✓${NC} HEARTBEAT.md already configured"
  fi
else
  echo "$SECTION" > "$HEARTBEAT"
  echo -e "   ${GREEN}✓${NC} HEARTBEAT.md created"
fi

#═══════════════════════════════════════════════════════════════
# Get QR Code
#═══════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}Getting WhatsApp QR code...${NC}"
sleep 3

STATUS=$(curl -s -H "X-Api-Key: $WAHA_API_KEY" "http://localhost:$WAHA_PORT/api/sessions/default" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$STATUS" == "SCAN_QR_CODE" ]; then
  curl -s -H "X-Api-Key: $WAHA_API_KEY" \
    "http://localhost:$WAHA_PORT/api/default/auth/qr" \
    --output "$WORK_DIR/qr.png"
  
  echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗"
  echo "║  📱 SCAN THE QR CODE WITH WHATSAPP                           ║"
  echo "║  Settings → Linked Devices → Link a Device                   ║"
  echo "╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "QR Code saved to: $WORK_DIR/qr.png"
  
  # Try to open it
  open "$WORK_DIR/qr.png" 2>/dev/null || xdg-open "$WORK_DIR/qr.png" 2>/dev/null || true
  
elif [ "$STATUS" == "WORKING" ]; then
  echo -e "\n${GREEN}✅ WhatsApp already connected!${NC}"
else
  echo -e "\n${YELLOW}Status: $STATUS${NC}"
  echo "Dashboard: http://localhost:$WAHA_PORT"
fi

#═══════════════════════════════════════════════════════════════
# Done!
#═══════════════════════════════════════════════════════════════
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ SETUP COMPLETE!                                          ║"
echo "╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Components running:"
echo "  • WAHA Docker:     http://localhost:$WAHA_PORT (auto-restarts)"
echo "  • Message Store:   http://localhost:$MESSAGE_STORE_PORT (auto-starts on boot)"
echo "  • Messages file:   $WORK_DIR/messages.jsonl"
echo "  • Credentials:     $WORK_DIR/.env"
echo ""
echo "How it works:"
echo "  1. Someone sends you a WhatsApp message"
echo "  2. OpenClaw analyzes it every minute"
echo "  3. If RDV detected → Telegram asks to add to calendar"
echo "  4. If urgent → Telegram alert"
echo ""
echo -e "${YELLOW}Just scan the QR code and you're done! 🎉${NC}"
