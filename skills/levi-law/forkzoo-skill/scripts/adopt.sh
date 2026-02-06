#!/bin/bash
# ForkZoo - Adopt a digital pet
# Usage: ./adopt.sh <animal> [repo-name]
# Animals: monkey, cat, dog, lion

set -e

ANIMAL="${1:-monkey}"
CUSTOM_NAME="${2:-}"

# Validate animal type
case "$ANIMAL" in
  monkey|cat|dog|lion)
    ;;
  *)
    echo "❌ Unknown animal: $ANIMAL"
    echo "Available: monkey, cat, dog, lion"
    exit 1
    ;;
esac

# Map animal to source repo
case "$ANIMAL" in
  monkey) SOURCE_REPO="forkZoo/forkMonkey" ;;
  cat)    SOURCE_REPO="forkZoo/forkCat" ;;
  dog)    SOURCE_REPO="forkZoo/forkDog" ;;
  lion)   SOURCE_REPO="forkZoo/forkLion" ;;
esac

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set"
  echo "Set it with: export GITHUB_TOKEN=your_token"
  echo "Token needs 'repo' and 'workflow' scopes"
  exit 1
fi

# Get current user
GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user | jq -r '.login')

if [ "$GITHUB_USER" == "null" ] || [ -z "$GITHUB_USER" ]; then
  echo "❌ Could not get GitHub user. Check your token."
  exit 1
fi

echo "🐾 Adopting a $ANIMAL for $GITHUB_USER..."

# Determine repo name
if [ -n "$CUSTOM_NAME" ]; then
  REPO_NAME="$CUSTOM_NAME"
else
  REPO_NAME="fork${ANIMAL^}"  # Capitalize first letter
fi

# Check if repo already exists
EXISTING=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME")

if [ "$EXISTING" == "200" ]; then
  echo "⚠️  You already have a repo named $REPO_NAME"
  echo "   Check it at: https://github.com/$GITHUB_USER/$REPO_NAME"
  echo "   Or specify a custom name: ./adopt.sh $ANIMAL my-pet-name"
  exit 1
fi

# Fork the repo
echo "🍴 Forking $SOURCE_REPO..."
FORK_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$SOURCE_REPO/forks" \
  -d "{\"name\": \"$REPO_NAME\", \"default_branch_only\": true}")

FORK_URL=$(echo "$FORK_RESPONSE" | jq -r '.html_url')

if [ "$FORK_URL" == "null" ]; then
  echo "❌ Failed to fork repo"
  echo "$FORK_RESPONSE" | jq -r '.message // .errors[0].message // "Unknown error"'
  exit 1
fi

echo "✅ Forked to: $FORK_URL"

# Wait for fork to be ready
echo "⏳ Waiting for fork to initialize..."
sleep 5

# Enable GitHub Actions (they're disabled by default on forks)
echo "⚡ Enabling GitHub Actions..."
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME/actions/permissions" \
  -d '{"enabled": true, "allowed_actions": "all"}' > /dev/null

# Trigger the genesis workflow if it exists
echo "🐣 Initializing your pet..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME/actions/workflows/genesis.yml/dispatches" \
  -d '{"ref": "main"}' 2>/dev/null || true

# Enable GitHub Pages
echo "🌐 Setting up GitHub Pages..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME/pages" \
  -d '{"source": {"branch": "main", "path": "/"}}' 2>/dev/null || true

PAGES_URL="https://$GITHUB_USER.github.io/$REPO_NAME/"

echo ""
echo "🎉 Congratulations! You adopted a $ANIMAL!"
echo ""
echo "📍 Repository: $FORK_URL"
echo "🌐 Live page:  $PAGES_URL"
echo ""
echo "Your pet will evolve daily via GitHub Actions."
echo "Check status anytime with: ./status.sh $REPO_NAME"
echo ""
echo "Welcome to the ForkZoo! 🐾"
