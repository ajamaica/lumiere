---
name: linkedin-pipedream
description: Post to LinkedIn, comment, like, search organizations, and manage profiles via Pipedream OAuth integration.
homepage: https://mcp.pipedream.com
metadata:
  {
    'openclaw':
      {
        'emoji': '💼',
        'requires': { 'bins': ['pdauth'], 'skills': ['pdauth'] },
        'install':
          [
            {
              'id': 'pdauth-dep',
              'kind': 'skill',
              'skill': 'pdauth',
              'label': 'Install pdauth skill first',
            },
          ],
      },
  }
---

# LinkedIn via Pipedream — Post, Comment & Engage

Full LinkedIn automation using Pipedream's OAuth infrastructure. Post as yourself or your organization, comment on posts, search companies, and more.

## Prerequisites

1. **pdauth CLI installed and configured** — see pdauth skill
2. **LinkedIn account connected via OAuth**

## Quick Start

```bash
# 1. Connect LinkedIn (generates OAuth link for user to click)
pdauth connect linkedin --user telegram:5439689035

# 2. After user authorizes, verify connection
pdauth status --user telegram:5439689035

# 3. Post to LinkedIn
pdauth call linkedin.linkedin-create-text-post-user \
  --user telegram:5439689035 \
  --args '{"instruction": "Create a post: Excited to announce our new product launch! 🚀"}'
```

## OAuth Flow

```bash
# Generate OAuth link
pdauth connect linkedin --user USER_ID

# Share with user: "Click to authorize LinkedIn: <link>"
# User clicks → authorizes via LinkedIn → done

# Verify connection
pdauth status --user USER_ID
```

**User ID convention:** Use `telegram:<user_id>` format for Telegram users.

---

## Available Tools (19 total)

### ✅ Working via MCP (pdauth call)

| Tool                                  | Purpose                    |
| ------------------------------------- | -------------------------- |
| `linkedin-create-text-post-user`      | Post as personal account   |
| `linkedin-create-image-post-user`     | Post with image (personal) |
| `linkedin-create-comment`             | Comment on any post        |
| `linkedin-create-like-on-share`       | Like a post                |
| `linkedin-search-organization`        | Search for companies       |
| `linkedin-get-current-member-profile` | Get your own profile       |
| `linkedin-get-member-profile`         | Get any member's profile   |
| `linkedin-get-org-member-access`      | Check org admin status     |
| `linkedin-retrieve-comments-shares`   | Get comments on a post     |
| `linkedin-delete-post`                | Delete your post           |

### ⚠️ Broken via MCP (requires workaround)

| Tool                                      | Issue                    | Workaround          |
| ----------------------------------------- | ------------------------ | ------------------- |
| `linkedin-create-text-post-organization`  | "tool name too long" bug | Use direct SDK call |
| `linkedin-create-image-post-organization` | Same bug                 | Use direct SDK call |

---

## Tool Reference

### 1. Create Personal Post

```bash
pdauth call linkedin.linkedin-create-text-post-user \
  --user telegram:5439689035 \
  --args '{"instruction": "Create a post: Your post content here. Use emojis 🎉 and hashtags #AI #Tech"}'
```

**Tips:**

- Keep posts under 3000 characters
- Emojis increase engagement
- Use line breaks for readability

### 2. Create Image Post (Personal)

```bash
pdauth call linkedin.linkedin-create-image-post-user \
  --user telegram:5439689035 \
  --args '{"instruction": "Create image post with text: Check out our new office! Image URL: https://example.com/image.jpg"}'
```

### 3. Comment on a Post

```bash
# Comment using post URN
pdauth call linkedin.linkedin-create-comment \
  --user telegram:5439689035 \
  --args '{"instruction": "Comment on urn:li:share:7293123456789012480 with text: Great insights! Thanks for sharing."}'
```

**Finding post URNs:**

- From LinkedIn URL: `linkedin.com/posts/username_activity-7293123456789012480` → URN is `urn:li:share:7293123456789012480`
- Or use `linkedin-retrieve-comments-shares` on known posts

### 4. Like a Post

```bash
pdauth call linkedin.linkedin-create-like-on-share \
  --user telegram:5439689035 \
  --args '{"instruction": "Like the post urn:li:share:7293123456789012480"}'
```

### 5. Search Organizations

```bash
pdauth call linkedin.linkedin-search-organization \
  --user telegram:5439689035 \
  --args '{"instruction": "Search for companies matching: artificial intelligence startups"}'
```

### 6. Get Your Profile

```bash
pdauth call linkedin.linkedin-get-current-member-profile \
  --user telegram:5439689035 \
  --args '{"instruction": "Get my LinkedIn profile"}'
```

Returns: name, headline, URN, vanity name, etc.

### 7. Get Member Profile

```bash
pdauth call linkedin.linkedin-get-member-profile \
  --user telegram:5439689035 \
  --args '{"instruction": "Get profile for member URN urn:li:person:30_5n7bx7f"}'
```

### 8. Check Organization Admin Access

```bash
pdauth call linkedin.linkedin-get-org-member-access \
  --user telegram:5439689035 \
  --args '{"instruction": "Check my access level for organization 105382747"}'
```

Returns: `ADMINISTRATOR`, `MEMBER`, or `NONE`

### 9. Get Comments on a Post

```bash
pdauth call linkedin.linkedin-retrieve-comments-shares \
  --user telegram:5439689035 \
  --args '{"instruction": "Get comments for post urn:li:share:7293123456789012480"}'
```

### 10. Delete a Post

```bash
pdauth call linkedin.linkedin-delete-post \
  --user telegram:5439689035 \
  --args '{"instruction": "Delete post urn:li:share:7293123456789012480"}'
```

---

## Organization Posting (Workaround Required)

### The Bug

`linkedin-create-text-post-organization` fails via MCP with:

```
Error: tool name too long
```

This is a Pipedream MCP bug, not a LinkedIn API issue.

### Workaround: Direct SDK Call

Create a Node.js script to post as organization:

```javascript
// org-post.mjs
import { PipedreamClient } from '@pipedream/sdk'

const client = new PipedreamClient({
  projectEnvironment: 'development',
  clientId: 'YOUR_CLIENT_ID', // from ~/.config/pdauth/config.json
  clientSecret: 'YOUR_CLIENT_SECRET',
  projectId: 'YOUR_PROJECT_ID',
})

async function postAsOrg(orgId, text) {
  const result = await client.actions.run({
    id: 'linkedin-create-text-post-organization',
    externalUserId: 'telegram:5439689035',
    configuredProps: {
      linkedin: { authProvisionId: 'apn_4vhLGx4' }, // LinkedIn account ID
      organizationId: orgId,
      text: text,
    },
  })
  console.log('Posted!', result)
}

// Example usage
postAsOrg('105382747', 'Hello from Versatly! 🚀')
```

Run with:

```bash
node org-post.mjs
```

### Known Organization IDs

| Organization | ID        | URN                           |
| ------------ | --------- | ----------------------------- |
| Versatly     | 105382747 | urn:li:organization:105382747 |

---

## Key Reference Values

### Pedro's LinkedIn Info

| Item                | Value                      |
| ------------------- | -------------------------- |
| Member URN          | `urn:li:person:30_5n7bx7f` |
| User ID (Pipedream) | `telegram:5439689035`      |
| Auth Provision ID   | `apn_4vhLGx4`              |
| Admin of            | Versatly (org 105382747)   |

### URN Formats

| Type         | Format                                | Example                            |
| ------------ | ------------------------------------- | ---------------------------------- |
| Person       | `urn:li:person:ID`                    | `urn:li:person:30_5n7bx7f`         |
| Organization | `urn:li:organization:ID`              | `urn:li:organization:105382747`    |
| Post/Share   | `urn:li:share:ID`                     | `urn:li:share:7293123456789012480` |
| Comment      | `urn:li:comment:(urn:li:share:ID,ID)` | Complex nested URN                 |

---

## Common Patterns

### Pattern 1: Post and Verify

```bash
# Post
pdauth call linkedin.linkedin-create-text-post-user \
  --user telegram:5439689035 \
  --args '{"instruction": "Create post: Just shipped a new feature! 🎉"}'

# The response includes the post URN - save it for later
```

### Pattern 2: Engage with Content

```bash
# Find posts to engage with (manual: get URN from LinkedIn URL)
# Like the post
pdauth call linkedin.linkedin-create-like-on-share \
  --user telegram:5439689035 \
  --args '{"instruction": "Like post urn:li:share:7293123456789012480"}'

# Comment
pdauth call linkedin.linkedin-create-comment \
  --user telegram:5439689035 \
  --args '{"instruction": "Comment on urn:li:share:7293123456789012480: Congrats on the launch!"}'
```

### Pattern 3: Research a Company

```bash
# Search for the company
pdauth call linkedin.linkedin-search-organization \
  --user telegram:5439689035 \
  --args '{"instruction": "Search for OpenAI"}'

# Check if you have admin access (for orgs you manage)
pdauth call linkedin.linkedin-get-org-member-access \
  --user telegram:5439689035 \
  --args '{"instruction": "Check access for organization 12345678"}'
```

---

## Error Handling

### Common Errors

| Error                | Cause                    | Solution                                        |
| -------------------- | ------------------------ | ----------------------------------------------- |
| `App not connected`  | No LinkedIn OAuth        | Run `pdauth connect linkedin --user USER_ID`    |
| `tool name too long` | MCP bug for org tools    | Use direct SDK workaround                       |
| `403 Forbidden`      | No permission for action | Check org admin status                          |
| `Invalid URN`        | Malformed URN format     | Use correct format: `urn:li:type:id`            |
| `Rate limited`       | Too many API calls       | Wait and retry (LinkedIn limits ~100 calls/day) |

### Checking Connection Status

```bash
# Quick status check
pdauth status --user telegram:5439689035

# JSON output for parsing
pdauth status --user telegram:5439689035 --json
```

### Reconnecting

If OAuth expires or breaks:

```bash
pdauth disconnect linkedin --user telegram:5439689035
pdauth connect linkedin --user telegram:5439689035
# Share new link with user
```

---

## Best Practices

1. **Rate Limits:** LinkedIn is strict. Space out bulk operations.
2. **Content Quality:** LinkedIn penalizes spammy content. Write thoughtfully.
3. **Org Posting:** Always verify admin access before attempting org posts.
4. **URN Handling:** Always validate URN format before API calls.
5. **Error Recovery:** If a post fails, check status before retrying (may have succeeded).

---

## Example Workflow: Complete LinkedIn Campaign

```bash
# 1. Verify connection
pdauth status --user telegram:5439689035

# 2. Check org admin status
pdauth call linkedin.linkedin-get-org-member-access \
  --user telegram:5439689035 \
  --args '{"instruction": "Check access for organization 105382747"}'

# 3. Post personal announcement
pdauth call linkedin.linkedin-create-text-post-user \
  --user telegram:5439689035 \
  --args '{"instruction": "Create post: Thrilled to share that Versatly just launched our new AI assistant! 🤖 #AI #Startup"}'

# 4. Post as organization (use SDK workaround)
# → Run org-post.mjs script

# 5. Engage with relevant industry posts
pdauth call linkedin.linkedin-create-comment \
  --user telegram:5439689035 \
  --args '{"instruction": "Comment on urn:li:share:XXXXX: Great perspective on AI safety!"}'
```

---

## Files & Configuration

| File                                           | Purpose                |
| ---------------------------------------------- | ---------------------- |
| `~/.config/pdauth/config.json`                 | Pipedream credentials  |
| `~/.openclaw/workspace/pdauth/`                | pdauth CLI source      |
| `~/.openclaw/workspace/skills/pdauth/SKILL.md` | pdauth skill reference |

---

## See Also

- **pdauth skill** — OAuth management for all Pipedream apps
- [Pipedream MCP](https://mcp.pipedream.com) — Browse all available integrations
- [LinkedIn API Docs](https://learn.microsoft.com/en-us/linkedin/marketing/) — Official API reference
