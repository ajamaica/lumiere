# Mail Hygiene - Daily Spam & Phishing Scanner

## Overview

A automated daily cron job that scans your Gmail inbox for spam and phishing emails, taking protective actions as needed.

**Schedule:** Daily at 10:00 AM (Mountain Time)

## Features

### 1. **Spam Detection**

- Identifies promotional and marketing emails
- Detects unsubscribe links
- Looks for common spam indicators:
  - Promotional language ("sale", "offer", "discount", "limited time")
  - Noreply/marketing addresses
  - "View in browser" links

### 2. **Phishing Detection**

Detects and removes several types of phishing attempts:

- **IRS/Tax Impersonation** - Emails claiming to be from IRS without @irs.gov domain
- **Spoofed Services** - Fake PayPal, Apple, Amazon, Google, Microsoft, Bank emails
- **Suspicious Domains** - Illegitimate sender domains with urgency language
- **Malicious Links** - URL shorteners (bit.ly, tinyurl) and credential redirects (@-based URLs)

### 3. **Automated Actions**

For detected phishing emails:

1. **Move to trash** - Immediately removes dangerous emails
2. **Create Gmail filter** - Auto-traps future emails from the same sender
3. **Logging** - Records all detected threats for review

### 4. **Daily Reporting**

- Generates detailed scan report: `/Users/ericwoodard/clawd/mail-reports/YYYY-MM-DD.txt`
- Latest summary always available: `/Users/ericwoodard/clawd/mail-reports/latest-summary.txt`
- All activity logged to: `/Users/ericwoodard/clawd/logs/mail-hygiene.log`

## Files

| File                                                      | Purpose                   |
| --------------------------------------------------------- | ------------------------- |
| `/Users/ericwoodard/clawd/scripts/mail-hygiene.sh`        | Main scanning script      |
| `/Users/ericwoodard/clawd/scripts/mail-hygiene-notify.sh` | Wrapper for notifications |
| `/Users/ericwoodard/clawd/mail-reports/`                  | Daily scan reports        |
| `/Users/ericwoodard/clawd/logs/mail-hygiene.log`          | Audit log                 |

## Cron Configuration

```
0 10 * * * /Users/ericwoodard/clawd/scripts/mail-hygiene.sh 2>&1 | logger -t mail-hygiene
```

**Timing:** 10:00 AM daily (all days of week/month/year)

### View Cron Jobs

```bash
crontab -l
```

### Edit Cron Jobs

```bash
crontab -e
```

## How It Works

1. **Search** - Uses `gog gmail search 'newer_than:1d'` to find emails from the last 24 hours
2. **Fetch** - Retrieves full email details with `gog gmail get <id> --format full`
3. **Analyze** - Runs emails through spam and phishing detection rules
4. **Act** - For phishing:
   - Moves to trash with `gog gmail trash <id>`
   - Creates filter to auto-trash future emails: `gog gmail create-filter --from <sender> --delete`
5. **Report** - Generates summary with counts and actions taken

## Detection Rules

### Spam Indicators

- Contains "unsubscribe" link
- Promotional keywords: sale, offer, discount, promotion, limited time, deal, shop, buy, save, % off
- Noreply/marketing sender addresses
- "View this email in your browser" link

### Phishing Indicators

- IRS/tax language from non-@irs.gov domain
- Service names (PayPal, Apple, Amazon, etc.) from unauthorized domains
- Suspicious domains + urgency language ("verify", "confirm", "account", "suspended")
- URL shorteners or credential redirects

## Manual Testing

Run the script manually:

```bash
/Users/ericwoodard/clawd/scripts/mail-hygiene.sh
```

Check the report:

```bash
cat /Users/ericwoodard/clawd/mail-reports/latest-summary.txt
```

View the audit log:

```bash
tail -f /Users/ericwoodard/clawd/logs/mail-hygiene.log
```

## Customization

Edit the detection rules in `/Users/ericwoodard/clawd/scripts/mail-hygiene.sh`:

- **Spam keywords** (line ~150): Modify `promotional keywords`
- **Phishing services** (line ~180): Add/remove spoofed service names
- **Suspicious domains** (line ~190): Adjust domain validation regex
- **Suspicious link patterns** (line ~200): Add/remove URL patterns

## Troubleshooting

### Script not running?

Check cron logs:

```bash
log stream --predicate 'process == "logger"' --level debug
```

### Gmail access issues?

Verify gog CLI is working:

```bash
gog gmail search 'newer_than:1d' | head -5
```

### Check recent reports

```bash
ls -ltr /Users/ericwoodard/clawd/mail-reports/
tail -50 /Users/ericwoodard/clawd/mail-reports/latest-summary.txt
```

## Future Enhancements

- [ ] Telegram notification with scan results
- [ ] Link destination verification before moving to trash
- [ ] Machine learning-based phishing detection
- [ ] Whitelist for trusted senders
- [ ] Weekly digest report
- [ ] Dashboard for tracking phishing attempts over time

---

**Installed:** 2026-01-29
**Status:** ✅ Active and monitoring
