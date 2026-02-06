#!/bin/bash
# Installation script for Binance Enhanced Skill

set -e

echo "🚀 Installing Binance Enhanced Skill for OpenClaw"
echo "=================================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo "❌ Please do not run as root/sudo"
  exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 11 ]); then
  echo "❌ Python 3.11 or higher is required. Found: $PYTHON_VERSION"
  exit 1
fi

echo "✓ Python $PYTHON_VERSION detected"

# Check OpenClaw installation
if ! command -v openclaw &> /dev/null; then
  echo "❌ OpenClaw is not installed or not in PATH"
  echo "   Please install OpenClaw first: https://docs.openclaw.ai/installation"
  exit 1
fi

OPENCLAW_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
echo "✓ OpenClaw detected: $OPENCLAW_VERSION"

# Create installation directory
INSTALL_DIR="$HOME/.openclaw/skills/binance-enhanced"
echo "📁 Installing to: $INSTALL_DIR"

# Create directory structure
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/config"
mkdir -p "$INSTALL_DIR/data"
mkdir -p "$INSTALL_DIR/logs"

# Copy files
echo "📦 Copying files..."
cp -r ./* "$INSTALL_DIR/" 2>/dev/null || true

# Remove installation script from target
rm -f "$INSTALL_DIR/install.sh"

# Set permissions
chmod +x "$INSTALL_DIR/test/testnet.sh"
chmod +x "$INSTALL_DIR/test/test_integration.sh"
chmod +x "$INSTALL_DIR/security/limits.sh"
chmod +x "$INSTALL_DIR/security/logger.sh"
chmod +x "$INSTALL_DIR/security/security_checks.sh"

# Create configuration templates
echo "⚙️  Creating configuration templates..."
if [ ! -f "$INSTALL_DIR/config/.env" ]; then
  cp "$INSTALL_DIR/templates/.env.example" "$INSTALL_DIR/config/.env"
  echo "   Created: $INSTALL_DIR/config/.env (please edit with your API keys)"
fi

if [ ! -f "$INSTALL_DIR/config/config.yaml" ]; then
  cp "$INSTALL_DIR/templates/config.yaml.example" "$INSTALL_DIR/config/config.yaml"
  echo "   Created: $INSTALL_DIR/config/config.yaml"
fi

if [ ! -f "$INSTALL_DIR/monitoring/config.yaml" ]; then
  cp "$INSTALL_DIR/monitoring/config.example.yaml" "$INSTALL_DIR/monitoring/config.yaml"
  echo "   Created: $INSTALL_DIR/monitoring/config.yaml"
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd "$INSTALL_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "   Creating virtual environment..."
  python3 -m venv venv
fi

# Activate virtual environment and install
source venv/bin/activate

# Install core dependencies
echo "   Installing core packages..."
pip install --upgrade pip
pip install requests python-dotenv pyyaml pycryptodome

# Ask about optional dependencies
echo ""
echo "📊 Optional dependencies:"
echo "   1) Telegram bot and web interface (Flask, python-telegram-bot)"
echo "   2) Performance optimizations (aiohttp, orjson, jq)"
echo "   3) Trading strategies and analytics (pandas, numpy)"
echo "   4) Monitoring and dashboard (plotly, dash)"
echo "   5) All of the above"
echo "   6) Skip optional dependencies"
echo ""
read -p "Select option (1-6): " OPTION

case $OPTION in
  1)
    pip install flask python-telegram-bot openpyxl
    ;;
  2)
    pip install aiohttp orjson jq
    ;;
  3)
    pip install pandas numpy
    ;;
  4)
    pip install plotly dash
    ;;
  5)
    pip install flask python-telegram-bot openpyxl aiohttp orjson jq pandas numpy plotly dash
    ;;
  6)
    echo "   Skipping optional dependencies"
    ;;
  *)
    echo "   Invalid option, skipping optional dependencies"
    ;;
esac

# Test installation
echo "🧪 Testing installation..."
cd "$INSTALL_DIR"

# Test Python imports
echo "   Testing Python imports..."
python3 -c "import requests, yaml, dotenv; print('✓ Core imports successful')"

# Test security scripts
echo "   Testing security scripts..."
source security/security_checks.sh 2>/dev/null && echo "✓ Security scripts loaded"

# Register with OpenClaw
echo "🔗 Registering with OpenClaw..."
OPENCLAW_SKILLS_DIR="$HOME/.openclaw/skills"

# Create symlink if skills directory exists
if [ -d "$OPENCLAW_SKILLS_DIR" ]; then
  SKILL_LINK="$OPENCLAW_SKILLS_DIR/binance-enhanced"
  if [ ! -L "$SKILL_LINK" ]; then
    ln -sf "$INSTALL_DIR" "$SKILL_LINK"
    echo "✓ Created symlink: $SKILL_LINK → $INSTALL_DIR"
  fi
fi

# Create activation script
cat > "$INSTALL_DIR/activate.sh" << 'EOF'
#!/bin/bash
# Activation script for Binance Enhanced Skill

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Activating Binance Enhanced Skill"
echo "====================================="

# Add to Python path
export PYTHONPATH="$SKILL_DIR:$PYTHONPATH"

# Source security scripts
if [ -f "$SKILL_DIR/security/security_checks.sh" ]; then
  source "$SKILL_DIR/security/security_checks.sh"
  echo "✓ Security checks loaded"
fi

# Set environment variables
export BINANCE_ENHANCED_SKILL_DIR="$SKILL_DIR"
export BINANCE_CONFIG_DIR="$SKILL_DIR/config"

# Load environment file if exists
if [ -f "$SKILL_DIR/config/.env" ]; then
  set -a
  source "$SKILL_DIR/config/.env"
  set +a
  echo "✓ Environment loaded from $SKILL_DIR/config/.env"
fi

echo "✅ Binance Enhanced Skill activated!"
echo ""
echo "Available commands:"
echo "  • test-connection    - Test Binance API connection"
echo "  • start-bot          - Start Telegram bot"
echo "  • start-dashboard    - Start monitoring dashboard"
echo "  • run-tests          - Run integration tests"
echo ""
echo "Usage examples:"
echo "  python3 -m ux.parser 'купи 0.1 BTC по рынку'"
echo "  ./test/testnet.sh"
echo "  python3 strategies/dca.py"
EOF

chmod +x "$INSTALL_DIR/activate.sh"

# Create helper scripts
cat > "$INSTALL_DIR/test-connection.sh" << 'EOF'
#!/bin/bash
# Test Binance API connection

cd "$(dirname "$0")"
./test/testnet.sh
EOF

cat > "$INSTALL_DIR/start-bot.sh" << 'EOF'
#!/bin/bash
# Start Telegram bot

cd "$(dirname "$0")/telegram-bot"
source ../venv/bin/activate
python3 bot.py
EOF

cat > "$INSTALL_DIR/start-dashboard.sh" << 'EOF'
#!/bin/bash
# Start monitoring dashboard

cd "$(dirname "$0")/monitoring/dashboard"
source ../../venv/bin/activate
FLASK_APP=app.py flask run --host=0.0.0.0 --port=8080
EOF

cat > "$INSTALL_DIR/run-tests.sh" << 'EOF'
#!/bin/bash
# Run integration tests

cd "$(dirname "$0")"
./test/test_integration.sh
EOF

chmod +x "$INSTALL_DIR"/*.sh

echo ""
echo "🎉 Installation complete!"
echo "========================"
echo ""
echo "Next steps:"
echo "1. Edit configuration files:"
echo "   nano $INSTALL_DIR/config/.env          # Add your API keys"
echo "   nano $INSTALL_DIR/config/config.yaml   # Configure risk profile"
echo ""
echo "2. Activate the skill:"
echo "   source $INSTALL_DIR/activate.sh"
echo ""
echo "3. Test the installation:"
echo "   ./test-connection.sh                   # Test Binance API"
echo "   ./run-tests.sh                         # Run integration tests"
echo ""
echo "4. Start services:"
echo "   ./start-bot.sh                         # Start Telegram bot"
echo "   ./start-dashboard.sh                   # Start monitoring dashboard"
echo ""
echo "5. For OpenClaw integration:"
echo "   Add to your OpenClaw config:"
echo "   {"
echo "     \"skills\": {"
echo "       \"binance-enhanced\": {"
echo "         \"path\": \"$INSTALL_DIR\","
echo "         \"enabled\": true"
echo "       }"
echo "     }"
echo "   }"
echo ""
echo "📚 Documentation:"
echo "   • Full documentation: $INSTALL_DIR/SKILL.md"
echo "   • FAQ: $INSTALL_DIR/FAQ.md"
echo "   • Troubleshooting: $INSTALL_DIR/TROUBLESHOOTING.md"
echo ""
echo "Need help? Check the documentation or open an issue on GitHub."
echo ""
echo "Happy trading! 🚀"