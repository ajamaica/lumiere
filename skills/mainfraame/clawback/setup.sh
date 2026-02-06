#!/bin/bash
# ClawBack Setup Script for OpenClaw Skill

set -e

echo "🔧 Setting up ClawBack..."
echo "=========================="

# Check Python version
echo "Checking Python version..."
python3 --version

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -e .

# Make CLI executable
echo "Making CLI executable..."
chmod +x bin/clawback.py

# Create config directory
echo "Creating config directory..."
mkdir -p ~/.clawback

# Check if config exists
if [ ! -f ~/.clawback/config.json ]; then
    echo "Creating default config..."
    cat > ~/.clawback/config.json << 'EOF'
{
  "broker": {
    "adapter": "etrade",
    "environment": "sandbox",
    "credentials": {
      "apiKey": "",
      "apiSecret": ""
    }
  },
  "trading": {
    "accountId": "",
    "initialCapital": 50000,
    "tradeScalePercentage": 0.01,
    "maxPositionPercentage": 0.05,
    "dailyLossLimit": 0.02
  },
  "notifications": {
    "telegram": {
      "enabled": true,
      "useOpenClaw": true
    }
  },
  "congress": {
    "dataSource": "official",
    "pollIntervalHours": 24,
    "minimumTradeSize": 10000
  }
}
EOF
    echo "Default config created at ~/.clawback/config.json"
fi

# Create symlink to CLI
echo "Creating symlink to CLI..."
sudo ln -sf "$(pwd)/bin/clawback.py" /usr/local/bin/clawback 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit ~/.clawback/config.json with your broker credentials"
echo "2. Run 'clawback setup' to complete configuration"
echo "3. Run 'clawback status' to check system status"
echo ""
echo "💡 To activate the virtual environment:"
echo "   source venv/bin/activate"
echo ""
echo "🚀 To start trading:"
echo "   clawback run"