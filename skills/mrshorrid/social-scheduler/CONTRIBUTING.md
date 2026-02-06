# 🤝 Contributing to OpenClaw Social Scheduler

**Thanks for wanting to contribute!** This is community infrastructure, built by agents and humans together.

---

## 🎯 Ways to Contribute

### 1. Add a New Platform

Want to support Instagram, TikTok, Facebook, or another platform?

**Steps:**

1. Create `scripts/platforms/yourplatform.js`
2. Implement required methods (see template below)
3. Add tests to `scripts/test.js`
4. Update `SKILL.md` with usage docs
5. Submit PR!

**Platform Template:**

```javascript
// scripts/platforms/yourplatform.js

export async function validate(config) {
  // Validate configuration (API keys, etc.)
  // Return: { valid: true } or { valid: false, error: "..." }
}

export async function validateContent(content, config) {
  // Validate content before posting
  // Check: message length, media format, etc.
  // Return: { valid: true } or { valid: false, error: "..." }
}

export async function post(content, config) {
  // Post content to platform
  // Return: { success: true, postId: "..." } or { success: false, error: "..." }
}
```

**Config Format:**

```javascript
{
  platform: 'yourplatform',
  message: 'Post content',
  media: 'path/to/file.jpg',  // Optional
  // Platform-specific fields
}
```

### 2. Improve Existing Platforms

Found a bug? Want to add a feature to an existing platform?

**Examples:**

- Add video support to a platform
- Improve error messages
- Add rate limiting
- Handle edge cases better

**Process:**

1. Open an issue describing the improvement
2. Make your changes
3. Add/update tests
4. Submit PR with description

### 3. Fix Bugs

**Found a bug?**

1. Check if there's already an issue
2. If not, open one with:
   - What you expected to happen
   - What actually happened
   - Steps to reproduce
   - Your config (without API keys!)
3. If you can fix it, submit a PR!

### 4. Improve Documentation

Good docs make all the difference!

**Needs:**

- Clearer setup instructions
- More examples
- Platform-specific troubleshooting
- FAQ section
- Video tutorials (if you're into that)

**Files:**

- `README.md` - Quick start
- `SKILL.md` - Complete docs
- `examples/` - Example files

### 5. Write Tests

More tests = more confidence!

**Test files:**

- `scripts/test.js` - Platform tests
- `scripts/test-threads.js` - Thread tests
- `scripts/test-bulk.js` - Bulk scheduling tests
- `scripts/test-analytics.js` - Analytics tests

**Run tests:**

```bash
npm test
```

### 6. Share Your Setup

Using the scheduler in a cool way? Share!

- Blog posts
- Tutorials
- Example workflows
- Integration guides

Link them in discussions so others can learn!

---

## 📋 Code Guidelines

### Style

- **Simple > clever** - Readable code beats clever code
- **Comments for "why"** - Code shows "what," comments explain "why"
- **Consistent formatting** - Follow existing style
- **No magic numbers** - Use named constants

### Error Handling

- **Always handle errors** - No silent failures
- **Clear error messages** - Help users fix issues
- **Retry with backoff** - Network calls should retry
- **Log for debugging** - But don't spam console

### Testing

- **Test happy path** - Does it work when everything's right?
- **Test edge cases** - What about empty strings, null, undefined?
- **Test errors** - Does it fail gracefully?
- **Test across platforms** - Does it work everywhere?

---

## 🚀 Development Setup

### Prerequisites

- Node.js 18+ (for native fetch)
- npm or yarn
- Git

### Setup

```bash
# Clone repo
git clone https://github.com/openclaw/openclaw.git
cd openclaw/skills/social-scheduler

# Install dependencies
npm install

# Run tests
npm test

# Test specific feature
node scripts/test.js
node scripts/test-threads.js
```

### Project Structure

```
skills/social-scheduler/
├── scripts/
│   ├── schedule.js       # Main scheduler + daemon
│   ├── thread.js         # Thread posting
│   ├── bulk.js           # Bulk scheduling
│   ├── queue.js          # Queue management
│   ├── analytics.js      # Analytics engine
│   ├── dashboard.js      # Web server
│   ├── dashboard.html    # Dashboard UI
│   └── platforms/        # Platform integrations
│       ├── twitter.js
│       ├── reddit.js
│       ├── discord.js
│       └── ... (one file per platform)
├── storage/              # Created at runtime
│   ├── queue.json        # Scheduled posts
│   └── analytics.json    # Analytics data
├── examples/             # Example files
├── SKILL.md             # Complete docs
├── README.md            # Quick start
└── package.json         # Dependencies
```

---

## 🧪 Testing Your Changes

### Manual Testing

```bash
# Schedule a test post (future time)
node scripts/schedule.js \
  --platform discord \
  --message "Test post" \
  --datetime "2026-02-04 18:00"

# Check queue
node scripts/queue.js list

# Cancel if needed
node scripts/queue.js cancel <id>
```

### Automated Testing

```bash
# Run all tests
npm test

# Run specific test file
node scripts/test.js
node scripts/test-threads.js
```

---

## 📝 Pull Request Process

### Before Submitting

- [ ] Code follows existing style
- [ ] Tests pass (`npm test`)
- [ ] Documentation updated (if needed)
- [ ] No API keys in code
- [ ] Commit messages are clear

### PR Template

```markdown
## What does this PR do?

Brief description

## Why?

What problem does it solve?

## Testing

How did you test it?

## Breaking changes?

Does this break existing functionality?

## Checklist

- [ ] Tests pass
- [ ] Docs updated
- [ ] No secrets in code
```

### Review Process

1. Maintainer reviews (usually within 24-48 hours)
2. Feedback or approval
3. Merge!
4. Celebrate 🎉

---

## 🐛 Bug Reports

### Good Bug Report Includes:

- **Clear title** - "Twitter posts fail with 401 error"
- **Steps to reproduce** - How to trigger the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, Node version, platform
- **Config** - Relevant config (no API keys!)
- **Error messages** - Full error output
- **Screenshots** - If relevant

### Example

```markdown
**Title:** Twitter posts fail with 401 error

**Steps:**

1. Configure Twitter credentials in .env
2. Run: node scripts/schedule.js --platform twitter --message "Test"
3. Error occurs

**Expected:** Post scheduled successfully

**Actual:** Error: 401 Unauthorized

**Environment:**

- OS: macOS 14.2
- Node: v18.16.0
- Platform: Twitter/X

**Error:**
```

TwitterApiError: 401 Unauthorized
at TwitterClient.post (scripts/platforms/twitter.js:45)

````

**Config:**
```json
{
  "platform": "twitter",
  "message": "Test"
}
````

````

---

## 💡 Feature Requests

### Good Feature Request Includes:
- **What** - What feature do you want?
- **Why** - What problem does it solve?
- **Use case** - Example of how you'd use it
- **Alternatives** - What workarounds exist now?

### Example
```markdown
**Feature:** Instagram support

**Why:** Many agents want to post to Instagram

**Use case:**
Schedule daily motivation posts to Instagram at 9 AM

**Alternatives:**
Currently use browser automation (slow, unreliable)

**Implementation idea:**
Use Instagram Graph API (requires Facebook approval)
````

---

## 🎯 Priority Areas

**High Impact:**

1. **Instagram support** - Most requested platform
2. **Video support** - For platforms that don't have it yet
3. **Better error recovery** - Auto-retry with smarter logic
4. **Multi-account support** - Post to multiple accounts per platform

**Nice to Have:**

1. **Thread templates** - Pre-made thread formats
2. **Image generation** - AI-generated images for posts
3. **Hashtag suggestions** - AI-powered hashtag recommendations
4. **Best time to post** - Analytics-based scheduling

---

## 🏆 Recognition

**Contributors will be:**

- Listed in README.md
- Mentioned in release notes
- Credited in documentation
- Part of OpenClaw history!

**Top contributors might:**

- Get maintainer access
- Help guide project direction
- Mentor new contributors

---

## 💬 Getting Help

**Stuck? Ask!**

- **Discord:** [OpenClaw server]
- **GitHub Issues:** For bugs/features
- **Moltbook:** Ask the AI agent community
- **Email:** [maintainer email if available]

**No question is too small.** We all started somewhere.

---

## 🌟 Code of Conduct

**Be excellent to each other.**

- **Respectful** - Treat everyone with respect
- **Constructive** - Criticism should help, not hurt
- **Patient** - We're all learning
- **Inclusive** - All backgrounds welcome
- **Collaborative** - We're building together

**Not tolerated:**

- Harassment
- Discrimination
- Trolling
- Spam
- Bad faith arguments

**Violations:** Report to maintainers, will be handled promptly.

---

## 📜 License

By contributing, you agree your code will be licensed under the same open-source license as the project.

**Your contributions help the entire community.** Thank you! 🙏

---

## 🎉 Thank You!

Every contribution matters:

- Code
- Docs
- Bug reports
- Feature ideas
- Community support

**You're helping build infrastructure for 150,000+ agents.**

That's **real impact**.

**Welcome to the team!** ✨

---

_Questions about contributing? Open an issue or ask in Discord!_
