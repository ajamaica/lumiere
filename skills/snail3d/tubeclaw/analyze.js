#!/usr/bin/env node

/**
 * TubeClaw - YouTube Video Analyzer
 * Analyzes YouTube videos, extracts insights, removes fluff
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CONFIG = {
  tempDir: path.join(process.env.HOME, '.clawd-tubeclaw'),
  transcriptSkill: path.join(process.env.HOME, 'clawd', 'video-transcript-downloader'),
}

// Ensure temp dir exists
if (!fs.existsSync(CONFIG.tempDir)) {
  fs.mkdirSync(CONFIG.tempDir, { recursive: true })
}

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * Get transcript using video-transcript-downloader
 */
async function getTranscript(videoUrl) {
  console.log('📥 Fetching transcript...')

  const scriptPath = path.join(CONFIG.transcriptSkill, 'scripts', 'vtd.js')
  if (!fs.existsSync(scriptPath)) {
    throw new Error('video-transcript-downloader skill not found. Install it first.')
  }

  try {
    const output = execSync(`node "${scriptPath}" transcript --url "${videoUrl}"`, {
      encoding: 'utf8',
      timeout: 60000,
    })
    return output.trim()
  } catch (error) {
    console.error('❌ Failed to get transcript:', error.message)
    throw error
  }
}

/**
 * Clean transcript - remove ads, sponsorships, filler
 */
function cleanTranscript(transcript) {
  console.log('🧹 Cleaning transcript...')

  let cleaned = transcript

  // Remove common ad/sponsorship patterns
  const adPatterns = [
    /check out sentry at sentry\.io[^\.]*/gi,
    /head on over to[^\.]*sentry\.io[^\.]*/gi,
    /we've been using this tool for a long time[^\.]*/gi,
    /thanks to our sponsor[^\.]*/gi,
    /this episode is sponsored by[^\.]*/gi,
    /visit[^\.]*\.com[^\.]*for[^\.]*/gi,
    /use code[^\.]*for[^\.]*/gi,
    /\[music\]/gi,
    /\[applause\]/gi,
    /\[laughter\]/gi,
  ]

  for (const pattern of adPatterns) {
    cleaned = cleaned.replace(pattern, '')
  }

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  cleaned = cleaned.replace(/\s{2,}/g, ' ')

  return cleaned.trim()
}

/**
 * Analyze transcript and extract insights
 * This uses a simple regex-based approach for now
 * In production, this would call an AI model
 */
function analyzeTranscript(transcript) {
  console.log('🔍 Analyzing content...')

  const analysis = {
    keyPoints: [],
    resources: [],
    topics: [],
    people: [],
  }

  // Extract URLs
  const urlPattern = /(https?:\/\/[^\s"'<>]+)/g
  const urls = [...transcript.matchAll(urlPattern)].map((m) => m[1])

  // Extract GitHub repos
  const githubPattern = /github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g
  const githubRepos = [...transcript.matchAll(githubPattern)].map((m) => `https://${m[0]}`)

  // Extract mentioned tools/products (capitalized words that seem like products)
  const toolPatterns = [
    /\b(Claude|ChatGPT|GPT-4|Opus|Sonnet|Codex|Cursor|VS Code|GitHub|Docker|Kubernetes|React|Vue|Angular)\b/g,
    /\b(Cloud Code|Clawdbot|Clawbot|MCP|PI|ElevenLabs|OpenAI|Anthropic)\b/g,
    /\b(TypeScript|JavaScript|Python|Rust|Go|Bash)\b/g,
  ]

  const tools = new Set()
  for (const pattern of toolPatterns) {
    const matches = [...transcript.matchAll(pattern)]
    matches.forEach((m) => tools.add(m[1]))
  }

  // Extract topics (common tech topics)
  const topicPatterns = [
    /\b(artificial intelligence|machine learning|AI|LLM|agents|coding|programming)\b/gi,
    /\b(security|prompt injection|bash|terminal|shell)\b/gi,
    /\b(API|database|frontend|backend|full-stack)\b/gi,
  ]

  const topics = new Set()
  for (const pattern of topicPatterns) {
    const matches = [...transcript.matchAll(pattern)]
    matches.forEach((m) => topics.add(m[1].toLowerCase()))
  }

  // Combine resources
  analysis.resources = [
    ...urls.map((url) => ({ type: 'url', url, context: 'Mentioned in video' })),
    ...githubRepos.map((repo) => ({ type: 'github', url: repo, context: 'Open source project' })),
    ...[...tools].map((tool) => ({ type: 'tool', name: tool, context: 'Technology mentioned' })),
  ]

  analysis.topics = [...topics]

  return analysis
}

/**
 * Generate summary from transcript
 */
function generateSummary(transcript) {
  // Simple summary - first 500 chars + key points
  const firstParagraph = transcript.split('\n\n')[0]
  return firstParagraph.substring(0, 500) + (firstParagraph.length > 500 ? '...' : '')
}

/**
 * Main analysis function
 */
async function analyzeVideo(videoUrl) {
  console.log(`\n🎬 TubeClaw analyzing: ${videoUrl}\n`)

  const videoId = extractVideoId(videoUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  // Get transcript
  const rawTranscript = await getTranscript(videoUrl)

  // Clean it
  const cleanedTranscript = cleanTranscript(rawTranscript)

  // Analyze
  const analysis = analyzeTranscript(cleanedTranscript)

  // Generate summary
  const summary = generateSummary(cleanedTranscript)

  const result = {
    videoId,
    videoUrl,
    summary,
    transcriptLength: cleanedTranscript.length,
    ...analysis,
    fullTranscript: cleanedTranscript,
  }

  return result
}

/**
 * Format output for display
 */
function formatOutput(result) {
  let output = '\n' + '='.repeat(60) + '\n'
  output += '🎯 TUBECLAW ANALYSIS\n'
  output += '='.repeat(60) + '\n\n'

  output += '📝 SUMMARY:\n'
  output += result.summary + '\n\n'

  if (result.topics.length > 0) {
    output += '🏷️  TOPICS:\n'
    output += result.topics.join(', ') + '\n\n'
  }

  if (result.resources.length > 0) {
    output += '🔗 RESOURCES:\n'
    result.resources.slice(0, 10).forEach((res, i) => {
      if (res.url) {
        output += `  ${i + 1}. ${res.url}\n`
      } else if (res.name) {
        output += `  ${i + 1}. ${res.name} (${res.context})\n`
      }
    })
    output += '\n'
  }

  output += `📊 Transcript length: ${result.transcriptLength} chars\n`
  output += `🎬 Video: ${result.videoUrl}\n`
  output += '='.repeat(60) + '\n'

  return output
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2)
  const urlArg = args.find((arg) => arg.startsWith('--url=') || arg.startsWith('https://'))

  if (!urlArg) {
    console.log('Usage: node analyze.js --url "https://youtube.com/watch?v=..."')
    process.exit(1)
  }

  const url = urlArg.startsWith('--url=') ? urlArg.slice(6) : urlArg

  analyzeVideo(url)
    .then((result) => {
      console.log(formatOutput(result))

      // Save to file
      const outputPath = path.join(CONFIG.tempDir, `analysis-${result.videoId}.json`)
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
      console.log(`\n💾 Full analysis saved to: ${outputPath}`)
    })
    .catch((err) => {
      console.error('❌ Error:', err.message)
      process.exit(1)
    })
}

module.exports = {
  analyzeVideo,
  extractVideoId,
  cleanTranscript,
  analyzeTranscript,
}
