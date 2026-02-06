#!/usr/bin/env node

const https = require('https')
const fs = require('fs')
const path = require('path')

// Load environment variables
function loadEnv() {
  const envPath = path.join(process.env.HOME, '.openclaw', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        process.env[match[1].trim()] = match[2].trim()
      }
    })
  }
}

loadEnv()

const API_KEY = process.env.NEWSAPI_KEY

function showUsage() {
  console.log(`
Usage: node sources.js [options]

List available news sources from NewsAPI.

Options:
  --country CODE     Filter by 2-letter country code (e.g., us, gb, de)
  --category CAT     Filter by category: business, entertainment, general, health, science, sports, technology
  --lang CODE        Filter by 2-letter language code (e.g., en, es, de)
  --json             Output raw JSON instead of formatted list

Examples:
  node sources.js
  node sources.js --country us
  node sources.js --category business --lang en
  node sources.js --json > sources.json
`)
}

function parseArgs(args) {
  const options = {
    country: null,
    category: null,
    language: null,
    json: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      showUsage()
      process.exit(0)
    } else if (arg === '--country' && args[i + 1]) {
      options.country = args[++i]
    } else if (arg === '--category' && args[i + 1]) {
      options.category = args[++i]
    } else if (arg === '--lang' && args[i + 1]) {
      options.language = args[++i]
    } else if (arg === '--json') {
      options.json = true
    }
  }

  return options
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = new URL(url)
    const requestOptions = {
      hostname: options.hostname,
      path: options.pathname + options.search,
      method: 'GET',
      headers: {
        'User-Agent': 'NewsAPISearch/1.0 (Research Tool)',
      },
    }

    const req = https.request(requestOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('Invalid JSON response'))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.end()
  })
}

async function getSources(filters = {}) {
  if (!API_KEY) {
    throw new Error('NEWSAPI_KEY not found in environment. Add it to ~/.openclaw/.env')
  }

  const params = new URLSearchParams({
    apiKey: API_KEY,
  })

  if (filters.country) {
    params.append('country', filters.country)
  }
  if (filters.category) {
    params.append('category', filters.category)
  }
  if (filters.language) {
    params.append('language', filters.language)
  }

  const url = `https://newsapi.org/v2/top-headlines/sources?${params.toString()}`

  try {
    const data = await makeRequest(url)

    if (data.status === 'error') {
      throw new Error(`NewsAPI error: ${data.message || 'Unknown error'}`)
    }

    return data.sources || []
  } catch (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`)
  }
}

function formatSources(sources) {
  // Group by country
  const byCountry = {}
  sources.forEach((source) => {
    const country = source.country?.toUpperCase() || 'Unknown'
    if (!byCountry[country]) {
      byCountry[country] = []
    }
    byCountry[country].push(source)
  })

  // Sort countries
  const sortedCountries = Object.keys(byCountry).sort()

  let output = `Found ${sources.length} sources\n`
  output += '='.repeat(50) + '\n\n'

  for (const country of sortedCountries) {
    output += `\n${country} (${byCountry[country].length} sources)\n`
    output += '-'.repeat(40) + '\n'

    // Sort sources alphabetically
    const sortedSources = byCountry[country].sort((a, b) => a.name.localeCompare(b.name))

    for (const source of sortedSources) {
      output += `  ${source.id}\n`
      output += `    Name: ${source.name}\n`
      output += `    Category: ${source.category || 'N/A'}\n`
      output += `    Language: ${source.language || 'N/A'}\n`
      output += `    URL: ${source.url}\n\n`
    }
  }

  return output
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    showUsage()
    process.exit(0)
  }

  const options = parseArgs(args)

  if (!API_KEY) {
    console.error('Error: NEWSAPI_KEY not found')
    console.error('Add NEWSAPI_KEY=your_key to ~/.openclaw/.env')
    process.exit(1)
  }

  try {
    const sources = await getSources({
      country: options.country,
      category: options.category,
      language: options.language,
    })

    if (options.json) {
      console.log(JSON.stringify(sources, null, 2))
    } else {
      console.log(formatSources(sources))
    }
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { getSources, makeRequest }
