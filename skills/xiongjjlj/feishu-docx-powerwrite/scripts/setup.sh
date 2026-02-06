#!/usr/bin/env bash
set -euo pipefail

echo "[feishu-docx-powerwrite] Setup checklist"

echo "1) Verify OpenClaw sees Feishu skills/tools"
openclaw skills check | sed -n '1,80p' || true

echo
cat <<'EOF'
2) You must configure YOUR OWN Feishu app credentials.
   Do NOT copy anyone else's tokens.

   Minimum expectation:
   - OpenClaw has Feishu channel configured
   - Feishu OpenAPI tools are available
   - Your app has Docx/Drive scopes enabled

3) Quick manual test (inside OpenClaw chat):
   - Ask: "Create a Feishu docx and write a heading + bullets"
   - Or provide an existing docx link and ask to append.
EOF

echo
echo "Done."
