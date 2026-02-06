#!/bin/bash
set -e

# Lidarr API wrapper
# Credentials: ~/.clawdbot/credentials/lidarr/config.json

CONFIG_FILE="$HOME/.clawdbot/credentials/lidarr/config.json"

if [ -f "$CONFIG_FILE" ]; then
  LIDARR_URL=$(jq -r '.url' "$CONFIG_FILE")
  LIDARR_API_KEY=$(jq -r '.apiKey' "$CONFIG_FILE")
  DEFAULT_QUALITY_PROFILE=$(jq -r '.defaultQualityProfile // empty' "$CONFIG_FILE")
  DEFAULT_METADATA_PROFILE=$(jq -r '.defaultMetadataProfile // empty' "$CONFIG_FILE")
fi

if [ -z "$LIDARR_URL" ] || [ -z "$LIDARR_API_KEY" ]; then
  echo "Error: Lidarr not configured. Create $CONFIG_FILE with {\"url\": \"...\", \"apiKey\": \"...\"}"
  exit 1
fi

API="$LIDARR_URL/api/v1"
AUTH="X-Api-Key: $LIDARR_API_KEY"

cmd="$1"
shift || true

case "$cmd" in
  search)
    query="$1"
    results=$(curl -s -H "$AUTH" "$API/artist/lookup?term=$(echo "$query" | jq -sRr @uri)")
    echo "$results" | jq -r '
      to_entries | .[] | 
      "\(.key + 1). \(.value.artistName)" +
      (if .value.disambiguation then " (\(.value.disambiguation))" else "" end) +
      " - https://musicbrainz.org/artist/\(.value.foreignArtistId)" +
      " [ID: \(.value.foreignArtistId)]"
    '
    echo ""
    echo "💡 Use 'list-artist-albums <artistId>' to see albums after adding"
    ;;
    
  search-json)
    query="$1"
    curl -s -H "$AUTH" "$API/artist/lookup?term=$(echo "$query" | jq -sRr @uri)"
    ;;
    
  exists)
    foreignArtistId="$1"
    result=$(curl -s -H "$AUTH" "$API/artist")
    existing=$(echo "$result" | jq --arg fid "$foreignArtistId" '[.[] | select(.foreignArtistId == $fid)]')
    if [ "$existing" = "[]" ]; then
      echo "not_found"
    else
      echo "exists"
      echo "$existing" | jq -r '.[0] | "ID: \(.id), Name: \(.artistName), Albums: \(.albums | length), Monitored: \(.monitored)"'
    fi
    ;;
    
  list-artist-albums)
    artistId="$1"
    if [ -z "$artistId" ]; then
      echo "Usage: list-artist-albums <artistId>"
      echo "Get artistId from 'list' command"
      exit 1
    fi
    
    # Check if it's a foreignArtistId (MusicBrainz ID) or internal ID
    if echo "$artistId" | grep -qE '^[a-f0-9-]{36}$'; then
      # It's a MusicBrainz ID, find internal ID
      artist=$(curl -s -H "$AUTH" "$API/artist" | jq --arg fid "$artistId" '.[] | select(.foreignArtistId == $fid)')
      if [ -z "$artist" ]; then
        echo "❌ Artist not found in library"
        exit 1
      fi
      internalId=$(echo "$artist" | jq -r '.id')
    else
      internalId="$artistId"
    fi
    
    echo "=== Albums ==="
    curl -s -H "$AUTH" "$API/album?artistId=$internalId" | jq -r '
      sort_by(.releaseDate) | reverse | .[] |
      "\(.id): \(.title) (\(.releaseDate | split("T")[0])) - Monitored: \(.monitored)"
    '
    ;;
    
  monitor-album)
    albumId="$1"
    searchFlag="true"
    
    for arg in "$@"; do
      if [ "$arg" = "--no-search" ]; then
        searchFlag="false"
      fi
    done
    
    if [ -z "$albumId" ]; then
      echo "Usage: monitor-album <albumId> [--no-search]"
      exit 1
    fi
    
    # Get album details
    album=$(curl -s -H "$AUTH" "$API/album/$albumId")
    
    if [ -z "$album" ] || [ "$album" = "null" ] || [ "$album" = "[]" ]; then
      echo "❌ Album not found"
      exit 1
    fi
    
    # Update to monitored
    updatePayload=$(echo "$album" | jq --argjson search "$searchFlag" '
      .monitored = true |
      if $search then
        .addOptions = {searchForNewAlbum: true}
      else
        .addOptions = {searchForNewAlbum: false}
      end
    ')
    
    result=$(curl -s -X PUT -H "$AUTH" -H "Content-Type: application/json" -d "$updatePayload" "$API/album/$albumId")
    
    if echo "$result" | jq -e '.id' > /dev/null 2>&1; then
      title=$(echo "$result" | jq -r '.title')
      releaseDate=$(echo "$result" | jq -r '.releaseDate | split("T")[0]')
      echo "✅ Monitoring: $title ($releaseDate)"
      if [ "$searchFlag" = "true" ]; then
        echo "🔍 Search started"
      fi
    else
      echo "❌ Failed to update album"
      echo "$result" | jq -r '.message // .'
    fi
    ;;
    
  config)
    echo "=== Root Folders ==="
    curl -s -H "$AUTH" "$API/rootfolder" | jq -r '.[] | "\(.id): \(.path)"'
    echo ""
    echo "=== Quality Profiles ==="
    curl -s -H "$AUTH" "$API/qualityprofile" | jq -r '.[] | "\(.id): \(.name)"'
    echo ""
    echo "=== Metadata Profiles ==="
    curl -s -H "$AUTH" "$API/metadataprofile" | jq -r '.[] | "\(.id): \(.name)"'
    ;;
    
  add)
    foreignArtistId="$1"
    metadataProfileId=""
    qualityProfileId=""
    searchFlag="true"
    discography="false"
    
    # Parse optional flags
    shift
    for arg in "$@"; do
      case "$arg" in
        --no-search)
          searchFlag="false"
          ;;
        --discography)
          discography="true"
          ;;
        [0-9]*)
          # Numeric argument could be quality or metadata profile
          if [ -z "$qualityProfileId" ]; then
            qualityProfileId="$arg"
          elif [ -z "$metadataProfileId" ]; then
            metadataProfileId="$arg"
          fi
          ;;
      esac
    done
    
    # Check if artist already exists
    existingCheck=$(curl -s -H "$AUTH" "$API/artist")
    existingArtist=$(echo "$existingCheck" | jq --arg fid "$foreignArtistId" '[.[] | select(.foreignArtistId == $fid)] | .[0]')
    
    if [ -n "$existingArtist" ] && [ "$existingArtist" != "null" ]; then
      artistId=$(echo "$existingArtist" | jq -r '.id')
      artistName=$(echo "$existingArtist" | jq -r '.artistName')
      
      echo "⚠️  Artist already exists: $artistName"
      echo ""
      
      # Check if monitored
      isMonitored=$(echo "$existingArtist" | jq -r '.monitored')
      if [ "$isMonitored" != "true" ]; then
        # Update to monitored
        updatedArtist=$(echo "$existingArtist" | jq '.monitored = true')
        curl -s -X PUT -H "$AUTH" -H "Content-Type: application/json" -d "$updatedArtist" "$API/artist/$artistId" > /dev/null
        echo "✅ Now monitoring: $artistName"
      else
        echo "✓ Already monitored: $artistName"
      fi
      
      echo ""
      echo "💡 Use 'list-artist-albums $artistId' to see albums"
      echo "💡 Use 'monitor-album <albumId>' to monitor specific albums"
      exit 0
    fi
    
    # Get artist details from lookup
    artist=$(curl -s -H "$AUTH" "$API/artist/lookup?term=$(echo "$foreignArtistId" | jq -sRr @uri)" | jq --arg fid "$foreignArtistId" '[.[] | select(.foreignArtistId == $fid)] | .[0]')
    
    if [ -z "$artist" ] || [ "$artist" = "null" ]; then
      echo "❌ Artist not found"
      exit 1
    fi
    
    # Get default root folder
    rootFolder=$(curl -s -H "$AUTH" "$API/rootfolder" | jq -r '.[0].path')
    
    # Use provided or config defaults
    if [ -z "$qualityProfileId" ] && [ -n "$DEFAULT_QUALITY_PROFILE" ]; then
      qualityProfileId="$DEFAULT_QUALITY_PROFILE"
    fi
    if [ -z "$qualityProfileId" ]; then
      # Default to FLAC/Lossless
      qualityProfileId=$(curl -s -H "$AUTH" "$API/qualityprofile" | jq -r '.[] | select(.name | contains("Lossless")) | .id' | head -1)
      if [ -z "$qualityProfileId" ]; then
        qualityProfileId=$(curl -s -H "$AUTH" "$API/qualityprofile" | jq -r '.[0].id')
      fi
    fi
    
    if [ -z "$metadataProfileId" ] && [ -n "$DEFAULT_METADATA_PROFILE" ]; then
      metadataProfileId="$DEFAULT_METADATA_PROFILE"
    fi
    if [ -z "$metadataProfileId" ]; then
      # Default to albums only
      metadataProfileId=$(curl -s -H "$AUTH" "$API/metadataprofile" | jq -r '.[] | select(.name | contains("Albums only")) | .id' | head -1)
      if [ -z "$metadataProfileId" ]; then
        metadataProfileId=$(curl -s -H "$AUTH" "$API/metadataprofile" | jq -r '.[0].id')
      fi
    fi
    
    # Override metadata profile if --discography requested
    if [ "$discography" = "true" ]; then
      metaProfile=$(curl -s -H "$AUTH" "$API/metadataprofile" | jq -r '.[] | select(.name | contains("Discography") or contains("Everything") or contains("All")) | .id' | head -1)
      if [ -n "$metaProfile" ]; then
        metadataProfileId="$metaProfile"
      fi
    fi
    
    # Build add request
    addRequest=$(echo "$artist" | jq --arg rf "$rootFolder" --argjson qp "$qualityProfileId" --argjson mp "$metadataProfileId" --argjson search "$searchFlag" '
      . + {
        rootFolderPath: $rf,
        qualityProfileId: $qp,
        metadataProfileId: $mp,
        monitored: true,
        addOptions: {
          searchForMissingAlbums: $search
        }
      }
    ')
    
    result=$(curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" -d "$addRequest" "$API/artist")
    
    if echo "$result" | jq -e '.id' > /dev/null 2>&1; then
      artistName=$(echo "$result" | jq -r '.artistName')
      albumCount=$(echo "$result" | jq -r '.albums | length')
      qualityName=$(curl -s -H "$AUTH" "$API/qualityprofile" | jq --argjson qid "$qualityProfileId" -r '.[] | select(.id == $qid) | .name')
      newId=$(echo "$result" | jq -r '.id')
      echo "✅ Added: $artistName"
      echo "   Albums: $albumCount | Quality: $qualityName"
      if [ "$searchFlag" = "true" ]; then
        echo "🔍 Search started"
      fi
      echo ""
      echo "💡 Use 'list-artist-albums $newId' to see albums"
    else
      echo "❌ Failed to add artist"
      echo "$result" | jq -r '.message // .'
    fi
    ;;
    
  list)
    echo "=== Artists in Library ==="
    curl -s -H "$AUTH" "$API/artist" | jq -r '.[] | "\(.id): \(.artistName) [\(.albums | length) albums, monitored: \(.monitored)]"' | sort
    ;;
    
  remove)
    artistId="$1"
    deleteFiles="false"
    if [ "$2" = "--delete-files" ]; then
      deleteFiles="true"
    fi
    
    if [ -z "$artistId" ]; then
      echo "Usage: remove <artistId> [--delete-files]"
      exit 1
    fi
    
    # Get artist details
    artist=$(curl -s -H "$AUTH" "$API/artist/$artistId")
    
    if [ -z "$artist" ] || [ "$artist" = "null" ]; then
      echo "❌ Artist not found"
      exit 1
    fi
    
    artistName=$(echo "$artist" | jq -r '.artistName')
    
    curl -s -X DELETE -H "$AUTH" "$API/artist/$artistId?deleteFiles=$deleteFiles" > /dev/null
    
    if [ "$deleteFiles" = "true" ]; then
      echo "🗑️ Removed: $artistName + deleted files"
    else
      echo "🗑️ Removed: $artistName (files kept)"
    fi
    ;;
    
  refresh)
    artistId="$1"
    if [ -z "$artistId" ]; then
      echo "Usage: refresh <artistId>"
      exit 1
    fi
    
    curl -s -X POST -H "$AUTH" "$API/command" -d "{\"name\": \"RefreshArtist\", \"artistId\": $artistId}" > /dev/null
    echo "🔄 Refresh triggered for artist $artistId"
    ;;
    
  *)
    echo "Usage: lidarr.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  search <query>                    Search for artists"
    echo "  search-json <query>               Search (JSON output)"
    echo "  exists <foreignArtistId>          Check if artist is in library"
    echo "  config                            Show root folders, quality & metadata profiles"
    echo "  list                              List artists in library"
    echo "  add <foreignArtistId> [--discography] [--no-search]"
    echo "                                    Add an artist (or monitor existing)"
    echo "  list-artist-albums <artistId>     List albums for an artist"
    echo "  monitor-album <albumId> [--no-search]  Monitor a specific album"
    echo "  refresh <artistId>                Refresh artist metadata"
    echo "  remove <artistId> [--delete-files] Remove an artist"
    ;;
esac
