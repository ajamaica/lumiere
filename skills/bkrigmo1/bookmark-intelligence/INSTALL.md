# 📦 Installation Guide

## For New Users (Never Used Before)

### 1. Prerequisites

```bash
# Check Node.js version (need 16+)
node --version

# Install bird CLI if you don't have it
npm install -g bird

# Optional: Install PM2 for daemon mode
npm install -g pm2
```

### 2. Run Setup Wizard

```bash
cd skills/bookmark-intelligence
npm run setup
```

Follow the interactive prompts. The wizard will:

- ✅ Check if dependencies are installed
- 🍪 Walk you through getting X cookies from your browser
- 🎯 Ask about your projects/interests
- ⚙️ Configure settings
- 🧪 Test your credentials
- ✅ Create `.env` and `config.json`

### 3. Test It

```bash
# Dry run (shows what would happen)
npm test

# Real run (processes bookmarks)
npm start
```

### 4. Run as Daemon (Optional)

```bash
npm run daemon
pm2 status bookmark-intelligence
```

---

## For Existing Users (Updating)

### If You Already Have .env and config.json

```bash
cd skills/bookmark-intelligence
git pull  # or however you update
npm start
```

Your credentials and config are preserved!

### If You Want to Reconfigure

```bash
npm run setup
```

This will guide you through setup again.

---

## Verification Checklist

After installation, verify:

- [ ] `.env` file exists with `AUTH_TOKEN` and `CT0`
- [ ] `config.json` exists with your projects listed
- [ ] `npm test` runs without errors
- [ ] `npm start` processes bookmarks successfully
- [ ] Analyzed bookmarks appear in `../../life/resources/bookmarks/`

---

## File Locations

After setup, you should have:

```
skills/bookmark-intelligence/
├── .env                  # ← Your credentials (SECRET!)
├── config.json           # ← Your preferences
├── bookmarks.json        # ← Processing state (auto-created)
└── [other skill files]

life/resources/bookmarks/ # ← Analysis results
├── bookmark-123.json
├── bookmark-456.json
└── ...
```

---

## Quick Commands Reference

| Command                             | What It Does                           |
| ----------------------------------- | -------------------------------------- |
| `npm run setup`                     | Interactive setup wizard               |
| `npm test`                          | Dry run (show what would be processed) |
| `npm start`                         | Run once (process bookmarks now)       |
| `npm run daemon`                    | Start background daemon                |
| `npm run uninstall`                 | Clean uninstall                        |
| `pm2 status`                        | Check daemon status                    |
| `pm2 logs bookmark-intelligence`    | View daemon logs                       |
| `pm2 restart bookmark-intelligence` | Restart daemon                         |
| `pm2 stop bookmark-intelligence`    | Stop daemon                            |

---

## Troubleshooting

### Setup wizard fails to find bird

```bash
npm install -g bird
which bird  # Should show a path
```

### "Missing credentials" error after setup

```bash
# Check .env exists and has content
cat .env

# Should show:
# AUTH_TOKEN=...
# CT0=...
```

### Want to start fresh?

```bash
npm run uninstall  # Remove everything
npm run setup      # Start over
```

---

## Next Steps

Once installed:

1. Read [SKILL.md](SKILL.md) for full documentation
2. Check [examples/](examples/) to see what output looks like
3. Customize `config.json` with your specific projects
4. Set up daemon mode if you want continuous monitoring

---

**Need Help?**

- Full docs: [SKILL.md](SKILL.md)
- Troubleshooting: [SKILL.md#troubleshooting](SKILL.md#-troubleshooting)
- Examples: [examples/](examples/)
