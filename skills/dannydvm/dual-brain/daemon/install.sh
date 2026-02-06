#!/bin/bash
# Dual-Brain Daemon Installer
# Supports macOS (launchd) and Linux (systemd)

set -e

# Detect platform
PLATFORM=$(uname -s)

if [ "$PLATFORM" = "Darwin" ]; then
  echo "🍎 Installing for macOS (launchd)..."
  
  # Get paths
  NODE_PATH=$(which node)
  CLI_PATH=$(which dual-brain)
  PLIST_PATH="$HOME/Library/LaunchAgents/com.dual-brain.plist"
  LOG_DIR="$HOME/.dual-brain"
  
  mkdir -p "$LOG_DIR"
  
  # Create plist
  cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dual-brain</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$CLI_PATH</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/launchd.error.log</string>
</dict>
</plist>
EOF
  
  echo "✅ Installed: $PLIST_PATH"
  
  # Load service
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  launchctl load "$PLIST_PATH"
  
  echo "✅ Service loaded and running"
  echo ""
  echo "Commands:"
  echo "  launchctl stop com.dual-brain    # Stop service"
  echo "  launchctl start com.dual-brain   # Start service"
  echo "  launchctl unload $PLIST_PATH  # Disable service"
  
elif [ "$PLATFORM" = "Linux" ]; then
  echo "🐧 Installing for Linux (systemd)..."
  
  NODE_PATH=$(which node)
  CLI_PATH=$(which dual-brain)
  SERVICE_PATH="/etc/systemd/system/dual-brain.service"
  
  # Create service file
  cat > /tmp/dual-brain.service <<EOF
[Unit]
Description=Dual-Brain Daemon
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$NODE_PATH $CLI_PATH start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
  
  echo "✅ Service file created"
  echo ""
  echo "To install (requires sudo):"
  echo "  sudo mv /tmp/dual-brain.service $SERVICE_PATH"
  echo "  sudo systemctl daemon-reload"
  echo "  sudo systemctl enable dual-brain"
  echo "  sudo systemctl start dual-brain"
  echo ""
  echo "Check status:"
  echo "  sudo systemctl status dual-brain"
  
else
  echo "❌ Unsupported platform: $PLATFORM"
  exit 1
fi
