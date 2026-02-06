## Social Post Skill

Post to Twitter and Farcaster from one command.

### Required Credentials

**Twitter:**
Requires OAuth 1.0a credentials in `/home/phan_harry/.openclaw/.env`:

```bash
X_CONSUMER_KEY=your_consumer_key
X_CONSUMER_SECRET=your_consumer_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret
```

Get these from: https://developer.twitter.com/en/portal/dashboard

**Farcaster:**
Requires credentials in `/home/phan_harry/.openclaw/farcaster-credentials.json`:

```json
{
  "fid": "your_fid",
  "custodyPrivateKey": "0x...",
  "signerPrivateKey": "..."
}
```

Created automatically when you set up your Farcaster account.

**Dependencies:**

- `python3` with `requests` and `requests_oauthlib` (for Twitter)
- `jq` (for JSON parsing)
- `curl` (for image uploads)

**Verify Setup:**

```bash
# Test dry-run (doesn't actually post)
scripts/post.sh --dry-run "Test message"

# Should show:
# ✅ Twitter: X/252 characters
# ✅ Farcaster: X/288 bytes
# Would post to Twitter
# Would post to Farcaster
```

### Quick Start

```bash
# Post to both platforms
scripts/post.sh "gm! Building onchain 🦞"

# Twitter only
scripts/post.sh --twitter "Twitter announcement"

# Farcaster only
scripts/post.sh --farcaster "Farcaster thoughts"

# With image (both platforms)
scripts/post.sh --image ~/photo.jpg "Check this out!"

# Long text as thread
scripts/post.sh --thread "Very long announcement that exceeds character limits..."

# Shorten URLs to save characters
scripts/post.sh --shorten-links "Check out this cool site: https://very-long-url.com/path/to/page"

# Combine features
scripts/post.sh --thread --shorten-links --image ~/pic.jpg "Long text with links and image..."
```

### Features

✅ Post to Twitter, Farcaster, or both  
✅ Automatic character/byte limit validation  
✅ Image upload support  
✅ **Thread support** - split long text into numbered posts  
✅ **Link shortening** - compress URLs to save characters  
✅ Auto-truncate option  
✅ Dry-run mode

### Platform Limits

- **Twitter:** 252 characters (280 with 10% buffer)
- **Farcaster:** 288 bytes (320 with 10% buffer)

### Image Hosting

- **Twitter:** Direct upload via Twitter API
- **Farcaster:** Uploaded to catbox.moe (free, no account needed)

### Troubleshooting

**"Error: Twitter post script not found"**

- Ensure `/home/phan_harry/.openclaw/workspace/scripts/twitter-post.sh` exists

**"Error: Farcaster credentials not found"**

- Check `/home/phan_harry/.openclaw/farcaster-credentials.json` exists
- Set up Farcaster account first

**"Error: Image not found"**

- Verify image path is correct
- Use absolute paths: `/full/path/to/image.jpg`

**Twitter authentication errors:**

- Verify credentials in `.env`
- Check if `python3` has `requests_oauthlib` installed:
  ```bash
  python3 -c "import requests_oauthlib"
  ```

**Character limit exceeded:**

- Use `--truncate` flag to auto-shorten
- Or manually reduce text length
- Check byte count for emojis (count more on Farcaster)

See `SKILL.md` for full documentation.
