# strykr-qa-bot

QA automation skill for testing Strykr (https://app.strykr.ai).

## What It Does

Automated testing for the Strykr AI finance dashboard:

- Pre-built test suites for all pages
- Signal card validation
- AI response quality checks
- PRISM API health monitoring
- Known issue tracking

## When To Use

- Testing Strykr after deployments
- Regression testing
- Monitoring site health
- Validating new features

## Usage

### Run All Tests

```bash
cd /path/to/strykr-qa-bot
npm test
```

### Run Specific Suite

```bash
npm run test:homepage
npm run test:crypto
npm run test:stocks
npm run test:news
npm run test:events
npm run test:ai-chat
```

### Quick Smoke Test

```bash
npm run smoke
```

### Programmatic Usage

```typescript
import { StrykrQABot } from 'strykr-qa-bot'

const qa = new StrykrQABot({
  baseUrl: 'https://app.strykr.ai',
})

// Run all suites
const results = await qa.runAll()

// Check specific assertions
await qa.expectSignalCard({ hasPrice: true, hasChart: true })
await qa.expectAIResponse({ minLength: 200 })

// Health check API
const health = await qa.checkPrismEndpoints()

// Generate report
const report = qa.generateReport()
```

## Test Suites

| Suite          | Tests                       | Notes                  |
| -------------- | --------------------------- | ---------------------- |
| homepage       | Navigation, widgets, status | Entry point            |
| crypto-signals | Filters, cards, actions     | Has known modal issue  |
| stock-signals  | Asset filters, actions      | Stocks/ETFs/Forex      |
| news           | Routing, categories         | Known direct URL issue |
| events         | Impact filters, times       | Known direct URL issue |
| ai-chat        | Input, responses            | Quality validation     |

## Known Issues Tracked

1. **details-modal-empty** (High) - Modal opens but content empty
2. **direct-url-blank-news** (Medium) - /news blank on direct nav
3. **direct-url-blank-events** (Medium) - /economic-events blank
4. **events-widget-race-condition** (Low) - Intermittent widget load

## Configuration

Edit `strykr-qa.yaml`:

```yaml
baseUrl: https://app.strykr.ai
browser:
  headless: false
  timeout: 30000
```

## Dependencies

- [web-qa-bot](https://github.com/NextFrontierBuilds/web-qa-bot) (peer dependency)

## Output

Test results with:

- Pass/Fail/Known-issue status
- Screenshots at each step
- Console error capture
- Timing metrics
- Markdown report

## Author

Next Frontier (@NextXFrontier)

## Links

- [GitHub](https://github.com/NextFrontierBuilds/strykr-qa-bot)
- [Strykr](https://app.strykr.ai)
