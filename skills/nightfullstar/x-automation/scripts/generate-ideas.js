#!/usr/bin/env node
/**
 * Generate tweet ideas from trending topics
 * Called by OpenClaw agent
 *
 * Usage: node scripts/generate-ideas.js
 */

const fs = require('fs')
const path = require('path')

async function main() {
  const trendsFile = path.join(__dirname, '..', 'data', 'latest-trends.json')

  if (!fs.existsSync(trendsFile)) {
    console.error('❌ No trends file found. Run auto-tweet.js first.')
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(trendsFile, 'utf8'))
  const trends = data.trends

  console.log('🔥 Top 5 Trending Topics:')
  console.log('========================\n')

  trends.slice(0, 5).forEach((trend, i) => {
    console.log(`${i + 1}. ${trend.topic}`)
    console.log(`   Volume: ${trend.tweets}\n`)
  })

  console.log('\n💡 Tweet Generation Guide:')
  console.log('==========================')
  console.log('Focus on: Crypto, Web3, your product, ETH, trending topics')
  console.log('Tone: Direct, opinionated, no corporate speak')
  console.log('Length: 150-250 chars (leave room for engagement)')
  console.log('Include: Hot takes, insights, product mentions (subtle)')
  console.log('\nAvoid: Generic platitudes, obvious statements, buzzwords')

  // Return trends as JSON for agent to process
  console.log('\n---TRENDS_JSON---')
  console.log(JSON.stringify(trends.slice(0, 5), null, 2))
  console.log('---END_TRENDS_JSON---')
}

main()
