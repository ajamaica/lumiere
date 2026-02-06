#!/bin/bash
# Discover Wyze cameras on local network
# Looks for common Wyze IP addresses and ports

echo "Searching for Wyze cameras on local network..."
echo ""

# Common Wyze ports to check
for port in 554 8554 8080 443; do
    for ip in 192.168.1.{1..254}; do
        (timeout 0.1 bash -c "echo > /dev/tcp/$ip/$port" 2>/dev/null && echo "Port $port open at $ip") &
    done
done
wait 2>/dev/null

echo ""
echo "Checking ARP table for Wyze devices..."
arp -a | grep -i "wyze\|wyzecam" || echo "No Wyze devices found in ARP table"

echo ""
echo "To enable RTSP on your Wyze camera:"
echo "1. Open Wyze app → Camera Settings → Advanced Settings"
echo "2. Enable RTSP"
echo "3. Set username/password"
echo "4. Copy the RTSP URL (looks like: rtsp://192.168.1.XXX/live)"
echo ""
echo "Then run: export WYZE_RTSP_URL='rtsp://...' && ./capture-wyze.sh"
