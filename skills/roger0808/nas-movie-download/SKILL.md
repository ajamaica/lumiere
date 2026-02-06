---
name: nas-movie-download
description: Search and download movies via Jackett and qBittorrent. Use when user wants to download movies or videos from torrent sources, search for specific movie titles, or manage movie downloads.
---

# NAS Movie Download

Automated movie downloading system using Jackett for torrent search and qBittorrent for download management.

## Configuration

### Environment Variables

Set these environment variables for the skill to function properly:

**Jackett Configuration:**

- `JACKETT_URL`: Jackett service URL (default: http://192.168.1.246:9117)
- `JACKETT_API_KEY`: Jackett API key (default: o5gp976vq8cm084cqkcv30av9v3e5jpy)

**qBittorrent Configuration:**

- `QB_URL`: qBittorrent Web UI URL (default: http://192.168.1.246:8888)
- `QB_USERNAME`: qBittorrent username (default: admin)
- `QB_PASSWORD`: qBittorrent password (default: adminadmin)

### Indexer Setup

The skill works with Jackett indexers. Currently configured indexers:

- The Pirate Bay
- TheRARBG
- YTS

Ensure these indexers are enabled and configured in your Jackett installation for best results.

## Usage

### Search Movies

Search for movies without downloading:

```bash
scripts/jackett-search.sh -q "Inception"
scripts/jackett-search.sh -q "The Matrix"
scripts/jackett-search.sh -q "死期将至"  # Chinese movie names supported
```

### Download Highest Quality Version

Search and automatically download the highest quality version:

```bash
scripts/download-movie.sh -q "Inception"
scripts/download-movie.sh -q "The Matrix"
```

### Manual Download Workflow

For more control over the download process:

1. Search: `scripts/jackett-search.sh -q "movie name"`
2. Review results and copy magnet link
3. Add to qBittorrent: `scripts/qbittorrent-add.sh -m "magnet:?xt=urn:btih:..."`

### Test Configuration

Verify your Jackett and qBittorrent setup:

```bash
scripts/test-config.sh
```

## Quality Selection

The skill automatically prioritizes quality in this order:

1. **4K/UHD**: Contains "4K", "2160p", "UHD"
2. **1080P/Full HD**: Contains "1080p", "FHD"
3. **720P/HD**: Contains "720p", "HD"
4. **Other**: Other quality levels

When using `download-movie.sh`, the highest quality available torrent will be selected automatically.

## Script Details

### jackett-search.sh

Search Jackett for torrents.

**Parameters:**

- `-q, --query`: Search query (required)
- `-u, --url`: Jackett URL (optional, uses env var)
- `-k, --api-key`: API key (optional, uses env var)

**Example:**

```bash
scripts/jackett-search.sh -q "Inception" -u http://192.168.1.246:9117
```

### qbittorrent-add.sh

Add torrent to qBittorrent.

**Parameters:**

- `-m, --magnet`: Magnet link (required)
- `-u, --url`: qBittorrent URL (optional, uses env var)
- `-n, --username`: Username (optional, uses env var)
- `-p, --password`: Password (optional, uses env var)

**Example:**

```bash
scripts/qbittorrent-add.sh -m "magnet:?xt=urn:btih:..."
```

### download-movie.sh

One-click search and download.

**Parameters:**

- `-q, --query`: Movie name (required)

**Example:**

```bash
scripts/download-movie.sh -q "The Matrix"
```

## Tips and Best Practices

- **Use English movie names** for better search results
- **Check Jackett indexer status** if searches return no results
- **Monitor qBittorrent** to manage download progress
- **Consider storage space** when downloading 4K content
- **Test configuration** periodically to ensure services are running

## Troubleshooting

### No Search Results

1. Verify Jackett is running: `curl http://192.168.1.246:9117`
2. Check Jackett indexers are enabled in Jackett UI
3. Try English movie names
4. Verify API key is correct

### qBittorrent Connection Failed

1. Confirm qBittorrent is running
2. Check Web UI is enabled in qBittorrent settings
3. Verify username and password
4. Ensure network connectivity to qBittorrent server

### Permission Issues

Ensure scripts have execute permissions:

```bash
chmod +x scripts/*.sh
```

## Security Notes

- Keep API keys secure and don't commit them to version control
- Use HTTPS connections when possible
- Consider setting up VPN for torrent traffic
- Monitor qBittorrent for unauthorized downloads

## Dependencies

- `curl`: For HTTP requests
- `jq`: For JSON parsing
- Bash shell

Install jq if missing:

```bash
apt-get install jq
```
