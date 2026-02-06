#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 27: Docker security hardening"

if ! command -v docker &>/dev/null; then
    log "Docker not found, skipping check"
    finish
fi

# Check for running OpenClaw containers
CONTAINERS=$(docker ps --filter "name=openclaw" --filter "name=claw" --format "{{.ID}}" 2>/dev/null)

if [[ -z "$CONTAINERS" ]]; then
    log "No OpenClaw containers found running"
    finish
fi

log "Found OpenClaw container(s), analyzing security configuration..."

ISSUES_FOUND=0

while read -r CONTAINER_ID; do
    if [[ -z "$CONTAINER_ID" ]]; then
        continue
    fi

    CONTAINER_NAME=$(docker inspect -f '{{.Name}}' "$CONTAINER_ID" 2>/dev/null | sed 's/^\///')
    log "Checking container: $CONTAINER_NAME ($CONTAINER_ID)"

    # Check if running as root
    USER=$(docker inspect -f '{{.Config.User}}' "$CONTAINER_ID" 2>/dev/null)
    if [[ -z "$USER" || "$USER" == "0" || "$USER" == "root" ]]; then
        log "  WARNING: Container running as root user"
        ((ISSUES_FOUND++))
    fi

    # Check for docker socket mount
    if docker inspect -f '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' "$CONTAINER_ID" 2>/dev/null | grep -q "/var/run/docker.sock"; then
        log "  WARNING: Docker socket mounted (container can control host Docker)"
        ((ISSUES_FOUND++))
    fi

    # Check for privileged mode
    PRIVILEGED=$(docker inspect -f '{{.HostConfig.Privileged}}' "$CONTAINER_ID" 2>/dev/null)
    if [[ "$PRIVILEGED" == "true" ]]; then
        log "  WARNING: Container running in privileged mode"
        ((ISSUES_FOUND++))
    fi

    # Check for host network mode
    NETWORK_MODE=$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$CONTAINER_ID" 2>/dev/null)
    if [[ "$NETWORK_MODE" == "host" ]]; then
        log "  WARNING: Container using host network mode"
        ((ISSUES_FOUND++))
    fi
done <<< "$CONTAINERS"

if [[ $ISSUES_FOUND -gt 0 ]]; then
    guidance "Docker Security Hardening" \
        "Found $ISSUES_FOUND security issue(s) in running containers." \
        "" \
        "RECOMMENDED HARDENED DOCKER RUN COMMAND:" \
        "" \
        "docker run -d \\" \
        "  --name openclaw \\" \
        "  --user 1000:1000 \\" \
        "  --read-only \\" \
        "  --tmpfs /tmp:rw,noexec,nosuid,size=100m \\" \
        "  --security-opt=no-new-privileges:true \\" \
        "  --cap-drop=ALL \\" \
        "  --cap-add=NET_BIND_SERVICE \\" \
        "  --network bridge \\" \
        "  -p 127.0.0.1:3000:3000 \\" \
        "  -v \$HOME/.openclaw:/home/openclaw/.openclaw:rw \\" \
        "  -e OPENCLAW_CONFIG_DIR=/home/openclaw/.openclaw \\" \
        "  openclaw/openclaw:latest" \
        "" \
        "Key security features:" \
        "- Runs as non-root user (1000:1000)" \
        "- Read-only root filesystem" \
        "- Drops all capabilities except NET_BIND_SERVICE" \
        "- Prevents privilege escalation" \
        "- Binds only to localhost" \
        "- No docker socket mount" \
        "" \
        "To apply: Stop current container and recreate with hardened settings"
    ((FAILED++))
else
    log "Container security configuration looks good"
fi

finish
