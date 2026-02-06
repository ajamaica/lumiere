#!/bin/bash
# ForkZoo - Interact with your pet (trigger evolution)
# Usage: ./interact.sh [repo-name]

set -e

REPO_NAME="${1:-}"

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set"
  exit 1
fi

# Get current user
GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user | jq -r '.login')

# If no repo specified, try to find one
if [ -z "$REPO_NAME" ]; then
  REPOS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/users/$GITHUB_USER/repos?per_page=100" | \
    jq -r '.[] | select(.name | test("fork(Monkey|Cat|Dog|Lion|monkey|cat|dog|lion)"; "i")) | .name')
  
  if [ -z "$REPOS" ]; then
    echo "❌ No pets found. Adopt one with: ./adopt.sh <animal>"
    exit 1
  fi
  
  REPO_NAME=$(echo "$REPOS" | head -1)
fi

echo "🐾 Interacting with $REPO_NAME..."
echo ""

# Try to trigger the daily evolution workflow
echo "⚡ Triggering evolution..."

# Try different workflow names
for WORKFLOW in "daily-evolution.yml" "evolve.yml" "daily.yml"; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME/actions/workflows/$WORKFLOW/dispatches" \
    -d '{"ref": "main"}' 2>/dev/null)
  
  if [ "$RESPONSE" == "204" ]; then
    echo "✅ Evolution triggered!"
    echo ""
    echo "Your pet is evolving... Check back in a minute!"
    echo "🌐 Watch at: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
    exit 0
  fi
done

echo "⚠️  Could not trigger evolution workflow."
echo "   The pet may evolve automatically on schedule."
echo ""
echo "Check workflows at: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
