---
name: outlook-web
description: Access Outlook Web for email and calendar operations - reading, composing (as drafts by default), searching, and managing emails and calendar events. Use when the user needs to check email, draft messages, search inbox, view calendar, or manage their Outlook mailbox.
allowed-tools: Bash(playwright-cli:*)
---

# Outlook Web Access Skill

This skill provides access to Outlook Web (outlook.office.com) via playwright-cli with persistent session management.

## Session Configuration

**All commands must use**: `--session=outlook-web`

This ensures cookies and authentication persist between commands.

## First-Time Authentication

Microsoft login requires manual intervention. Follow these steps for first-time setup:

### Step 1: Open Outlook in headed mode to trigger login

```bash
playwright-cli open "https://outlook.office.com/mail/inbox" --session=outlook-web --headed
```

The browser will open visibly and redirect to Microsoft login. **Tell the user to complete login manually** in the opened browser window.

### Step 2: Verify authentication

After user confirms login is complete:

```bash
playwright-cli snapshot --session=outlook-web
```

If successful, the snapshot will show inbox content (email subjects, folders). If it shows a login form, authentication is not complete.

**Note**: After initial authentication, subsequent commands can run headless (default) since the session cookies persist.

## Detecting Session Expiry

Microsoft sessions expire after ~7-14 days. Signs of expiry:

- Snapshot shows login form instead of inbox
- Navigation redirects to login URL

**To re-authenticate**: Open Outlook in headed mode again:

```bash
playwright-cli open "https://outlook.office.com/mail/inbox" --session=outlook-web --headed
```

Complete the login manually in the browser window.

## Key URLs

```
Base: https://outlook.office.com

Email:
- /mail/inbox           - Inbox
- /mail/drafts          - Drafts folder
- /mail/sentitems       - Sent folder
- /mail/deleteditems    - Deleted/Trash
- /mail/archive         - Archive
- /mail/junkemail       - Junk/Spam
- /mail/search?q=TERM   - Search results
- /mail/deeplink/compose - New email composer

Calendar:
- /calendar             - Calendar view
- /calendar/view/day    - Day view
- /calendar/view/week   - Week view
- /calendar/view/month  - Month view
```

## Email Operations

### View Inbox

```bash
playwright-cli open "https://outlook.office.com/mail/inbox" --session=outlook-web
playwright-cli snapshot --session=outlook-web
```

### Read an Email

Navigate to inbox, then click on an email row to select it:

```bash
playwright-cli click "EMAIL_SUBJECT_OR_SELECTOR" --session=outlook-web
playwright-cli snapshot --session=outlook-web
```

The reading pane will show the email content.

### Compose New Email (Draft by Default)

```bash
playwright-cli open "https://outlook.office.com/mail/deeplink/compose" --session=outlook-web
playwright-cli snapshot --session=outlook-web
```

Fill in fields:

```bash
# Add recipient
playwright-cli fill "[aria-label='To']" "recipient@example.com" --session=outlook-web

# Add subject
playwright-cli fill "[aria-label='Add a subject']" "Subject line" --session=outlook-web

# Add body (the editor area)
playwright-cli fill "[aria-label='Message body']" "Email content here" --session=outlook-web
```

**IMPORTANT**: By default, save as draft instead of sending:

```bash
# Save as draft (Ctrl+S or close the compose window)
playwright-cli keyboard "Control+s" --session=outlook-web
```

Only send if user explicitly requests:

```bash
# Send email (only when explicitly requested by user)
playwright-cli click "[aria-label='Send']" --session=outlook-web
```

### Reply to an Email

**Method 1: Via Reading Pane (Simple)**

With an email open in the reading pane:

```bash
# Click Reply button
playwright-cli click "[aria-label='Reply']" --session=outlook-web

# Fill reply message
playwright-cli fill "[aria-label='Message body']" "Your reply text here" --session=outlook-web

# Save as draft (auto-saves, or use Ctrl+S)
playwright-cli press "Control+s" --session=outlook-web
```

**Method 2: Complete Reply Flow**

From inbox to draft reply:

```bash
# 1. Navigate to inbox
playwright-cli open "https://outlook.office.com/mail/inbox" --session=outlook-web

# 2. Click the email (get ref from snapshot)
playwright-cli snapshot --session=outlook-web
playwright-cli click <email-ref> --session=outlook-web

# 3. Click Reply button
playwright-cli snapshot --session=outlook-web
playwright-cli click <reply-button-ref> --session=outlook-web

# 4. Fill reply
playwright-cli fill <message-body-ref> "Your reply message" --session=outlook-web

# 5. Save draft (Ctrl+S or Escape)
playwright-cli press "Control+s" --session=outlook-web
```

**Method 3: Fast Batch Reply**

Using run-code for speed:

```bash
playwright-cli run-code "
  await page.goto('https://outlook.office.com/mail/inbox');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message body' }).fill('Your reply');
  await page.keyboard.press('Control+s');
" --session=outlook-web
```

**Note:** Replies are auto-saved as drafts and have "Re: [Original Subject]" format.

### Forward an Email

```bash
playwright-cli click "[aria-label='Forward']" --session=outlook-web
playwright-cli snapshot --session=outlook-web
# Add recipient and content
```

### Delete an Email

With an email selected:

```bash
playwright-cli click "[aria-label='Delete']" --session=outlook-web
```

### Search Emails

```bash
playwright-cli open "https://outlook.office.com/mail/search?q=YOUR_SEARCH_TERM" --session=outlook-web
playwright-cli snapshot --session=outlook-web
```

Or use the search box:

```bash
playwright-cli click "[aria-label='Search']" --session=outlook-web
playwright-cli fill "[aria-label='Search']" "search query" --session=outlook-web
playwright-cli keyboard "Enter" --session=outlook-web
playwright-cli snapshot --session=outlook-web
```

### Navigate Folders

```bash
# Drafts
playwright-cli open "https://outlook.office.com/mail/drafts" --session=outlook-web

# Sent
playwright-cli open "https://outlook.office.com/mail/sentitems" --session=outlook-web

# Deleted
playwright-cli open "https://outlook.office.com/mail/deleteditems" --session=outlook-web
```

## Calendar Operations

### View Calendar

```bash
playwright-cli open "https://outlook.office.com/calendar" --session=outlook-web
playwright-cli snapshot --session=outlook-web
```

### View Specific Time Range

```bash
# Day view
playwright-cli open "https://outlook.office.com/calendar/view/day" --session=outlook-web

# Week view
playwright-cli open "https://outlook.office.com/calendar/view/week" --session=outlook-web

# Month view
playwright-cli open "https://outlook.office.com/calendar/view/month" --session=outlook-web
```

### View Event Details

Click on an event in the calendar view:

```bash
playwright-cli click "EVENT_TITLE_OR_SELECTOR" --session=outlook-web
playwright-cli snapshot --session=outlook-web
```

## Best Practices

1. **Always snapshot after navigation** - Outlook loads asynchronously; snapshot confirms content is ready
2. **Wait if needed** - If snapshot shows loading state, wait and snapshot again:
   ```bash
   playwright-cli wait 2000 --session=outlook-web
   playwright-cli snapshot --session=outlook-web
   ```
3. **Use ARIA labels** - Outlook has good ARIA labeling; prefer `[aria-label='...']` selectors
4. **Check for errors** - If an operation fails, snapshot to see current state
5. **Default to drafts** - Never send emails without explicit user confirmation

## Advanced Usage & Optimizations

### Batch Operations with run-code

For faster programmatic operations, batch multiple commands using `run-code`:

```bash
playwright-cli run-code "
  // Open inbox and reply to first email
  await page.goto('https://outlook.office.com/mail/inbox');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message body' }).fill('Your reply text');
  await page.keyboard.press('Control+s');
" --session=outlook-web
```

**Benefits:** 60-70% faster than individual commands, single process invocation.

### Direct Email Navigation

If you have an email ID (from URL or previous snapshot), navigate directly:

```bash
# Instead of: inbox → find → click
playwright-cli open "https://outlook.office.com/mail/inbox/id/AAQkAGMxODI1MWVlLTgy..." --session=outlook-web
```

Email IDs are found in URLs when emails are open: `/mail/inbox/id/<EMAIL_ID>`

### Skip Unnecessary Snapshots

For programmatic use, only snapshot when you need to extract data:

```bash
# Fast: No intermediate snapshots
playwright-cli open "https://outlook.office.com/mail/inbox" --session=outlook-web
playwright-cli click e600 --session=outlook-web
playwright-cli click "Reply" --session=outlook-web
playwright-cli fill "Message body" "Text" --session=outlook-web
# Only snapshot if you need to verify or extract data
```

### Resource Blocking for Speed (Advanced)

Block images, fonts, and analytics to speed up page loads by 30-50%:

```bash
playwright-cli run-code "
  // Block non-essential resources
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('browser.events.data.microsoft.com') ||
        url.includes('csp.microsoft.com') ||
        url.match(/\\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf)$/)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  // Then navigate
  await page.goto('https://outlook.office.com/mail/inbox');
" --session=outlook-web
```

**Note:** Test thoroughly as blocking resources may affect functionality.

### Trust Auto-Save

Outlook Web auto-saves drafts every few seconds. For programmatic workflows:

- Skip navigating to drafts folder for verification
- Trust that draft saved if no error occurred
- Only verify when explicitly needed

### Efficient Content Extraction for LLMs

**Problem:** Full page snapshots include 60-95% UI chrome (toolbars, navigation, wrappers) and only 5-40% actual content.

**Solution:** Use `run-code` to extract just the text you need:

```bash
# Extract email list as text (no YAML overhead)
playwright-cli run-code "
  const listbox = await page.locator('[role=\"listbox\"]');
  return await listbox.innerText();
" --session=outlook-web
```

```bash
# Extract just message body text
playwright-cli run-code "
  const body = await page.locator('[role=\"document\"]').first();
  return await body.innerText();
" --session=outlook-web
```

```bash
# Extract structured data as JSON
playwright-cli run-code "
  const emails = await page.locator('[role=\"option\"]')
    .evaluateAll(opts => opts.slice(0, 10).map(o => ({
      text: o.textContent.trim(),
      unread: o.textContent.includes('Unread')
    })));
  return JSON.stringify(emails, null, 2);
" --session=outlook-web
```

**Benefits:**

- 70-90% reduction in tokens
- Faster LLM processing
- Cleaner output (text or JSON vs YAML)

**When to use:**

- Full snapshots: Interactive exploration, getting element refs
- Text extraction: Reading email content, processing messages
- JSON extraction: Bulk operations, data analysis

## Troubleshooting

### "Browser is already in use" error

Close the existing playwright session:

```bash
playwright-cli close --session=outlook-web
```

Then retry the command.

### Login page appears unexpectedly

Session has expired. Re-authenticate:

```bash
playwright-cli open "https://outlook.office.com/mail/inbox" --session=outlook-web --headed
# User completes login in the opened browser window
```

### Content not loading

Wait and retry:

```bash
playwright-cli wait 3000 --session=outlook-web
playwright-cli snapshot --session=outlook-web
```

## UI Pattern Reference

See `references/ui-patterns.md` for discovered element selectors and patterns specific to Outlook Web.
