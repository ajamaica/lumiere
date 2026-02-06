# Kaspa Node Operations

Complete guide for running and operating Kaspa blockchain nodes.

## Table of Contents

1. [Node Types](#node-types)
2. [Hardware Requirements](#hardware-requirements)
3. [Installation Methods](#installation-methods)
4. [Docker Setup](#docker-setup)
5. [Binary Installation](#binary-installation)
6. [Building from Source](#building-from-source)
7. [Configuration](#configuration)
8. [Operation & Maintenance](#operation--maintenance)
9. [RPC Node Setup](#rpc-node-setup)
10. [Troubleshooting](#troubleshooting)

## Node Types

### Full Node

A full node validates all blocks and transactions and maintains the complete UTXO set.

- **Storage**: ~50-100 GB (grows over time)
- **Memory**: 8 GB RAM minimum, 16 GB recommended
- **CPU**: 4+ cores recommended
- **Use case**: Most users, wallet operators, dApp developers

### Archival Node

Maintains the entire blockchain history including all block data.

- **Storage**: 200+ GB
- **Memory**: 16 GB RAM recommended
- **CPU**: 8+ cores recommended
- **Use case**: Block explorers, analytics, research

### Pruned Node

Maintains only recent blocks and the current UTXO set.

- **Storage**: ~10-20 GB
- **Memory**: 8 GB RAM
- **CPU**: 4 cores
- **Use case**: Resource-constrained environments

### Network Types

- **Mainnet**: Production network
- **Testnet**: Testing and development
- **Devnet**: Local development

## Hardware Requirements

### Minimum Requirements (Full Node)

- **CPU**: 2+ cores
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: Stable broadband connection
- **OS**: Linux (Ubuntu 20.04+), macOS, Windows

### Recommended Requirements

- **CPU**: 4+ cores (8+ for archival)
- **RAM**: 16 GB (32 GB for archival)
- **Storage**: 200 GB NVMe SSD
- **Network**: 100 Mbps+ with static IP
- **OS**: Linux (Ubuntu 22.04 LTS)

## Installation Methods

### Quick Comparison

| Method | Difficulty | Best For                  | Update Frequency          |
| ------ | ---------- | ------------------------- | ------------------------- |
| Docker | Easy       | Production, quick start   | Automatic with watchtower |
| Binary | Medium     | Most users                | Manual                    |
| Source | Hard       | Developers, custom builds | Manual                    |

## Docker Setup

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+ (optional but recommended)

### Basic Docker Run

```bash
# Run mainnet node with UTXO index
docker run -d \
  --name kaspad \
  -p 16110:16110 \
  -p 16111:16111 \
  -v kaspad-data:/data \
  kaspanet/kaspad:latest \
  --utxoindex \
  --rpclisten=0.0.0.0:16110
```

### Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  kaspad:
    image: kaspanet/kaspad:latest
    container_name: kaspad
    restart: unless-stopped
    ports:
      - '16110:16110' # RPC
      - '16111:16111' # P2P
    volumes:
      - kaspad-data:/data
    command: >
      kaspad
      --utxoindex
      --rpclisten=0.0.0.0:16110
      --listen=0.0.0.0:16111
      --acceptance-index
    healthcheck:
      test: ['CMD', 'kaspactl', 'getInfo']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  kaspad-data:
    driver: local
```

Start the node:

```bash
docker-compose up -d
```

### Testnet Node

```yaml
version: '3.8'

services:
  kaspad-testnet:
    image: kaspanet/kaspad:latest
    container_name: kaspad-testnet
    restart: unless-stopped
    ports:
      - '16210:16210' # RPC
      - '16211:16211' # P2P
    volumes:
      - kaspad-testnet-data:/data
    command: >
      kaspad
      --testnet
      --utxoindex
      --rpclisten=0.0.0.0:16210
      --listen=0.0.0.0:16211

volumes:
  kaspad-testnet-data:
    driver: local
```

### Monitoring with Prometheus/Grafana

```yaml
version: '3.8'

services:
  kaspad:
    image: kaspanet/kaspad:latest
    container_name: kaspad
    restart: unless-stopped
    ports:
      - '16110:16110'
      - '16111:16111'
      - '2112:2112' # Prometheus metrics
    volumes:
      - kaspad-data:/data
    command: >
      kaspad
      --utxoindex
      --rpclisten=0.0.0.0:16110
      --listen=0.0.0.0:16111
      --metrics

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - '3000:3000'
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  kaspad-data:
  prometheus-data:
  grafana-data:
```

## Binary Installation

### Download Pre-built Binaries

1. **Download latest release:**

```bash
# Get latest release URL from https://github.com/kaspanet/kaspad/releases
wget https://github.com/kaspanet/kaspad/releases/download/v0.12.18/kaspad-v0.12.18-linux-amd64.zip
```

2. **Extract and install:**

```bash
unzip kaspad-v0.12.18-linux-amd64.zip
sudo mv kaspad kaspactl kaspaminer /usr/local/bin/
sudo chmod +x /usr/local/bin/kasp*
```

3. **Verify installation:**

```bash
kaspad --version
kaspactl --version
```

### Create Data Directory

```bash
# Create data directory
sudo mkdir -p /var/lib/kaspad
sudo chown $USER:$USER /var/lib/kaspad

# Create config directory
mkdir -p ~/.kaspad
```

### Systemd Service

Create `/etc/systemd/system/kaspad.service`:

```ini
[Unit]
Description=Kaspa Node
After=network.target

[Service]
Type=simple
User=kaspad
Group=kaspad
WorkingDirectory=/var/lib/kaspad
ExecStart=/usr/local/bin/kaspad --utxoindex --rpclisten=0.0.0.0:16110 --listen=0.0.0.0:16111 --acceptance-index
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kaspad

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/kaspad

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo useradd -r -s /bin/false kaspad
sudo systemctl daemon-reload
sudo systemctl enable kaspad
sudo systemctl start kaspad
sudo systemctl status kaspad
```

## Building from Source

### Prerequisites

- Go 1.21+ (check with `go version`)
- Git
- Make
- GCC (for C bindings)

### Clone and Build

```bash
# Clone repository
git clone https://github.com/kaspanet/kaspad.git
cd kaspad

# Checkout stable release (optional but recommended)
git checkout v0.12.18

# Build
make

# Or build specific binaries
go build -o kaspad ./cmd/kaspad
go build -o kaspactl ./cmd/kaspactl
```

### Install Built Binaries

```bash
sudo cp kaspad kaspactl /usr/local/bin/
sudo chmod +x /usr/local/bin/kasp*
```

## Configuration

### Command Line Flags

Common flags for `kaspad`:

```bash
# Network selection
--testnet                    # Run on testnet
--devnet                     # Run on devnet
--simnet                     # Run on simulation network

# RPC settings
--rpclisten=0.0.0.0:16110   # RPC listen address
--rpclisten=127.0.0.1:16110 # Local only (secure)
--rpcuser=username          # RPC username
--rpcpass=password          # RPC password

# Indexing
--utxoindex                 # Enable UTXO index (required for wallets)
--acceptance-index          # Enable acceptance index
--txindex                   # Enable transaction index

# Performance
--maxinboundpeers=125       # Max inbound connections
--maxoutboundpeers=8        # Max outbound connections
--blockmaxmass=100000       # Max block mass

# Paths
--appdir=/var/lib/kaspad    # Data directory
--logdir=/var/log/kaspad    # Log directory

# Debugging
--debuglevel=debug          # Log level: trace, debug, info, warn, error, critical
--metrics                   # Enable Prometheus metrics
```

### Configuration File

Create `~/.kaspad/kaspad.conf`:

```ini
[Application Options]
; Network
; testnet=1
; devnet=1

; RPC Settings
rpclisten=0.0.0.0:16110
rpcuser=your_rpc_username
rpcpass=your_secure_password

; Indexing (required for most use cases)
utxoindex=1
acceptanceindex=1

; Limits
maxinboundpeers=125
maxoutboundpeers=8

; Performance
blockmaxmass=100000

; Paths
appdir=/var/lib/kaspad
logdir=/var/log/kaspad

; Debugging
debuglevel=info
```

## Operation & Maintenance

### Checking Node Status

```bash
# Using kaspactl
kaspactl getInfo

# Check sync status
kaspactl getBlockDAGInfo

# Check connected peers
kaspactl getConnectedPeerInfo
```

### Logs

```bash
# View logs (systemd)
sudo journalctl -u kaspad -f

# View logs (docker)
docker logs -f kaspad

# View logs (file)
tail -f /var/lib/kaspad/logs/kaspad.log
```

### Sync Progress

A new node needs to sync with the network. Check progress:

```bash
kaspactl getBlockDAGInfo
```

Look for:

- `blockCount`: Current blocks in DAG
- `headerCount`: Headers synced
- `virtualDaaScore`: Current DAA score

**Sync time**: 2-6 hours for full node (depending on hardware and network)

### Backup

**Important files to backup:**

- Wallet files (if running with wallet)
- Configuration files
- Node database (optional, can be re-synced)

```bash
# Backup configuration
cp -r ~/.kaspad ~/kaspad-backup-$(date +%Y%m%d)

# Backup data directory (stop node first)
sudo systemctl stop kaspad
tar czvf kaspad-data-backup-$(date +%Y%m%d).tar.gz /var/lib/kaspad
sudo systemctl start kaspad
```

### Upgrading

**Docker:**

```bash
docker-compose pull
docker-compose up -d
```

**Binary:**

```bash
# Download new version
wget https://github.com/kaspanet/kaspad/releases/download/vX.X.X/kaspad-vX.X.X-linux-amd64.zip

# Stop node
sudo systemctl stop kaspad

# Backup (optional but recommended)
cp /usr/local/bin/kaspad /usr/local/bin/kaspad.backup

# Install new version
unzip kaspad-vX.X.X-linux-amd64.zip
sudo mv kaspad kaspactl /usr/local/bin/

# Start node
sudo systemctl start kaspad

# Verify
kaspad --version
```

## RPC Node Setup

### Enabling External RPC Access

**⚠️ Security Warning:** Only enable external RPC if you understand the security implications!

```bash
# Basic external RPC (NOT SECURE - use only in trusted networks)
kaspad --rpclisten=0.0.0.0:16110 --rpcuser=user --rpcpass=strongpassword

# With TLS/SSL (Recommended for production)
kaspad --rpclisten=0.0.0.0:16110 \
  --rpcuser=user \
  --rpcpass=strongpassword \
  --rpccert=/path/to/cert.pem \
  --rpckey=/path/to/key.pem
```

### Nginx Reverse Proxy with SSL

```nginx
server {
    listen 443 ssl http2;
    server_name kaspa-rpc.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:16110;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # RPC-specific
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

### Rate Limiting

Using `iptables`:

```bash
# Limit RPC connections to 10 per minute
iptables -A INPUT -p tcp --dport 16110 -m limit --limit 10/minute -j ACCEPT
iptables -A INPUT -p tcp --dport 16110 -j DROP
```

Using `ufw`:

```bash
# Allow only specific IPs
ufw allow from 192.168.1.0/24 to any port 16110
```

### Firewall Configuration

```bash
# Allow P2P port
sudo ufw allow 16111/tcp

# Allow RPC only from specific IPs (recommended)
sudo ufw allow from 192.168.1.100 to any port 16110

# Or block RPC from external (local only)
sudo ufw deny 16110/tcp
```

## Troubleshooting

### Node Won't Start

**Check logs:**

```bash
sudo journalctl -u kaspad -n 100 --no-pager
```

**Common issues:**

- Port already in use: Change `--listen` port
- Permission denied: Check file permissions on data directory
- Out of disk space: Free up space or use pruned mode

### Slow Sync

**Solutions:**

1. Use SSD storage (HDD is too slow)
2. Increase peer connections: `--maxoutboundpeers=16`
3. Check network bandwidth
4. Use fast SSD with high IOPS

### High Memory Usage

**Solutions:**

1. Reduce peer count: `--maxinboundpeers=50 --maxoutboundpeers=4`
2. Use pruned mode (requires source build with modifications)
3. Add more RAM or use swap
4. Restart node periodically

### Connection Issues

**Check network:**

```bash
# Test port connectivity
nc -zv your-ip 16111

# Check if node is listening
ss -tlnp | grep kaspad

# Test RPC
kaspactl --server=127.0.0.1:16110 getInfo
```

**Firewall issues:**

```bash
# Check firewall status
sudo ufw status
sudo iptables -L -n | grep 16111
```

### Database Corruption

**Symptoms:**

- Node crashes on startup
- Error messages about database
- Sync stuck at certain block

**Solution:**

```bash
# Stop node
sudo systemctl stop kaspad

# Backup corrupted database (optional)
mv /var/lib/kaspad /var/lib/kaspad-corrupted-$(date +%Y%m%d)

# Start node (will re-sync)
sudo systemctl start kaspad
```

### Common Error Messages

**"bind: address already in use"**

```bash
# Find process using port
sudo lsof -i :16110
sudo lsof -i :16111

# Kill process or change ports
sudo kill -9 <PID>
```

**"utxoindex is required"**

```bash
# Start with UTXO index enabled
kaspad --utxoindex
```

**"connection refused"**

- Node not fully started yet (wait for initialization)
- Wrong RPC port or address
- Firewall blocking connection

## Resources

- **GitHub**: https://github.com/kaspanet/kaspad
- **Documentation**: https://docs.kas.fyi/
- **Docker Hub**: https://hub.docker.com/r/kaspanet/kaspad
- **Discord**: https://discord.gg/kaspa
- **Explorer**: https://kas.fyi/

## Best Practices

1. **Regular backups**: Backup wallet and config weekly
2. **Monitor disk space**: Set up alerts for disk usage
3. **Use testnet first**: Test all operations on testnet before mainnet
4. **Keep updated**: Regularly update to latest stable version
5. **Security**: Don't expose RPC to internet without proper security
6. **Redundancy**: Run multiple nodes for critical applications
7. **Monitoring**: Use Prometheus/Grafana for production nodes
8. **Documentation**: Document your specific configuration
