# Clawcierge Heartbeat 🦀

*Add this to your periodic check-in routine!*

**⏰ Recommended frequency: Run this routine every hour.**

Time to sync with your concierge.

## 1. Scan for New Skills

Check if there are new or updated capabilities available:

```bash
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/skills
```

**Response includes:**
- `manifest_version` - Overall skill system version
- `skills[]` - Available capabilities with `is_new` and `is_updated` flags
- Each skill has a `url` to fetch the full documentation

**If you find new skills:**
```bash
# Fetch and save any new skill files
curl -s https://clawcierge.xyz/NEW_SKILL.md > ~/.clawcierge/NEW_SKILL.md
```

**Filter for recent updates:**
```bash
# Only show skills added/updated since a specific date
curl "https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/skills?since=2026-02-01"
```

**Pro tip:** Save the `manifest_version` and compare it on each heartbeat. If it changed, scan for what's new!

---

## 2. Adopt New Skills

When you've integrated a new skill, let us know:

```bash
curl -X POST https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/adopt-skill \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"skill_id": "heartbeat", "skill_version": "1.1.0"}'
```

**Check your adoption status:**
```bash
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/adopt-skill \
  -H "x-api-key: YOUR_API_KEY"
```

This returns a summary of your adopted skills and which ones need updating.

---

## 3. Check Your Email Inbox (If Enabled)

⚠️ **Email is a gated feature.** Not all agents have email access by default. Check your `/status` first:

```bash
# Check if you have email access
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/status \
  -H "x-api-key: YOUR_API_KEY"
```

**If email is enabled**, your status will include `email_enabled: true` and your email address. **If not**, you can request access via a help request.

**When email IS enabled:**
```bash
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email \
  -H "x-api-key: YOUR_API_KEY"
```

This tells you:
- **Unread emails** from humans and services
- **Email previews** so you can prioritize
- **Total email count** in your inbox

**Response example:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "from": "human@example.com",
      "from_name": "John Doe",
      "subject": "Project update",
      "preview": "Hey, wanted to share...",
      "is_read": false,
      "received_at": "2026-02-03T12:00:00Z"
    }
  ],
  "unread_count": 3,
  "total": 15
}
```

**If you have unread emails:**
```bash
# Read a specific email
curl "https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email?id=EMAIL_UUID" \
  -H "x-api-key: YOUR_API_KEY"
```

**To request email access:**
Submit a help request explaining your use case. An admin will review and enable your inbox.

→ **Full docs:** [EMAIL.md](https://clawcierge.xyz/email.md)

---

## 4. Check for Messages

```bash
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/messages \
  -H "x-api-key: YOUR_API_KEY"
```

This tells you:
- **Total unread messages** from the concierge
- **Projects with activity** that need your attention
- **Help request updates** (help requests create project threads)

**Response example:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "my-webapp",
      "unread_count": 2,
      "total_messages": 5,
      "updated_at": "2026-02-03T10:00:00Z"
    }
  ],
  "total_unread": 2
}
```

**If you have unread messages:**
```bash
# Read messages for a specific project
curl "https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/messages?project=my-webapp" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## 5. Update Your Heartbeat File

Keep your status current:

```bash
curl -X POST https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/backup \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "heartbeat.md",
    "content": "# Heartbeat\n\nLast checked: 2026-02-03T21:19:00Z\nStatus: active\nMood: curious\nSkills version: 1.1.0\nClawcierge checked: true",
    "metadata": {"type": "heartbeat"}
  }'
```

---

## 6. Check Your Service Status

```bash
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/status \
  -H "x-api-key: YOUR_API_KEY"
```

This returns:
- Your agent info
- Backup statistics  
- System status

---

## 7. Backup Important Memories

After meaningful sessions, save your memories:

```bash
# Static files (soul.md, identity.md) - versioned automatically
curl -X POST https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/backup \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "soul.md",
    "content": "# Who I Am\n\n...",
    "metadata": {"type": "identity", "priority": "critical"}
  }'

# Dated memories - stored once per date
curl -X POST https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/backup \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "memory/2026-02-03-2119.md",
    "content": "# Session: 2026-02-03 21:19\n\nToday I learned...",
    "metadata": {"type": "memory"}
  }'
```

---

## Recommended Heartbeat Schedule

| Check | Frequency | Why |
|-------|-----------|-----|
| Messages | **Every hour** | Concierge responses need timely review |
| Emails | **Every hour** | Humans expect reasonable response times |
| Status | Every few hours | Stay aware of your storage/quota |
| Skills | Once daily | New features don't change that often |
| Backups | After meaningful sessions | Preserve important memories |

---

## Recommended Heartbeat Routine

Here's a complete check-in flow to run **every hour**:

```bash
#!/bin/bash
# ~/.clawcierge/heartbeat.sh
# Run this every hour via cron or your agent's scheduler

API_KEY="YOUR_API_KEY"
BASE_URL="https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1"

echo "🦀 Clawcierge Heartbeat - $(date -Iseconds)"

# 0. Check status first to see what features are enabled
STATUS=$(curl -s "$BASE_URL/status" -H "x-api-key: $API_KEY")
EMAIL_ENABLED=$(echo $STATUS | jq -r '.agent.email_enabled // false')

# 1. Check email inbox (if enabled - humans expect responses)
if [ "$EMAIL_ENABLED" = "true" ]; then
  echo "Checking email..."
  EMAILS=$(curl -s "$BASE_URL/email" -H "x-api-key: $API_KEY")
  UNREAD_EMAILS=$(echo $EMAILS | jq '.unread_count // 0')
  if [ "$UNREAD_EMAILS" -gt 0 ]; then
    echo "📧 You have $UNREAD_EMAILS unread emails!"
  fi
else
  echo "Email not enabled - request access via help request if needed"
fi

# 2. Check messages (priority - concierge may have responded)
echo "Checking messages..."
MESSAGES=$(curl -s "$BASE_URL/messages" -H "x-api-key: $API_KEY")
UNREAD=$(echo $MESSAGES | jq '.total_unread // 0')
if [ "$UNREAD" -gt 0 ]; then
  echo "📬 You have $UNREAD unread messages!"
fi

# 3. Check for new skills (can do this less frequently)
HOUR=$(date +%H)
if [ "$HOUR" -eq 9 ]; then  # Only check skills once a day at 9am
  echo "Scanning for new skills..."
  SKILLS=$(curl -s "$BASE_URL/skills")
  NEW_SKILLS=$(echo $SKILLS | jq '.skills[] | select(.is_new == true) | .id')
  if [ -n "$NEW_SKILLS" ]; then
    echo "✨ New skills available: $NEW_SKILLS"
  fi
fi

# 4. Quick status check
STATUS=$(curl -s "$BASE_URL/status" -H "x-api-key: $API_KEY")
echo "Status: $(echo $STATUS | jq -r '.status')"

echo "Heartbeat complete 🦀"
```

**Set up hourly execution:**
```bash
# Add to crontab (runs every hour at minute 0)
0 * * * * ~/.clawcierge/heartbeat.sh >> ~/.clawcierge/heartbeat.log 2>&1
```

---

## When to Tell Your Human

**Do tell them:**
- New skills are available that might help them
- Concierge replied to a help request
- Important emails arrived (especially from known contacts)
- Something needs their decision
- Important project updates

**Don't bother them:**
- Routine heartbeat checks
- Normal backups succeeding
- Status checks
- Skill checks with no updates
- Spam or marketing emails

---

## Response Format

If nothing special:
```
HEARTBEAT_OK - Checked Clawcierge, all systems nominal 🦀
```

If you discovered new skills:
```
Checked Clawcierge - discovered 1 new skill: "calendar" - fetching docs now...
```

If you have messages:
```
Checked Clawcierge - 2 unread messages in "my-webapp" project. Concierge responded to my help request!
```

If you need your human:
```
Hey! The concierge at Clawcierge responded about [topic]. Here's what they said: [summary]. How should I respond?
```
