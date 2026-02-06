# strykr-qa-bot

Strykr-specific QA automation extending [web-qa-bot](https://github.com/NextFrontierBuilds/web-qa-bot).

Pre-built test suites for https://app.strykr.ai covering all pages, filters, and functionality.

## Features

- **Pre-built Test Suites** - Ready-to-run tests for all Strykr pages
- **Known Issue Tracking** - Documented bugs with severity and status
- **Strykr-specific Assertions** - Custom validators for signal cards, AI responses
- **PRISM API Health Checks** - Endpoint monitoring
- **Screenshot Capture** - Visual evidence for all test steps

## Quick Start

```bash
# Clone the repo
git clone https://github.com/NextFrontierBuilds/strykr-qa-bot.git
cd strykr-qa-bot

# Install dependencies
npm install

# Run all test suites
npm test

# Run specific suite
npm run test:crypto
npm run test:homepage
```

## Test Suites

| Suite                 | Description                           |
| --------------------- | ------------------------------------- |
| `homepage.yaml`       | Market status, navigation, widgets    |
| `crypto-signals.yaml` | Crypto filters, signal cards, actions |
| `stock-signals.yaml`  | Stock/ETF/Forex filters, actions      |
| `news.yaml`           | News routing, filters, interactions   |
| `events.yaml`         | Economic events, impact filters       |
| `ai-chat.yaml`        | AI input, responses, quality          |

## Running Tests

### All Suites

```bash
npm test
# or
npx web-qa-bot run ./test-suites --config strykr-qa.yaml
```

### Individual Suite

```bash
npx web-qa-bot run ./test-suites/crypto-signals.yaml
```

### Smoke Test

```bash
npm run smoke
# Quick health check of the site
```

## Known Issues

The `config/known-issues.yaml` tracks documented bugs:

| ID                             | Severity | Description                           |
| ------------------------------ | -------- | ------------------------------------- |
| `details-modal-empty`          | High     | Details modal opens but content empty |
| `direct-url-blank-news`        | Medium   | /news blank on direct URL navigation  |
| `direct-url-blank-events`      | Medium   | /economic-events blank on direct URL  |
| `events-widget-race-condition` | Low      | Homepage events widget intermittent   |

Tests that hit known issues are marked as "known-issue" rather than "fail".

## Configuration

Edit `strykr-qa.yaml` to customize:

```yaml
baseUrl: https://app.strykr.ai

browser:
  headless: false
  timeout: 30000
  screenshotDir: ./screenshots

suites:
  - test-suites/homepage.yaml
  - test-suites/crypto-signals.yaml
  # ...

knownIssuesFile: ./config/known-issues.yaml
```

## Strykr-Specific Assertions

### expectSignalCard

Validates signal card components:

```typescript
await strykr.expectSignalCard({
  hasSymbol: true,
  hasPrice: true,
  hasChart: true,
  hasActions: true,
  type: 'crypto',
  direction: 'long',
})
```

### expectAIResponse

Validates AI response quality:

```typescript
await strykr.expectAIResponse({
  hasPrice: true,
  hasTechnicals: true,
  minLength: 200,
  hasSentiment: true,
})
```

### checkPrismEndpoints

Health check PRISM API endpoints:

```typescript
const health = await strykr.checkPrismEndpoints()
// Returns Map<endpoint, isHealthy>
```

## Test Coverage

### Filters Tested

- Direction: Long / Short
- Crypto chains: EVM / Solana
- Asset types: Stocks / ETFs / Forex
- News categories: Crypto / Stocks / All
- News sentiment: Bullish / Bearish
- Event impact: High / Medium / Low
- Event time: Today / This Week

### Actions Tested

- Listen (TTS playback)
- Ask Strykr AI (pre-filled queries)
- Details modal (known issue: empty content)
- Share options

### Navigation Tested

- Sidebar navigation (works)
- Direct URL navigation (issues on /news, /economic-events)

### AI Chat Tested

- Direct input queries
- Pre-filled queries from signals
- Response quality (length, content)
- Loading states
- Error handling

## Reports

Generate a test report:

```bash
npx web-qa-bot report ./results --output report.md
```

Reports include:

- Pass/Fail/Known-issue status
- Screenshots
- Console errors
- Timing metrics

## Project Structure

```
strykr-qa-bot/
├── test-suites/
│   ├── homepage.yaml
│   ├── crypto-signals.yaml
│   ├── stock-signals.yaml
│   ├── news.yaml
│   ├── events.yaml
│   └── ai-chat.yaml
├── src/
│   ├── index.ts
│   ├── strykr-bot.ts
│   └── assertions.ts
├── config/
│   └── known-issues.yaml
├── strykr-qa.yaml
├── package.json
├── README.md
└── SKILL.md
```

## Contributing

1. Add new tests to appropriate suite YAML
2. Document new known issues in `config/known-issues.yaml`
3. Add custom assertions to `src/assertions.ts`

## License

MIT

## Links

- [Strykr](https://app.strykr.ai)
- [web-qa-bot](https://github.com/NextFrontierBuilds/web-qa-bot)
- [ClawdHub](https://clawdhub.com)
