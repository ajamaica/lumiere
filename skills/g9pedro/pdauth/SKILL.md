---
name: pdauth
description: Dynamic OAuth for AI agents via Pipedream. Generate OAuth links for 2500+ APIs, let users authorize, then call MCP tools on their behalf.
homepage: https://github.com/Versatly/pdauth
metadata:
  {
    'openclaw':
      {
        'emoji': '🔐',
        'requires': { 'bins': ['pdauth'] },
        'install':
          [
            {
              'id': 'node',
              'kind': 'node',
              'package': 'pdauth',
              'bins': ['pdauth'],
              'label': 'Install pdauth (node)',
            },
          ],
      },
  }
---

# pdauth — Dynamic OAuth for AI Agents

Use `pdauth` to give yourself (the agent) access to 2500+ APIs via OAuth. The flow:

1. Agent needs access to an app (Spotify, Slack, Notion, etc.)
2. Generate an OAuth link with `pdauth connect <app>`
3. Share link with user → they click and authorize
4. Agent can now call tools via `pdauth call <app.tool>`

## Quick Reference

```bash
# Configure (one-time setup)
pdauth config

# Search for apps
pdauth apps --search spotify

# Generate OAuth link
pdauth connect spotify --user USER_ID

# Check what's connected
pdauth status --user USER_ID

# List available tools
pdauth tools spotify --user USER_ID

# Call a tool
pdauth call spotify.get_my_playlists --user USER_ID
pdauth call slack.send_message channel=general text="Hello!"
```

## The OAuth Flow (How to Request Access)

When you need access to an app the user hasn't authorized:

```
1. Run: pdauth connect <app> --user <user_id>
2. Get the OAuth link from output
3. Send link to user: "To do this, I need access to <App>. Click here to authorize: <link>"
4. User clicks, authorizes via Pipedream
5. Confirm with: pdauth status --user <user_id>
6. Now you can call tools!
```

### User ID Strategy

Use a consistent identifier per user:

- Telegram: `telegram:5439689035`
- Email: `pedro@example.com`
- Custom: `pedro-mainframe`

The same user ID across sessions maintains their connected accounts.

## Calling Tools

```bash
# Format: pdauth call <app>.<tool_name> [key=value ...]

# Simple args
pdauth call slack.send_message channel=general text="Hello"

# JSON args for complex data
pdauth call notion.create_page --args '{"title": "My Page", "content": "..."}'

# Get JSON output for parsing
pdauth call spotify.get_my_playlists --json
```

## Checking Status

```bash
# See what user has connected
pdauth status --user pedro

# See all users
pdauth status --all

# JSON for scripting
pdauth status --user pedro --json
```

## Popular Apps

Browse all at https://mcp.pipedream.com

| App           | Slug            | Example Tools                     |
| ------------- | --------------- | --------------------------------- |
| Slack         | `slack`         | send_message, list_channels       |
| Spotify       | `spotify`       | get_my_playlists, add_to_playlist |
| Notion        | `notion`        | create_page, query_database       |
| Google Sheets | `google_sheets` | get_values, update_values         |
| Gmail         | `gmail`         | send_email, list_messages         |
| GitHub        | `github`        | create_issue, list_repos          |
| Linear        | `linear`        | create_issue, list_issues         |
| Airtable      | `airtable`      | list_records, create_record       |

## Error Handling

**"App not connected"** → Generate link with `pdauth connect` and ask user to authorize

**"Tool not found"** → List available tools with `pdauth tools <app>`

**"Invalid credentials"** → Run `pdauth config` to set up Pipedream credentials

## Tips

1. **Always check status first** before attempting tool calls
2. **Use consistent user IDs** so connections persist across sessions
3. **JSON output** (`--json`) is best for parsing results programmatically
4. **Link expiry** — OAuth links expire after 4 hours, generate fresh ones as needed

## Example Workflow

```
User: "Add 'Bohemian Rhapsody' to my Spotify playlist"

Agent:
1. pdauth status --user telegram:5439689035 --json
   → No Spotify connection

2. pdauth connect spotify --user telegram:5439689035
   → Gets OAuth link

3. Send to user: "I need Spotify access. Click here: <link>"

4. User authorizes

5. pdauth status --user telegram:5439689035
   → Spotify ✓ connected

6. pdauth call spotify.search_tracks query="Bohemian Rhapsody" --json
   → Get track ID

7. pdauth call spotify.add_to_playlist playlist_id=... track_id=...
   → Done!

8. Reply: "Added Bohemian Rhapsody to your playlist! 🎵"
```
