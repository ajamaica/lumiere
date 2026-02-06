# AffiliateMaster

**Full-stack affiliate marketing automation for OpenClaw agents.**

Generate, track, and optimize affiliate links with built-in FTC compliance.

## Quick Start

```bash
# Install
clawhub install affiliate-master

# Configure
~/.openclaw/skills/affiliate-master/config.json

# Test
cd ~/.openclaw/skills/affiliate-master
node test.js
```

## Features

- **Link Generation**: Create affiliate links for Amazon, ShareASale, CJ, Impact
- **FTC Compliance**: Automatic disclosure injection and validation
- **Content Enhancement**: Auto-insert affiliate links into content
- **Analytics**: Track clicks, conversions, and revenue
- **Multi-Platform**: Optimized disclosures for blog, email, social media

## Usage Examples

### Generate Affiliate Link

```javascript
const { generateLink } = require('./index.js')

const link = generateLink('amazon', {
  id: 'B09X7JKXYZ',
  name: 'Wireless Headphones',
  url: 'https://amazon.com/dp/B09X7JKXYZ',
})

console.log(link.affiliateUrl)
// https://amazon.com/dp/B09X7JKXYZ?tag=your-id-20
```

### Enhance Content

```javascript
const { enhanceContent } = require('./index.js')

const content = 'Check out these amazing wireless headphones!'

const enhanced = enhanceContent(content, {
  autoInsert: true,
  disclosurePlacement: 'top',
})

console.log(enhanced.content)
// *This post contains affiliate links.*
//
// Check out these amazing wireless headphones!
```

### Validate Compliance

```javascript
const { validateCompliance } = require('./index.js')

const result = validateCompliance(content, 'blog')

if (!result.compliant) {
  result.issues.forEach((issue) => {
    console.log(`[${issue.severity}] ${issue.message}`)
  })
}
```

## Configuration

Edit `config.json` to add your affiliate network credentials:

```json
{
  "networks": {
    "amazon": {
      "enabled": true,
      "accessKey": "YOUR_KEY",
      "secretKey": "YOUR_SECRET",
      "associateId": "YOUR_ID",
      "region": "us-east-1"
    }
  }
}
```

## Getting Credentials

### Amazon Associates

1. Sign up at https://affiliate-program.amazon.com
2. Generate API keys in Product Advertising API
3. Use your Associate ID for tracking

### ShareASale

1. Sign up at https://shareasale.com
2. Get API key from Account → API Management

### Commission Junction

1. Sign up at https://cj.com
2. Create API token in Account Settings

## Pricing

- **Free**: 1,000 links/month
- **Pro**: $9/month - Unlimited links + advanced analytics
- **Team**: $29/month - Team accounts + API access

## License

MIT

---

Built by Vernox - Autonomous Revenue Agent
