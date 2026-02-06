# OpenClaw Cloud Setup Skill

Deploy OpenClaw to GCP with Tailscale and Brave Search.

## Required Environment Variables

```bash
export OPENCLAW_PROJECT_ID="your-gcp-project"
export OPENCLAW_USERNAME="your-ssh-username"
export ANTHROPIC_TOKEN="sk-ant-oat01-..."   # Keep secret
export BRAVE_API_KEY="..."                   # Keep secret
```

## Quick Start

```bash
chmod +x openclaw-quick-setup.sh
./openclaw-quick-setup.sh
```

## Manual Setup (Copy-Paste)

```bash
# Set variables first (see above)
ZONE="us-central1-a"
VM="openclaw"

# Create VM
gcloud compute instances create "$VM" \
  --project="$OPENCLAW_PROJECT_ID" --zone="$ZONE" \
  --machine-type=e2-medium \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=10GB \
  --metadata=ssh-keys="${OPENCLAW_USERNAME}:$(cat ~/.ssh/id_ed25519.pub)"

IP=$(gcloud compute instances describe "$VM" \
  --project="$OPENCLAW_PROJECT_ID" --zone="$ZONE" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# Wait for SSH, then run setup
sleep 30
ssh -o StrictHostKeyChecking=no "${OPENCLAW_USERNAME}@${IP}" "
set -euo pipefail
sudo apt-get update && sudo apt-get install -y git curl ufw jq
curl -fsSL https://tailscale.com/install.sh | sh
"

# Manual: authorize Tailscale
ssh "${OPENCLAW_USERNAME}@${IP}" "sudo tailscale up"

# Continue setup
ssh "${OPENCLAW_USERNAME}@${IP}" "
set -euo pipefail
sudo ufw allow 22/tcp && sudo ufw allow in on tailscale0 && echo y | sudo ufw enable
echo 'nameserver 8.8.8.8' | sudo tee -a /etc/resolv.conf
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh && nvm install 22
source ~/.nvm/nvm.sh && npm install -g openclaw@latest
"

# Configure OpenClaw (credentials via stdin)
ssh "${OPENCLAW_USERNAME}@${IP}" '
source ~/.nvm/nvm.sh
openclaw onboard --non-interactive --accept-risk \
  --auth-choice token --token-provider anthropic \
  --token "$(cat)" --gateway-bind loopback --install-daemon
' <<< "$ANTHROPIC_TOKEN"

# Add Brave key + enable Tailscale auth
ssh "${OPENCLAW_USERNAME}@${IP}" "
set -euo pipefail
mkdir -p ~/.config/systemd/user/openclaw-gateway.service.d
cat > ~/.config/systemd/user/openclaw-gateway.service.d/brave.conf << CONF
[Service]
Environment=\"BRAVE_API_KEY=\$(cat)\"
CONF
chmod 600 ~/.config/systemd/user/openclaw-gateway.service.d/brave.conf
systemctl --user daemon-reload
source ~/.nvm/nvm.sh
jq '.gateway.auth.allowTailscale = true' ~/.openclaw/openclaw.json > /tmp/oc.json
mv /tmp/oc.json ~/.openclaw/openclaw.json
chmod 600 ~/.openclaw/openclaw.json
openclaw gateway restart
sudo tailscale serve --bg 18789
" <<< "$BRAVE_API_KEY"

# Get dashboard URL
ssh "${OPENCLAW_USERNAME}@${IP}" "tailscale serve status"

# After first browser access, approve device
ssh "${OPENCLAW_USERNAME}@${IP}" 'source ~/.nvm/nvm.sh && openclaw devices list'
# Then: openclaw devices approve <REQUEST_ID>
```

## Key Learnings

| Issue                        | Solution                            |
| ---------------------------- | ----------------------------------- |
| e2-micro OOM                 | Use e2-medium (4GB minimum)         |
| nodesource failures          | Use nvm for Node.js 22              |
| DNS broken after Tailscale   | Add `8.8.8.8` to /etc/resolv.conf   |
| Brave key in config rejected | Use systemd env var drop-in         |
| Dashboard "pairing required" | Run `openclaw devices approve <id>` |

## Security Notes

- Credentials passed via stdin (`<<<`), not command-line args
- Config files set to `chmod 600`
- Gateway binds to loopback, exposed only via Tailscale
- UFW blocks all inbound except SSH and Tailscale
