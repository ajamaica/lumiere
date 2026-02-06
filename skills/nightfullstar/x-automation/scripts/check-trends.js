#!/usr/bin/env node
/**
 * Fetch trending topics from X using OpenClaw browser control
 * Usage: Call from OpenClaw agent
 */

const fs = require('fs')
const path = require('path')

// This script outputs instructions for the OpenClaw agent
// The agent will use the browser tool to scrape trends

console.log('📋 X Trend Scraper Instructions for OpenClaw Agent')
console.log('==================================================\n')

console.log('Use the browser tool to:')
console.log('1. Navigate to https://x.com/explore/tabs/trending')
console.log('2. Take a snapshot with refs to get trending topics')
console.log('3. Extract topic names and tweet counts')
console.log('4. Save to data/latest-trends.json')
console.log('\nThen call this script again with trends saved.')

// Check if trends already exist
const trendsFile = path.join(__dirname, '..', 'data', 'latest-trends.json')

if (fs.existsSync(trendsFile)) {
  const data = JSON.parse(fs.readFileSync(trendsFile, 'utf8'))

  console.log('\n✅ Found existing trends:')
  console.log(`   Fetched: ${data.timestamp}`)
  console.log(`   Count: ${data.trends.length} topics\n`)

  data.trends.slice(0, 5).forEach((trend, i) => {
    console.log(`${i + 1}. ${trend.topic} (${trend.tweets || 'N/A'})`)
  })

  console.log('\n💡 Ready to generate tweet ideas from these trends!')
} else {
  console.log('\n⚠️  No trends file found yet.')
  console.log('    Agent needs to scrape trends first using browser tool.')
}
