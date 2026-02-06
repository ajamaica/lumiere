#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 31: Gateway binding and firewall configuration"

NEEDS_FIX=0

# Check if openclaw CLI is available
if command -v openclaw &>/dev/null; then
    GATEWAY_BIND=$(openclaw config get gateway.bind 2>/dev/null)

    if [[ -n "$GATEWAY_BIND" ]]; then
        log "Current gateway.bind: $GATEWAY_BIND"

        # Check if bound to non-localhost addresses
        if [[ "$GATEWAY_BIND" != "localhost" && "$GATEWAY_BIND" != "127.0.0.1" && "$GATEWAY_BIND" != "::1" ]]; then
            log "WARNING: Gateway is exposed to network (bound to $GATEWAY_BIND)"

            if confirm "Bind gateway to localhost only?"; then
                if $DRY_RUN; then
                    log "[DRY-RUN] Would set gateway.bind=localhost"
                    ((FIXED++))
                else
                    if openclaw config set gateway.bind localhost; then
                        log "Successfully bound gateway to localhost"
                        ((FIXED++))
                    else
                        log "ERROR: Failed to update gateway.bind"
                        ((FAILED++))
                    fi
                fi
                NEEDS_FIX=1
            else
                log "Gateway will remain exposed to network"
                ((FAILED++))
                NEEDS_FIX=1
            fi
        else
            log "Gateway is already bound to localhost"
        fi
    fi
else
    log "openclaw CLI not found, skipping gateway bind check"
fi

# Detect OS and provide firewall guidance
OS_TYPE=$(uname -s)

log "Providing firewall configuration guidance for $OS_TYPE..."

case "$OS_TYPE" in
    Darwin)
        guidance "macOS Firewall Configuration" \
            "Configure macOS pf (Packet Filter) firewall to restrict OpenClaw access:" \
            "" \
            "METHOD 1: Application Firewall (GUI)" \
            "1. System Preferences → Security & Privacy → Firewall" \
            "2. Enable Firewall" \
            "3. Click 'Firewall Options'" \
            "4. Find OpenClaw and set to 'Block incoming connections'" \
            "   OR allow only specific apps" \
            "" \
            "METHOD 2: pf Firewall (Advanced)" \
            "1. Create firewall rules: sudo nano /etc/pf.anchors/openclaw" \
            "   # Block external access to OpenClaw ports" \
            "   block in proto tcp from any to any port 3000" \
            "   pass in proto tcp from 127.0.0.1 to any port 3000" \
            "   pass in proto tcp from ::1 to any port 3000" \
            "" \
            "2. Load anchor in /etc/pf.conf:" \
            "   anchor \"openclaw\"" \
            "   load anchor \"openclaw\" from \"/etc/pf.anchors/openclaw\"" \
            "" \
            "3. Enable and reload pf:" \
            "   sudo pfctl -e" \
            "   sudo pfctl -f /etc/pf.conf" \
            "" \
            "4. Verify rules: sudo pfctl -sr" \
            "" \
            "METHOD 3: Little Snitch (Third-party)" \
            "- Install Little Snitch for detailed application firewall" \
            "- Create rule to block OpenClaw network access except localhost"
        ;;
    Linux)
        # Detect Linux distribution
        if command -v firewall-cmd &>/dev/null; then
            FW_TYPE="firewalld"
        elif command -v ufw &>/dev/null; then
            FW_TYPE="ufw"
        else
            FW_TYPE="iptables"
        fi

        case "$FW_TYPE" in
            firewalld)
                guidance "Linux Firewall Configuration (firewalld)" \
                    "Configure firewalld to restrict OpenClaw access:" \
                    "" \
                    "1. Block OpenClaw port from external access:" \
                    "   sudo firewall-cmd --permanent --remove-port=3000/tcp" \
                    "   sudo firewall-cmd --reload" \
                    "" \
                    "2. Allow only localhost access (if needed):" \
                    "   sudo firewall-cmd --permanent --zone=trusted --add-source=127.0.0.1" \
                    "   sudo firewall-cmd --permanent --zone=trusted --add-port=3000/tcp" \
                    "   sudo firewall-cmd --reload" \
                    "" \
                    "3. Verify rules:" \
                    "   sudo firewall-cmd --list-all" \
                    "" \
                    "4. Check status:" \
                    "   sudo firewall-cmd --state"
                ;;
            ufw)
                guidance "Linux Firewall Configuration (ufw)" \
                    "Configure ufw to restrict OpenClaw access:" \
                    "" \
                    "1. Enable ufw if not already enabled:" \
                    "   sudo ufw enable" \
                    "" \
                    "2. Deny OpenClaw port by default:" \
                    "   sudo ufw deny 3000/tcp" \
                    "" \
                    "3. Allow only localhost access:" \
                    "   sudo ufw allow from 127.0.0.1 to any port 3000 proto tcp" \
                    "" \
                    "4. Verify rules:" \
                    "   sudo ufw status verbose" \
                    "" \
                    "5. Check numbered rules:" \
                    "   sudo ufw status numbered"
                ;;
            iptables)
                guidance "Linux Firewall Configuration (iptables)" \
                    "Configure iptables to restrict OpenClaw access:" \
                    "" \
                    "1. Allow localhost access only:" \
                    "   sudo iptables -A INPUT -p tcp --dport 3000 -s 127.0.0.1 -j ACCEPT" \
                    "   sudo iptables -A INPUT -p tcp --dport 3000 -j DROP" \
                    "" \
                    "2. For IPv6:" \
                    "   sudo ip6tables -A INPUT -p tcp --dport 3000 -s ::1 -j ACCEPT" \
                    "   sudo ip6tables -A INPUT -p tcp --dport 3000 -j DROP" \
                    "" \
                    "3. Save rules (Debian/Ubuntu):" \
                    "   sudo apt-get install iptables-persistent" \
                    "   sudo netfilter-persistent save" \
                    "" \
                    "4. Save rules (RHEL/CentOS):" \
                    "   sudo service iptables save" \
                    "" \
                    "5. Verify rules:" \
                    "   sudo iptables -L -n -v" \
                    "" \
                    "6. Make persistent across reboots:" \
                    "   sudo systemctl enable iptables" \
                    "   sudo systemctl enable ip6tables"
                ;;
        esac
        ;;
    *)
        guidance "Firewall Configuration" \
            "Detected OS: $OS_TYPE" \
            "" \
            "Configure your firewall to:" \
            "1. Block external access to port 3000 (or your OpenClaw port)" \
            "2. Allow only localhost (127.0.0.1) connections" \
            "3. Use a reverse proxy (nginx/caddy) if external access needed" \
            "" \
            "Consult your OS documentation for firewall configuration."
        ;;
esac

if [[ $NEEDS_FIX -eq 1 ]]; then
    ((FAILED++))
fi

finish
