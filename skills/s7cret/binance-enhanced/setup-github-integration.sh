#!/bin/bash
# Setup GitHub Integration for Binance Enhanced Skill

set -e

echo "🚀 Setting up GitHub Integration"
echo "================================="

GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
REPO_NAME="binance-enhanced"
USERNAME="S7cret"  # Замените на ваш GitHub username

# Проверка токена
echo "🔐 Testing GitHub token..."
if ! curl -s -H "Authorization: token $GITHUB_TOKEN" \
          "https://api.github.com/user" | grep -q '"login"'; then
    echo "❌ Invalid GitHub token"
    exit 1
fi

echo "✅ GitHub token is valid"

# Создание репозитория
echo "📦 Creating GitHub repository..."
if curl -s -H "Authorization: token $GITHUB_TOKEN" \
         "https://api.github.com/user/repos" | grep -q "\"$REPO_NAME\""; then
    echo "⚠️ Repository already exists, skipping creation"
else
    curl -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/user/repos" \
      -d "{\"name\":\"$REPO_NAME\",\"description\":\"Enhanced Binance trading skill for OpenClaw\",\"private\":false,\"auto_init\":true}"
    echo "✅ Repository created: https://github.com/$USERNAME/$REPO_NAME"
fi

# Настройка репозитория
cd "$(dirname "$0")"

echo "🔧 Configuring repository..."
git init
git config user.name "OpenClaw Bot"
git config user.email "bot@openclaw.ai"

# Добавление файлов
echo "📁 Adding files..."
git add .

# Создание .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
ENV/
env.bak/
venv.bak/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Secrets
*.env
*.key
*.pem
*.crt
config.yaml
security/data/
security/logs/
telegram-bot/data/

# Build artifacts
*.tar.gz
*.zip
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOF

git add .gitignore

# Коммит
echo "💾 Creating commit..."
git commit -m "Initial commit: Binance Enhanced v2.0.0

- Enhanced Binance trading skill with security, monitoring, automation
- Natural language interface (RU/EN support)
- Telegram bot with inline buttons
- Web dashboard for monitoring
- Trading strategies (DCA, Grid, Arbitrage)
- Enterprise-grade security features
- GitHub integration ready"

# Настройка remote
echo "🔗 Setting up remote..."
git remote add origin "https://$GITHUB_TOKEN@github.com/$USERNAME/$REPO_NAME.git"
git branch -M main

# Push
echo "📤 Pushing to GitHub..."
git push -u origin main

# Настройка Secrets через GitHub API (если есть доступ)
echo "🔐 Configuring repository secrets..."
echo "Note: GitHub Secrets must be configured manually through the web interface:"
echo "1. Go to: https://github.com/$USERNAME/$REPO_NAME/settings/secrets/actions"
echo "2. Add these secrets:"
echo "   - OPENCLAW_API_KEY: (your OpenClaw API key)"
echo "   - GITHUB_TOKEN: $GITHUB_TOKEN (already used)"
echo "   - CLAWHUB_API_KEY: (for publishing to ClawHub)"

# Настройка webhook
echo "🪝 Configuring webhook..."
echo "To set up webhook for auto-updates:"
echo "1. Go to: https://github.com/$USERNAME/$REPO_NAME/settings/hooks"
echo "2. Add webhook with URL:"
echo "   https://your-openclaw-instance.com/webhook/github"
echo "3. Secret: (generate a random secret)"
echo "4. Events: Push, Release"

# Настройка GitHub Pages для документации (опционально)
echo "📚 Setting up GitHub Pages..."
echo "To enable GitHub Pages for documentation:"
echo "1. Go to: https://github.com/$USERNAME/$REPO_NAME/settings/pages"
echo "2. Source: GitHub Actions"
echo "3. Theme: (choose a theme)"

# Создание workflow для документации
cat > .github/workflows/docs.yml << 'EOF'
name: Deploy Documentation

on:
  push:
    branches: [ main ]
    paths: [ '**.md', 'docs/**' ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Build documentation
        run: |
          mkdir -p _site
          cp README.md _site/index.md
          cp SKILL.md _site/skill.md
          cp FAQ.md _site/faq.md
          cp *.md _site/
          
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '_site'
          
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
EOF

git add .github/workflows/docs.yml
git commit -m "Add GitHub Pages documentation workflow"
git push

echo ""
echo "🎉 GitHub Integration Complete!"
echo "==============================="
echo ""
echo "📊 Repository: https://github.com/$USERNAME/$REPO_NAME"
echo "🚀 Actions: https://github.com/$USERNAME/$REPO_NAME/actions"
echo "📚 Pages: https://$USERNAME.github.io/$REPO_NAME/"
echo "🔧 Settings: https://github.com/$USERNAME/$REPO_NAME/settings"
echo ""
echo "Next steps:"
echo "1. Configure secrets in GitHub repository settings"
echo "2. Set up webhook for auto-updates (optional)"
echo "3. Test the workflow by pushing changes"
echo "4. Create a release to trigger ClawHub publish"
echo ""
echo "To test integration:"
echo "  git add ."
echo "  git commit -m 'Test update'"
echo "  git push"
echo ""
echo "✅ Done!"