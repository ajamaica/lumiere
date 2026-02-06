#!/bin/bash
# Get current public IP and location
# Usage: ./get_ip.sh

echo "Fetching IP information..."

URLS=(
  myip.ipip.net
  ifconfig.me
  icanhazip.com
  https://api.ipify.org
)

# Try myip.ipip.net first, it shows geolocation
declare -A ip_results
count=0
for url in "${URLS[@]}"; do
    IP=$(curl -s --max-time 3 --connect-timeout 3 "$url" 2>/dev/null)
    if [ $? -eq 28 ] || [ $? -eq -1 ]; then
        continue
    fi
    # echo $http_status $IP
    ip_results["$url"]="$IP"

    count=$((count + 1))
    if [ $count -gt 1 ]; then
        break
    fi
done

for url in "${!ip_results[@]}"; do
    # echo "from" "$url" "=>" "$IP"
    IP="${ip_results[$url]}"
    if [ "$url" == "myip.ipip.net" ]; then
        echo $IP
        continue
    fi
    
    # Try to get geolocation
    GEO=$(curl -s "https://ipinfo.io/$IP/json" 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$GEO" ]; then
        echo "$IP"
        echo "$GEO" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"Location: {data.get('city', 'N/A')}, {data.get('region', 'N/A')}, {data.get('country', 'N/A')} {data.get('org', 'N/A')}\")
"
    fi
done
