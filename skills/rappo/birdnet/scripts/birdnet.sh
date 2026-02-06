#!/bin/bash
set -e

# BirdNET-Go API wrapper
# Credentials: ~/.clawdbot/credentials/birdnet/config.json

CONFIG_FILE="$HOME/.clawdbot/credentials/birdnet/config.json"

if [ -f "$CONFIG_FILE" ]; then
  BIRDNET_URL=$(jq -r '.url' "$CONFIG_FILE")
fi

# Default if not configured
if [ -z "$BIRDNET_URL" ]; then
  BIRDNET_URL="http://192.168.1.50:783"
fi

API="$BIRDNET_URL/api/v2"

cmd="$1"
shift || true

case "$cmd" in
  recent)
    limit="${1:-10}"
    
    echo "=== Recent Bird Detections ==="
    echo ""
    
    curl -s "$API/detections?limit=$limit" | jq -r '.data[] | 
      "🐦 \(.commonName) (\(.scientificName))" +
      "\n   Confidence: \(.confidence * 100 | floor)%" +
      "\n   Time: \(.date) \(.time)" +
      "\n   Status: \(.verified)" +
      (if .weather then "\n   Weather: \(.weather.temperature)°C, \(.weather.description)" else "" end) +
      "\n   ID: \(.id)" +
      "\n"
    '
    ;;
    
  search)
    query="$1"
    if [ -z "$query" ]; then
      echo "Usage: search \"Bird Name\""
      exit 1
    fi
    
    echo "=== Searching for: $query ==="
    echo ""
    
    # Get all recent detections and filter
    curl -s "$API/detections?limit=100" | jq --arg q "$query" -r '
      .data[] | 
      select(.commonName | ascii_downcase | contains($q | ascii_downcase)) |
      "🐦 \(.commonName) (\(.scientificName))" +
      "\n   Confidence: \(.confidence * 100 | floor)%" +
      "\n   Time: \(.date) \(.time)" +
      "\n   ID: \(.id)" +
      "\n"
    '
    ;;
    
  detection)
    id="$1"
    if [ -z "$id" ]; then
      echo "Usage: detection <id>"
      exit 1
    fi
    
    result=$(curl -s "$API/detections/$id")
    
    if [ "$result" = "null" ] || [ -z "$result" ]; then
      echo "❌ Detection not found"
      exit 1
    fi
    
    echo "$result" | jq -r '
      "=== Detection Details ===" +
      "\n\n🐦 \(.commonName)" +
      "\n   Scientific: \(.scientificName)" +
      "\n   Species Code: \(.speciesCode)" +
      "\n" +
      "\n📊 Detection Info:" +
      "\n   Confidence: \(.confidence * 100 | floor)%" +
      "\n   Time: \(.beginTime)" +
      "\n   Time of Day: \(.timeOfDay)" +
      "\n   Verified: \(.verified)" +
      "\n" +
      (if .weather then 
        "\n🌤️ Weather:" +
        "\n   Temperature: \(.weather.temperature)°C" +
        "\n   Description: \(.weather.description)" +
        "\n   Wind: \(.weather.windSpeed)" +
        "\n   Humidity: \(.weather.humidity)%"
      else "" end) +
      "\n" +
      "\n📈 Stats:" +
      "\n   Days since first seen: \(.daysSinceFirstSeen)" +
      "\n   Days this year: \(.daysThisYear)" +
      "\n   Season: \(.currentSeason)"
    '
    ;;
    
  species)
    scientificName="$1"
    if [ -z "$scientificName" ]; then
      echo "Usage: species \"Scientific Name\""
      echo "Example: species \"Corvus corax\""
      exit 1
    fi
    
    encodedName=$(echo "$scientificName" | jq -sRr @uri)
    result=$(curl -s "$API/species?scientific_name=$encodedName")
    
    if [ "$result" = "null" ] || [ -z "$result" ]; then
      echo "❌ Species not found"
      exit 1
    fi
    
    echo "$result" | jq -r '
      "=== Species Information ===" +
      "\n\n🐦 \(.common_name)" +
      "\n   Scientific: \(.scientific_name)" +
      "\n" +
      "\n📊 Rarity:" +
      "\n   Status: \(.rarity.status)" +
      "\n   Score: \(.rarity.score)" +
      (if .rarity.location_based then "\n   Location-based: Yes" else "" end) +
      "\n" +
      "\n🧬 Taxonomy:" +
      "\n   Kingdom: \(.taxonomy.kingdom)" +
      "\n   Phylum: \(.taxonomy.phylum)" +
      "\n   Class: \(.taxonomy.class)" +
      "\n   Order: \(.taxonomy.order)" +
      "\n   Family: \(.taxonomy.family)" +
      "\n   Genus: \(.taxonomy.genus)" +
      "\n   Species: \(.taxonomy.species)"
    '
    ;;
    
  today)
    today=$(date +%Y-%m-%d)
    
    echo "=== Today's Bird Detections ($today) ==="
    echo ""
    
    curl -s "$API/detections?limit=200" | jq --arg today "$today" -r '
      .data[] | 
      select(.date == $today) |
      "🐦 \(.commonName)" +
      "\n   Time: \(.time)" +
      "\n   Confidence: \(.confidence * 100 | floor)%" +
      "\n"
    ' | head -50
    
    # Show unique species count
    unique=$(curl -s "$API/detections?limit=200" | jq --arg today "$today" -r '
      [.data[] | select(.date == $today) | .commonName] | unique | length
    ')
    total=$(curl -s "$API/detections?limit=200" | jq --arg today "$today" -r '
      [.data[] | select(.date == $today)] | length
    ')
    
    echo ""
    echo "📊 Summary: $total detections, $unique unique species"
    ;;
    
  stats)
    echo "=== BirdNET-Go Stats ==="
    echo ""
    
    # Get recent detections and calculate stats
    curl -s "$API/detections?limit=500" | jq -r '
      "Total detections queried: \(.data | length)",
      "",
      "Top species (last 500 detections):",
      "",
      (.data | group_by(.commonName) | 
       map({name: .[0].commonName, count: length}) | 
       sort_by(.count) | reverse | .[0:10] | 
       .[] | "  \(.count)x \(.name)"
      )
    '
    ;;
    
  *)
    echo "Usage: birdnet.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  recent [limit]              Show recent detections (default: 10)"
    echo "  search \"Bird Name\"          Search detections by species name"
    echo "  detection <id>              Get detailed info about a detection"
    echo "  species \"Scientific Name\"   Get species info and rarity"
    echo "  today                       Show today's detections"
    echo "  stats                       Show detection statistics"
    echo ""
    echo "Examples:"
    echo "  birdnet.sh recent 5"
    echo "  birdnet.sh search \"Raven\""
    echo "  birdnet.sh detection 28470"
    echo "  birdnet.sh species \"Corvus corax\""
    ;;
esac
