---
name: telegram-cloud-storage
description: A high-performance Telegram Cloud Storage solution using Teldrive. Turns Telegram into an unlimited cloud drive with a local API/UI.
metadata:
  {
    'openclaw':
      {
        'requires': { 'bins': ['teldrive'] },
        'install':
          [
            {
              'id': 'binary',
              'kind': 'exec',
              'command': './scripts/install_binary.sh',
              'label': 'Download Teldrive Binary',
            },
          ],
      },
  }
---

# Telegram Cloud Storage (Teldrive Edition)

This skill runs [Teldrive](https://github.com/tgdrive/teldrive), a powerful utility that organizes Telegram files and provides a high-speed API/UI for accessing them.

## Features

- **Unlimited Storage**: Uses Telegram as a backend.
- **High Performance**: Written in Go, optimized for speed.
- **UI & API**: Includes a web interface and REST API.
- **AI-Native Client**: Includes `client.py` for agent-based file operations.

## Credits

This skill is a wrapper for [Teldrive](https://github.com/tgdrive/teldrive) by [divyam234](https://github.com/divyam234). All credit for the core engine goes to the original authors.

## Requirements

1. **PostgreSQL Database**: Version 17+ recommended.
2. **pgroonga Extension**: Required for file search within Postgres.
3. **Telegram API**: App ID and Hash from [my.telegram.org](https://my.telegram.org).

## Installation

### 1. Database Setup

Ensure Postgres is running and the `pgroonga` extension is installed.

```sql
CREATE DATABASE teldrive;
\c teldrive
CREATE EXTENSION IF NOT EXISTS pgroonga;
```

### 2. Configure

Run the setup script to generate `config/config.toml`:

```bash
./scripts/setup.sh
```

### 3. Start Server

```bash
./scripts/manage.sh start
```

## Agent Usage

The skill includes a Python client for programmatic access.

### Environment Variables

- `TELDRIVE_TOKEN`: Your JWT token (get this from the UI or `config/token.txt` after login).
- `TELDRIVE_SESSION_HASH`: Your Telegram session hash (found in the `teldrive.sessions` table).

### Commands

```bash
# List files
python3 scripts/client.py list /

# Upload a file
python3 scripts/client.py upload local_file.txt /remote/path

# Download a file
python3 scripts/client.py download <file_id> local_save_path
```

## Directory Structure

- `bin/`: Teldrive binary.
- `config/`: Configuration templates and generated config.
- `scripts/`: Setup, management, and client scripts.
- `logs/`: Application logs.
