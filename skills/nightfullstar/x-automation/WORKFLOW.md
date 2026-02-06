# X Auto-Tweet System - Complete Guide

## 🎯 How It Works

**Fully automated tweet generation with human approval:**

1. **Cron job runs every 4 hours**
2. **I scrape trending topics** (via browser automation)
3. **I generate 2-3 tweet ideas** based on:
   - Trending crypto/tech topics
   - BountyLock updates
   - Your interests (ETH, Base L2, Web3)
4. **Send to you via Telegram** for approval
5. **Post approved tweets** automatically

## 📁 File Structure

```
x-automation/
├── data/
│   ├── latest-trends.json      # Current trending topics
│   ├── approved-queue.json     # Tweets you approved
│   ├── tweet-history.json      # All posted tweets
│   └── pending-approval.json   # Awaiting your review
├── scripts/
│   ├── auto-tweet.js           # Main automation script
│   ├── post.js                 # Direct tweet posting
│   ├── post-approved.js        # Post from approval queue
│   └── check-trends.js         # View current trends
└── README.md
```

## 🚀 Workflow

### Step 1: Manual Trend Scraping (for now)

Since browser automation needs Chrome extension setup, here's the simple flow:

**You tell me trends, I generate tweets:**

1. You: "Check X trends and generate tweet ideas"
2. Me: I navigate to X, scrape trends, generate 2-3 tweet ideas
3. You: Approve via "yes" / "edit: <new text>" / "skip"
4. Me: Post approved tweets

### Step 2: Tweet Approval via Telegram

**When I send tweet ideas:**

```
💡 Tweet Idea #1:
"ETH dipping under $2,800 again. Same people panic selling now will FOMO at $4k.

DCA gang stays winning 📈"

React with:
✅ = Post it
✏️ = I'll ask for edits
❌ = Skip
```

### Step 3: Posting

Once approved, tweets go to queue and post automatically (or manually via script).

## 🎨 Tweet Generation Guidelines

**Focus areas:**

- Crypto trends (ETH, Base L2, DeFi)
- Web3 development insights
- BountyLock updates (subtle, not spammy)
- Hot takes on trending tech topics

**Tone:**

- Direct, opinionated
- No corporate speak or buzzwords
- Personal voice (like you'd actually write it)
- 150-250 characters (short = more engagement)

**Avoid:**

- Generic motivational garbage
- Obvious statements ("Web3 is the future!")
- Over-selling BountyLock
- Engagement bait ("RT if you agree!")

## 📅 Posting Schedule

**Optimal times (Baku GMT+4):**

- Morning: 9:00-10:00 (when people check phones)
- Lunch: 13:00-14:00 (break time browsing)
- Evening: 19:00-21:00 (peak Twitter hours)
- Late: 23:00-00:00 (night crew)

**Frequency:**

- 2-4 tweets per day
- Don't post all at once
- Space out by 3-4 hours minimum

## 🔧 Manual Commands

### Check What's Trending

```bash
# I'll navigate to X and tell you top 5 trends
"What's trending on X?"
```

### Generate Tweet Ideas

```bash
# Based on current trends
"Generate 3 tweet ideas from X trends"
```

### Post Specific Tweet

```bash
# Direct posting
"Post this tweet: <your text>"
```

### Check Tweet History

```bash
"Show me tweets posted today"
```

## 🤖 Automation (Cron Job)

**Once we dial in the flow, I'll set up:**

```json
{
  "schedule": { "kind": "every", "everyMs": 14400000 },
  "payload": {
    "kind": "agentTurn",
    "message": "Check X trending topics. Generate 2-3 tweet ideas (crypto/Web3 focus). Send to Telegram with approval reactions. Post approved tweets."
  },
  "sessionTarget": "isolated"
}
```

Runs every 4 hours, fully automated except your approval.

## ⚠️ Safety Features

- **No auto-posting without approval** (except if you whitelist it)
- **Daily tweet limit:** Max 10 tweets/day (avoid spam)
- **Human-like delays:** 30-60 sec between tweets
- **Content review:** All tweets shown to you first
- **Edit capability:** Tweak before posting

## 🎯 Success Metrics

Track in `data/analytics.json`:

- Tweets posted per day
- Approval rate (how many you approve vs skip)
- Topics that resonate (crypto vs tech vs product)
- Engagement (manual tracking for now)

## 🚦 Getting Started

**Phase 1: Manual (This Week)**

1. You tell me when to check trends
2. I generate ideas → send to Telegram
3. You approve
4. I post them

**Phase 2: Semi-Auto (Next Week)**

1. Cron job checks trends 3x/day
2. Auto-generates ideas
3. Sends for approval
4. Posts approved ones

**Phase 3: Full Auto (Optional)**

1. I post within guidelines you set
2. Daily summary of what I posted
3. You review/delete if needed

---

## ✅ Ready?

Say **"Check X trends and generate tweet ideas"** and we'll do the first manual run!
