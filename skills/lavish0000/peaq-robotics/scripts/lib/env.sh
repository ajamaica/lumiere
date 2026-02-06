#!/usr/bin/env bash

resolve_root() {
  if [[ -n "${PEAQ_ROS2_ROOT:-}" ]]; then
    echo "$PEAQ_ROS2_ROOT"
    return
  fi

  for guess in \
    "$HOME/peaq-robotics-ros2" \
    "$HOME/Work/peaq/peaq-robotics-ros2" \
    "/work/peaq-robotics-ros2"; do
    if [[ -d "$guess/peaq_ros2_core" ]]; then
      echo "$guess"
      return
    fi
  done

  echo ""
}

auto_set_ros_domain_id() {
  if [[ -n "${ROS_DOMAIN_ID:-}" && "${ROS_DOMAIN_ID:-}" != "0" ]]; then
    return
  fi
  local workspace
  workspace="$(resolve_openclaw_workspace)"
  if [[ -z "$workspace" ]]; then
    return
  fi
  # Stable-ish per-workspace ROS domain (100-199) to avoid collisions.
  local hash
  hash="$(printf "%s" "$workspace" | cksum | awk '{print $1}')"
  local id=$(( (hash % 100) + 100 ))
  export ROS_DOMAIN_ID="$id"
}

load_root() {
  if [[ -n "$ROOT" ]]; then
    return
  fi

  local found
  found="$(resolve_root)"
  if [[ -z "$found" ]]; then
    return
  fi

  ROOT="$(cd "$found" && pwd)"
  if [[ -n "${PEAQ_ROS2_CONFIG_YAML:-}" ]]; then
    CONFIG="$PEAQ_ROS2_CONFIG_YAML"
  else
    local workspace
    workspace="$(resolve_openclaw_workspace)"
    if [[ -n "$workspace" ]]; then
      local workspace_config="${workspace}/.peaq_robot/peaq_robot.yaml"
      local wallet_path="${workspace}/.peaq_robot/wallet.json"
      mkdir -p "${workspace}/.peaq_robot"
      if [[ ! -f "$workspace_config" ]]; then
        local example="$ROOT/peaq_ros2_examples/config/peaq_robot.example.yaml"
        local base="$ROOT/peaq_ros2_examples/config/peaq_robot.yaml"
        if [[ -f "$example" ]]; then
          cp "$example" "$workspace_config"
        elif [[ -f "$base" ]]; then
          cp "$base" "$workspace_config"
        fi
      fi
      CONFIG="$workspace_config"
      set_config_wallet_path "$wallet_path"
    else
      CONFIG="$ROOT/peaq_ros2_examples/config/peaq_robot.yaml"
    fi
  fi
  WS_SETUP="${WS_SETUP:-$ROOT/install/setup.bash}"
}

require_root() {
  load_root
  if [[ -z "$ROOT" ]]; then
    fatal "PEAQ_ROS2_ROOT not set and repo not found. Run '$SCRIPT_NAME install' or set PEAQ_ROS2_ROOT."
  fi
}

ensure_env() {
  require_root
  [[ -f "$ROS_SETUP" ]] || fatal "ROS setup not found at $ROS_SETUP"
  [[ -f "$WS_SETUP" ]] || fatal "Workspace setup not found at $WS_SETUP (run colcon build)"
  [[ -f "$CONFIG" ]] || fatal "Config file not found at $CONFIG"

  # ROS setup scripts assume some vars may be unset; avoid nounset errors.
  set +u
  # shellcheck disable=SC1090
  source "$ROS_SETUP"
  # shellcheck disable=SC1090
  source "$WS_SETUP"
  set -u
}
