# 📦 Notion Templates for OpenClaw

Ready-to-use database templates optimized for AI agent workflows. Import these into your Notion workspace, share them with your OpenClaw integration, and start automating.

## 🎯 How to Use

### 1. Import Template into Notion

Notion doesn't support direct JSON import, but these templates serve as:

- **Schema reference** — See exactly what properties to create
- **Documentation** — Understand the intended workflow
- **Automation guide** — Example code for each template

### 2. Manual Setup (5 minutes per template)

1. Create new database in Notion
2. Add properties matching the template structure
3. Configure options (select values, tags, etc.)
4. Customize if needed — these are starting points

**💡 Pro Tip:** Add an **`ID`** property with type **unique ID** to auto-number entries (#1, #2, #3...). Then reference entries as `ID#3` instead of long UUIDs!

### 3. Connect to OpenClaw

1. Share the database with your integration (Share → Add connections)
2. Get the database ID from the URL
3. Start using with `notion-cli.js`

**Smart ID Reference:**

- **Notion ID:** `node notion-cli.js append-body '#3' --database DB_ID --text "content"`
- **Direct UUID:** `node notion-cli.js append-body 2fb3e4ac... --text "content"`

---

## 📋 Available Templates

### 📝 Content Pipeline

`content-pipeline.json`

**Best for:** Content creators, marketers, social media managers

**Tracks:** Ideas → Research → Draft → Review → Scheduled → Posted

**Key Properties:**

- Status (Idea → Posted)
- Platform (X/Twitter, YouTube, MakerWorld, etc.)
- Content Type (Quick Post, Thread, Video, Tutorial)
- Publish Date (for calendar view)
- Performance metrics

**OpenClaw Automation:**

```typescript
// Research scout finds trends, adds to "Ideas"
await exec({
  command: `node notion-cli.js add-entry ${CONTENT_DB} \
    --title "New Trend: AI-Generated Supports" \
    --properties '{"Status":{"select":{"name":"Idea"}},"Platform":{"multi_select":[{"name":"YouTube"}]}}'`,
})

// Daily: Move scheduled content to "Posted" after publishing
```

---

### 🎯 Project Tracker

`project-tracker.json`

**Best for:** Solo entrepreneurs, freelancers, small teams

**Tracks:** Projects from ideation to completion

**Key Properties:**

- Status (Not Started → In Progress → Blocked → Done)
- Priority (Critical to Backlog)
- Revenue Impact ($0 to $$$$)
- Time tracking (Est. vs Actual hours)
- AI Assistants used
- Weekly Goal flag

**OpenClaw Automation:**

```typescript
// Weekly business summary updates "Actual Hours"
// Shalom adds completed tasks, you review and confirm
```

---

### 🖨️ 3D Print CRM

`crm-3d-printing.json`

**Best for:** 3D printing businesses, custom fabrication shops

**Tracks:** Customer orders from lead → shipped

**Key Properties:**

- Status (Lead → Quote → Ordered → Printing → Shipped)
- Filament Type & Color
- Layer Height selection
- Print time est.
- Shopify/Quotify integration
- Tracking numbers
- Model file attachments

**OpenClaw Automation:**

```typescript
// New Shopify order webhook → creates CRM entry
// Status updates as you progress through printing stages
// Automatic "Ship By" date calculation based on Due Date
```

---

### 📚 Knowledge Base

`knowledge-base.json`

**Best for:** Building living documentation, SOPs, troubleshooting guides

**Tracks:** Articles organized by category and freshness

**Key Properties:**

- Category (SOP, Troubleshooting, Design Patterns, etc.)
- Subcategory (3D Printing, Business, Tools)
- Status (Draft → Published → Outdated)
- Last Verified date (for freshness tracking)
- Related articles (relations)
- Tags for filtering

**OpenClaw Automation:**

```typescript
// When you fix a tricky problem:
await exec({
  command: `node notion-cli.js add-entry ${KB_DB} \
    --title "Fixing Stringing on PETG" \
    --properties '{"Category":{"select":{"name":"Troubleshooting"}},"Tags":{"multi_select":[{"name":"PETG"}]}}'`,
})

// Monthly: Query "Last Verified > 3 months ago" for review reminders
```

---

## 🤖 Automation Ideas

### Daily / Scheduled

1. **Content Ideas Scout** (Research cron job)
   - Scans 3D printing trends
   - Adds findings to Content Pipeline as "Idea"
   - Tags relevant platforms

2. **Stale Content Alert**
   - Query "Idea" status items older than 7 days
   - Remind you to either develop or discard

3. **Weekly Priority Sync**
   - Review Project Tracker
   - Set "Weekly Goal" flags based on upcoming deadlines

### Event-Based

1. **New Order Flow** (Shopify webhook)
   - New order → CRM entry created
   - Auto-populates from order data
   - Estimates print time based on model file

2. **Project Milestone**
   - Status changes to "Done" → Archives research notes
   - Updates related project links

### Maintenance

1. **Knowledge Freshness Check**
   - Monthly: Query articles not verified in 90 days
   - Flag for review or mark outdated

2. **Performance Backfill**
   - Weekly: Update posted content with engagement metrics

---

## 🛠️ Customization Guide

### Adding New Properties

Use the pattern in the JSON templates:

```json
"My Property": {
  "type": "select|multi_select|rich_text|number|date|checkbox|url|email|files",
  "description": "What this property tracks"
}
```

### Modifying Options

Update select/multi_select options to match your workflow:

- Add/remove platforms to match your social presence
- Adjust project statuses for your process
- Create custom tags for your niche

### Creating Views

Each template suggests Notion views:

- **Board** (Kanban): Drag items through workflow
- **Table**: Sort and filter for analysis
- **Calendar**: Schedule-based management
- **Gallery**: Visual browsing (great for 3D models)

---

## 🔗 Quick Start Template

Can't decide? Start here:

1. **Today:** Set up **Content Pipeline**
2. **This Week:** Add **Project Tracker**
3. **When busy:** Add **CRM** (only when orders ramp up)
4. **Later:** Add **Knowledge Base** (as you accumulate knowledge)

---

## 📖 Example Database IDs

Share your database IDs here once configured (for your reference only):

```
Content Pipeline DB: _____________
Project Tracker DB: _____________
CRM DB: _____________
Knowledge Base DB: _____________
```

---

## 💡 Pro Tips

1. **Start simple** — Don't add all properties at once. Use the core set, expand as needed.

2. **Use templates for consistency** — Similar items should have similar structure

3. **Let AI populate, you review** — Have OpenClaw add items as "Draft", you approve/publish

4. **Keep IDs handy** — Store database IDs in `~/.openclaw/.env`:

   ```bash
   NOTION_TOKEN=secret_xxx
   CONTENT_DB_ID=abc123...
   PROJECT_DB_ID=def456...
   ```

5. **Iterate** — These are starting points. Customize to match _your_ workflow, not the template's assumptions.

---

**Need help setting up a specific template?** Check the `examples/` directory for step-by-step walkthroughs.

Happy automating! 🚀
