#!/usr/bin/env node
/**
 * Bookmark Analyzer
 * Uses LLM to extract insights from bookmarked content
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { getLicenseStatus, TIERS } from './scripts/license.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load configuration
const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'))

// Extract URLs from tweet text
function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s]+/g
  const matches = text.match(urlRegex) || []
  return matches
}

// Fetch full content from URLs
function fetchUrlContent(url) {
  console.error(`Fetching content from: ${url}`)

  // Skip t.co URLs - they're just redirects
  if (url.includes('t.co')) {
    return null
  }

  try {
    // Use curl with user agent to avoid blocks, limit content size
    const cmd = `curl -L -s -A "Mozilla/5.0" --max-time 10 "${url}" | head -c 100000`
    const content = execSync(cmd, { encoding: 'utf8', timeout: 15000 })

    // Basic HTML cleanup - extract text content
    const cleaned = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return cleaned.substring(0, 5000) // Limit to 5000 chars
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message)
    return null
  }
}

// Build analysis prompt
function buildAnalysisPrompt(bookmark, urlContents) {
  const contextProjects = config.contextProjects.join(', ')

  let contentSection = ''
  if (urlContents.length > 0) {
    contentSection = `\n**Referenced Content:**\n${urlContents.join('\n\n---\n\n')}`
  }

  return `Analyze this bookmarked content and extract actionable insights.

**Tweet:**
Author: @${bookmark.author.username} (${bookmark.author.name})
Text: ${bookmark.text}
Engagement: ${bookmark.likeCount} likes, ${bookmark.retweetCount} retweets
Posted: ${bookmark.createdAt}
${contentSection}

**Context Projects:**
${contextProjects}

**Extract:**
1. **Key Concepts**: Main ideas, technologies, patterns mentioned
2. **Actionable Items**: Specific code snippets, strategies, tools, or techniques that can be implemented
3. **Implementation Suggestions**: How these could be applied to the context projects
4. **Relevance**: Which context projects this relates to and why
5. **Priority**: High/Medium/Low based on potential impact and relevance

**Format your response as valid JSON ONLY (no markdown, no extra text):**
{
  "summary": "Brief 1-2 sentence summary of the content",
  "keyConcepts": ["concept1", "concept2"],
  "actionableItems": ["specific actionable item 1", "specific actionable item 2"],
  "implementations": [
    {
      "project": "project name",
      "suggestion": "specific implementation idea",
      "effort": "low|medium|high"
    }
  ],
  "relevantProjects": ["project1", "project2"],
  "priority": "high|medium|low",
  "hasActionableInsights": true|false
}`
}

// Call LLM via OpenClaw CLI
function callLLM(prompt, bookmark) {
  // Check if LLM analysis is available for this tier
  const licenseStatus = getLicenseStatus()
  const tier = TIERS[licenseStatus.tier]

  if (!tier.llmAnalysis) {
    console.error('⚠️  LLM analysis disabled on Free tier. Using fallback heuristics.')
    console.error('   Upgrade to Pro for full AI-powered analysis: npm run license:upgrade')
    return createFallbackAnalysis(bookmark)
  }

  console.error('Calling LLM for analysis...')

  try {
    // Write prompt to temp file
    const tempFile = `/tmp/bookmark-analysis-${Date.now()}.txt`
    writeFileSync(tempFile, prompt)

    // Try to use openclaw CLI to invoke LLM
    // This assumes openclaw command is available and configured
    // For MVP, we'll use fallback since openclaw might not have 'ask' command
    const cmd = `openclaw ask --model gpt-4o-mini --format json "$(cat ${tempFile})" 2>/dev/null || echo '{"error": "LLM unavailable"}'`

    const result = execSync(cmd, {
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    })

    // Clean up temp file
    try {
      execSync(`rm ${tempFile}`)
    } catch (e) {}

    // Parse and validate response
    const parsed = JSON.parse(result)

    // If LLM unavailable, return fallback
    if (parsed.error) {
      console.error('LLM unavailable, using fallback analysis')
      return createFallbackAnalysis(bookmark)
    }

    return parsed
  } catch (error) {
    console.error('Error calling LLM:', error.message)
    return createFallbackAnalysis(bookmark)
  }
}

// Create fallback analysis without LLM
function createFallbackAnalysis(bookmark) {
  // Simple heuristic-based analysis
  const text = bookmark.text.toLowerCase()
  const author = bookmark.author.username

  // Check for technical keywords
  const hasTech = /\b(api|code|algorithm|bot|ai|ml|automation|tool|framework|library)\b/i.test(text)
  const hasStrategy = /\b(strategy|approach|method|technique|system|process)\b/i.test(text)
  const hasRevenue = /\b(revenue|money|profit|earn|monetize|sell|price)\b/i.test(text)

  let priority = 'low'
  let relevantProjects = []
  let hasActionable = false

  if (hasTech) {
    relevantProjects.push('automation')
    priority = 'medium'
    hasActionable = true
  }
  if (hasStrategy && hasTech) {
    relevantProjects.push('trading bot', 'agent memory')
    priority = 'high'
  }
  if (hasRevenue) {
    relevantProjects.push('revenue generation')
    priority = 'high'
    hasActionable = true
  }

  // High engagement = potentially valuable
  if (bookmark.likeCount > 500) {
    priority = priority === 'low' ? 'medium' : 'high'
    hasActionable = true
  }

  return {
    summary: `Bookmarked tweet from @${author} with ${bookmark.likeCount} likes. ${hasTech ? 'Contains technical content.' : ''} ${hasRevenue ? 'Discusses revenue/monetization.' : ''}`,
    keyConcepts: [
      hasTech ? 'technical implementation' : null,
      hasStrategy ? 'strategic approach' : null,
      hasRevenue ? 'revenue generation' : null,
    ].filter(Boolean),
    actionableItems: hasActionable
      ? ['Review content for implementation ideas', 'Analyze referenced links or resources']
      : [],
    implementations:
      relevantProjects.length > 0
        ? [
            {
              project: relevantProjects[0],
              suggestion: 'Research and evaluate applicability',
              effort: 'medium',
            },
          ]
        : [],
    relevantProjects,
    priority,
    hasActionableInsights: hasActionable,
    note: 'Fallback analysis (LLM unavailable)',
  }
}

// Main analysis function
async function analyze(bookmark) {
  console.error(`\nAnalyzing bookmark: ${bookmark.id} from @${bookmark.author.username}`)

  // Extract and fetch URLs
  const urls = extractUrls(bookmark.text)
  const urlContents = []

  console.error(`Found ${urls.length} URLs in tweet`)

  for (const url of urls.slice(0, 3)) {
    // Limit to 3 URLs to avoid timeouts
    const content = fetchUrlContent(url)
    if (content && content.length > 100) {
      urlContents.push(`URL: ${url}\nContent: ${content}`)
    }
  }

  console.error(`Successfully fetched ${urlContents.length} URL contents`)

  // Build prompt
  const prompt = buildAnalysisPrompt(bookmark, urlContents)

  // Get LLM analysis (or fallback)
  const analysis = callLLM(prompt, bookmark)

  console.error(
    `Analysis complete: ${analysis.priority} priority, ${analysis.hasActionableInsights ? 'has' : 'no'} actionable insights`,
  )

  return analysis
}

// CLI entry point
async function main() {
  try {
    // Read bookmark JSON from file path argument
    const bookmarkFile = process.argv[2]
    if (!bookmarkFile) {
      console.error('Usage: node analyzer.js <bookmark-json-file>')
      process.exit(1)
    }

    const bookmarkJson = readFileSync(bookmarkFile, 'utf8')
    const bookmark = JSON.parse(bookmarkJson)
    const analysis = await analyze(bookmark)

    // Output analysis as JSON (to stdout, not stderr)
    console.log(JSON.stringify(analysis, null, 2))
  } catch (error) {
    console.error('Analysis failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
