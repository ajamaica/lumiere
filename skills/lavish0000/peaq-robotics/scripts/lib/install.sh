#!/usr/bin/env bash

patch_core_identity() {
  local repo_root="$1"
  local target="$repo_root/peaq_ros2_core/peaq_ros2_core/core_node.py"
  [[ -f "$target" ]] || return 0
  python3 - <<'PY' "$target"
import re
import sys

path = sys.argv[1]
with open(path, "r") as f:
    text = f.read()

create_method = """    def _handle_identity_create(self, request, response):
        \"\"\"Handle identity creation requests.\"\"\"
        try:
            # Auto-derive DID name from wallet address
            did_name = f'did:peaq:{self.robot_sdk.address}'
            self.logger.info(f'Creating identity: {did_name}')

            metadata_json = request.metadata_json or ''
            did_document = None
            if metadata_json:
                try:
                    metadata_obj = json.loads(metadata_json)
                except Exception:
                    metadata_obj = {\"raw\": metadata_json}
                if isinstance(metadata_obj, dict):
                    doc = dict(metadata_obj)
                    if \"verificationMethod\" in doc and \"verificationMethods\" not in doc:
                        doc[\"verificationMethods\"] = doc.pop(\"verificationMethod\")
                    if \"service\" in doc and \"services\" not in doc:
                        doc[\"services\"] = doc.pop(\"service\")
                    if \"authentication\" in doc and \"authentications\" not in doc:
                        doc[\"authentications\"] = doc.pop(\"authentication\")
                    if not any(k in doc for k in (\"id\", \"controller\", \"verificationMethods\", \"authentications\", \"services\", \"signature\")):
                        doc = {\"services\": [{\"id\": \"#metadata\", \"type\": \"peaqMetadata\", \"data\": json.dumps(doc)}]}
                    did_document = doc
                else:
                    did_document = {\"services\": [{\"id\": \"#metadata\", \"type\": \"peaqMetadata\", \"data\": json.dumps(metadata_obj)}]}

            # Create identity using SDK
            tx_hash = self.robot_sdk.id.create_identity(
                name=did_name,
                did_document=did_document,
                confirmation_mode=self.config.default_confirmation_mode
            )
            # Normalize SDK return (string vs SubstrateSendResult or dict).
            try:
                if isinstance(tx_hash, dict):
                    tx_hash = tx_hash.get("tx_hash") or tx_hash.get("txHash") or tx_hash.get("hash")
                elif hasattr(tx_hash, "tx_hash"):
                    tx_hash = getattr(tx_hash, "tx_hash")
                elif hasattr(tx_hash, "txHash"):
                    tx_hash = getattr(tx_hash, "txHash")
                elif hasattr(tx_hash, "hash"):
                    tx_hash = getattr(tx_hash, "hash")
            except Exception:
                pass
            if not isinstance(tx_hash, str):
                tx_hash = str(tx_hash)
            try:
                import re
                m = re.search(r"0x[a-fA-F0-9]{64}", tx_hash or "")
                if m:
                    tx_hash = m.group(0)
            except Exception:
                pass
            if not tx_hash:
                raise RuntimeError('identity create returned empty tx_hash')

            response.tx_hash = tx_hash

            # Log success
            log_identity_operation(self.logger, 'created', did_name, tx_hash, success=True)

            # Publish transaction status
            self._publish_tx_status('PENDING', tx_hash)

            self.logger.info(f'✅ Identity creation initiated: {tx_hash[:8]}...')

        except Exception as e:
            error_msg = f'Failed to create identity: {str(e)}'
            self.logger.error(error_msg)
            # Retry once with a fresh SDK/session
            try:
                self.logger.info('Retrying identity create after SDK reinit')
                self._initialize_robot_sdk()
                tx_hash = self.robot_sdk.id.create_identity(
                    name=did_name,
                    did_document=did_document,
                    confirmation_mode=self.config.default_confirmation_mode
                )
                try:
                    if isinstance(tx_hash, dict):
                        tx_hash = tx_hash.get("tx_hash") or tx_hash.get("txHash") or tx_hash.get("hash")
                    elif hasattr(tx_hash, "tx_hash"):
                        tx_hash = getattr(tx_hash, "tx_hash")
                    elif hasattr(tx_hash, "txHash"):
                        tx_hash = getattr(tx_hash, "txHash")
                    elif hasattr(tx_hash, "hash"):
                        tx_hash = getattr(tx_hash, "hash")
                except Exception:
                    pass
                if not isinstance(tx_hash, str):
                    tx_hash = str(tx_hash)
                try:
                    import re
                    m = re.search(r"0x[a-fA-F0-9]{64}", tx_hash or "")
                    if m:
                        tx_hash = m.group(0)
                except Exception:
                    pass
                if not tx_hash:
                    raise RuntimeError('identity create returned empty tx_hash')
                response.tx_hash = tx_hash
                log_identity_operation(self.logger, 'created', did_name, tx_hash, success=True)
                self._publish_tx_status('PENDING', tx_hash)
                self.logger.info(f'✅ Identity creation initiated: {tx_hash[:8]}...')
                return response
            except Exception as e2:
                self.logger.error(f'Failed to create identity (retry): {str(e2)}')
            response.tx_hash = ''
            did_name = f'did:peaq:{self.robot_sdk.address}'
            log_identity_operation(self.logger, 'creation_failed', did_name, success=False)

        return response
"""

read_method = """    def _handle_identity_read(self, request, response):
        \"\"\"Handle identity read requests.\"\"\"
        try:
            self.logger.info('Reading identity document')

            # Read identity using SDK
            doc = self.robot_sdk.id.read_identity()
            if isinstance(doc, dict) and doc.get('read_status') == 'error':
                raise RuntimeError(doc.get('error', 'identity read error'))

            response.doc_json = json.dumps(doc, indent=2)

            log_identity_operation(self.logger, 'read', success=True)
            self.logger.info('✅ Identity document retrieved')

        except Exception as e:
            error_msg = f'Failed to read identity: {str(e)}'
            self.logger.error(error_msg)
            # Retry once with a fresh SDK/session
            try:
                self.logger.info('Retrying identity read after SDK reinit')
                self._initialize_robot_sdk()
                doc = self.robot_sdk.id.read_identity()
                if isinstance(doc, dict) and doc.get('read_status') == 'error':
                    raise RuntimeError(doc.get('error', 'identity read error'))
                response.doc_json = json.dumps(doc, indent=2)
                log_identity_operation(self.logger, 'read', success=True)
                self.logger.info('✅ Identity document retrieved')
                return response
            except Exception as e2:
                self.logger.error(f'Failed to read identity (retry): {str(e2)}')
            response.doc_json = '{}'
            log_identity_operation(self.logger, 'read_failed', success=False)

        return response
"""

changed = False

def replace_block(source: str, name: str, replacement: str) -> tuple[str, bool]:
    pattern = rf"^[ \t]*def {name}\(.*?\n[ \t]*return response\n"
    match = re.search(pattern, source, flags=re.S | re.M)
    if not match:
        return source, False
    return source[:match.start()] + replacement + source[match.end():], True

text, did_change = replace_block(text, "_handle_identity_create", create_method)
changed = changed or did_change
text, did_change = replace_block(text, "_handle_identity_read", read_method)
changed = changed or did_change

if changed:
    with open(path, "w") as f:
        f.write(text)
PY

  echo "Patched core_node identity handlers for DID document mapping + retries."
}

install_repo() {
  local repo="${PEAQ_ROS2_REPO_URL:-https://github.com/peaqnetwork/peaq-robotics-ros2}"
  local target="${HOME}/peaq-robotics-ros2"
  local ref="${PEAQ_ROS2_REPO_REF:-}"
  local update="0"
  local skip_build="0"
  local target_set="0"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dir)
        target="${2:-}"
        [[ -n "$target" ]] || fatal "install --dir requires a path"
        target_set="1"
        shift 2
        ;;
      --ref)
        ref="${2:-}"
        [[ -n "$ref" ]] || fatal "install --ref requires a branch/tag/commit"
        shift 2
        ;;
      --update)
        update="1"
        shift
        ;;
      --skip-build)
        skip_build="1"
        shift
        ;;
      *)
        if [[ "$target_set" == "0" ]]; then
          target="$1"
          target_set="1"
        else
          ref="$1"
        fi
        shift
        ;;
    esac
  done

  command -v git >/dev/null 2>&1 || fatal "git not found (required for install)"

  if [[ -d "$target/.git" ]]; then
    if [[ "$update" == "1" ]]; then
      git -C "$target" fetch --all --tags
      if [[ -n "$ref" ]]; then
        git -C "$target" checkout "$ref"
      fi
      git -C "$target" pull --ff-only || true
    else
      echo "Repo already exists at $target (use --update to pull)."
    fi
  else
    git clone "$repo" "$target"
    if [[ -n "$ref" ]]; then
      git -C "$target" checkout "$ref"
    fi
  fi

  local config_dir="$target/peaq_ros2_examples/config"
  if [[ -f "$config_dir/peaq_robot.example.yaml" ]] && [[ ! -f "$config_dir/peaq_robot.yaml" ]]; then
    cp "$config_dir/peaq_robot.example.yaml" "$config_dir/peaq_robot.yaml"
    echo "Created $config_dir/peaq_robot.yaml from example (edit as needed)."
  fi
  CONFIG="$config_dir/peaq_robot.yaml"

  if [[ -f "$CONFIG" ]]; then
    set_config_network "$NETWORK_PRIMARY"
    if [[ -n "${PEAQ_ROS2_WALLET_PATH:-}" ]]; then
      set_config_wallet_path "$PEAQ_ROS2_WALLET_PATH"
    else
      set_config_wallet_path "~/.peaq_robot/wallet.json"
    fi
  fi

  patch_core_identity "$target"

  if [[ "$skip_build" == "0" ]]; then
    [[ -f "$ROS_SETUP" ]] || fatal "ROS setup not found at $ROS_SETUP (set ROS_SETUP or install ROS 2)"
    command -v colcon >/dev/null 2>&1 || fatal "colcon not found (install colcon or ensure ROS 2 environment is loaded)"

    set +u
    # shellcheck disable=SC1090
    source "$ROS_SETUP"
    set -u

    (cd "$target" && colcon build --symlink-install)
  fi

  local build_note=""
  if [[ "$skip_build" == "1" ]]; then
    build_note="colcon build skipped (run: cd \"$target\" && colcon build --symlink-install)"
  else
    build_note="colcon build completed"
  fi

  cat <<EOF
Install complete.
Next steps:
  export PEAQ_ROS2_ROOT="$target"
  export PEAQ_ROS2_CONFIG_YAML="$target/peaq_ros2_examples/config/peaq_robot.yaml"
  $build_note
EOF
}
