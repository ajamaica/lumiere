#!/bin/bash
# WhatsApp Automation Skill - Setup Helper

set -e

echo "🚀 WhatsApp Automation Setup"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v18+"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ Docker: $(docker --version)"

# Create directories
echo ""
echo "📁 Creating directories..."
mkdir -p .whatsapp-messages
mkdir -p scripts

echo "✅ Directories created"

# Get local IP
echo ""
echo "🔍 Finding your local IP..."
IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$IP" ]; then
    echo "⚠️  Could not automatically detect IP"
    echo "Run: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
    echo "And use the IP address that starts with 192.168 or 10.0"
    read -p "Enter your local IP: " IP
fi

echo "✅ Your local IP: $IP"

# Start WAHA
echo ""
read -p "Start WAHA Docker container? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🐳 Starting WAHA..."
    docker run -it \
        -p 3000:3000 \
        --name waha \
        devlikeapro/waha &
    
    echo "⏳ Waiting for WAHA to start (30 seconds)..."
    sleep 30
    echo "✅ WAHA started at http://localhost:3000"
fi

# Start message store
echo ""
read -p "Start message store service? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🎯 Starting message store service..."
    node scripts/whatsapp-message-store.js &
    
    sleep 2
    echo "✅ Service started at http://localhost:19000"
fi

# Configuration summary
echo ""
echo "================================================"
echo "📋 Configuration Summary"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1️⃣  Open WAHA Dashboard:"
echo "    http://localhost:3000/dashboard"
echo ""
echo "2️⃣  Link your WhatsApp:"
echo "    - Sessions → Start New"
echo "    - Scan QR with your phone"
echo "    - Wait for WORKING status"
echo ""
echo "3️⃣  Configure Webhook:"
echo "    - Webhooks → URL field"
echo "    - Set to: http://$IP:19000/webhook"
echo "    - Events: ✅ session.status, ✅ message"
echo "    - Click Update"
echo ""
echo "4️⃣  Test:"
echo "    - Send yourself a WhatsApp message"
echo "    - Run: node scripts/whatsapp-query.js list"
echo ""
echo "5️⃣  Set up Cron Jobs:"
echo "    - See references/CRON-JOBS.md"
echo ""
echo "================================================"
echo ""
echo "📖 Documentation:"
echo "   - Setup: references/SETUP.md"
echo "   - Cron: references/CRON-JOBS.md"
echo "   - API: references/API.md"
echo "   - Help: references/TROUBLESHOOTING.md"
echo ""
echo "✅ Setup complete! Follow the next steps above."
