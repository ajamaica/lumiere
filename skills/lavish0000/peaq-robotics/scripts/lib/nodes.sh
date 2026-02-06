#!/usr/bin/env bash

run_bg() {
  local name="$1"; shift
  mkdir -p "$LOG_DIR" "$PID_DIR"

  local pid_file="$PID_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    local existing_pid
    existing_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
      if ps -o stat= -p "$existing_pid" 2>/dev/null | grep -q "Z"; then
        rm -f "$pid_file"
      else
        echo "$name already running (pid $existing_pid)"
        return 0
      fi
    fi
  fi

  nohup "$@" >"$LOG_DIR/$name.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$pid_file"
  echo "Started $name (pid $pid). Log: $LOG_DIR/$name.log"
}

stop_bg() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"
  if [[ ! -f "$pid_file" ]]; then
    echo "$name not running (no pid file)"
    return 0
  fi
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "Stopped $name (pid $pid)"
  else
    echo "$name not running (stale pid)"
  fi
  rm -f "$pid_file"
}
