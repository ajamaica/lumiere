---
name: virustotal-security-scanner
description: Scan files and URLs using VirusTotal API via curl or Python utilities. Check hashes, upload files, and manage comments.
homepage: https://www.virustotal.com/
metadata:
  {
    'clawdbot':
      {
        'emoji': '🦠',
        'requires': { 'bins': ['curl', 'jq', 'sha256sum', 'python3'], 'env': ['VT_API_KEY'] },
      },
  }
---

# VirusTotal Scanner Skill

Interact with VirusTotal API using either standard system tools (curl) or Python utilities.

## Setup

1. Get your API key: https://www.virustotal.com/gui/user/[your-username]/apikey
2. Set the environment variable:
   ```bash
   export VT_API_KEY="your-api-key-here"
   ```

## Privacy Warning

**CRITICAL**: This skill involves sending data to VirusTotal, a public threat intelligence service.

1.  **Never upload files without explicit user consent.**
2.  **Do not include PII (Personally Identifiable Information)** in comments or descriptions.
3.  **Warn the user** that uploaded files are shared with the security community and can be downloaded by other researchers.

## Best Practices: Caching Results

To avoid unnecessary API calls and stay within rate limits, it is recommended to cache the JSON results locally. Use `~/.vt/` to store these reports.

```bash
# Create cache directory
mkdir -p ~/.vt

# Save a report to cache
HASH="your-file-hash"
curl --request GET \
     --url "https://www.virustotal.com/api/v3/files/$HASH" \
     --header "accept: application/json" \
     --header "x-apikey: $VT_API_KEY" > ~/.vt/$HASH.json

# Query the cache instead of the API (if jq available)
cat ~/.vt/$HASH.json | jq '.data.attributes.last_analysis_stats'
```

## Usage: Curl (Standard and use it by default)

### 1. Hash a file (Required for checks)

Calculate the SHA256 hash of a file to check if it exists in VirusTotal.

```bash
# Linux
sha256sum /path/to/file

# MacOS
shasum -a 256 /path/to/file

# Windows (PowerShell)
Get-FileHash /path/to/file -Algorithm SHA256
```

### 2. Check File Report

Check if a file hash is already known to VirusTotal.

```bash
curl --request GET \
     --url "https://www.virustotal.com/api/v3/files/{hash}" \
     --header "accept: application/json" \
     --header "x-apikey: $VT_API_KEY"
```

### 3. Upload File

**Privacy Note**: Only upload files if you have the user's explicit permission.

#### Small Files (< 32MB)

```bash
curl --request POST \
     --url "https://www.virustotal.com/api/v3/files" \
     --header "accept: application/json" \
     --header "x-apikey: $VT_API_KEY" \
     --form "file=@/path/to/file"
```

#### Large Files (> 32MB)

First, get a unique upload URL:

```bash
curl --request GET \
     --url "https://www.virustotal.com/api/v3/files/upload_url" \
     --header "accept: application/json" \
     --header "x-apikey: $VT_API_KEY"
```

Then upload to that URL:

```bash
curl --request POST \
     --url "{upload_url_from_previous_step}" \
     --header "accept: application/json" \
     --header "x-apikey: $VT_API_KEY" \
     --form "file=@/path/to/large_file"
```

### 4. File Comments

**Privacy Warning**: Do NOT include PII (Personally Identifiable Information) or sensitive data in comments. Context about the file origin or downloader is useful.

#### Get Comments

```bash
curl --request GET \
     --url "https://www.virustotal.com/api/v3/files/{hash}/comments?limit=10" \
     --header "accept: application/json" \
     --header "x-apikey: $VT_API_KEY"
```

#### Add Comment

```bash
curl --request POST \
     --url "https://www.virustotal.com/api/v3/files/{hash}/comments" \
     --header "accept: application/json" \
     --header "content-type: application/json" \
     --header "x-apikey: $VT_API_KEY" \
     --data '{"data": {"type": "comment", "attributes": {"text": "File found in /tmp directory via downloader script."}}}'
```

### 5. URL Scanning

#### Scan a URL

```bash
curl --request POST \
     --url "https://www.virustotal.com/api/v3/urls" \
     --header "accept: application/json" \
     --header "content-type: application/x-www-form-urlencoded" \
     --header "x-apikey: $VT_API_KEY" \
     --data "url={url_to_analyze}"
```

#### Get URL Report

Note: The ID for a URL is usually its SHA256 hash.

```bash
curl --request GET \
     --url "https://www.virustotal.com/api/v3/urls/{url_id_or_hash}" \
     --header "accept: application/json" \
     --header "x-apikey: $VT_API_KEY"
```

## Usage: Python Utilities

If system libraries are missing or you prefer Python, use the provided helper scripts.

### Install Requirements

```bash
pip install requests
```

### 1. Calculate Hash

```bash
python3 vt-scanner/calc_hash.py /path/to/file
```

### 2. API Client (`vt_client.py`)

This script wraps the API endpoints for easier usage.

#### Check File

```bash
python3 vt-scanner/vt_client.py check-file {hash}
```

#### Upload File

Handles both small and large file upload flows automatically.

```bash
python3 vt-scanner/vt_client.py upload-file /path/to/file
```

#### Get Comments

```bash
# For a file
python3 vt-scanner/vt_client.py get-comments {file_hash}

# For a URL
python3 vt-scanner/vt_client.py get-comments {url_id} --url
```

#### Add Comment

```bash
python3 vt-scanner/vt_client.py add-comment {id} "Your comment here"
```

#### Scan URL

```bash
python3 vt-scanner/vt_client.py scan-url "http://example.com"
```

#### Check URL Report

```bash
python3 vt-scanner/vt_client.py check-url {url_id}
```
