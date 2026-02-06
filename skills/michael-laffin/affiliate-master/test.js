/**
 * AffiliateMaster Test Suite
 */

const {
  generateLink,
  searchProduct,
  enhanceContent,
  getAnalytics,
  validateCompliance,
} = require('./index.js')

console.log('=== AffiliateMaster Test Suite ===\n')

// Test 1: Product Search
console.log('Test 1: Product Search')
const products = searchProduct('headphones')
console.log(`Found ${products.length} products:`)
products.forEach((p) =>
  console.log(`  - ${p.name} ($${p.price}, ${p.commissionRate * 100}% commission)`),
)
console.log('')

// Test 2: Generate Link
console.log('Test 2: Generate Affiliate Link')
try {
  const link = generateLink('amazon', products[0], { shorten: true })
  console.log('Generated link:')
  console.log(JSON.stringify(link, null, 2))
} catch (e) {
  console.log(`Note: ${e.message} (Network not configured - expected for MVP)`)
}
console.log('')

// Test 3: Enhance Content
console.log('Test 3: Enhance Content with Affiliate Links')
const content = `Check out these amazing wireless headphones! They have great sound quality and are perfect for work from home. The noise-canceling feature is excellent.`
const enhanced = enhanceContent(content, {
  autoInsert: true,
  disclosurePlacement: 'top',
  maxLinks: 2,
})
console.log('Original content:', content)
console.log('\nEnhanced content:', enhanced.content)
console.log(`\nLinks inserted: ${enhanced.linksInserted.length}`)
console.log(`Compliance status: ${enhanced.complianceStatus}`)
console.log('')

// Test 4: Validate Compliance
console.log('Test 4: FTC Compliance Validation')
const nonCompliant = 'Buy this product here! It is amazing!'
const validation = validateCompliance(nonCompliant, 'blog')
console.log('Content:', nonCompliant)
console.log('Compliance check:', validation.compliant)
console.log('Issues:', validation.issues.length)
validation.issues.forEach((issue) => {
  console.log(`  [${issue.severity.toUpperCase()}] ${issue.message}`)
})
console.log('')

// Test 5: Analytics
console.log('Test 5: Analytics')
const analytics = getAnalytics('30d')
console.log('30-day performance:')
console.log(`  Total clicks: ${analytics.totalClicks}`)
console.log(`  Total conversions: ${analytics.totalConversions}`)
console.log(`  Total revenue: $${analytics.totalRevenue.toFixed(2)}`)
console.log(`  EPC: $${analytics.epc}`)
console.log(`  Conversion rate: ${analytics.conversionRate}%`)
console.log('')

console.log('=== All Tests Complete ===')
