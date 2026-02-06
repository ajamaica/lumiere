#!/bin/bash
# host-info.sh - Gather ESXi host statistics and health

ESXI_USER="${ESXI_USER:-root}"
ESXI_HOST="${1:-}"

usage() {
    echo "Usage: ESXI_USER=<user> $0 <esxi-host>"
    echo "Environment: ESXI_USER (default: root)"
    exit 1
}

[[ -z "$ESXI_HOST" ]] && usage

echo "=== ESXi Host: $ESXI_HOST (User: $ESXI_USER) ==="
echo ""
echo "--- Version ---"
ssh "${ESXI_USER}@${ESXI_HOST}" "esxcli system version get"
echo ""
echo "--- Hostname ---"
ssh "${ESXI_USER}@${ESXI_HOST}" "esxcli system hostname get"
echo ""
echo "--- Uptime ---"
ssh "${ESXI_USER}@${ESXI_HOST}" "uptime"
echo ""
echo "--- Health Status ---"
ssh "${ESXI_USER}@${ESXI_HOST}" "esxcli hardware platform get"
echo ""
echo "--- Memory ---"
ssh "${ESXI_USER}@${ESXI_HOST}" "esxcli hardware memory get"
echo ""
echo "--- Storage ---"
ssh "${ESXI_USER}@${ESXI_HOST}" "esxcli storage filesystem list"
echo ""
echo "--- Network Interfaces ---"
ssh "${ESXI_USER}@${ESXI_HOST}" "esxcli network ip interface ipv4 get"
