#!/bin/bash
# Quick health check

READY=$(curl -s "https://archon.technology/api/v1/ready")

if [ "$READY" = "true" ]; then
  echo "✓ Archon node is ready"
  exit 0
else
  echo "✗ Archon node is not ready"
  exit 1
fi
