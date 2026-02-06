# 🔖 Bookmark Intelligence

**Turn your X (Twitter) bookmarks into actionable insights, automatically.**

Bookmark Intelligence watches your X bookmarks, fetches the full content from linked articles, analyzes everything with AI, and surfaces ideas relevant to YOUR projects. Stop letting great content sit in your bookmarks — let AI extract the value for you.

---

## 💎 Pricing & Tiers

Bookmark Intelligence offers three tiers to fit your needs:

### 🆓 Free Tier

**Perfect for trying it out**

- **Price:** $0/month
- **10 bookmarks** per month
- Manual run only (no automation)
- Basic keyword analysis (no AI)
- No notifications
- Rate limited: 1 run per hour

### ⭐ Pro Tier - $9/month

**Best for individuals**

- **Unlimited bookmarks**
- Automated monitoring (background daemon)
- Full AI-powered analysis (GPT-4o-mini)
- Telegram notifications
- Priority support

### 🚀 Enterprise Tier - $29/month

**For teams and power users**

- Everything in Pro, plus:
- Team sharing & collaboration
- Custom AI models (bring your own API keys)
- API access for integrations
- Slack & Discord notifications
- Webhook support
- Dedicated support

**Annual plans available** - Save 2 months (16% off)!

### How to Upgrade

1. **Check your current tier:**

   ```bash
   npm run license:check
   ```

2. **View upgrade options:**

   ```bash
   npm run license:upgrade
   ```

3. **Choose payment method:**
   - Credit Card (Stripe)
   - Crypto (USDC on Polygon)

4. **Activate your license:**
   ```bash
   node scripts/license.js activate YOUR-LICENSE-KEY
   ```

---

## 📋 Quick Start

**Total setup time: ~5 minutes**

1. **Run the setup wizard:**

   ```bash
   cd skills/bookmark-intelligence
   npm run setup
   ```

2. **The wizard will:**
   - ✅ Check if you have the required tools installed
   - 🍪 Guide you through getting your X cookies (step-by-step)
   - 🎯 Ask about your active projects & interests
   - ⚙️ Configure notification preferences
   - 🧪 Test your credentials

3. **Run it once to process your current bookmarks:**

   ```bash
   npm start
   ```

4. **Set it up as a background daemon (optional but recommended):**
   ```bash
   npm run daemon
   ```

That's it! You're done. 🎉

---

## 🎯 What It Does

### The Problem

You bookmark tons of great content on X, but:

- You never go back to read it
- The tweets link to articles you don't have time to read
- You forget why you bookmarked something
- You miss connections to your current projects

### The Solution

Bookmark Intelligence:

1. **Monitors** your X bookmarks automatically
2. **Fetches** the full content from any linked articles (not just the tweets)
3. **Analyzes** everything with AI to extract key concepts and actionable items
4. **Relates** insights to YOUR specific projects and interests
5. **Notifies** you (via Telegram) when it finds something valuable
6. **Stores** everything in a searchable knowledge base

### Example Output

You bookmark a tweet about "vector embeddings for AI memory" → The skill:

- Fetches the linked article
- Extracts: key concepts, actionable implementation steps, code patterns
- Relates it to your "trading bot" and "agent memory" projects
- Suggests: "Store market analysis as embeddings to find historical patterns"
- Saves the full analysis to `life/resources/bookmarks/bookmark-123.json`
- Sends you a Telegram notification with the summary

See [examples/sample-analysis.json](examples/sample-analysis.json) for a full example.

---

## 🍪 Getting Your X Cookies (Step-by-Step)

You need two cookies from X.com. Don't worry, this is safe and takes 2 minutes.

### Chrome / Edge / Brave

1. Open https://x.com in your browser
2. **Make sure you're logged in**
3. Press **F12** (opens Developer Tools)
4. Click the **Application** tab at the top
5. In the left sidebar:
   - Expand **Cookies**
   - Click **https://x.com**
6. You'll see a list of cookies. Find these two:
   - `auth_token` → Copy the **Value** column
   - `ct0` → Copy the **Value** column

```
┌─────────────────────────────────────────┐
│ Application  Console  Sources  ...     │ ← Click "Application"
├─────────────────────────────────────────┤
│ ▼ Storage                               │
│   ▼ Cookies                             │
│     ▶ https://x.com      ← Click this   │
│                                         │
│ Name          Value                     │
│ auth_token    abc123...  ← Copy this    │
│ ct0           xyz789...  ← Copy this    │
└─────────────────────────────────────────┘
```

### Firefox

1. Open https://x.com
2. Press **F12**
3. Click **Storage** tab (not "Application")
4. Expand **Cookies** → **https://x.com**
5. Copy `auth_token` and `ct0` values

### Safari

1. Enable Developer menu:
   - Safari → Preferences → Advanced
   - Check "Show Develop menu in menu bar"
2. Go to https://x.com
3. Develop → Show Web Inspector
4. Storage tab → Cookies → x.com
5. Copy `auth_token` and `ct0`

### ⚠️ Important Security Notes

- **These cookies are like your password** - they give full access to your X account
- **Never share them with anyone**
- **Don't post them online or commit them to git**
- They're stored locally in `.env` with strict permissions (600 = only you can read)
- They expire periodically - you'll need to update them (the skill will tell you)

The setup wizard creates a `.env` file that looks like this:

```bash
AUTH_TOKEN=your_long_token_here
CT0=your_other_token_here
```

---

## 🛠️ Requirements

### Required

- **Node.js** v16+ ([download here](https://nodejs.org))
- **bird CLI** - X/Twitter command-line tool
  ```bash
  npm install -g bird
  ```

### Optional (but recommended)

- **PM2** - For running as a background daemon
  ```bash
  npm install -g pm2
  ```

The setup wizard checks all of this automatically!

---

## ⚙️ Configuration

After running `npm run setup`, you'll have two files:

### 1. `.env` - Your Credentials

```bash
AUTH_TOKEN=your_token_here
CT0=your_ct0_here
```

**Never commit this file!** It's in `.gitignore`.

### 2. `config.json` - Your Preferences

```json
{
  "credentialsFile": ".env",
  "bookmarkCount": 50,
  "checkIntervalMinutes": 60,
  "storageDir": "../../life/resources/bookmarks",
  "notifyTelegram": true,
  "contextProjects": ["trading bot", "agent memory", "your other projects..."]
}
```

**Key settings:**

- `bookmarkCount` - How many recent bookmarks to check (default: 50)
- `checkIntervalMinutes` - How often to check for new bookmarks (default: 60)
- `contextProjects` - **Your active projects** - the more specific, the better the AI analysis!
- `notifyTelegram` - Get notified about high-value insights (requires OpenClaw)

You can edit `config.json` anytime. Changes take effect on next run.

---

## 🚀 Usage

### Run Once (Process Current Bookmarks)

```bash
npm start
```

Processes your recent bookmarks once and exits.

### Test Mode (See What Would Happen)

```bash
npm test
```

Shows what it would process without actually doing it.

### Background Daemon (Recommended for Daily Use)

```bash
npm run daemon
```

This runs Bookmark Intelligence in the background, checking for new bookmarks every hour (configurable).

**Managing the daemon:**

```bash
pm2 status bookmark-intelligence   # Check if it's running
pm2 logs bookmark-intelligence     # View recent logs
pm2 stop bookmark-intelligence     # Pause it
pm2 restart bookmark-intelligence  # Restart it
pm2 delete bookmark-intelligence   # Remove it completely
```

---

## 📂 Where Does Everything Go?

```
skills/bookmark-intelligence/
├── .env                    # Your credentials (SECRET - never commit!)
├── config.json             # Your preferences
├── bookmarks.json          # Processing state (tracks what's been analyzed)
├── monitor.js              # Main script
├── analyzer.js             # AI analysis engine
├── scripts/
│   ├── setup.js           # Setup wizard
│   └── uninstall.js       # Clean uninstall
└── examples/              # Sample outputs to show you what to expect

life/resources/bookmarks/   # ← Analyzed bookmarks saved here
├── bookmark-123.json
├── bookmark-456.json
└── ...
```

Each analyzed bookmark becomes a JSON file with:

- The original tweet (author, text, engagement stats)
- Full analysis (summary, key concepts, actionable items)
- Implementation suggestions for YOUR projects
- Priority level
- Timestamp

---

## 🔔 Notifications (OpenClaw Integration)

If you're running this inside OpenClaw (not standalone), you can get Telegram notifications for high-value insights.

**What triggers a notification:**

- `priority: "high"` AND
- `hasActionableInsights: true`

**What you get:**

- 📚 Summary of the content
- 🎯 List of actionable items
- 💡 Key concepts
- 🔨 Implementation suggestions for your projects
- 🔗 Link to the original tweet

See [examples/sample-notification.md](examples/sample-notification.md) for a full example.

---

## 🧹 Uninstalling

```bash
npm run uninstall
```

This will:

1. Stop the PM2 daemon (if running)
2. Delete your credentials (`.env`)
3. Delete configuration (`config.json`)
4. Delete processing state (`bookmarks.json`)
5. **Ask** if you want to keep your analyzed bookmarks

To reinstall later, just run `npm run setup` again.

---

## 🔧 Troubleshooting

### "Missing Twitter credentials" error

**Problem:** The skill can't find your auth tokens.

**Solution:**

1. Make sure you ran `npm run setup`
2. Check that `.env` exists in `skills/bookmark-intelligence/`
3. Check that `.env` has both `AUTH_TOKEN=` and `CT0=` lines

### "No bookmarks fetched" or "unauthorized" error

**Problem:** Your cookies are invalid or expired.

**Solution:**

1. Get fresh cookies from X.com (see instructions above)
2. Update `.env` with new values
3. Try running `npm test` to verify

**To manually test your credentials:**

```bash
cd skills/bookmark-intelligence
source .env
bird whoami --json
```

If this works, your credentials are valid.

### "bird: command not found"

**Problem:** bird CLI isn't installed.

**Solution:**

```bash
npm install -g bird
```

### Daemon not running / stops unexpectedly

**Problem:** PM2 might not be installed, or daemon crashed.

**Solution:**

```bash
# Check PM2 is installed
pm2 --version

# If not, install it
npm install -g pm2

# Check daemon status
pm2 status

# View logs to see what happened
pm2 logs bookmark-intelligence

# Restart
npm run daemon
```

### Analysis seems generic / not relevant

**Problem:** The AI doesn't know what you care about.

**Solution:**

1. Edit `config.json`
2. Update `contextProjects` with **specific** project descriptions:
   ```json
   "contextProjects": [
     "Building a crypto trading bot using Python and Binance API",
     "Learning Rust for systems programming",
     "Growing my SaaS to $10k MRR"
   ]
   ```
3. Restart: `pm2 restart bookmark-intelligence`

The more specific you are, the better the AI can relate insights to your work!

---

## 🔐 Privacy & Data

**Where is your data stored?**

- Credentials: `.env` (local file, permissions: 600)
- Analyzed bookmarks: `life/resources/bookmarks/` (local files)
- Nothing is sent to any third party except:
  - X.com (to fetch your bookmarks)
  - OpenAI/Anthropic (for AI analysis, if using OpenClaw LLM)
  - Linked websites (to fetch article content)

**Can I use this without OpenClaw?**

- Yes! It works standalone
- You won't get LLM analysis (falls back to keyword-based analysis)
- You won't get Telegram notifications
- Everything else works fine

**Is it safe?**

- Your credentials never leave your machine
- `.env` is in `.gitignore` so you won't accidentally commit it
- File permissions are set to 600 (owner read/write only)
- No telemetry, no phone-home

---

## 🎨 Customization Ideas

Once you're comfortable with the basics, you can customize:

### Change notification threshold

Edit `monitor.js` line ~120 to notify on `medium` priority too:

```javascript
if (config.notifyTelegram && (analysis.priority === 'high' || analysis.priority === 'medium')) {
```

### Process more bookmarks

Edit `config.json`:

```json
{
  "bookmarkCount": 100 // Check last 100 bookmarks
}
```

### Check more frequently

```json
{
  "checkIntervalMinutes": 30 // Check every 30 minutes
}
```

### Export to Notion / Obsidian

Add your own export script in `scripts/export-to-notion.js` - each bookmark is already a clean JSON structure!

---

## 📚 Examples

See the `examples/` folder:

- **sample-analysis.json** - What a full analysis looks like
- **sample-notification.md** - What you'll see in Telegram

---

## 🐛 Found a Bug?

Open an issue on ClawHub or submit a PR!

Common issues:

- Cookie expiration → Just update `.env` with fresh cookies
- Rate limiting → Reduce `bookmarkCount` or increase `checkIntervalMinutes`
- Analysis quality → Make `contextProjects` more specific

---

## 📜 License

MIT - Do whatever you want with it!

---

## 💳 Payment & Licensing

### Accepted Payment Methods

**Credit Card (Stripe)**

- All major credit cards accepted
- Instant activation
- Automatic recurring billing
- Cancel anytime

**Cryptocurrency**

- USDC on Polygon network
- Low transaction fees (~$0.01)
- Manual verification (24hr activation)
- Send exact amount with payment ID as memo

### How Payments Work

1. Run `npm run license:upgrade` to see options
2. Choose your tier and payment method
3. For Stripe: Click the link and complete checkout
4. For Crypto: Send USDC to the provided address with the payment memo
5. You'll receive a license key via email
6. Activate: `node scripts/license.js activate <key>`

### License Management

**Check your status anytime:**

```bash
npm run license:check
```

**Your license includes:**

- Subscription tier and features
- Usage stats (bookmarks processed this month)
- Expiration date
- Grace period (3 days after expiration)

**Renewals:**

- Monthly: Auto-renews every 30 days
- Annual: Auto-renews every 365 days
- You'll receive renewal reminders via email

### Refund Policy

- **30-day money-back guarantee** for annual plans
- Monthly subscriptions: Refund available within 7 days of first payment
- Contact support with your license key or payment ID
- Refunds processed within 5-7 business days

### Privacy

- Payment processing: Stripe (PCI-DSS Level 1 certified)
- We never store your credit card details
- License keys are encrypted locally on your machine
- Usage statistics are stored locally only

### Support

**Free Tier:** Community support via GitHub issues
**Pro Tier:** Email support (48hr response time)
**Enterprise Tier:** Priority support (8hr response time) + Slack channel

---

## ❓ Frequently Asked Questions

### General

**Q: Do I need OpenClaw to use this?**  
A: No! It works standalone. With OpenClaw you get LLM analysis and notifications, but it's optional.

**Q: Can I try it before paying?**  
A: Yes! Start with the Free tier (10 bookmarks/month). No credit card required.

**Q: How do I upgrade or downgrade?**  
A: Run `npm run license:upgrade` to upgrade. For downgrades, contact support before renewal.

**Q: What happens if I exceed my Free tier limit?**  
A: Processing stops at 10 bookmarks. You'll see a message prompting you to upgrade. Your data is safe.

### Billing

**Q: Can I cancel anytime?**  
A: Yes! No commitments. Cancel before your next billing date and you won't be charged.

**Q: Do you offer discounts?**  
A: Annual plans save 2 months (16% off). Student/nonprofit discounts available - contact support.

**Q: What if my payment fails?**  
A: You'll get a 3-day grace period to update payment info. After that, you'll downgrade to Free tier.

**Q: Can I get an invoice?**  
A: Yes! Invoices are emailed automatically. Enterprise customers can request custom invoices.

### Technical

**Q: Does the Free tier use AI analysis?**  
A: No, Free tier uses keyword-based heuristics. Upgrade to Pro for full AI-powered insights.

**Q: How does automation work?**  
A: Pro/Enterprise tiers can run as a background daemon (PM2) that checks bookmarks automatically.

**Q: Can I use my own AI API keys?**  
A: Enterprise tier only. Supports OpenAI, Anthropic, and custom endpoints.

**Q: Is my data private?**  
A: Yes! Everything runs locally. Your bookmarks never leave your machine except for AI analysis API calls.

**Q: What if I change machines?**  
A: Your license key works on one machine at a time. Contact support to transfer licenses.

### For Sellers (if distributing via ClawHub)

**Q: How do I configure payment for my wallet?**  
A: Edit `payment-config.json` and add your Stripe keys and/or crypto wallet address.

**Q: Can I change the pricing?**  
A: Yes! Edit the `pricing` section in `payment-config.json`.

**Q: How do I issue trial licenses?**  
A: Use the admin dashboard: `node scripts/admin.js issue pro user@example.com trial`

**Q: How do I track revenue?**  
A: Run `npm run admin:revenue` to see stats.

---

## 🤝 Contributing

Pull requests welcome! Areas for improvement:

- Better content extraction (handle paywalls, PDFs, etc.)
- Deduplication (don't re-analyze similar bookmarks)
- Trend detection (spot recurring themes across bookmarks)
- Interactive Telegram UI (implement/dismiss/save for later buttons)
- Export integrations (Notion, Obsidian, Roam)

---

**Made with ❤️ for OpenClaw**

Questions? Check the troubleshooting section above or ask in the OpenClaw community!
