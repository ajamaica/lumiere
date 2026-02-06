# pget CLI reference (replicate/pget)

## Install

- Linux/macOS binary:
  ```bash
  sudo curl -o /usr/local/bin/pget -L "https://github.com/replicate/pget/releases/latest/download/pget_$(uname -s)_$(uname -m)"
  sudo chmod +x /usr/local/bin/pget
  ```
- Homebrew (macOS):
  ```bash
  brew tap replicate/tap
  brew install replicate/tap/pget
  ```

## Usage

### Single file

```bash
pget <url> <dest> [-c|--concurrency N] [-x|--extract]
```

### Multifile

```bash
pget multifile <manifest-file>
# manifest file is lines of: <url> <dest>
# use "-" to read from stdin
```

## Global options

- `--concurrency` (int): max chunks in parallel (default 4 \* NumCPU)
- `--chunk-size` (string): chunk size (e.g., `10M`, default `125M`)
- `--connect-timeout` (duration): e.g. `10s` (default `5s`)
- `--retries` (int): default `5`
- `--force`: overwrite
- `--log-level` (`debug|info|warn|error`)
- `--verbose`: equivalent to `--log-level debug`
- `--resolve` (string, repeatable): `host:port:ip`

## Multifile options

- `--max-concurrent-files` (int, default 40)
- `--max-conn-per-host` (int, default 40)

## Examples

```bash
# Fast download
pget https://storage.googleapis.com/replicant-misc/sd15.tar ./sd15

# Download + extract
pget https://storage.googleapis.com/replicant-misc/sd15.tar ./sd15 -x

# Multifile from stdin
cat manifest.txt | pget multifile -
```
