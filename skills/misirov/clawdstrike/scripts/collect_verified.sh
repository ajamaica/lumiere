#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$SCRIPT_DIR/redact_helpers.sh"

OUT_PATH=${OPENCLAW_AUDIT_OUT:-verified-bundle.json}
GENERATED_AT_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEEP=false
if [[ "${1:-}" == "--deep" ]]; then
  DEEP=true
  shift
fi

STATE_DIR=${OPENCLAW_STATE_DIR:-"$HOME/.openclaw"}
CONFIG_PATH=${OPENCLAW_CONFIG_PATH:-"$STATE_DIR/openclaw.json"}
WORKSPACE_DIR=${OPENCLAW_WORKSPACE_DIR:-${WORKSPACE:-""}}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

stat_path() {
  local path="$1"
  if [ ! -e "$path" ]; then
    printf 'missing'
    return 0
  fi
  if has_cmd stat; then
    if stat -c '%F|%a|%U|%G|%n' "$path" >/dev/null 2>&1; then
      stat -c '%F|%a|%U|%G|%n' "$path"
      return 0
    fi
    if stat -f '%HT|%Lp|%Su|%Sg|%N' "$path" >/dev/null 2>&1; then
      stat -f '%HT|%Lp|%Su|%Sg|%N' "$path"
      return 0
    fi
  fi
  printf 'stat_unavailable'
}

detect_synced_folder() {
  local path="$1"
  case "$path" in
    *"/Dropbox/"*|*"/Dropbox"* )
      printf 'synced=true reason=dropbox'
      ;;
    *"/OneDrive/"*|*"/OneDrive"* )
      printf 'synced=true reason=onedrive'
      ;;
    *"/Google Drive/"*|*"/GoogleDrive/"*|*"/GoogleDrive"* )
      printf 'synced=true reason=google_drive'
      ;;
    *"/iCloud/"*|*"/Library/Mobile Documents/"*|*"/com~apple~CloudDocs/"* )
      printf 'synced=true reason=icloud'
      ;;
    * )
      printf 'synced=false'
      ;;
  esac
}

capture() {
  local out
  out=$("$@" 2>&1 || true)
  printf '%s' "$out"
}

truncate() {
  local input="$1"
  local max=20000
  if [ ${#input} -le $max ]; then
    printf '%s' "$input"
  else
    printf '%s' "${input:0:$max}\n[truncated]"
  fi
}

emit_header() {
  cat > "$OUT_PATH" <<EOF_HEADER
{
  "meta": {
    "generated_at": "$(json_escape "$GENERATED_AT_UTC")",
    "script": "collect_verified.sh",
    "deep_requested": "${DEEP}",
    "state_dir": "$(json_escape "$STATE_DIR")",
    "config_path": "$(json_escape "$CONFIG_PATH")",
    "workspace_dir": "$(json_escape "$WORKSPACE_DIR")"
  },
  "commands": {
EOF_HEADER
}

emit_footer() {
  cat >> "$OUT_PATH" <<'EOF_FOOTER'
  }
}
EOF_FOOTER
}

first_cmd=1
emit_command() {
  local key="$1"
  local cmd="$2"
  local out="$3"
  out=$(redact_text "$out")
  out=$(truncate "$out")
  if [ $first_cmd -eq 0 ]; then
    printf ',\n' >> "$OUT_PATH"
  else
    first_cmd=0
  fi
  printf '    "%s": {"cmd": "%s", "out": "%s"}' \
    "$(json_escape "$key")" \
    "$(json_escape "$cmd")" \
    "$(json_escape "$out")" \
    >> "$OUT_PATH"
}

emit_header

# OS / environment
uname_out=""
if has_cmd uname; then
  uname_out="$(capture uname -a)"
  emit_command "os.uname" "uname -a" "$uname_out"
fi
if [ -f /etc/os-release ]; then
  emit_command "os.release" "cat /etc/os-release" "$(capture cat /etc/os-release)"
fi
if has_cmd sw_vers; then
  emit_command "os.sw_vers" "sw_vers" "$(capture sw_vers)"
fi
if has_cmd id; then
  emit_command "user.id" "id" "$(capture id)"
fi
if has_cmd whoami; then
  emit_command "user.whoami" "whoami" "$(capture whoami)"
fi

if has_cmd systemd-detect-virt; then
  emit_command "env.virt" "systemd-detect-virt" "$(capture systemd-detect-virt)"
else
  env_out="unknown"
  if [ -f /.dockerenv ] || [ -f /.containerenv ]; then
    env_out="container"
  elif [[ "${uname_out:-}" == *Microsoft* ]]; then
    env_out="wsl"
  fi
  emit_command "env.virt" "detect:files" "$env_out"
fi

# OpenClaw core
if has_cmd openclaw; then
  emit_command "openclaw.version" "openclaw --version" "$(capture openclaw --version)"

  if openclaw status --all --json >/dev/null 2>&1; then
    emit_command "openclaw.status" "openclaw status --all --json" "$(capture openclaw status --all --json)"
  else
    emit_command "openclaw.status" "openclaw status --all" "$(capture openclaw status --all)"
  fi

  if openclaw security audit --json >/dev/null 2>&1; then
    emit_command "openclaw.security_audit" "openclaw security audit --json" "$(capture openclaw security audit --json)"
  else
    emit_command "openclaw.security_audit" "openclaw security audit" "$(capture openclaw security audit)"
  fi

  if [ "$DEEP" = true ]; then
    if openclaw security audit --deep --json >/dev/null 2>&1; then
      emit_command "openclaw.security_audit_deep" "openclaw security audit --deep --json" "$(capture openclaw security audit --deep --json)"
    else
      emit_command "openclaw.security_audit_deep" "openclaw security audit --deep" "$(capture openclaw security audit --deep)"
    fi
  fi

  if openclaw skills list --json >/dev/null 2>&1; then
    emit_command "openclaw.skills_list" "openclaw skills list --json" "$(capture openclaw skills list --json)"
  else
    emit_command "openclaw.skills_list" "openclaw skills list" "$(capture openclaw skills list)"
  fi

  if openclaw plugins list --json >/dev/null 2>&1; then
    emit_command "openclaw.plugins_list" "openclaw plugins list --json" "$(capture openclaw plugins list --json)"
  else
    emit_command "openclaw.plugins_list" "openclaw plugins list" "$(capture openclaw plugins list)"
  fi

  if openclaw approvals get --json >/dev/null 2>&1; then
    emit_command "openclaw.approvals" "openclaw approvals get --json" "$(capture openclaw approvals get --json)"
  elif openclaw approvals get >/dev/null 2>&1; then
    emit_command "openclaw.approvals" "openclaw approvals get" "$(capture openclaw approvals get)"
  fi
fi

# Config summary
CONFIG_PY=""
if has_cmd python3; then
  CONFIG_PY="python3"
elif has_cmd python; then
  CONFIG_PY="python"
fi

if [ -f "$CONFIG_PATH" ]; then
  if [ -n "$CONFIG_PY" ]; then
    emit_command "config.summary" "$CONFIG_PY \"$SCRIPT_DIR/config_summary.py\" \"$CONFIG_PATH\"" "$(capture "$CONFIG_PY" "$SCRIPT_DIR/config_summary.py" "$CONFIG_PATH")"
  else
    emit_command "config.summary" "config_summary:python_missing" "python not available"
  fi
else
  emit_command "config.summary" "config_summary:missing" "config file not found"
fi

# Network listening ports
if has_cmd ss; then
  emit_command "net.listening" "ss -tulpen" "$(capture ss -tulpen)"
elif has_cmd lsof; then
  emit_command "net.listening" "lsof -i -P -n" "$(capture lsof -i -P -n)"
elif has_cmd netstat; then
  emit_command "net.listening" "netstat -ano" "$(capture netstat -ano)"
else
  emit_command "net.listening" "net:missing" "no ss/lsof/netstat found"
fi

# Firewall
fw_any=false
if has_cmd ufw; then
  emit_command "fw.ufw" "ufw status" "$(capture ufw status)"
  fw_any=true
fi
if has_cmd firewall-cmd; then
  emit_command "fw.firewalld_state" "firewall-cmd --state" "$(capture firewall-cmd --state)"
  emit_command "fw.firewalld_rules" "firewall-cmd --list-all" "$(capture firewall-cmd --list-all)"
  fw_any=true
fi
if has_cmd nft; then
  emit_command "fw.nft" "nft list ruleset" "$(capture nft list ruleset)"
  fw_any=true
fi
if has_cmd iptables; then
  emit_command "fw.iptables" "iptables -S" "$(capture iptables -S)"
  fw_any=true
fi
if [ -x /usr/libexec/ApplicationFirewall/socketfilterfw ]; then
  emit_command "fw.macos" "/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate" "$(capture /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate)"
  fw_any=true
fi
if has_cmd netsh; then
  emit_command "fw.windows" "netsh advfirewall show allprofiles" "$(capture netsh advfirewall show allprofiles)"
  fw_any=true
fi
if [ "$fw_any" = false ]; then
  emit_command "fw.none" "fw:none" "no firewall status command found"
fi

# Filesystem permissions and hygiene
emit_command "fs.stat.state_dir" "stat \"$STATE_DIR\"" "$(stat_path "$STATE_DIR")"
emit_command "fs.stat.config" "stat \"$CONFIG_PATH\"" "$(stat_path "$CONFIG_PATH")"
emit_command "fs.stat.credentials_dir" "stat \"$STATE_DIR/credentials\"" "$(stat_path "$STATE_DIR/credentials")"

sessions_dir="$STATE_DIR/sessions"
if [ ! -d "$sessions_dir" ] && [ -d "$STATE_DIR/agents" ]; then
  sessions_dir="$STATE_DIR/agents"
fi
emit_command "fs.stat.sessions_dir" "stat \"$sessions_dir\"" "$(stat_path "$sessions_dir")"

auth_profiles_out="none"
if [ -d "$STATE_DIR" ] && has_cmd find; then
  auth_paths="$(capture find "$STATE_DIR" -xdev -path "*/agent/auth-profiles.json" -print)"
  if [ -n "$auth_paths" ]; then
    auth_profiles_out=""
    while IFS= read -r p; do
      [ -n "$p" ] || continue
      auth_profiles_out+=$(stat_path "$p")$'\n'
    done <<< "$auth_paths"
    auth_profiles_out="${auth_profiles_out%$'\n'}"
  fi
fi
emit_command "fs.stat.auth_profiles" "stat auth-profiles" "$auth_profiles_out"

if has_cmd icacls; then
  emit_command "fs.icacls.config" "icacls \"$CONFIG_PATH\"" "$(capture icacls "$CONFIG_PATH")"
  emit_command "fs.icacls.credentials_dir" "icacls \"$STATE_DIR/credentials\"" "$(capture icacls "$STATE_DIR/credentials")"
fi

emit_command "fs.synced_folder" "detect:synced_folder" "state_dir=$STATE_DIR; $(detect_synced_folder "$STATE_DIR")"

if [ -d "$STATE_DIR" ] && has_cmd find; then
  emit_command "fs.symlinks_state" "find \"$STATE_DIR\" -xdev -type l -maxdepth 6" "$(capture find "$STATE_DIR" -xdev -type l -maxdepth 6)"
  emit_command "fs.world_writable_state" "find \"$STATE_DIR\" -xdev -perm -0002 -print" "$(capture find "$STATE_DIR" -xdev -perm -0002 -print)"
  emit_command "fs.suid_sgid_state" "find \"$STATE_DIR\" -xdev -type f \\( -perm -4000 -o -perm -2000 \\) -print" "$(capture find "$STATE_DIR" -xdev -type f \( -perm -4000 -o -perm -2000 \) -print)"
else
  emit_command "fs.symlinks_state" "find:state_dir" "state dir not found or find missing"
  emit_command "fs.world_writable_state" "find:state_dir" "state dir not found or find missing"
  emit_command "fs.suid_sgid_state" "find:state_dir" "state dir not found or find missing"
fi
if [ -n "$WORKSPACE_DIR" ] && [ -d "$WORKSPACE_DIR" ] && has_cmd find; then
  emit_command "fs.world_writable_workspace" "find \"$WORKSPACE_DIR\" -xdev -perm -0002 -print" "$(capture find "$WORKSPACE_DIR" -xdev -perm -0002 -print)"
  emit_command "fs.suid_sgid_workspace" "find \"$WORKSPACE_DIR\" -xdev -type f \\( -perm -4000 -o -perm -2000 \\) -print" "$(capture find "$WORKSPACE_DIR" -xdev -type f \( -perm -4000 -o -perm -2000 \) -print)"
else
  emit_command "fs.world_writable_workspace" "find:workspace" "workspace not set or not found"
  emit_command "fs.suid_sgid_workspace" "find:workspace" "workspace not set or not found"
fi

# Skills/plugins inventory (path restricted)
if [ -d "$STATE_DIR/skills" ] && has_cmd find; then
  emit_command "skills.state_inventory" "find \"$STATE_DIR/skills\" -xdev -maxdepth 3 -type f" "$(capture find "$STATE_DIR/skills" -xdev -maxdepth 3 -type f)"
  emit_command "skills.state_exec_files" "find \"$STATE_DIR/skills\" -xdev -type f -perm -111 -print" "$(capture find "$STATE_DIR/skills" -xdev -type f -perm -111 -print)"
else
  emit_command "skills.state_inventory" "find:state_skills" "state skills dir not found or find missing"
  emit_command "skills.state_exec_files" "find:state_skills" "state skills dir not found or find missing"
fi
if [ -n "$WORKSPACE_DIR" ] && [ -d "$WORKSPACE_DIR/skills" ] && has_cmd find; then
  emit_command "skills.workspace_inventory" "find \"$WORKSPACE_DIR/skills\" -xdev -maxdepth 3 -type f" "$(capture find "$WORKSPACE_DIR/skills" -xdev -maxdepth 3 -type f)"
  emit_command "skills.workspace_exec_files" "find \"$WORKSPACE_DIR/skills\" -xdev -type f -perm -111 -print" "$(capture find "$WORKSPACE_DIR/skills" -xdev -type f -perm -111 -print)"
else
  emit_command "skills.workspace_inventory" "find:workspace_skills" "workspace skills dir not found or find missing"
  emit_command "skills.workspace_exec_files" "find:workspace_skills" "workspace skills dir not found or find missing"
fi
PATTERN='(curl|wget|base64|bash|sh|powershell|Invoke-WebRequest|iwr|irm|nc|netcat|socat|ssh|scp|chmod \+x|chattr|launchctl|systemctl|crontab)'

if [ -d "$STATE_DIR/extensions" ] && has_cmd find; then
  emit_command "plugins.state_inventory" "find \"$STATE_DIR/extensions\" -xdev -maxdepth 3 -type f" "$(capture find "$STATE_DIR/extensions" -xdev -maxdepth 3 -type f)"
fi

if [ -n "$CONFIG_PY" ] && [ -f "$CONFIG_PATH" ]; then
  extra_dirs="$("$CONFIG_PY" "$SCRIPT_DIR/config_summary.py" --extra-dirs "$CONFIG_PATH" 2>/dev/null || true)"
  idx=0
  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    if [[ "$dir" == error:* ]]; then
      continue
    fi
    idx=$((idx + 1))
    if [ -d "$dir" ] && has_cmd find; then
      emit_command "skills.extra_inventory.$idx" "find \"$dir\" -xdev -maxdepth 3 -type f" "$(capture find "$dir" -xdev -maxdepth 3 -type f)"
      emit_command "skills.extra_exec_files.$idx" "find \"$dir\" -xdev -type f -perm -111 -print" "$(capture find "$dir" -xdev -type f -perm -111 -print)"
      if has_cmd rg; then
        emit_command "skills.extra_pattern_scan.$idx" "rg -n --no-messages -S '$PATTERN' \"$dir\"" "$(capture rg -n --no-messages -S "$PATTERN" "$dir")"
      fi
    fi
    if [ "$idx" -ge 5 ]; then
      break
    fi
  done <<< "$extra_dirs"
fi

# Pattern scan (path restricted)
if has_cmd rg; then
  if [ -d "$STATE_DIR/skills" ]; then
    emit_command "skills.state_pattern_scan" "rg -n --no-messages -S '$PATTERN' \"$STATE_DIR/skills\"" "$(capture rg -n --no-messages -S "$PATTERN" "$STATE_DIR/skills")"
  else
    emit_command "skills.state_pattern_scan" "rg:state_skills" "state skills dir not found"
  fi
  if [ -n "$WORKSPACE_DIR" ] && [ -d "$WORKSPACE_DIR/skills" ]; then
    emit_command "skills.workspace_pattern_scan" "rg -n --no-messages -S '$PATTERN' \"$WORKSPACE_DIR/skills\"" "$(capture rg -n --no-messages -S "$PATTERN" "$WORKSPACE_DIR/skills")"
  else
    emit_command "skills.workspace_pattern_scan" "rg:workspace_skills" "workspace skills dir not found"
  fi
else
  emit_command "skills.state_pattern_scan" "rg:missing" "rg not available"
  emit_command "skills.workspace_pattern_scan" "rg:missing" "rg not available"
fi

emit_footer

printf 'Wrote %s\n' "$OUT_PATH"
