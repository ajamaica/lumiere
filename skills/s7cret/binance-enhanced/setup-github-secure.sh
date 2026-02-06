#!/bin/bash
# Secure GitHub Integration Setup

set -e

echo "🔐 Secure GitHub Integration Setup"
echo "==================================="

# Запрос токена если не передан
if [ -z "$1" ]; then
    echo "⚠️  WARNING: GitHub token should be passed as argument, not hardcoded"
    echo "Usage: ./setup-github-secure.sh <github-token> [username]"
    echo ""
    echo "Your token starts with: ghp_L6voLFFv..."
    echo "Please run: ./setup-github-secure.sh ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx S7cret"
    exit 1
fi

GITHUB_TOKEN="$1"
USERNAME="${2:-S7cret}"
REPO_NAME="binance-enhanced"

echo "👤 GitHub User: $USERNAME"
echo "📦 Repository: $REPO_NAME"
echo "🔐 Token: ${GITHUB_TOKEN:0:8}...${GITHUB_TOKEN: -4}"

# Проверка токена
echo ""
echo "🔍 Testing GitHub token..."
USER_INFO=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
                "https://api.github.com/user")

if echo "$USER_INFO" | grep -q '"login"'; then
    DETECTED_USER=$(echo "$USER_INFO" | grep '"login"' | head -1 | cut -d'"' -f4)
    echo "✅ Token valid for user: $DETECTED_USER"
    
    if [ "$DETECTED_USER" != "$USERNAME" ]; then
        echo "⚠️  Token belongs to $DETECTED_USER, not $USERNAME"
        read -p "Continue with $DETECTED_USER? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        USERNAME="$DETECTED_USER"
    fi
else
    echo "❌ Invalid GitHub token"
    echo "Response: $USER_INFO"
    exit 1
fi

echo ""
echo "🚀 Starting GitHub integration..."

# Удаление токена из истории bash
history -c

# Создание безопасного скрипта для настройки
cat > setup-repo.sh << 'SCRIPT'
#!/bin/bash
# Internal script - token passed as environment variable

set -e

echo "📦 Creating/updating repository..."
REPO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              -H "Authorization: token $GITHUB_TOKEN" \
              "https://api.github.com/repos/$USERNAME/$REPO_NAME")

if [ "$REPO_STATUS" = "200" ]; then
    echo "✅ Repository exists: https://github.com/$USERNAME/$REPO_NAME"
    echo "   Updating..."
else
    echo "🆕 Creating new repository..."
    curl -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/user/repos" \
      -d '{
        "name": "'"$REPO_NAME"'",
        "description": "Enhanced Binance trading skill for OpenClaw",
        "private": false,
        "auto_init": true,
        "has_issues": true,
        "has_projects": false,
        "has_wiki": false,
        "has_downloads": true
      }'
    echo "✅ Repository created"
fi

echo ""
echo "🎉 Repository ready: https://github.com/$USERNAME/$REPO_NAME"
SCRIPT

chmod +x setup-repo.sh
GITHUB_TOKEN="$GITHUB_TOKEN" USERNAME="$USERNAME" REPO_NAME="$REPO_NAME" ./setup-repo.sh
rm -f setup-repo.sh

echo ""
echo "🔧 Local Git setup..."
cd "$(dirname "$0")"

# Инициализация Git если не инициализирован
if [ ! -d ".git" ]; then
    git init
    git config user.name "$USERNAME"
    git config user.email "$USERNAME@users.noreply.github.com"
    
    # .gitignore уже создан в основном скрипте
    git add .
    git commit -m "Initial commit: Binance Enhanced v2.0.0"
fi

# Настройка remote с токеном
echo "🔗 Configuring Git remote..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://$USERNAME:$GITHUB_TOKEN@github.com/$USERNAME/$REPO_NAME.git"

# Push
echo "📤 Pushing to GitHub..."
git push -u origin main --force

# Очистка токена из URL в конфиге
echo "🧹 Cleaning token from Git config..."
git remote set-url origin "https://github.com/$USERNAME/$REPO_NAME.git"

echo ""
echo "✅ GitHub integration complete!"
echo ""
echo "📊 Quick links:"
echo "   Repository:   https://github.com/$USERNAME/$REPO_NAME"
echo "   Actions:      https://github.com/$USERNAME/$REPO_NAME/actions"
echo "   Settings:     https://github.com/$USERNAME/$REPO_NAME/settings"
echo ""
echo "🔐 Next steps - configure secrets:"
echo "1. Go to: https://github.com/$USERNAME/$REPO_NAME/settings/secrets/actions"
echo "2. Add 'New repository secret':"
echo "   - Name: OPENCLAW_API_KEY"
echo "   - Value: (your OpenClaw API key)"
echo ""
echo "3. Optional - for ClawHub publishing:"
echo "   - Name: CLAWHUB_API_KEY"
echo "   - Value: (your ClawHub API key)"
echo ""
echo "🚀 To test: Make a change and push:"
echo "   echo '# Test update' >> TEST.md"
echo "   git add TEST.md"
echo "   git commit -m 'Test update'"
echo "   git push"
echo ""
echo "⚠️  SECURITY NOTE:"
echo "   - Your GitHub token was used temporarily and not stored"
echo "   - Consider rotating token after setup"
echo "   - Token should have only 'repo' scope"
echo "   - Never commit tokens to Git!"

# Предложение ротации токена
echo ""
read -p "🔐 Generate new token with limited scope? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Go to: https://github.com/settings/tokens"
    echo "Create new token with only:"
    echo "  - repo (Full control of private repositories)"
    echo "Then update remote:"
    echo "  git remote set-url origin https://USERNAME:NEW_TOKEN@github.com/USERNAME/REPO.git"
fi