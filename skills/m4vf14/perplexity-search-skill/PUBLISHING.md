# Publishing Guide

## Package Ready ✅

Your skill is packaged and ready for ClawHub publication.

**Location:** `/Users/craigmilligan/.openclaw/workspace/perplexity-search-skill/`

---

## Pre-Publication Checklist

- [x] Security audit passed
- [x] Script tested and working
- [x] Documentation complete
- [x] License included (MIT)
- [x] Metadata added (skill.json)
- [x] README with install instructions
- [x] Changelog started
- [x] .gitignore configured

---

## Option 1: Publish to ClawHub (Recommended)

### Step 1: Create GitHub Repo (if not exists)

```bash
cd /Users/craigmilligan/.openclaw/workspace/perplexity-search-skill

# Initialize git if needed
git init
git add .
git commit -m "Initial release v1.0.0"

# Create GitHub repo and push
gh repo create perplexity-search-openclaw --public --source=. --push
```

### Step 2: Upload to ClawHub

1. Go to: https://clawhub.ai/upload
2. Select the skill directory or GitHub URL
3. Review metadata (pulled from skill.json)
4. Publish

**OR** use the ClawHub CLI:

```bash
clawhub publish /Users/craigmilligan/.openclaw/workspace/perplexity-search-skill
```

---

## Option 2: Manual Distribution

Users can install directly from your GitHub repo:

```bash
# In their OpenClaw environment
cd ~/.openclaw/skills/
git clone https://github.com/M4vF14/perplexity-search-openclaw.git perplexity-search
```

Then add API key to `~/.openclaw/openclaw.json` and restart gateway.

---

## Post-Publication

### Monitor Usage

- Watch GitHub stars/issues
- Check ClawHub analytics (if available)
- Monitor Perplexity API usage at https://perplexity.ai/account/api

### Support Channels

- GitHub Issues: For bugs and feature requests
- ClawHub Comments: For user questions
- OpenClaw Discord: For community support

### Versioning

When you make changes:

1. Update `skill.json` version (semantic versioning)
2. Add entry to `CHANGELOG.md`
3. Commit and tag:
   ```bash
   git add .
   git commit -m "Release v1.1.0: Add feature X"
   git tag v1.1.0
   git push --tags
   ```
4. Update on ClawHub (auto-detects new tags)

---

## What Users Will See

**On ClawHub:**

- Name: Perplexity Search
- Icon: 🔍
- Description: Search the web using Perplexity's Search API...
- Install button → `clawhub install perplexity-search`

**After Installation:**

- Skill appears in `~/.openclaw/skills/perplexity-search/`
- Agent can use it immediately
- Users must add their own API key

---

## Security Note

Your personal API key is **NOT** in the packaged skill. Users must provide their own. The package only contains:

- Documentation
- Scripts
- Configuration templates

✅ **Safe to distribute publicly**

---

## Questions?

- ClawHub docs: https://clawhub.com/docs
- OpenClaw docs: https://docs.openclaw.ai
- Your OpenClaw agent can help too! 🦾
