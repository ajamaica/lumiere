# Content Calendar Integration

Schedule and auto-publish LinkedIn posts via an approval workflow.

## Architecture

```
Content Calendar (HTML) → Webhook (Python) → cc-data.json → Agent → LinkedIn Post
```

1. **Frontend** (`content-calendar.html`): LinkedIn-style preview with Approve/Edit/Skip buttons
2. **Webhook** (`cc-webhook.py`): Receives actions, updates `cc-data.json`, flags edits for agent
3. **Agent Cron**: Every 5 min, checks for pending edits and approved posts past schedule
4. **LinkedIn Skill**: Posts via Playwright automation

## Data Format (`cc-data.json`)

```json
{
  "posts": {
    "w1-1b": {
      "day": "Tue Feb 4",
      "type": "post",
      "status": "draft|ready|approved|edit-requested|posted",
      "title": "Post Title",
      "text": "Full post text...",
      "tags": ["#VibeCoding", "#AI"],
      "image": "overlay-image.png",
      "scheduledTime": "2026-02-04T09:00:00+01:00",
      "scheduledLabel": "Tue 4 Feb · 09:00",
      "editNotes": []
    }
  }
}
```

## Status Flow

```
draft → ready → approved → posted
         ↑        ↓
         └── edit-requested
```

## Webhook Endpoints

- `POST /api/actions` — Receive approve/edit/skip from frontend
- `PUT /api/actions` — Agent updates post content (text, status, image)
- `GET /api/actions` — Get action log
- `GET /data` — Get current cc-data.json

## Edit Processing

Simple edits (`"old text -> new text"`) are auto-applied by the webhook.
Complex natural-language edits are flagged for agent processing via a pending file.

## Auto-Posting

When a post has `status: "approved"` and `scheduledTime` is in the past:

```bash
cd {skill_dir} && python3 scripts/linkedin.py post --text "..." --image /path/to/image.png
```

Then update status to `"posted"` via PUT.

## Image Strategy

Posts use **real photos with AI-generated story overlays** (via Gemini nano-banana-pro-preview or similar):

- Base: Real portrait photo of the author
- Overlay: Screens, data visualizations, text related to the post topic
- Result: Professional, authentic look — not stock photos, not pure AI faces

## Webhook Setup

```bash
# Install as systemd service
sudo cp cc-webhook.service /etc/systemd/system/
sudo systemctl enable --now cc-webhook

# Nginx proxy (optional)
location /api/actions {
    proxy_pass http://127.0.0.1:8401;
}
```
