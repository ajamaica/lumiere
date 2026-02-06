# YouTube Studio - Project Structure

Complete file and directory organization for the YouTube Studio skill.

## Directory Tree

```
youtube-studio/
├── SKILL.md                           # Technical documentation & API reference
├── README.md                          # User guide & quick start
├── INSTALL.md                         # Detailed installation guide
├── STRUCTURE.md                       # This file
├── package.json                       # NPM dependencies & scripts
├── .env.example                       # Environment variables template
│
├── scripts/                           # Core application modules
│   ├── youtube-studio.js              # Main CLI entry point & command router
│   ├── auth-handler.js                # OAuth 2.0 authentication
│   ├── api-client.js                  # YouTube API client with rate limiting
│   ├── channel-analytics.js           # Channel statistics & analytics
│   ├── video-uploader.js              # Video upload & metadata handling
│   ├── comment-manager.js             # Comment reading & reply management
│   ├── content-ideas.js               # Video idea generation with AI
│   └── utils.js                       # Logging, formatting, & utilities
│
├── config/                            # Configuration files
│   ├── templates.json                 # Video description & reply templates
│   └── niche-prompts.json             # AI prompts for different niches
│
└── logs/                              # Runtime logs (created on first run)
    └── youtube-studio-YYYY-MM-DD.log  # Daily log files
```

## File Descriptions

### Root Level

| File           | Purpose                                                                             |
| -------------- | ----------------------------------------------------------------------------------- |
| `SKILL.md`     | Complete technical documentation, API setup, rate limiting strategy, error handling |
| `README.md`    | User-friendly quick start, common commands, troubleshooting                         |
| `INSTALL.md`   | Step-by-step installation for new users                                             |
| `STRUCTURE.md` | This documentation (file organization)                                              |
| `package.json` | NPM dependencies, scripts, metadata                                                 |
| `.env.example` | Template for environment configuration                                              |

### scripts/ Directory

**youtube-studio.js** (500+ lines)

- CLI command parsing (yargs)
- Command routing (auth, stats, upload, comments, reply, ideas, quota)
- Output formatting (chalk colors)
- Error handling & user feedback

**auth-handler.js** (250+ lines)

- OAuth 2.0 authentication flow
- Google login browser integration
- Token generation & refresh
- Credential management
- Session validation

**api-client.js** (300+ lines)

- Quota tracking & enforcement
- Exponential backoff retry logic
- Rate limiting (429, 503 handling)
- Circuit breaker pattern
- Request batching
- Daily quota reset logic

**channel-analytics.js** (350+ lines)

- Channel statistics retrieval
- Top videos analysis
- Recent performance metrics
- Watch time estimation
- Engagement calculation
- Quota status reporting

**video-uploader.js** (300+ lines)

- Resumable upload protocol
- Metadata validation
- Custom thumbnail handling
- Playlist management
- Video scheduling
- MIME type detection
- Chunked upload handling

**comment-manager.js** (250+ lines)

- Comment listing & filtering
- Comment thread traversal
- Reply functionality
- Comment analysis (sentiment)
- Spam detection
- Comment deletion
- Statistics calculation

**content-ideas.js** (350+ lines)

- AI-powered idea generation
- Niche-specific prompting
- Comment reply suggestions
- Trending topic integration
- Fallback idea generation
- Template loading

**utils.js** (300+ lines)

- Logger initialization & management
- Duration/byte formatting
- Email validation
- Text cleaning & truncation
- Metadata validation
- URL parsing
- Retry logic with backoff
- Object merging utilities

### config/ Directory

**templates.json**

- Video description templates (devoted_journey, faith_teaching, prayer_guide, testimony)
- Comment reply templates (grateful, educational, promotional, engagement)
- Video category mappings
- Used by content generation & uploader modules

**niche-prompts.json**

- Niche-specific configuration objects
- Niches: devotional, fitness, educational, cooking, vlog, gaming
- Each includes: description, focus, audience, tone, content pillars, video idea templates
- Used by content ideas generator for targeted suggestions

## Configuration Files (User-Created)

These files are created in `~/.clawd-youtube/` during setup:

| File                  | Source                       | Purpose                      |
| --------------------- | ---------------------------- | ---------------------------- |
| `credentials.json`    | Downloaded from Google Cloud | OAuth 2.0 credentials        |
| `tokens.json`         | Generated after auth         | Auth tokens & refresh tokens |
| `config.env`          | Copied from `.env.example`   | User configuration           |
| `quota-tracking.json` | Auto-generated               | Daily API quota tracking     |
| `logs/`               | Auto-generated               | Application logs             |

## Data Flow

```
User Command
    ↓
CLI Parser (youtube-studio.js)
    ↓
Command Handler (auth, stats, upload, etc.)
    ↓
API Client (api-client.js) ← Quota Tracking
    ↓
YouTube API (via googleapis)
    ↓
Response Processing & Formatting
    ↓
Output to User (stdout/colors)
    ↓
Logging (utils.js logger)
```

## Module Dependencies

```
youtube-studio.js
├── auth-handler.js
├── channel-analytics.js
│   └── api-client.js
├── video-uploader.js
│   └── api-client.js
├── comment-manager.js
│   └── api-client.js
├── content-ideas.js
│   ├── Axios (for AI calls)
│   └── utils.js
└── utils.js

External Dependencies:
├── googleapis (Google API client)
├── google-auth-library (OAuth handling)
├── axios (HTTP requests)
├── chalk (colored terminal output)
├── yargs (CLI argument parsing)
└── fs, path, http (Node.js built-ins)
```

## Key Design Patterns

### 1. Rate Limiting & Quota Management

- **Files:** `api-client.js`, `channel-analytics.js`
- **Pattern:** Quota tracking before each request
- **Features:** Daily reset, percentage warnings, request batching

### 2. Error Recovery

- **Files:** `api-client.js`
- **Pattern:** Exponential backoff, circuit breaker, retry logic
- **Handles:** 429 (rate limited), 503 (unavailable), 5xx (server errors)

### 3. OAuth Authentication

- **Files:** `auth-handler.js`, `api-client.js`
- **Pattern:** Token refresh on demand, local storage
- **Features:** Browser-based login, automatic token management

### 4. Modular Command Handling

- **Files:** `youtube-studio.js`
- **Pattern:** Command → Handler → Module → API
- **Features:** Consistent error handling, formatted output

### 5. Templating System

- **Files:** `content-ideas.js`, `templates.json`
- **Pattern:** Load templates, merge with user data
- **Features:** Fallback templates, niche-specific templates

### 6. Logging

- **Files:** `utils.js`
- **Pattern:** Centralized logger, file & console output
- **Features:** Log levels, daily rotation, detailed context

## Performance Considerations

1. **Quota Efficiency**
   - Batch requests where possible
   - Track usage to avoid exceeding limits
   - Default daily limit: 1M units = ~1,600 video uploads

2. **Response Caching** (not yet implemented)
   - Cache channel stats for short periods
   - Reduces API calls for frequently accessed data

3. **Async Operations**
   - All API calls are async to prevent blocking
   - Promise-based architecture

4. **Error Recovery**
   - Automatic retry with exponential backoff
   - Circuit breaker prevents cascading failures
   - Token refresh happens transparently

## Security Architecture

1. **Credential Storage**
   - OAuth tokens stored locally in `~/.clawd-youtube/`
   - Never committed to version control
   - Encrypted would be ideal (future enhancement)

2. **Scope Management**
   - Only requests necessary OAuth scopes
   - Uses OAuth 2.0 refresh tokens

3. **Input Validation**
   - Metadata validation before upload
   - URL validation for extraction
   - Length limits enforced (title, description, tags)

4. **Rate Limiting**
   - Respects YouTube API quotas
   - Prevents quota exhaustion
   - Implements backoff strategies

## Extensibility Points

### Add New Commands

1. Add command in `youtube-studio.js` using yargs
2. Create handler function
3. Call appropriate module (analytics, uploader, etc.)

### Add New Niche

1. Add entry to `config/niche-prompts.json`
2. Module will automatically use it for idea generation

### Add New API Functionality

1. Create module in `scripts/`
2. Use `api-client.makeQuotaAwareRequest()` for API calls
3. Export functions for CLI to use

### Add Templates

1. Update `config/templates.json`
2. Call from `content-ideas.js` or uploader

## Testing & Debugging

**Enable Debug Logging:**

```bash
LOG_LEVEL=debug youtube-studio stats
```

**Check Logs:**

```bash
tail -f ~/.clawd-youtube/logs/youtube-studio-*.log
```

**Test Authentication:**

```bash
youtube-studio auth
```

**Dry Run Mode:**

```bash
youtube-studio upload --file video.mp4 --title "Test" --dry-run
```

## Future Enhancements

- [ ] Live stream monitoring
- [ ] Playlist automation
- [ ] Subtitle generation
- [ ] Thumbnail optimization
- [ ] Analytics dashboards
- [ ] Multi-channel support
- [ ] Response caching
- [ ] Token encryption
- [ ] Web UI
- [ ] Database backend for stats history

---

This structure ensures:

- **Separation of Concerns:** Each module has a single responsibility
- **Reusability:** Modules can be used independently
- **Testability:** Functions are isolated and mockable
- **Maintainability:** Clear file organization and documentation
- **Scalability:** Easy to add features without refactoring
