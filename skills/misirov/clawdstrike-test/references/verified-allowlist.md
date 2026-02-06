# Verified Mode Allowlist

Follow these rules:

1. Run only the commands listed below, via `scripts/collect_verified.sh`.
2. Do not add or substitute commands.
3. If a required command is unavailable, record that in the report and mark the check unverified.

OpenClaw:

- openclaw --version
- openclaw status --all
- openclaw status --all --json (if supported)
- openclaw security audit
- openclaw security audit --json (if supported)
- openclaw security audit --deep (only if user approves local probe)
- openclaw security audit --deep --json (if supported and approved)
- openclaw skills list (or --json if supported)
- openclaw skills info <id> (if supported)
- openclaw plugins list (or --json if supported)
- openclaw plugins info <id> (if supported)
- openclaw approvals get --json (if supported)
- openclaw pairing list <channel> --json (if supported; redact codes)

OS / environment:

- uname -a
- cat /etc/os-release
- sw_vers
- systemd-detect-virt
- id
- whoami
- ver (Windows)
- icacls <path> (Windows permissions only)

Network:

- ss -tulpen
- lsof -i -P -n
- netstat -ano

Firewall:

- ufw status
- firewall-cmd --state
- firewall-cmd --list-all
- nft list ruleset
- iptables -S
- /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
- netsh advfirewall show allprofiles

If none of the firewall commands are available on the host, record that fact and mark `net.firewall` as VULNERABLE with `(UNVERIFIED)` in Evidence.

File scanning (path-restricted):

- find <approved_path> -xdev -maxdepth <n> -type f
- find <approved_path> -xdev -type l
- find <approved_path> -xdev -perm -0002 -print
- find <approved_path> -xdev -type f \( -perm -4000 -o -perm -2000 \) -print
- find <approved_path> -xdev -type f -perm -111 -print
- rg -n --no-messages -S <pattern> <approved_path>
- stat <path> (read-only permissions)
- python3 scripts/config_summary.py <config_path> (or python if python3 unavailable)
- sed (used only by scripts for safe JSON escaping)
