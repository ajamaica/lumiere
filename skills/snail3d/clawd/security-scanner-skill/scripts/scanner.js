#!/usr/bin/env node

/**
 * Security Scanner - Analyzes skills and code for vulnerabilities and malware
 *
 * Usage:
 *   scanner.js <path> [--output json|text]
 *   scanner.js --code "<code_snippet>" [--output json|text]
 *   scanner.js <path> --fix [--output-dir /path]
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

const log = {
  error: (msg) => console.error(`${colors.red}${colors.bold}✖${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}${colors.bold}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}${colors.bold}✓${colors.reset} ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`${colors.cyan}[DEBUG]${colors.reset} ${msg}`),
}

/**
 * Pattern definitions for vulnerability detection
 */
const PATTERNS = {
  // Code execution
  eval: {
    pattern: /\beval\s*\(/g,
    risk: 'DANGEROUS',
    description: 'eval() allows arbitrary code execution',
    weight: 10,
  },
  exec: {
    pattern: /\bexec\s*\(/g,
    risk: 'DANGEROUS',
    description: 'exec() allows arbitrary code execution',
    weight: 10,
  },
  dynamicRequire: {
    pattern: /require\s*\(\s*['"`][^'"`]*\$|require\s*\(\s*\[|require\s*\(\s*template/g,
    risk: 'DANGEROUS',
    description: 'Dynamic require() with variable paths can load arbitrary code',
    weight: 9,
  },
  childProcess: {
    pattern: /require\s*\(\s*['"]child_process['"]\s*\)|from\s+['"]child_process['"]/g,
    risk: 'CAUTION',
    description: 'child_process allows spawning external commands',
    weight: 7,
  },
  // Credential/secret theft
  processEnv: {
    pattern: /process\.env\.\w*(SECRET|KEY|PASSWORD|TOKEN|API|CREDENTIAL)/gi,
    risk: 'CAUTION',
    description: 'Accessing sensitive environment variables',
    weight: 6,
  },
  envAccess: {
    pattern: /process\.env\[['"][A-Z_]+['"]\]/g,
    risk: 'CAUTION',
    description: 'Dynamic environment variable access (potential secret theft)',
    weight: 5,
  },
  // Network calls
  fetch: {
    pattern:
      /fetch\s*\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1|192\.168|10\.|172\.(1[6-9]|2\d|3[01])|undefined|null)/gi,
    risk: 'CAUTION',
    description: 'Network call to external domain',
    weight: 4,
  },
  http: {
    pattern: /require\s*\(\s*['"]https?['"]\s*\)|from\s+['"]https?['"]/g,
    risk: 'CAUTION',
    description: 'HTTP module imported (potential network calls)',
    weight: 3,
  },
  unknownDomainRequest: {
    pattern:
      /http\.(get|post|request)\s*\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1|undefined|null)/gi,
    risk: 'CAUTION',
    description: 'HTTP request to unknown external domain',
    weight: 5,
  },
  // Hidden/obfuscated code
  base64: {
    pattern: /atob\s*\(|Buffer\.from\s*\([^,]*,\s*['"]base64['"]\)/g,
    risk: 'CAUTION',
    description: 'Base64 decoding (potential code obfuscation)',
    weight: 4,
  },
  // Suspicious patterns
  fsReadSync: {
    pattern: /fs\.readFileSync\s*\(\s*['"]\/etc\/|fs\.readFileSync\s*\(\s*['"]~\//g,
    risk: 'CAUTION',
    description: 'Reading sensitive system files',
    weight: 5,
  },
  socketIO: {
    pattern: /require\s*\(\s*['"]net['"]\s*\)|require\s*\(\s*['"]dgram['"]\s*\)/g,
    risk: 'CAUTION',
    description: 'Low-level socket/network access',
    weight: 4,
  },
}

/**
 * Heuristics for detecting obfuscation
 */
function checkObfuscation(content) {
  const findings = []

  // Check for minification (low average identifier length, high symbol density)
  const lines = content.split('\n')
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0)
  const totalChars = content.length

  // Calculate symbol density (non-alphanumeric, non-whitespace)
  const symbolMatch = content.match(/[^\w\s]/g)
  const symbolDensity = symbolMatch ? symbolMatch.length / totalChars : 0

  if (symbolDensity > 0.4 && nonEmptyLines.length < totalChars / 50) {
    findings.push({
      type: 'MINIFIED_CODE',
      risk: 'CAUTION',
      description: 'Code appears to be minified or obfuscated',
      weight: 4,
      suggestion: 'Use a deobfuscator or ask the author for source code',
    })
  }

  // Check for suspicious encoding/escaping
  if (/\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/gi.test(content)) {
    findings.push({
      type: 'ENCODED_STRINGS',
      risk: 'CAUTION',
      description: 'Hex or Unicode encoded strings detected (possible obfuscation)',
      weight: 3,
      suggestion: 'Decode and review the hidden strings',
    })
  }

  return findings
}

/**
 * Scan code for vulnerabilities
 */
function scanCode(content, filename = 'code.js') {
  const findings = []
  const lines = content.split('\n')

  // Check each pattern
  for (const [patternName, patternDef] of Object.entries(PATTERNS)) {
    let match
    const regex = new RegExp(patternDef.pattern.source, 'g')

    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const lineNum = content.substring(0, match.index).split('\n').length
      const lineContent = lines[lineNum - 1]?.trim() || ''

      findings.push({
        type: patternName,
        risk: patternDef.risk,
        description: patternDef.description,
        weight: patternDef.weight,
        lineNumber: lineNum,
        lineContent,
        filename,
        startIndex: match.index,
        matchText: match[0],
      })
    }
  }

  // Check obfuscation
  findings.push(...checkObfuscation(content))

  return findings
}

/**
 * Recursively scan directory for code files
 */
function scanDirectory(dirPath) {
  const allFindings = []
  const scannedFiles = []

  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      const relativePath = path.relative(dirPath, fullPath)

      // Skip node_modules, .git, etc.
      if (/^(node_modules|\.git|\.next|dist|build|\.env)/.test(relativePath)) {
        continue
      }

      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (/\.(js|ts|jsx|tsx|py|go|java|rb|php|sh)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8')
        const findings = scanCode(content, relativePath)

        if (findings.length > 0) {
          allFindings.push(...findings)
        }

        scannedFiles.push(relativePath)
      }
    }
  }

  walkDir(dirPath)
  return { findings: allFindings, scannedFiles }
}

/**
 * Calculate overall risk level
 */
function calculateRiskLevel(findings) {
  if (findings.length === 0) return 'SAFE'

  const risks = findings.map((f) => f.risk)

  if (risks.includes('DANGEROUS')) return 'DANGEROUS'
  if (risks.includes('CAUTION')) return 'CAUTION'
  return 'SAFE'
}

/**
 * Generate recommendation
 */
function generateRecommendation(riskLevel, findings) {
  if (riskLevel === 'DANGEROUS') {
    return {
      action: 'REJECT',
      reason: 'Code contains dangerous patterns that could allow malware or data theft',
      details: 'Do not install. Request source code review from maintainer.',
    }
  }

  if (riskLevel === 'CAUTION') {
    return {
      action: 'QUARANTINE',
      reason: 'Code contains potentially suspicious patterns requiring review',
      details:
        'Review findings before installation. Consider asking maintainer about specific suspicious patterns.',
    }
  }

  return {
    action: 'INSTALL',
    reason: 'No obvious malicious patterns detected',
    details: 'Code appears safe. Standard security practices still recommended.',
  }
}

/**
 * Suggest fixes for fixable issues
 */
function suggestFixes(findings) {
  const fixes = []

  findings.forEach((finding) => {
    switch (finding.type) {
      case 'dynamicRequire':
        fixes.push({
          type: 'dynamicRequire',
          description: 'Replace dynamic require with static import',
          file: finding.filename,
          line: finding.lineNumber,
          suggestion: 'Use static imports or a whitelist of allowed modules',
          difficulty: 'MEDIUM',
        })
        break
      case 'eval':
      case 'exec':
        fixes.push({
          type: finding.type,
          description: `Remove ${finding.type}() call`,
          file: finding.filename,
          line: finding.lineNumber,
          suggestion: 'Replace with safer alternative or remove entirely',
          difficulty: 'HIGH',
        })
        break
      case 'MINIFIED_CODE':
        fixes.push({
          type: 'obfuscation',
          description: 'Deobfuscate or get source code',
          suggestion: 'Contact maintainer for source code',
          difficulty: 'HARD',
        })
        break
      default:
        break
    }
  })

  return fixes
}

/**
 * Format output as JSON
 */
function formatJSON(result) {
  return JSON.stringify(result, null, 2)
}

/**
 * Format output as human-readable text
 */
function formatText(result) {
  let output = ''

  output += `${colors.bold}=== Security Scanner Report ===${colors.reset}\n\n`

  output += `${colors.bold}Target:${colors.reset} ${result.target}\n`
  output += `${colors.bold}Files Scanned:${colors.reset} ${result.scannedFiles.length}\n`
  output += `${colors.bold}Findings:${colors.reset} ${result.findings.length}\n\n`

  // Risk level
  const riskColor =
    result.riskLevel === 'DANGEROUS'
      ? colors.red
      : result.riskLevel === 'CAUTION'
        ? colors.yellow
        : colors.green
  output += `${colors.bold}Risk Level:${colors.reset} ${riskColor}${colors.bold}${result.riskLevel}${colors.reset}\n\n`

  // Findings grouped by file
  if (result.findings.length > 0) {
    output += `${colors.bold}Detailed Findings:${colors.reset}\n`
    const grouped = {}

    result.findings.forEach((finding) => {
      if (!grouped[finding.filename]) {
        grouped[finding.filename] = []
      }
      grouped[finding.filename].push(finding)
    })

    for (const [file, fileFindings] of Object.entries(grouped)) {
      output += `\n  ${colors.cyan}${file}${colors.reset}\n`

      fileFindings.forEach((f) => {
        const riskColor =
          f.risk === 'DANGEROUS' ? colors.red : f.risk === 'CAUTION' ? colors.yellow : colors.green
        if (f.lineNumber) {
          output += `    Line ${f.lineNumber}: ${riskColor}[${f.risk}]${colors.reset} ${f.description}\n`
        } else {
          output += `    ${riskColor}[${f.risk}]${colors.reset} ${f.description}\n`
        }
        if (f.matchText) {
          output += `      Code: ${colors.cyan}${f.matchText}${colors.reset}\n`
        }
        if (f.lineContent) {
          output += `      Context: ${f.lineContent.substring(0, 80)}\n`
        }
        if (f.suggestion) {
          output += `      Suggestion: ${f.suggestion}\n`
        }
      })
    }
  } else {
    output += `${colors.green}${colors.bold}✓ No suspicious patterns found!${colors.reset}\n`
  }

  // Recommendation
  output += `\n${colors.bold}Recommendation:${colors.reset}\n`
  output += `  ${colors.bold}Action:${colors.reset} ${result.recommendation.action}\n`
  output += `  ${colors.bold}Reason:${colors.reset} ${result.recommendation.reason}\n`
  output += `  ${colors.bold}Details:${colors.reset} ${result.recommendation.details}\n`

  // Fixes
  if (result.fixes && result.fixes.length > 0) {
    output += `\n${colors.bold}Suggested Fixes:${colors.reset}\n`
    result.fixes.forEach((fix) => {
      output += `  • ${fix.description}\n`
      if (fix.file) output += `    File: ${fix.file}:${fix.line}\n`
      output += `    Suggestion: ${fix.suggestion}\n`
      output += `    Difficulty: ${fix.difficulty}\n`
    })
  }

  return output
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Security Scanner - Code Vulnerability & Malware Detection

Usage:
  scanner.js <path>                    Scan a file or directory
  scanner.js --code "<snippet>"        Scan a code snippet
  scanner.js <path> --output json      Output as JSON
  scanner.js <path> --output text      Output as human-readable (default)

Examples:
  scanner.js ./my-skill/
  scanner.js ./package.js --output json
  scanner.js --code "eval(userInput)"
  scanner.js /path/to/skill --fix      Show suggested fixes

Options:
  --code <snippet>     Scan inline code instead of file
  --output <format>    Output format: json or text (default: text)
  --fix                Show suggested fixes (interactive)
  --debug              Show debug output
    `)
    process.exit(0)
  }

  const outputFormat = args.includes('--output')
    ? args[args.indexOf('--output') + 1] || 'text'
    : 'text'
  const showFixes = args.includes('--fix')
  const codeSnippet = args.includes('--code') ? args[args.indexOf('--code') + 1] : null

  try {
    let findings, scannedFiles, target

    if (codeSnippet) {
      if (outputFormat !== 'json') log.info(`Scanning code snippet...`)
      findings = scanCode(codeSnippet, 'snippet.js')
      scannedFiles = ['snippet.js']
      target = '<inline code>'
    } else {
      const inputPath = args[0]
      target = inputPath

      if (!fs.existsSync(inputPath)) {
        log.error(`Path not found: ${inputPath}`)
        process.exit(1)
      }

      const stat = fs.statSync(inputPath)

      if (stat.isDirectory()) {
        if (outputFormat !== 'json') log.info(`Scanning directory: ${inputPath}`)
        const result = scanDirectory(inputPath)
        findings = result.findings
        scannedFiles = result.scannedFiles
      } else {
        if (outputFormat !== 'json') log.info(`Scanning file: ${inputPath}`)
        const content = fs.readFileSync(inputPath, 'utf8')
        findings = scanCode(content, path.basename(inputPath))
        scannedFiles = [path.basename(inputPath)]
      }
    }

    const riskLevel = calculateRiskLevel(findings)
    const recommendation = generateRecommendation(riskLevel, findings)
    const fixes = showFixes ? suggestFixes(findings) : []

    const result = {
      target,
      timestamp: new Date().toISOString(),
      riskLevel,
      findings,
      scannedFiles,
      recommendation,
      fixes: showFixes ? fixes : undefined,
    }

    if (outputFormat === 'json') {
      console.log(formatJSON(result))
    } else {
      console.log(formatText(result))
    }

    // Exit with appropriate code
    process.exit(riskLevel === 'DANGEROUS' ? 2 : riskLevel === 'CAUTION' ? 1 : 0)
  } catch (error) {
    log.error(`${error.message}`)
    if (process.env.DEBUG) {
      console.error(error)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  log.error(`Unexpected error: ${error.message}`)
  process.exit(1)
})
