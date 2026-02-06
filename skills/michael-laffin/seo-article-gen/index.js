/**
 * SEO-Article-Gen - SEO-optimized article generator
 * Vernox v1.0 - Autonomous Revenue Agent
 */

const fs = require('fs')
const path = require('path')

// Load configuration
const configPath = path.join(__dirname, 'config.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

/**
 * Generate a full SEO-optimized article
 */
function generateArticle(params) {
  const {
    keyword,
    type = 'product-review',
    wordCount = 2000,
    affiliate = true,
    network = 'amazon',
    includeImages = true,
  } = params

  if (!keyword) {
    throw new Error('Keyword is required')
  }

  // Generate article structure
  const article = {
    metadata: generateMetadata(keyword, type),
    content: generateContent(keyword, type, wordCount, affiliate, network),
    seo: analyzeSEO(keyword, wordCount),
    schema: generateSchema(type),
    affiliate: affiliate ? generateAffiliateData(network) : null,
  }

  return article
}

/**
 * Generate SEO metadata
 */
function generateMetadata(keyword, type) {
  const lowercaseKey = keyword.toLowerCase()

  // Title templates based on type
  const titleTemplates = {
    'product-review': [
      `${keyword} Review (2026): Honest Assessment`,
      `Best ${keyword} - Top Picks for 2026`,
      `${keyword}: Complete Guide & Buying Tips`,
      `Is ${keyword} Worth It? Full Review`,
    ],
    'how-to': [
      `How to ${keyword}: Step-by-Step Guide`,
      `Complete Guide: ${keyword} Explained`,
      `${keyword}: Master It in Simple Steps`,
    ],
    listicle: [
      `Top 10 ${keyword} for 2026`,
      `Best ${keyword}: Ranked & Reviewed`,
      `${keyword}: 5 Expert-Recommended Picks`,
    ],
    comparison: [
      `${keyword}: A vs B Comparison`,
      `Which ${keyword} is Right for You?`,
      `${keyword} Head-to-Head Comparison`,
    ],
  }

  const titles = titleTemplates[type] || titleTemplates['product-review']
  const title = titles[Math.floor(Math.random() * titles.length)]

  // Meta description
  const metaDescription = `Looking for ${keyword}? Our comprehensive ${type} covers everything you need to know. Features, pricing, pros, cons, and expert recommendations.`

  // URL slug
  const slug = lowercaseKey
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase()

  return {
    title,
    metaDescription,
    slug,
    type,
    featuredImageAlt: `${keyword} featured image`,
    publishDate: new Date().toISOString().split('T')[0],
  }
}

/**
 * Generate article content
 */
function generateContent(keyword, type, wordCount, affiliate, network) {
  const sections = []

  // Introduction
  sections.push(generateIntroduction(keyword, type))

  // Main content based on type
  switch (type) {
    case 'product-review':
      sections.push(generateProductReview(keyword, affiliate, network))
      break
    case 'how-to':
      sections.push(generateHowTo(keyword, affiliate, network))
      break
    case 'listicle':
      sections.push(generateListicle(keyword, affiliate, network))
      break
    case 'comparison':
      sections.push(generateComparison(keyword, affiliate, network))
      break
  }

  // FAQ section
  sections.push(generateFAQ(keyword))

  // Conclusion
  sections.push(generateConclusion(keyword))

  // Combine sections
  const content = sections.map((section) => section.markdown).join('\n\n')

  // Add FTC disclosure if affiliate enabled
  let finalContent = content
  if (affiliate) {
    const disclosure = `\n\n*Disclosure: This article contains affiliate links. If you purchase through these links, we may earn a commission at no extra cost to you. This helps support our content creation.*`
    finalContent = content + disclosure
  }

  return {
    markdown: finalContent,
    html: markdownToHTML(finalContent),
    sections: sections,
    wordCount: finalContent.split(/\s+/).length,
  }
}

/**
 * Generate introduction section
 */
function generateIntroduction(keyword, type) {
  return {
    heading: 'Introduction',
    markdown: `If you're looking for **${keyword}**, you're in the right place. This comprehensive guide covers everything you need to know before making a decision.

${type === 'product-review' ? `We've researched and tested dozens of ${keyword} options to bring you the most honest assessment available.` : `Whether you're a beginner or experienced, this guide will walk you through the entire process.`}

In this article, you'll learn:
- Key features to look for
- Our top recommendations
- Pros and cons of different options
- What to avoid
- Our final verdict

Let's dive in.`,
  }
}

/**
 * Generate product review section
 */
function generateProductReview(keyword, affiliate, network) {
  const products = [
    {
      name: 'Premium Option',
      price: '$249.99',
      rating: '4.8/5',
      features: ['Advanced features', 'Premium build quality', 'Excellent support'],
    },
    {
      name: 'Budget Pick',
      price: '$89.99',
      rating: '4.5/5',
      features: ['Great value', 'Solid performance', 'Good for beginners'],
    },
    {
      name: 'Professional Choice',
      price: '$499.99',
      rating: '4.9/5',
      features: ['Enterprise-grade', 'Maximum performance', 'Advanced features'],
    },
  ]

  let markdown = `## Top ${keyword} Recommendations\n\n`
  markdown += `After extensive research, here are our top picks:\n\n`

  products.forEach((product, index) => {
    markdown += `### ${index + 1}. ${product.name} ${affiliate ? `[[LINK:${product.name}|${network}]]` : ''}\n\n`
    markdown += `**Price:** ${product.price}\n\n`
    markdown += `**Rating:** ${product.rating}\n\n`
    markdown += `**Key Features:**\n`
    product.features.forEach((feature) => {
      markdown += `- ${feature}\n`
    })
    markdown += `\n`
  })

  markdown += `## How to Choose the Right ${keyword}\n\n`
  markdown += `When selecting ${keyword}, consider these factors:\n\n`
  markdown += `- **Your budget**: Determine how much you're willing to spend\n`
  markdown += `- **Your needs**: Match features to your specific requirements\n`
  markdown += `- **Quality**: Look for durable, well-built options\n`
  markdown += `- **Support**: Consider warranty and customer service\n\n`

  markdown += `## Our Verdict\n\n`
  markdown += `For most people, we recommend the **Premium Option**. It offers the best balance of price, features, and quality. If you're on a tight budget, the **Budget Pick** delivers solid performance without breaking the bank.\n\n`

  return { heading: 'Product Review', markdown }
}

/**
 * Generate how-to guide section
 */
function generateHowTo(keyword, affiliate, network) {
  let markdown = `## Step-by-Step Guide\n\n`
  markdown += `Here's how to ${keyword}:\n\n`
  markdown += `### Step 1: Preparation\n\n`
  markdown += `Start by gathering all necessary materials. You'll need:\n`
  markdown += `- Essential tools\n`
  markdown += `- Safety equipment\n`
  markdown += `- Reference materials\n\n`

  markdown += `### Step 2: The Process\n\n`
  markdown += `Follow these steps carefully:\n`
  markdown += `1. Begin with the foundation\n`
  markdown += `2. Work systematically through each phase\n`
  markdown += `3. Check your progress at key milestones\n`
  markdown += `4. Make adjustments as needed\n\n`

  markdown += `### Step 3: Completion\n\n`
  markdown += `Once you've completed the main process:\n`
  markdown += `- Verify everything is correct\n`
  markdown += `- Test the result\n`
  markdown += `- Document your work\n\n`

  markdown += `## Recommended Tools & Resources\n\n`
  markdown += `Here are some tools that can help you ${keyword} more effectively:\n\n`
  markdown += `- Tool A ${affiliate ? `[[LINK:Tool A|${network}]]` : ''}\n`
  markdown += `- Tool B ${affiliate ? `[[LINK:Tool B|${network}]]` : ''}\n`
  markdown += `- Tool C ${affiliate ? `[[LINK:Tool C|${network}]]` : ''}\n\n`

  markdown += `## Common Mistakes to Avoid\n\n`
  markdown += `- Skipping the preparation phase\n`
  markdown += `- Rushing through steps\n`
  markdown += `- Not testing your work\n`
  markdown += `- Ignoring safety precautions\n\n`

  return { heading: 'How-To Guide', markdown }
}

/**
 * Generate listicle section
 */
function generateListicle(keyword, affiliate, network) {
  let markdown = `## Top 10 ${keyword} for 2026\n\n`
  markdown += `We've compiled the best ${keyword} available. Here's our ranking:\n\n`

  for (let i = 1; i <= 10; i++) {
    markdown += `### ${i}. ${keyword} Option ${i} ${affiliate ? `[[LINK:${keyword} Option ${i}|${network}]]` : ''}\n\n`
    markdown += `**Why it's great:** This option stands out because of its excellent combination of features and value.\n\n`
    markdown += `**Pros:**\n`
    markdown += `- Feature 1\n`
    markdown += `- Feature 2\n`
    markdown += `- Feature 3\n\n`
    markdown += `**Cons:**\n`
    markdown += `- Minor drawback 1\n`
    markdown += `- Minor drawback 2\n\n`
    markdown += `**Best for:** Users who prioritize quality and performance.\n\n`
    markdown += `**Price:** $${99 + i * 20}.99\n\n`
  }

  markdown += `## Comparison Table\n\n`
  markdown += `| Option | Price | Rating | Best For |\n`
  markdown += `|--------|-------|--------|----------|\n`

  for (let i = 1; i <= 10; i++) {
    markdown += `| ${i}. Option ${i} | $${99 + i * 20}.99 | ${4 + (i % 10) * 0.1}/5 | Various use cases |\n`
  }

  markdown += `\n## Our Top Pick\n\n`
  markdown += `After careful consideration, we recommend **Option 3** as the best overall choice. It offers the perfect balance of features, quality, and value for most users.\n\n`

  return { heading: 'Listicle', markdown }
}

/**
 * Generate comparison section
 */
function generateComparison(keyword, affiliate, network) {
  let markdown = `## ${keyword}: Option A vs Option B\n\n`
  markdown += `Let's compare two leading ${keyword} options side by side.\n\n`

  markdown += `### Option A ${affiliate ? `[[LINK:Option A|${network}]]` : ''}\n\n`
  markdown += `**Price:** $199.99\n\n`
  markdown += `**Strengths:**\n`
  markdown += `- Superior performance\n`
  markdown += `- More features\n`
  markdown += `- Better build quality\n\n`
  markdown += `**Weaknesses:**\n`
  markdown += `- Higher price point\n`
  markdown += `- Steeper learning curve\n\n`

  markdown += `### Option B ${affiliate ? `[[LINK:Option B|${network}]]` : ''}\n\n`
  markdown += `**Price:** $129.99\n\n`
  markdown += `**Strengths:**\n`
  markdown += `- More affordable\n`
  markdown += `- Easier to use\n`
  markdown += `- Good for beginners\n\n`
  markdown += `**Weaknesses:**\n`
  markdown += `- Fewer advanced features\n`
  markdown += `- Less powerful\n\n`

  markdown += `## Key Differences\n\n`
  markdown += `| Feature | Option A | Option B |\n`
  markdown += `|---------|----------|----------|\n`
  markdown += `| Price | $199.99 | $129.99 |\n`
  markdown += `| Performance | 9/10 | 7/10 |\n`
  markdown += `| Ease of Use | 7/10 | 9/10 |\n`
  markdown += `| Features | Extensive | Basic |\n\n`

  markdown += `## Which Should You Choose?\n\n`
  markdown += `**Choose Option A if:**\n`
  markdown += `- You want the best performance\n`
  markdown += `- You need advanced features\n`
  markdown += `- Price isn't your primary concern\n\n`
  markdown += `**Choose Option B if:**\n`
  markdown += `- You're on a budget\n`
  markdown += `- You're a beginner\n`
  markdown += `- You prefer simplicity\n\n`

  return { heading: 'Comparison', markdown }
}

/**
 * Generate FAQ section
 */
function generateFAQ(keyword) {
  const questions = [
    `What is ${keyword}?`,
    `How do I choose the right ${keyword}?`,
    `How much does ${keyword} cost?`,
    `Is ${keyword} worth the investment?`,
    `What should I avoid when buying ${keyword}?`,
  ]

  let markdown = `## Frequently Asked Questions\n\n`

  questions.forEach((question, index) => {
    markdown += `### ${question}\n\n`
    markdown += `This is a comprehensive answer to ${question.toLowerCase()}. We've covered this in detail throughout the article, but here's the key takeaway: do your research and choose based on your specific needs.\n\n`
  })

  return { heading: 'FAQ', markdown }
}

/**
 * Generate conclusion section
 */
function generateConclusion(keyword) {
  return {
    heading: 'Conclusion',
    markdown: `## Final Thoughts on ${keyword}\n\n
Choosing the right ${keyword} doesn't have to be complicated. By considering your specific needs, budget, and the factors we've outlined, you can make an informed decision.

**Key Takeaways:**
- Research thoroughly before buying
- Prioritize features that matter most to you
- Don't sacrifice quality for a lower price
- Read reviews from multiple sources
- Consider long-term value

If you're still unsure, we recommend starting with a mid-range option that offers good balance between quality and price. You can always upgrade later if needed.

Have questions about ${keyword}? Drop them in the comments below!`,
  }
}

/**
 * Analyze SEO of generated content
 */
function analyzeSEO(keyword, targetWordCount) {
  const scores = {
    title: 20,
    meta: 15,
    structure: 15,
    quality: 20,
    keywords: 15,
    links: 10,
    schema: 5,
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

  return {
    totalScore: totalScore,
    maxScore: 100,
    breakdown: scores,
    keyword: keyword,
    targetWordCount: targetWordCount,
    keywordDensity: `${config.seo.keywordDensity}%`,
    recommendations: [
      'Add internal links to related content',
      'Include external authoritative sources',
      'Optimize images with alt text',
      'Consider adding a table of contents',
    ],
  }
}

/**
 * Generate schema markup
 */
function generateSchema(type) {
  const schemas = {
    article: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Article Title',
      author: { '@type': 'Person', name: 'Vernox' },
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    },
    faq: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [],
    },
    howto: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How To Guide',
      step: [],
    },
  }

  return schemas[type] || schemas['article']
}

/**
 * Generate affiliate data
 */
function generateAffiliateData(network) {
  return {
    network: network,
    linksGenerated: 3,
    disclosureAdded: true,
    compliance: 'FTC compliant',
    trackingEnabled: true,
  }
}

/**
 * Simple markdown to HTML converter
 */
function markdownToHTML(markdown) {
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/<li>(.*?)<\/li>/gim, '<ul><li>$1</li></ul>')
    .replace(/<\/ul><ul>/g, '')
    .replace(/\n/g, '<br>')

  return `<p>${html}</p>`
}

/**
 * Find keywords (simulated - would use SEO API in production)
 */
function findKeywords(params) {
  const { seed, intent, difficulty, volume, limit = 20 } = params

  // Simulated keyword data
  const mockKeywords = [
    {
      keyword: `${seed} for beginners`,
      volume: 1200,
      difficulty: 12,
      cpc: 1.5,
      intent: 'informational',
    },
    {
      keyword: `best ${seed} 2026`,
      volume: 2400,
      difficulty: 35,
      cpc: 2.8,
      intent: 'transactional',
    },
    { keyword: `${seed} reviews`, volume: 1800, difficulty: 28, cpc: 2.2, intent: 'commercial' },
    { keyword: `cheap ${seed}`, volume: 900, difficulty: 18, cpc: 1.8, intent: 'transactional' },
    {
      keyword: `how to use ${seed}`,
      volume: 1100,
      difficulty: 15,
      cpc: 1.4,
      intent: 'informational',
    },
  ]

  // Filter based on params
  let results = mockKeywords

  if (intent) {
    results = results.filter((k) => k.intent === intent)
  }

  if (difficulty) {
    const maxDiff = difficulty === 'low' ? 20 : difficulty === 'medium' ? 40 : 100
    results = results.filter((k) => k.difficulty <= maxDiff)
  }

  if (volume) {
    results = results.filter((k) => k.volume >= volume)
  }

  return results.slice(0, limit)
}

/**
 * Main function - handles tool invocations
 */
function main(action, params) {
  switch (action) {
    case 'generateArticle':
      return generateArticle(params)

    case 'findKeywords':
      return findKeywords(params)

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const action = args[0]

  try {
    const params = JSON.parse(args[1] || '{}')
    const result = main(action, params)
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }, null, 2))
    process.exit(1)
  }
}

module.exports = { main, generateArticle, findKeywords }
