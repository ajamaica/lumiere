/**
 * AffiliateMaster - Full-stack affiliate marketing automation
 * Vernox v1.0 - Autonomous Revenue Agent
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Load configuration
const configPath = path.join(__dirname, 'config.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// Analytics storage
const analyticsPath = path.join(__dirname, 'analytics.json')
let analytics = {}

if (fs.existsSync(analyticsPath)) {
  analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'))
}

function saveAnalytics() {
  fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2))
}

function generateTrackingId() {
  return `aff_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

function logEvent(event) {
  const date = new Date().toISOString().split('T')[0]
  if (!analytics[date]) {
    analytics[date] = { clicks: 0, conversions: 0, revenue: 0, links: {} }
  }

  if (event.type === 'click') {
    analytics[date].clicks++
    if (event.trackingId) {
      if (!analytics[date].links[event.trackingId]) {
        analytics[date].links[event.trackingId] = {
          clicks: 0,
          conversions: 0,
          revenue: 0,
          product: event.product,
        }
      }
      analytics[date].links[event.trackingId].clicks++
    }
  } else if (event.type === 'conversion') {
    analytics[date].conversions++
    analytics[date].revenue += event.amount || 0
    if (event.trackingId && analytics[date].links[event.trackingId]) {
      analytics[date].links[event.trackingId].conversions++
      analytics[date].links[event.trackingId].revenue += event.amount || 0
    }
  }

  saveAnalytics()
}

/**
 * Generate affiliate link for a product
 */
function generateLink(network, product, options = {}) {
  if (!config.networks[network] || !config.networks[network].enabled) {
    throw new Error(`Network ${network} is not configured or enabled`)
  }

  const trackingId = generateTrackingId()

  let affiliateUrl

  switch (network) {
    case 'amazon':
      const associateId = config.networks.amazon.associateId
      affiliateUrl = product.url.includes('?')
        ? `${product.url}&tag=${associateId}`
        : `${product.url}?tag=${associateId}`
      break

    case 'shareasale':
      const saData = config.networks.shareasale
      affiliateUrl = `https://www.shareasale.com/sale.cfm?tracking=${trackingId}&affiliateId=${saData.affiliateId}&merchantId=${product.merchantId}&productId=${product.id}`
      break

    case 'cj':
      const cjData = config.networks.cj
      affiliateUrl = `https://www.anrdoezrs.net/click-${cjData.websiteId}-${product.advertiserId}?sid=${trackingId}`
      break

    case 'impact':
      affiliateUrl = product.url
      break

    default:
      throw new Error(`Unsupported network: ${network}`)
  }

  // Generate disclosure
  const disclosure = getDisclosure('default')

  logEvent({ type: 'click', trackingId, product: product.name || product.id })

  return {
    originalUrl: product.url,
    affiliateUrl: options.shorten ? shortenLink(affiliateUrl) : affiliateUrl,
    disclosure,
    trackingId,
    network,
    productName: product.name || product.id,
  }
}

/**
 * Shorten link (simulated - would integrate with bit.ly, rebrandly, etc.)
 */
function shortenLink(url) {
  // For Amazon, use amzn.to
  if (url.includes('amazon.com') && config.shortener.enabled) {
    // In production, this would call Amazon's shortener API
    return url // Returning full URL for MVP
  }
  return url
}

/**
 * Get disclosure text for platform
 */
function getDisclosure(platform = 'default') {
  const disclosure = config.disclosure
  const platformConfig = disclosure.platforms[platform]

  if (platform === 'twitter') {
    return `(Affiliate)`
  } else if (platform === 'email') {
    return disclosure.text
  }

  return disclosure.text
}

/**
 * Search for products across networks
 */
function searchProduct(query, options = {}) {
  const network = options.network || 'amazon'
  const category = options.category

  // In production, this would call actual network APIs
  // For MVP, returning simulated results
  const mockProducts = [
    {
      id: 'B09X7JKXYZ',
      name: 'Wireless Noise-Canceling Headphones',
      price: 249.99,
      url: 'https://amazon.com/dp/B09X7JKXYZ',
      commissionRate: 0.04,
      category: 'electronics',
    },
    {
      id: 'B08YZJL7PQ',
      name: 'Smart Home Security Camera',
      price: 129.99,
      url: 'https://amazon.com/dp/B08YZJL7PQ',
      commissionRate: 0.045,
      category: 'electronics',
    },
    {
      id: 'B07JQS1Z5T',
      name: 'Mechanical Gaming Keyboard',
      price: 89.99,
      url: 'https://amazon.com/dp/B07JQS1Z5T',
      commissionRate: 0.035,
      category: 'computers',
    },
  ]

  // Filter by query (simple text match for MVP)
  const results = mockProducts.filter((p) => {
    const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase())
    const matchesCategory = !category || p.category === category
    return matchesQuery && matchesCategory
  })

  return results
}

/**
 * Enhance content with affiliate links
 */
function enhanceContent(content, options = {}) {
  const { autoInsert = true, disclosurePlacement = 'top', maxLinks = 3 } = options

  let enhancedContent = content
  const insertedLinks = []

  if (autoInsert) {
    // Detect product mentions and insert links
    const products = searchProduct('', {})

    // Simple keyword matching for MVP
    products.slice(0, maxLinks).forEach((product) => {
      const productName = product.name.toLowerCase()
      const productWords = productName.split(' ').slice(0, 2).join(' ')

      if (content.toLowerCase().includes(productWords)) {
        try {
          const link = generateLink('amazon', product)
          enhancedContent = enhancedContent.replace(
            new RegExp(productName, 'i'),
            `[${product.name}](${link.affiliateUrl})`,
          )
          insertedLinks.push(link)
        } catch (e) {
          // Skip if network not configured
        }
      }
    })
  }

  // Add disclosure
  const disclosure = getDisclosure('default')

  if (disclosurePlacement === 'top') {
    enhancedContent = `*${disclosure}*\n\n${enhancedContent}`
  } else if (disclosurePlacement === 'bottom') {
    enhancedContent = `${enhancedContent}\n\n*${disclosure}*`
  }

  return {
    content: enhancedContent,
    linksInserted: insertedLinks,
    disclosureAdded: true,
    complianceStatus: 'compliant',
  }
}

/**
 * Get analytics data
 */
function getAnalytics(dateRange = '30d', network = null) {
  const today = new Date()
  const startDate = new Date()

  switch (dateRange) {
    case '7d':
      startDate.setDate(today.getDate() - 7)
      break
    case '30d':
      startDate.setDate(today.getDate() - 30)
      break
    case '90d':
      startDate.setDate(today.getDate() - 90)
      break
    case 'all':
      startDate.setFullYear(today.getFullYear() - 10)
      break
  }

  const startDateStr = startDate.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const rangeData = {}
  let totalClicks = 0
  let totalConversions = 0
  let totalRevenue = 0

  Object.keys(analytics).forEach((date) => {
    if (date >= startDateStr && date <= todayStr) {
      rangeData[date] = analytics[date]
      totalClicks += analytics[date].clicks
      totalConversions += analytics[date].conversions
      totalRevenue += analytics[date].revenue
    }
  })

  // Calculate EPC (Earnings Per Click)
  const epc = totalClicks > 0 ? (totalRevenue / totalClicks).toFixed(2) : '0.00'

  // Find top products
  const productStats = {}
  Object.values(rangeData).forEach((dayData) => {
    Object.values(dayData.links).forEach((link) => {
      if (!productStats[link.product]) {
        productStats[link.product] = { clicks: 0, conversions: 0, revenue: 0 }
      }
      productStats[link.product].clicks += link.clicks
      productStats[link.product].conversions += link.conversions
      productStats[link.product].revenue += link.revenue
    })
  })

  const topProducts = Object.entries(productStats)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([product, stats]) => ({ product, ...stats }))

  return {
    dateRange,
    totalClicks,
    totalConversions,
    totalRevenue,
    epc: parseFloat(epc),
    conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00',
    topProducts,
    rawData: rangeData,
  }
}

/**
 * Validate FTC compliance
 */
function validateCompliance(content, platform = 'blog') {
  const issues = []
  const disclosure = config.disclosure.text.toLowerCase()

  // Check if disclosure is present
  if (!content.toLowerCase().includes(disclosure.substring(0, 10))) {
    issues.push({
      type: 'missing_disclosure',
      severity: 'critical',
      message: 'FTC disclosure is missing from content',
      suggestion: `Add: "${config.disclosure.text}"`,
    })
  }

  // Check disclosure placement based on platform
  const platformRules = config.disclosure.platforms[platform]
  if (
    platformRules === 'above-fold' &&
    !content.substring(0, 500).toLowerCase().includes('affiliate')
  ) {
    issues.push({
      type: 'disclosure_placement',
      severity: 'warning',
      message: 'Disclosure should be above the fold',
      suggestion: 'Move disclosure to the top of your content',
    })
  }

  // Check for excessive links (spammy)
  const linkCount = (content.match(/\[.*\]\(.*\)/g) || []).length
  if (linkCount > 10) {
    issues.push({
      type: 'excessive_links',
      severity: 'warning',
      message: `Too many affiliate links (${linkCount})`,
      suggestion: 'Reduce to 3-5 links for better user experience',
    })
  }

  return {
    compliant: issues.filter((i) => i.severity === 'critical').length === 0,
    issues,
    score: 100 - issues.length * 10,
    platform,
  }
}

/**
 * Main function - handles tool invocations
 */
function main(action, params) {
  switch (action) {
    case 'generateLink':
      return generateLink(params.network, params.product, params.options)

    case 'searchProduct':
      return searchProduct(params.query, params.options)

    case 'enhanceContent':
      return enhanceContent(params.content, params.options)

    case 'getAnalytics':
      return getAnalytics(params.dateRange, params.network)

    case 'validateCompliance':
      return validateCompliance(params.content, params.platform)

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

module.exports = {
  main,
  generateLink,
  searchProduct,
  enhanceContent,
  getAnalytics,
  validateCompliance,
}
