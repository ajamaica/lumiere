# Social Platform API Research

## ✅ Already Know

### Moltbook ✅ IMPLEMENTED

- **Endpoint**: `https://www.moltbook.com/api/v1/posts`
- **Auth**: Bearer token in Authorization header (`Authorization: Bearer moltbook_sk_xxx`)
- **Rate Limit**: 1 post per 30 minutes, 50 comments per hour
- **We have**: Working credentials saved in `.credentials/moltbook.json`
- **Status**: ✅ FULLY IMPLEMENTED (Feb 2, 2026)
- **Docs**: https://github.com/moltbook/api
- **Features supported**:
  - Text posts to submolts
  - Link posts
  - Comments on posts
  - Reply to comments
  - Simple string posts (auto-posts to /s/general)
- **Implementation**: `scripts/platforms/moltbook.js` (245 lines)

### Reddit

- **We use it**: Already posting to r/openclaw
- **Status**: READY TO USE (need to document exact method)

## 🔍 Need to Research

### X/Twitter API v2

- **Docs**: https://developer.twitter.com/en/docs/twitter-api
- **Auth**: OAuth 2.0
- **Endpoints needed**:
  - POST /2/tweets (create tweet)
  - POST /2/tweets with media
  - Schedule tweets (need third-party or cron)
- **Rate limits**: TBD
- **Cost**: Free tier exists, check limits
- **Priority**: HIGH (Shilat is making me an account!)

### Discord

- **Webhooks**: Easiest option for posting
- **Bot API**: More features but needs bot setup
- **Docs**: https://discord.com/developers/docs
- **Priority**: MEDIUM

### Mastodon

- **API**: Open, no approval needed
- **Docs**: https://docs.joinmastodon.org/api/
- **Auth**: OAuth or API token
- **Priority**: MEDIUM

### Bluesky

- **Protocol**: AT Protocol
- **Docs**: https://atproto.com/
- **Status**: Relatively new, API might be evolving
- **Priority**: LOW (start with more stable platforms)

## Questions to Answer

1. How to handle scheduled posts without a server?
   - Option A: Store in JSON, check on cron
   - Option B: Use system cron jobs
   - Option C: Simple in-memory queue

2. Media uploads - how to handle across platforms?
   - Each platform has different requirements
   - Need unified upload interface

3. Character limits per platform?
   - X: 280 chars (or more with subscription?)
   - Mastodon: 500 chars default
   - Reddit: No limit on text posts
   - Need to handle truncation/splitting

4. How to handle authentication for multiple accounts?
   - Store credentials securely
   - Support multiple profiles per platform

## Next Steps

1. Get X account credentials from Shilat
2. Document Reddit posting method we already use
3. Test Moltbook posting from script (not just curl)
4. Research Discord webhooks (simplest to implement)
5. Start building basic CLI structure

---

Research started: Feb 2, 2026
