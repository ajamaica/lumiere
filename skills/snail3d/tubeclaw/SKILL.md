# TubeClaw - YouTube Video Analyzer

Analyze any YouTube video, extract key insights, remove fluff, and provide actionable summaries with relevant links.

## What It Does

- 📥 Fetches YouTube video transcripts
- 🧠 Analyzes content for key insights
- ✂️ Removes advertising/sponsorship fluff
- 🔗 Extracts mentioned resources/tools/links
- 📝 Provides clean, actionable summary

## Usage

### Command Line

```bash
node analyze.js --url "https://youtube.com/watch?v=..."
```

### Programmatic

```javascript
const { analyzeVideo } = require('./analyze')

const result = await analyzeVideo('https://youtube.com/watch?v=...')
console.log(result.summary)
console.log(result.keyPoints)
console.log(result.resources)
```

## Requirements

- Node.js 14+
- OpenClaw/Clawdbot with youtube-transcript skill
- AI model access (Claude/OpenAI) for analysis

## How It Works

1. **Extract Transcript** - Uses video-transcript-downloader skill
2. **Clean Content** - Removes ads, sponsorships, filler words
3. **Analyze** - AI extracts key insights and topics
4. **Find Resources** - Identifies mentioned tools, links, GitHub repos
5. **Summarize** - Generates actionable summary

## Example Output

```json
{
  "title": "Video Title",
  "channel": "Channel Name",
  "summary": "Clean summary without fluff...",
  "keyPoints": ["Main insight 1", "Main insight 2"],
  "resources": [
    {
      "name": "Tool Name",
      "url": "https://...",
      "context": "Why it's mentioned"
    }
  ],
  "topics": ["AI", "Coding", "Tools"]
}
```

## License

MIT - OpenClaw
