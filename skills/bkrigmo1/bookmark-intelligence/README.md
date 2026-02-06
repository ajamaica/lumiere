# 🔖 Bookmark Intelligence

**AI-powered bookmark analysis that actually helps you get things done.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: 16+](https://img.shields.io/badge/node-16+-green.svg)](https://nodejs.org)

Turn your X (Twitter) bookmarks into actionable insights automatically. This OpenClaw skill monitors your bookmarks, extracts content from linked articles, analyzes everything with AI, and surfaces ideas relevant to YOUR specific projects.

## 💎 Pricing

### 🆓 Free Tier

- 10 bookmarks/month
- Manual run only
- Basic analysis (no AI)

### ⭐ Pro - $9/month

- **Unlimited bookmarks**
- Automated monitoring
- Full AI analysis
- Telegram notifications

### 🚀 Enterprise - $29/month

- Everything in Pro +
- Team collaboration
- Custom AI models
- API access
- Slack/Discord integration

**Annual plans save 16%** | [View full pricing](SKILL.md#-pricing--tiers)

## ✨ Features

- 📚 **Auto-monitors** your X bookmarks
- 🔍 **Fetches full content** from linked articles (not just tweets)
- 🤖 **AI analysis** extracts key concepts, actionable items, and implementation ideas
- 🎯 **Project-aware** - relates insights to YOUR active projects
- 📱 **Telegram notifications** for high-value findings (Pro+)
- 💾 **Knowledge base** - stores everything for future reference
- ⚙️ **Background daemon** mode - runs 24/7 without your input (Pro+)

## 🚀 Quick Start

```bash
cd skills/bookmark-intelligence
npm run setup        # Interactive setup wizard
npm run license:check  # Check your tier and usage
npm start            # Process bookmarks once
npm run daemon       # Run in background (Pro/Enterprise)
```

The interactive wizard will:

1. ✅ Check dependencies
2. 🍪 Guide you through getting X cookies (step-by-step)
3. 🎯 Ask about your projects & interests
4. 🧪 Test your credentials
5. ⚙️ Configure everything

**That's it!** No configuration files to edit, no docs to read (unless you want to).

## 💳 How to Upgrade

```bash
npm run license:upgrade
```

Choose your payment method:

- **Credit Card (Stripe):** Instant activation
- **Crypto (USDC):** 24hr activation via Polygon network

After payment, activate your license:

```bash
node scripts/license.js activate YOUR-LICENSE-KEY
```

## 🧪 Test Licenses (For Development)

Pre-configured test keys for reviewers and developers:

```bash
# Free tier test
node scripts/license.js activate TEST-FREE-0000000000000000

# Pro tier test
node scripts/license.js activate TEST-PRO-00000000000000000

# Enterprise tier test
node scripts/license.js activate TEST-ENT-00000000000000000
```

These test licenses have all features enabled for evaluation.

## 📖 Full Documentation

See [SKILL.md](SKILL.md) for complete documentation including:

- Detailed setup instructions
- Cookie extraction guide with screenshots
- Configuration options
- Pricing & payment details
- FAQ
- Troubleshooting
- Examples

## 🎯 Example Use Case

**Before:**

> You bookmark a tweet about "vector embeddings for AI agents" and never look at it again.

**After (Pro tier):**

> The skill:
>
> 1. Fetches the linked article
> 2. Extracts: key concepts, code patterns, implementation steps
> 3. Relates it to your "trading bot" and "agent memory" projects
> 4. Suggests: "Store market analysis as embeddings to find similar historical patterns"
> 5. Sends you a Telegram notification with a summary
> 6. Saves the full analysis for later reference

See [examples/](examples/) for sample outputs.

## 🛠️ Requirements

**Required:**

- Node.js 16+ ([download](https://nodejs.org))
- [bird CLI](https://github.com/yardencsGitHub/bird) (`npm install -g bird`)

**Optional:**

- PM2 for daemon mode (`npm install -g pm2`)
- OpenClaw for LLM analysis & Telegram notifications

## 📦 What's Included

```
├── scripts/
│   ├── setup.js        # Interactive setup wizard
│   ├── license.js      # License management
│   ├── payment.js      # Payment processing
│   ├── upgrade.js      # Upgrade flow
│   ├── admin.js        # Admin dashboard (sellers)
│   └── uninstall.js    # Clean uninstall script
├── examples/           # Sample outputs
├── monitor.js          # Main monitoring script
├── analyzer.js         # AI analysis engine
├── SKILL.md           # Complete documentation
└── package.json
```

## 🎨 Customization

Edit `config.json` after setup to:

- Change how many bookmarks to check
- Adjust check frequency
- Update your project list (be specific for better results!)
- Enable/disable notifications

## 🔐 Privacy

- Your credentials stay on your machine (`.env` file, permissions: 600)
- License keys encrypted locally with machine ID
- Analyzed bookmarks stored locally in `life/resources/bookmarks/`
- No telemetry, no phone-home
- Open source - read the code yourself!

**Payment processing:** Stripe (PCI-DSS Level 1) or crypto (direct to wallet)

## 🧹 Uninstalling

```bash
npm run uninstall
```

Optionally keeps your analyzed bookmarks.

## 📜 License

MIT - Use it however you want!

## 🙋 Support

- **Free tier:** Community support via GitHub issues
- **Pro tier:** Email support (48hr response)
- **Enterprise tier:** Priority support (8hr response) + Slack channel

## 🤝 Contributing

PRs welcome! Ideas for improvement:

- Better content extraction (PDFs, paywalls)
- Deduplication across similar bookmarks
- Trend detection (recurring themes)
- Export integrations (Notion, Obsidian)
- Interactive Telegram UI

## 🐛 Issues?

See the [troubleshooting section](SKILL.md#-troubleshooting) in SKILL.md or open an issue.

---

## 👨‍💼 For Sellers (ClawHub Distribution)

### Setup Payment Processing

1. **Edit payment configuration:**

   ```bash
   node scripts/payment.js configure
   ```

2. **Configure your payment methods** in `payment-config.json`:
   - **Stripe:** Add your publishable and secret keys
   - **Crypto:** Add your wallet address (USDC on Polygon)
   - **Pricing:** Adjust tiers if desired

3. **Test payment flow:**

   ```bash
   node scripts/payment.js stripe pro monthly test@example.com
   ```

4. **Issue trial licenses:**
   ```bash
   node scripts/admin.js issue pro user@example.com trial
   ```

### Admin Commands

```bash
npm run admin:licenses    # Dashboard overview
npm run admin:payments    # List all payments
npm run admin:revenue     # Revenue statistics

node scripts/admin.js issue <tier> <email> [duration]
node scripts/admin.js revoke <license-key> [reason]
node scripts/admin.js list [tier] [status]
```

### Security Notes

- License keys: 32-char hex, encrypted with machine ID
- Payment webhooks: Verify Stripe signatures
- Never commit `payment-config.json` with real keys to public repos
- Test mode included for safe development

---

**Made for OpenClaw** | [Documentation](SKILL.md) | [Examples](examples/)
