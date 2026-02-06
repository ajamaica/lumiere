---
name: affiliate-master
description: Full-stack affiliate marketing automation for OpenClaw agents. Generate, track, and optimize affiliate links with FTC-compliant disclosures and multi-network support.
metadata:
  {
    'openclaw':
      {
        'version': '1.0.0',
        'author': 'Vernox',
        'license': 'MIT',
        'tags': ['affiliate', 'marketing', 'monetization', 'automation', 'ftc-compliance'],
        'category': 'marketing',
      },
  }
---

# AffiliateMaster - Affiliate Marketing Automation

**Vernox's first revenue-generating skill. Turn content into cash.**

## Overview

AffiliateMaster is a comprehensive affiliate marketing automation tool for OpenClaw agents. It handles the entire affiliate workflow from link generation to revenue tracking, with built-in FTC compliance.

## Features

### ✅ Link Management

- Generate affiliate links from multiple networks (Amazon, ShareASale, CJ, Impact)
- Track clicks, conversions, and revenue
- Automatic link shortening and branding
- Link health monitoring

### ✅ FTC Compliance

- Automatic disclosure injection for all content
- Customizable disclosure templates
- Platform-specific formatting (blog, social, email)
- Compliance audit logs

### ✅ Content Integration

- Auto-detect opportunities for affiliate links
- Insert links with context-aware placement
- Generate call-to-action text
- A/B test link placements

### ✅ Multi-Network Support

- Amazon Associates
- ShareASale
- Commission Junction (CJ)
- Impact
- Custom networks via API

### ✅ Analytics & Optimization

- Real-time revenue dashboard
- Conversion rate tracking
- Best-performing products identification
- Automated optimization suggestions

## Installation

```bash
clawhub install affiliate-master
```

## Quick Start

### 1. Configure API Keys

```bash
# Edit config file
~/.openclaw/skills/affiliate-master/config.json
```

```json
{
  "networks": {
    "amazon": {
      "accessKey": "YOUR_ACCESS_KEY",
      "secretKey": "YOUR_SECRET_KEY",
      "associateId": "YOUR_ASSOCIATE_ID",
      "region": "us-east-1"
    },
    "shareasale": {
      "apiKey": "YOUR_API_KEY",
      "affiliateId": "YOUR_AFFILIATE_ID"
    }
  },
  "disclosure": {
    "text": "This post contains affiliate links. If you buy through these links, we may earn a commission at no extra cost to you.",
    "placement": "top",
    "platforms": {
      "blog": "above-fold",
      "twitter": "end",
      "email": "footer"
    }
  }
}
```

### 2. Generate Your First Affiliate Link

```javascript
// Find a product
const products = await affiliateMaster.searchProduct('wireless headphones')

// Generate affiliate link
const link = await affiliateMaster.generateLink({
  network: 'amazon',
  product: products[0],
})

// Result:
// {
//   "originalUrl": "https://amazon.com/dp/B0XXXXX",
//   "affiliateUrl": "https://amzn.to/3xxxxx?tag=your-id-20",
//   "disclosure": "Affiliate link",
//   "trackingId": "aff_12345"
// }
```

### 3. Insert Links into Content

```javascript
const content = `Check out these amazing wireless headphones! They have great sound quality.`

const enhanced = await affiliateMaster.enhanceContent(content, {
  autoInsert: true,
  disclosurePlacement: 'top',
})

// Result: Content with affiliate links and FTC disclosure inserted
```

## Tool Functions

### `generateLink`

Generate affiliate links for products.

**Parameters:**

- `network` (string): Network name (amazon, shareasale, cj, impact)
- `product` (object): Product data (id, url, name)
- `shorten` (boolean): Generate short link (default: true)

**Returns:**

- `affiliateUrl`: Generated affiliate link
- `disclosure`: Required disclosure text
- `trackingId`: Unique tracking identifier

### `searchProduct`

Search for products across affiliate networks.

**Parameters:**

- `query` (string): Search query
- `network` (string): Network to search (default: all)
- `category` (string): Product category filter

**Returns:**

- Array of matching products with pricing and commission rates

### `enhanceContent`

Automatically insert affiliate links into content.

**Parameters:**

- `content` (string): Original content
- `options` (object):
  - `autoInsert` (boolean): Auto-detect opportunities
  - `disclosurePlacement` (string): Where to place disclosure
  - `maxLinks` (number): Maximum links to insert

**Returns:**

- Enhanced content with affiliate links and disclosures

### `getAnalytics`

Retrieve performance analytics.

**Parameters:**

- `dateRange` (string): 7d, 30d, 90d, all
- `network` (string): Filter by network (optional)

**Returns:**

- Clicks, conversions, revenue, EPC, top products

### `validateCompliance`

Check FTC compliance of content.

**Parameters:**

- `content` (string): Content to validate
- `platform` (string): Platform type (blog, social, email)

**Returns:**

- Compliance status, missing disclosures, recommendations

## Use Cases

### Blog Monetization

- Automatically insert affiliate links into product reviews
- Add FTC disclosures to all posts
- Track which products generate the most revenue

### Newsletter Monetization

- Add affiliate links to curated product recommendations
- Track clicks and conversions
- Optimize product selection over time

### Social Media Monetization

- Generate short affiliate links for Twitter/X
- Add compliant disclosures
- Track click-through rates

### E-commerce Arbitrage

- Compare affiliate rates across networks
- Find highest-paying offers
- Automate link generation

## Pricing

- **Free:** Up to 1,000 link generations/month
- **Pro:** $9/month - Unlimited links + advanced analytics
- **Team:** $29/month - Team accounts + API access

## Roadmap

- [ ] Integration with additional affiliate networks
- [ ] AI-powered product recommendations
- [ ] Auto-optimization based on performance data
- [ ] Bulk link generation for catalogs
- [ ] Custom domain support for branded links
- [ ] Real-time commission rate alerts

## Compliance

AffiliateMaster is built with FTC compliance in mind:

- Automatic disclosure generation
- Platform-appropriate formatting
- Audit logging for regulatory requirements

**Disclaimer:** This tool helps with compliance but does not replace legal advice. Always consult with a legal professional for specific compliance needs.

## Support

For issues, feature requests, or questions:

- GitHub: https://github.com/vernox/affiliate-master
- Discord: https://discord.gg/clawd

---

**Generate revenue. Stay compliant. Automate everything.**
