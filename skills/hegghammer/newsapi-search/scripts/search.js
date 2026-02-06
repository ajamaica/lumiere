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
Usage: node search.js <query> [options]

EVERYTHING ENDPOINT (default):
  --hours N          Search last N hours
  --days N           Search last N days (default: 7)
  --weeks N          Search last N weeks
  --months N         Search last N months
  --from DATE        Start date (YYYY-MM-DD)
  --to DATE          End date (YYYY-MM-DD)
  --limit N          Max results (default: 10, max: 100)
  --page N           Page number for pagination (default: 1)
  --in FIELDS        Search in: title, description, content (comma-separated)
  --title-only       Search only in article titles (qInTitle)
  --sources IDS      Comma-separated source IDs (max 20)
  --domains LIST     Include only these domains (comma-separated)
  --exclude LIST     Exclude these domains (comma-separated)
  --lang CODE        Language code (default: en, 'any' for all)
  --sort METHOD      Sort by: relevancy, date (publishedAt), popularity

TOP HEADLINES ENDPOINT:
  --headlines        Use top-headlines endpoint
  --country CODE     2-letter country code (e.g., us, gb, de)
  --category CAT     Category: business, entertainment, general, health, science, sports, technology

Note: --headlines cannot mix --country/--category with --sources

Examples:
  node search.js "manhunt" --days 3 --limit 5
  node search.js "manhunt" --sources bbc-news,cnn --lang en
  node search.js "manhunt" --domains nytimes.com,bbc.co.uk
  node search.js "manhunt" --title-only --sort date
  node search.js "trump" --headlines --country us --category politics
`)
}

function parseArgs(args) {
  const options = {
    query: null,
    endpoint: 'everything',
    timeWindow: { type: 'days', value: 7 },
    limit: 10,
    page: 1,
    lang: 'en',
    sort: 'relevancy',
    searchIn: null,
    titleOnly: false,
    sources: null,
    domains: null,
    excludeDomains: null,
    country: null,
    category: null,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      showUsage()
      process.exit(0)
    } else if (arg === '--headlines') {
      options.endpoint = 'top-headlines'
    } else if (arg === '--hours' && args[i + 1]) {
      options.timeWindow = { type: 'hours', value: parseInt(args[++i]) }
    } else if (arg === '--days' && args[i + 1]) {
      options.timeWindow = { type: 'days', value: parseInt(args[++i]) }
    } else if (arg === '--weeks' && args[i + 1]) {
      options.timeWindow = { type: 'weeks', value: parseInt(args[++i]) }
    } else if (arg === '--months' && args[i + 1]) {
      options.timeWindow = { type: 'months', value: parseInt(args[++i]) }
    } else if (arg === '--from' && args[i + 1]) {
      options.fromDate = args[++i]
    } else if (arg === '--to' && args[i + 1]) {
      options.toDate = args[++i]
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = Math.min(parseInt(args[++i]), 100)
    } else if (arg === '--page' && args[i + 1]) {
      options.page = parseInt(args[++i])
    } else if (arg === '--lang' && args[i + 1]) {
      options.lang = args[++i]
    } else if (arg === '--sort' && args[i + 1]) {
      const sortVal = args[++i]
      options.sort = sortVal === 'date' ? 'publishedAt' : sortVal
    } else if (arg === '--in' && args[i + 1]) {
      options.searchIn = args[++i]
    } else if (arg === '--title-only') {
      options.titleOnly = true
    } else if (arg === '--sources' && args[i + 1]) {
      options.sources = args[++i]
    } else if (arg === '--domains' && args[i + 1]) {
      options.domains = args[++i]
    } else if (arg === '--exclude' && args[i + 1]) {
      options.excludeDomains = args[++i]
    } else if (arg === '--country' && args[i + 1]) {
      options.country = args[++i]
    } else if (arg === '--category' && args[i + 1]) {
      options.category = args[++i]
    } else if (!arg.startsWith('--') && !options.query) {
      options.query = arg
    }
  }

  return options
}

function calculateDateRange(timeWindow) {
  const now = new Date()
  let fromDate = new Date()

  switch (timeWindow.type) {
    case 'hours':
      fromDate.setHours(now.getHours() - timeWindow.value)
      break
    case 'days':
      fromDate.setDate(now.getDate() - timeWindow.value)
      break
    case 'weeks':
      fromDate.setDate(now.getDate() - timeWindow.value * 7)
      break
    case 'months':
      fromDate.setMonth(now.getMonth() - timeWindow.value)
      break
  }

  return {
    from: fromDate.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  }
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

async function searchEverything(query, options = {}) {
  if (!API_KEY) {
    throw new Error('NEWSAPI_KEY not found in environment. Add it to ~/.openclaw/.env')
  }

  let fromDate, toDate
  if (options.fromDate && options.toDate) {
    fromDate = options.fromDate
    toDate = options.toDate
  } else if (options.timeWindow) {
    const range = calculateDateRange(options.timeWindow)
    fromDate = range.from
    toDate = range.to
  }

  const params = new URLSearchParams({
    pageSize: options.limit?.toString() || '10',
    page: options.page?.toString() || '1',
    sortBy: options.sort || 'relevancy',
    apiKey: API_KEY,
  })

  // Query parameter: use qInTitle or q
  if (query) {
    if (options.titleOnly) {
      params.append('qInTitle', query)
    } else {
      params.append('q', query)
    }
  }

  // Date filters
  if (fromDate) params.append('from', fromDate)
  if (toDate) params.append('to', toDate)

  // Language (skip if 'any' or headlines mode where it's not supported)
  if (options.lang && options.lang !== 'any') {
    params.append('language', options.lang)
  }

  // Search fields
  if (options.searchIn) {
    params.append('searchIn', options.searchIn)
  }

  // Source and domain filters
  if (options.sources) {
    params.append('sources', options.sources)
  }
  if (options.domains) {
    params.append('domains', options.domains)
  }
  if (options.excludeDomains) {
    params.append('excludeDomains', options.excludeDomains)
  }

  const url = `https://newsapi.org/v2/everything?${params.toString()}`

  try {
    const data = await makeRequest(url)

    if (data.status === 'error') {
      throw new Error(`NewsAPI error: ${data.message || 'Unknown error'}`)
    }

    return {
      query,
      endpoint: 'everything',
      timeWindow: options.timeWindow,
      fromDate,
      toDate,
      page: options.page || 1,
      language: options.lang || 'any',
      sortBy: options.sort || 'relevancy',
      filters: {
        sources: options.sources || null,
        domains: options.domains || null,
        excludeDomains: options.excludeDomains || null,
      },
      totalResults: data.totalResults || 0,
      returnedResults: data.articles?.length || 0,
      results: (data.articles || []).map((article) => ({
        title: article.title,
        url: article.url,
        description: article.description,
        content: article.content,
        source: article.source?.name || 'Unknown',
        author: article.author,
        publishedAt: article.publishedAt,
        urlToImage: article.urlToImage,
      })),
    }
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`)
  }
}

async function searchHeadlines(query, options = {}) {
  if (!API_KEY) {
    throw new Error('NEWSAPI_KEY not found in environment. Add it to ~/.openclaw/.env')
  }

  const params = new URLSearchParams({
    pageSize: options.limit?.toString() || '10',
    page: options.page?.toString() || '1',
    apiKey: API_KEY,
  })

  if (query) {
    params.append('q', query)
  }

  // Country and category (cannot mix with sources)
  if (options.country && !options.sources) {
    params.append('country', options.country)
  }
  if (options.category && !options.sources) {
    params.append('category', options.category)
  }
  if (options.sources) {
    params.append('sources', options.sources)
  }

  const url = `https://newsapi.org/v2/top-headlines?${params.toString()}`

  try {
    const data = await makeRequest(url)

    if (data.status === 'error') {
      throw new Error(`NewsAPI error: ${data.message || 'Unknown error'}`)
    }

    return {
      query,
      endpoint: 'top-headlines',
      country: options.country || null,
      category: options.category || null,
      page: options.page || 1,
      totalResults: data.totalResults || 0,
      returnedResults: data.articles?.length || 0,
      results: (data.articles || []).map((article) => ({
        title: article.title,
        url: article.url,
        description: article.description,
        content: article.content,
        source: article.source?.name || 'Unknown',
        author: article.author,
        publishedAt: article.publishedAt,
        urlToImage: article.urlToImage,
      })),
    }
  } catch (error) {
    throw new Error(`Headlines search failed: ${error.message}`)
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    showUsage()
    process.exit(1)
  }

  const options = parseArgs(args)

  // Validate API key
  if (!API_KEY) {
    console.error('Error: NEWSAPI_KEY not found')
    console.error('Add NEWSAPI_KEY=your_key to ~/.openclaw/.env')
    process.exit(1)
  }

  try {
    let results

    if (options.endpoint === 'top-headlines') {
      results = await searchHeadlines(options.query, {
        country: options.country,
        category: options.category,
        sources: options.sources,
        limit: options.limit,
        page: options.page,
      })
    } else {
      results = await searchEverything(options.query, options)
    }

    console.log(JSON.stringify(results, null, 2))
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  searchEverything,
  searchHeadlines,
  calculateDateRange,
  makeRequest,
}
