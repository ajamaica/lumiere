/**
 * SEO-Article-Gen Test Suite
 */

const { generateArticle, findKeywords } = require('./index.js')

console.log('=== SEO-Article-Gen Test Suite ===\n')

// Test 1: Find Keywords
console.log('Test 1: Keyword Research')
const keywords = findKeywords({
  seed: 'wireless headphones',
  intent: 'transactional',
  difficulty: 'medium',
  limit: 10,
})
console.log(`Found ${keywords.length} keywords:`)
keywords.forEach((k) => {
  console.log(`  - ${k.keyword}`)
  console.log(`    Volume: ${k.volume}, Difficulty: ${k.difficulty}, CPC: $${k.cpc}`)
})
console.log('')

// Test 2: Generate Product Review Article
console.log('Test 2: Generate Product Review Article')
const productReview = generateArticle({
  keyword: 'best wireless headphones 2026',
  type: 'product-review',
  wordCount: 2000,
  affiliate: true,
  network: 'amazon',
})

console.log('Metadata:')
console.log(`  Title: ${productReview.metadata.title}`)
console.log(`  Slug: ${productReview.metadata.slug}`)
console.log(`  Meta Description: ${productReview.metadata.metaDescription.substring(0, 100)}...`)

console.log('\nContent Stats:')
console.log(`  Word Count: ${productReview.content.wordCount}`)
console.log(`  Sections: ${productReview.content.sections.length}`)
console.log(`  Section 1: ${productReview.content.sections[0].heading}`)

console.log('\nSEO Score:')
console.log(`  Total: ${productReview.seo.totalScore}/100`)
console.log(`  Breakdown:`, productReview.seo.breakdown)

console.log('\nAffiliate Data:')
console.log(`  Network: ${productReview.affiliate.network}`)
console.log(`  Links Generated: ${productReview.affiliate.linksGenerated}`)
console.log(`  Compliance: ${productReview.affiliate.compliance}`)

console.log('\nContent Preview (first 500 chars):')
console.log(productReview.content.markdown.substring(0, 500) + '...')
console.log('')

// Test 3: Generate How-To Article
console.log('Test 3: Generate How-To Guide')
const howTo = generateArticle({
  keyword: 'setup wireless headphones',
  type: 'how-to',
  wordCount: 1500,
  affiliate: false,
})
console.log(`Generated: ${howTo.metadata.title}`)
console.log(`Word count: ${howTo.content.wordCount}`)
console.log('')

// Test 4: Generate Listicle
console.log('Test 4: Generate Listicle')
const listicle = generateArticle({
  keyword: 'budget headphones',
  type: 'listicle',
  wordCount: 2500,
  affiliate: true,
  network: 'amazon',
})
console.log(`Generated: ${listicle.metadata.title}`)
console.log(`Contains ${listicle.content.sections.length} sections`)
console.log('')

// Test 5: Generate Comparison
console.log('Test 5: Generate Comparison Article')
const comparison = generateArticle({
  keyword: 'over-ear vs on-ear headphones',
  type: 'comparison',
  wordCount: 1800,
  affiliate: true,
  network: 'amazon',
})
console.log(`Generated: ${comparison.metadata.title}`)
console.log(`SEO Score: ${comparison.seo.totalScore}/100`)
console.log('')

console.log('=== All Tests Complete ===')
