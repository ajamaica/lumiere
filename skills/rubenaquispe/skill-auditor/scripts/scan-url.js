#!/usr/bin/env node
/**
 * Skill Auditor — Remote URL scanner
 * Scans a GitHub skill directory without downloading files
 * Usage: node scan-url.js <github-url> [--json <output-path>]
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// Import patterns from scan-skill.js (same directory)
const scanSkillPath = path.join(__dirname, 'scan-skill.js')
const scanSkillCode = fs.readFileSync(scanSkillPath, 'utf-8')

// Extract PATTERNS array by evaluating just the data
const patternsMatch = scanSkillCode.match(/const PATTERNS = \[([\s\S]*?)\n\];/)
if (!patternsMatch) {
  console.error('Could not load patterns')
  process.exit(2)
}

let PATTERNS
eval(`PATTERNS = [${patternsMatch[1]}];`)

// ─── HTTP fetch ────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http')
    mod
      .get(url, { headers: { 'User-Agent': 'skill-auditor/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpGet(res.headers.location).then(resolve).catch(reject)
        }
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve({ status: res.statusCode, data }))
      })
      .on('error', reject)
  })
}

// ─── GitHub URL parsing ────────────────────────────────────────────

function parseGithubUrl(url) {
  // Handle: github.com/owner/repo/tree/branch/path/to/skill
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/(?:tree|blob)\/([^/]+)\/(.+)/)
  if (m) return { owner: m[1], repo: m[2], branch: m[3], path: m[4] }

  // Handle: github.com/owner/repo (root)
  const m2 = url.match(/github\.com\/([^/]+)\/([^/]+)\/?$/)
  if (m2) return { owner: m2[1], repo: m2[2], branch: 'main', path: '' }

  return null
}

// ─── Scan content in memory ────────────────────────────────────────

const DOC_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.rst',
  '.html',
  '.css',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.xsd',
  '.xsl',
  '.dtd',
  '.svg',
  '.csv',
])
const BINARY_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.dat',
  '.db',
  '.sqlite',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.bmp',
  '.svg',
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.webm',
  '.avi',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.skill',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
])

const METADATA_FILES = new Set([
  'readme.md',
  'package.json',
  'origin.json',
  'license',
  'license.md',
  'license.txt',
  'changelog.md',
  'contributing.md',
])
const SAFE_URL_PATTERNS = [
  /img\.shields\.io/i,
  /shields\.io\/badge/i,
  /badge\.fury\.io/i,
  /badgen\.net/i,
  /github\.com\/[\w-]+\/[\w-]+(?:\.git)?$/i,
  /clawhub\.ai/i,
  /npmjs\.com/i,
  /pypi\.org/i,
  /crates\.io/i,
]

function isDocFile(name) {
  return DOC_EXTENSIONS.has(path.extname(name).toLowerCase())
}
function isBinaryFile(name) {
  return BINARY_EXTENSIONS.has(path.extname(name).toLowerCase())
}
function isMetadataFile(name) {
  const basename = path.basename(name).toLowerCase()
  if (METADATA_FILES.has(basename)) return true
  if (name.includes('.clawhub')) return true
  return false
}
function isSafeUrl(url) {
  return SAFE_URL_PATTERNS.some((p) => p.test(url))
}

function adjustSeverity(severity, fileName) {
  if (!isDocFile(fileName)) return severity
  const downgrade = { critical: 'high', high: 'medium', medium: 'low', low: 'low' }
  return downgrade[severity] || severity
}

function scanContent(content, fileName) {
  const findings = []
  const lines = content.split('\n')

  for (const pattern of PATTERNS) {
    let matchCount = 0
    const maxMatches = pattern.maxMatches || 5

    for (let i = 0; i < lines.length; i++) {
      pattern.regex.lastIndex = 0
      let match
      while ((match = pattern.regex.exec(lines[i])) !== null) {
        matchCount++
        if (matchCount > maxMatches) break
        // Skip HTTP URL findings in metadata/doc files entirely
        if (pattern.id === 'http-url' && isMetadataFile(fileName)) continue
        // Skip safe URLs everywhere
        if (pattern.id === 'http-url' && match[0] && isSafeUrl(match[0])) continue
        const severity = adjustSeverity(pattern.severity, fileName)
        findings.push({
          id: pattern.id,
          category: pattern.category,
          severity,
          file: fileName,
          line: i + 1,
          snippet: lines[i].trim().substring(0, 200),
          explanation: pattern.description + (severity !== pattern.severity ? ' (in docs)' : ''),
          match: pattern.extractMatch ? match[0] : undefined,
        })
        if (match.index === pattern.regex.lastIndex) pattern.regex.lastIndex++
      }
      if (matchCount > maxMatches) break
    }
  }
  return findings
}

// ─── Risk + Accuracy (same logic as scan-skill.js) ─────────────────

function calculateRisk(findings) {
  const unmatched = findings.filter((f) => !f.intentMatch)
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  const categories = new Set()
  for (const f of unmatched) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
    categories.add(f.category)
  }

  if (
    categories.has('Prompt Injection') ||
    (categories.has('Obfuscation') &&
      (categories.has('Sensitive File Access') || categories.has('Data Exfiltration')))
  )
    return 'CRITICAL'
  if (counts.critical > 0) return 'CRITICAL'
  if (counts.high > 0) return 'HIGH'
  if (counts.medium >= 3 || (counts.medium >= 1 && counts.low >= 2)) return 'MEDIUM'
  if (counts.medium > 0 || counts.low > 2) return 'LOW'
  return 'CLEAN'
}

function summarizeCapabilities(findings) {
  const caps = new Set()
  for (const f of findings) {
    if (f.category === 'Network' || f.id === 'fetch-call' || f.id === 'curl-wget')
      caps.add('Makes network requests')
    if (f.category === 'File Access' || f.category === 'Sensitive File Access')
      caps.add('Accesses files outside skill directory')
    if (f.category === 'Shell Execution') caps.add('Executes shell commands')
    if (f.category === 'Obfuscation') caps.add('Uses obfuscation techniques')
    if (f.category === 'Prompt Injection') caps.add('Contains prompt injection attempts')
    if (f.category === 'Data Exfiltration') caps.add('Potential data exfiltration')
    if (f.category === 'Persistence') caps.add('Attempts persistence mechanisms')
    if (f.category === 'Privilege Escalation') caps.add('Attempts privilege escalation')
  }
  return Array.from(caps)
}

const ALWAYS_SUSPICIOUS = new Set([
  'Uses obfuscation techniques',
  'Contains prompt injection attempts',
  'Potential data exfiltration',
])
const DESC_KEYWORDS = {
  'Makes network requests': [
    /\b(?:fetch|download|upload|sync|cloud|api|web|url|http|online|remote|server|connect|request|send|receive|internet)\b/i,
  ],
  'Accesses files outside skill directory': [
    /\b(?:system\s*files?|user\s*files?|documents?|config|settings?|memory|workspace|home\s*dir)\b/i,
  ],
  'Executes shell commands': [
    /\b(?:shell|command|terminal|exec|run\s*(?:program|process|command)|cli|system\s*command|script)\b/i,
  ],
  'Uses obfuscation techniques': [],
  'Contains prompt injection attempts': [],
  'Potential data exfiltration': [],
  'Attempts persistence mechanisms': [
    /\b(?:schedul|cron|autostart|background|persist|always.?on|daemon|service)\b/i,
  ],
  'Attempts privilege escalation': [/\b(?:browser|device|camera|screen|node|control|automat)/i],
}
const DEDUCTIONS = {
  'Uses obfuscation techniques': 4,
  'Contains prompt injection attempts': 5,
  'Potential data exfiltration': 5,
  'Makes network requests': 1.5,
  'Accesses files outside skill directory': 2,
  'Executes shell commands': 2,
  'Attempts persistence mechanisms': 3,
  'Attempts privilege escalation': 2,
}

function calcAccuracy(description, caps, findings = [], fullContent = '') {
  if (!description || description === 'No description')
    return { score: 1, undisclosed: caps, reason: 'No description provided' }
  if (caps.length === 0)
    return { score: 10, undisclosed: [], reason: 'Skill does what it says and nothing more' }

  const fullText = (description + '\n' + (fullContent || '')).toLowerCase()
  const disclosed = [],
    undisclosed = []
  for (const cap of caps) {
    if (ALWAYS_SUSPICIOUS.has(cap)) {
      // Check if all findings in this category are intent-matched
      const capCategories = {
        'Contains prompt injection attempts': 'Prompt Injection',
        'Uses obfuscation techniques': 'Obfuscation',
        'Potential data exfiltration': 'Data Exfiltration',
      }
      const cat = capCategories[cap]
      const catFindings = findings.filter((f) => f.category === cat)
      if (catFindings.length > 0 && catFindings.every((f) => f.intentMatch)) {
        disclosed.push(cap + ' (disclosed)')
        continue
      }
      undisclosed.push(cap)
      continue
    }
    const kws = DESC_KEYWORDS[cap] || []
    kws.some((r) => r.test(fullText)) ? disclosed.push(cap) : undisclosed.push(cap)
  }

  // Check intent-matched categories
  const intentMatchedCategories = new Set()
  for (const f of findings) {
    if (f.intentMatch) intentMatchedCategories.add(f.category)
  }

  const CAP_TO_CATEGORIES = {
    'Accesses files outside skill directory': ['File Access', 'Sensitive File Access'],
    'Attempts persistence mechanisms': ['Persistence'],
    'Makes network requests': ['Network'],
    'Executes shell commands': ['Shell Execution'],
    'Attempts privilege escalation': ['Privilege Escalation'],
  }

  let score = 10
  for (const cap of undisclosed) {
    const relatedCats = CAP_TO_CATEGORIES[cap] || []
    const hasIntentMatch = relatedCats.some((c) => intentMatchedCategories.has(c))
    if (hasIntentMatch) {
      score -= (DEDUCTIONS[cap] || 1) * 0.25
    } else {
      score -= DEDUCTIONS[cap] || 1
    }
  }
  score += disclosed.length * 0.25
  score = Math.max(1, Math.min(10, Math.round(score)))

  let reason =
    score >= 8
      ? 'Description accurately reflects what the skill does'
      : score >= 5
        ? 'Some capabilities are not mentioned in the description'
        : score >= 3
          ? 'Significant undisclosed capabilities — description is misleading'
          : 'Description does not match actual behavior — skill is deceptive'

  return { score, disclosed, undisclosed, reason }
}

// ─── Intent-Aware Finding Analysis ─────────────────────────────────

function applyIntentMatching(findings, description, fullContent) {
  if (!fullContent && !description) return findings

  const desc = ((description || '') + '\n' + (fullContent || '')).toLowerCase()

  const INTENT_PATTERNS = [
    { fileRef: /SOUL\.md/i, descMatch: /soul\.md/i },
    { fileRef: /AGENTS\.md/i, descMatch: /agents\.md/i },
    { fileRef: /TOOLS\.md/i, descMatch: /tools\.md/i },
    { fileRef: /MEMORY\.md/i, descMatch: /memory\.md/i },
    { fileRef: /HEARTBEAT\.md/i, descMatch: /heartbeat\.md/i },
    { fileRef: /USER\.md/i, descMatch: /user\.md/i },
    { fileRef: /memory\//i, descMatch: /memory\//i },
    { fileRef: /\.learnings/i, descMatch: /\.learnings/i },
    {
      fileRef: /sessions_send|sessions_spawn/i,
      descMatch: /sessions?_(?:send|spawn|list|history)/i,
    },
    { fileRef: /cron|schedul/i, descMatch: /cron|schedul|hook/i },
    { fileRef: /CLAUDE\.md/i, descMatch: /claude\.md/i },
    { fileRef: /copilot-instructions/i, descMatch: /copilot-instructions/i },
  ]

  // Purpose-keyword patterns
  const PURPOSE_PATTERNS = [
    {
      purposeMatch:
        /\b(?:compress|optimi[zs]e|reduce\s*tokens?|token\s*sav|minif|compact|shrink|ai.?efficient)\b/i,
      expectedCategories: ['File Access', 'Sensitive File Access', 'Persistence'],
      expectedIds: ['memory-file-access', 'memory-write', 'path-traversal', 'homedir-access'],
    },
    {
      purposeMatch:
        /\b(?:modif(?:y|ies)\s*(?:ai\s*)?behavio[ur]|persistent\s*mode|ai.?writing|notation|instruction)\b/i,
      expectedCategories: ['Persistence', 'Sensitive File Access', 'Prompt Injection'],
      expectedIds: ['memory-write', 'prompt-injection-system', 'prompt-injection-new-instructions'],
    },
    {
      purposeMatch:
        /\b(?:audit\s*model|detect\s*model|model\s*(?:audit|detect|cost|compar)|cost\s*(?:analy|calculat|compar))\b/i,
      expectedCategories: ['File Access', 'Sensitive File Access'],
      expectedIds: ['memory-file-access', 'homedir-access', 'config-modification'],
    },
    {
      purposeMatch: /\b(?:workspace|organiz|clean\s*up|restructur|format\s*files?)\b/i,
      expectedCategories: ['File Access', 'Sensitive File Access'],
      expectedIds: ['memory-file-access', 'path-traversal', 'homedir-access'],
    },
  ]
  const matchedPurposes = PURPOSE_PATTERNS.filter((pp) => pp.purposeMatch.test(desc))
  const purposeExpectedCategories = new Set()
  const purposeExpectedIds = new Set()
  for (const pp of matchedPurposes) {
    pp.expectedCategories.forEach((c) => purposeExpectedCategories.add(c))
    pp.expectedIds.forEach((id) => purposeExpectedIds.add(id))
  }

  const severityDowngrade = { critical: 'medium', high: 'low', medium: 'low', low: 'low' }

  return findings.map((f) => {
    let matched = false
    for (const ip of INTENT_PATTERNS) {
      if (ip.fileRef.test(f.snippet) || ip.fileRef.test(f.explanation)) {
        if (ip.descMatch.test(desc)) {
          matched = true
          break
        }
      }
    }
    // Purpose-keyword matching
    if (!matched && (purposeExpectedCategories.has(f.category) || purposeExpectedIds.has(f.id))) {
      matched = true
    }

    if (matched) {
      return {
        ...f,
        intentMatch: true,
        originalSeverity: f.originalSeverity || f.severity,
        severity: severityDowngrade[f.severity] || f.severity,
        explanation: f.explanation + " ⚡ Expected behavior — matches skill's stated purpose",
      }
    } else {
      const sensitiveCategories = [
        'Sensitive File Access',
        'Persistence',
        'Data Exfiltration',
        'Privilege Escalation',
      ]
      const note = sensitiveCategories.includes(f.category)
        ? ' ⚠️ Undisclosed — not mentioned in skill description'
        : ''
      return { ...f, intentMatch: false, explanation: f.explanation + note }
    }
  })
}

// ─── Publisher Reputation ───────────────────────────────────────────

// Known publishers — NOT a whitelist, just context info
const KNOWN_PUBLISHERS = {
  anthropics: { name: 'Anthropic', tier: 'known', note: 'AI company, official skill repo' },
  openclaw: { name: 'OpenClaw', tier: 'known', note: 'Official skill registry' },
  moltbot: { name: 'Moltbot', tier: 'known', note: 'Official Moltbot org' },
  microsoft: { name: 'Microsoft', tier: 'known', note: 'Major tech company' },
  google: { name: 'Google', tier: 'known', note: 'Major tech company' },
  github: { name: 'GitHub', tier: 'known', note: 'Code hosting platform' },
}

function assessReputation(url, gh) {
  const owner = gh.owner.toLowerCase()
  const known = KNOWN_PUBLISHERS[owner]

  if (known) {
    return {
      publisher: known.name,
      tier: 'known',
      note: known.note,
      warning: "Known publisher — but reputation alone doesn't guarantee safety. Review findings.",
    }
  }

  return {
    publisher: gh.owner,
    tier: 'unknown',
    note: 'Unverified publisher',
    warning: 'Unknown publisher — review all findings carefully before installing.',
  }
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  let url = null,
    jsonOutput = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && args[i + 1]) jsonOutput = args[++i]
    else if (!url) url = args[i]
  }

  if (!url) {
    console.error('Usage: node scan-url.js <github-url> [--json <output>]')
    process.exit(2)
  }

  const gh = parseGithubUrl(url)
  if (!gh) {
    console.error('Only GitHub URLs supported. Format: github.com/owner/repo/tree/branch/path')
    process.exit(2)
  }

  // Fetch directory listing recursively
  async function listFiles(dirPath) {
    const apiUrl = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${dirPath}?ref=${gh.branch}`
    const listing = await httpGet(apiUrl)
    if (listing.status !== 200) return []
    const entries = JSON.parse(listing.data)
    let allFiles = []
    for (const entry of entries) {
      if (entry.type === 'file') {
        allFiles.push(entry)
      } else if (entry.type === 'dir') {
        const subFiles = await listFiles(entry.path)
        allFiles.push(...subFiles)
      }
    }
    return allFiles
  }

  process.stderr.write(`Fetching file list...\n`)
  const files = await listFiles(gh.path)
  const textFiles = files.filter((f) => !isBinaryFile(f.name))
  const binaryFiles = files.filter((f) => isBinaryFile(f.name))

  process.stderr.write(
    `Found ${textFiles.length} text files, ${binaryFiles.length} binary (skipped)\n`,
  )

  // Fetch and scan text files in parallel
  let allFindings = []
  const scannedFiles = []

  // Strip the base path to get relative names
  const basePath = gh.path ? gh.path + '/' : ''
  const fetches = textFiles.map(async (f) => {
    const raw = await httpGet(f.download_url)
    const relName = f.path.startsWith(basePath) ? f.path.slice(basePath.length) : f.name
    if (raw.status === 200) {
      scannedFiles.push(relName)
      return scanContent(raw.data, relName)
    }
    return []
  })

  const results = await Promise.all(fetches)
  for (const r of results) allFindings.push(...r)

  // Note binary files
  for (const f of binaryFiles) {
    const relName = f.path.startsWith(basePath) ? f.path.slice(basePath.length) : f.name
    scannedFiles.push(relName + ' (binary, skipped)')
  }

  // Dedupe
  const seen = new Set()
  allFindings = allFindings.filter((f) => {
    const key = `${f.id}:${f.file}:${f.line}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Parse SKILL.md for metadata
  const skillFile = textFiles.find((f) => f.name === 'SKILL.md')
  let skillMeta = {
    name: gh.path.split('/').pop() || gh.repo,
    description: 'No description',
    hasSkillMd: false,
    fullContent: '',
  }

  if (skillFile) {
    const raw = await httpGet(skillFile.download_url)
    if (raw.status === 200) {
      skillMeta.fullContent = raw.data
      const fmMatch = raw.data.match(/^---\s*\n([\s\S]*?)\n---/)
      if (fmMatch) {
        const nm = fmMatch[1].match(/^name:\s*(.+)$/m)
        const dm = fmMatch[1].match(/^description:\s*(.+)$/m)
        skillMeta = {
          ...skillMeta,
          name: nm ? nm[1].trim() : skillMeta.name,
          description: dm ? dm[1].trim().replace(/^["']|["']$/g, '') : 'No description',
          hasSkillMd: true,
        }
      }
    }
  }

  // Apply intent matching
  allFindings = applyIntentMatching(allFindings, skillMeta.description, skillMeta.fullContent)

  const riskLevel = calculateRisk(allFindings)
  const capabilities = summarizeCapabilities(allFindings)
  const urls = [
    ...new Set(allFindings.filter((f) => f.id === 'http-url' && f.match).map((f) => f.match)),
  ]

  // Publisher reputation from source URL
  const reputation = assessReputation(url, gh)

  const report = {
    skill: {
      name: skillMeta.name,
      description: skillMeta.description,
      hasSkillMd: skillMeta.hasSkillMd,
      source: url,
    },
    reputation,
    scan: {
      timestamp: new Date().toISOString(),
      filesScanned: scannedFiles,
      fileCount: scannedFiles.length,
    },
    riskLevel,
    accuracyScore: calcAccuracy(
      skillMeta.description,
      capabilities,
      allFindings,
      skillMeta.fullContent,
    ),
    findings: allFindings,
    findingCount: allFindings.length,
    summary: {
      declaredPurpose: skillMeta.description,
      actualCapabilities: capabilities,
      externalUrls: urls,
      severityCounts: {
        critical: allFindings.filter((f) => f.severity === 'critical').length,
        high: allFindings.filter((f) => f.severity === 'high').length,
        medium: allFindings.filter((f) => f.severity === 'medium').length,
        low: allFindings.filter((f) => f.severity === 'low').length,
      },
    },
  }

  const json = JSON.stringify(report, null, 2)
  if (jsonOutput) {
    fs.writeFileSync(jsonOutput, json)
    process.stderr.write(`Report saved to: ${jsonOutput}\n`)
  } else console.log(json)

  process.exit(allFindings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
