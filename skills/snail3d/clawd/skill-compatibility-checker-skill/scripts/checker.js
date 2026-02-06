#!/usr/bin/env node

/**
 * Skill Compatibility Checker
 *
 * Vets skills before installation by checking:
 * - Conflicts with installed skills
 * - System requirements (OS, architecture, Node version)
 * - Dependencies (CLI tools, API keys, Clawdbot version)
 * - Security scan via security-scanner skill
 * - Overall installation readiness
 */

const fs = require('fs')
const path = require('path')
const { execSync, spawnSync } = require('child_process')
const os = require('os')

// ============================================================================
// CONFIG & CONSTANTS
// ============================================================================

const SKILL_DIRECTORY = path.join(os.homedir(), 'clawd')
const TOOLS_FILE = path.join(SKILL_DIRECTORY, 'TOOLS.md')
const OUTPUT_FORMATS = ['text', 'json']
const RISK_LEVELS = ['SAFE', 'CAUTION', 'DANGEROUS']

// ============================================================================
// HELPERS
// ============================================================================

function log(msg, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
  }
  console.log(`${colors[color] || ''}${msg}${colors.reset}`)
}

function parseMarkdownFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}

  const lines = match[1].split('\n')
  const meta = {}

  for (const line of lines) {
    if (!line.trim()) continue
    const [key, ...valueParts] = line.split(':')
    const value = valueParts.join(':').trim()
    meta[key.trim()] = value
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/\\n/g, '\n')
  }

  return meta
}

function getInstalledSkills() {
  const skills = []
  try {
    const contents = fs.readdirSync(SKILL_DIRECTORY)
    for (const item of contents) {
      if (item.endsWith('-skill') || item.endsWith('.skill')) {
        const skillPath = path.join(SKILL_DIRECTORY, item)
        if (fs.statSync(skillPath).isDirectory()) {
          const skillMdPath = path.join(skillPath, 'SKILL.md')
          if (fs.existsSync(skillMdPath)) {
            const content = fs.readFileSync(skillMdPath, 'utf8')
            const meta = parseMarkdownFrontmatter(content)
            skills.push({
              name: meta.name || item.replace('-skill', ''),
              path: skillPath,
              meta,
            })
          }
        }
      }
    }
  } catch (e) {
    // Skill directory may not exist
  }
  return skills
}

function resolveSkillPath(specifier) {
  // clawdhub:skill-name -> not implemented yet
  if (specifier.startsWith('clawdhub:')) {
    throw new Error('ClawdHub lookups not yet implemented. Use local paths.')
  }

  // ~/clawd/... or /path/to/skill
  const resolved = specifier.replace('~', os.homedir())
  if (fs.existsSync(resolved)) {
    return resolved
  }

  throw new Error(`Skill path not found: ${specifier}`)
}

function getSystemInfo() {
  return {
    platform: process.platform, // 'darwin', 'linux', 'win32'
    arch: process.arch, // 'arm64', 'x64'
    nodeVersion: process.version.slice(1), // e.g., '25.4.0'
    osVersion: os.release(),
  }
}

function commandExists(cmd) {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${cmd}`, { stdio: 'ignore' })
    } else {
      execSync(`which ${cmd}`, { stdio: 'ignore' })
    }
    return true
  } catch {
    return false
  }
}

function parseVersion(versionStr) {
  const match = versionStr.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
  }
}

function compareVersions(current, required) {
  // Returns: 0 if equal, 1 if current > required, -1 if current < required
  if (!current || !required) return null

  const c = parseVersion(current)
  const r = parseVersion(required)

  if (!c || !r) return null

  if (c.major !== r.major) return c.major > r.major ? 1 : -1
  if (c.minor !== r.minor) return c.minor > r.minor ? 1 : -1
  if (c.patch !== r.patch) return c.patch > r.patch ? 1 : -1

  return 0
}

function getConfiguredApiKeys() {
  const keys = {}
  try {
    if (fs.existsSync(TOOLS_FILE)) {
      const content = fs.readFileSync(TOOLS_FILE, 'utf8')
      // Very basic parsing - look for sections like "API Key: xxx"
      // This is a simplified version; production would use better parsing
      const lines = content.split('\n')
      for (const line of lines) {
        if (line.includes(':') && !line.startsWith('#')) {
          const [key, value] = line.split(':')
          const cleanKey = key.trim().toLowerCase()
          if (cleanKey.includes('api') || cleanKey.includes('key') || cleanKey.includes('token')) {
            keys[cleanKey] = !!value.trim()
          }
        }
      }
    }
  } catch (e) {
    // File doesn't exist or can't be parsed
  }

  // Also check environment
  for (const key of Object.keys(process.env)) {
    if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
      keys[key.toLowerCase()] = true
    }
  }

  return keys
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function checkConflicts(skillPath, installedSkills) {
  const conflicts = []
  const warnings = []

  const skillMdPath = path.join(skillPath, 'SKILL.md')
  if (!fs.existsSync(skillMdPath)) {
    return { conflicts, warnings }
  }

  const content = fs.readFileSync(skillMdPath, 'utf8')
  const meta = parseMarkdownFrontmatter(content)
  const skillName = meta.name || path.basename(skillPath)

  // Check for name conflicts
  for (const installed of installedSkills) {
    if (installed.name === skillName) {
      conflicts.push(`Skill name "${skillName}" already installed at ${installed.path}`)
    }
  }

  // Check for CLI command conflicts
  const pkgJsonPath = path.join(skillPath, 'package.json')
  let cliCommands = []
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
      if (pkg.bin) {
        if (typeof pkg.bin === 'string') {
          cliCommands = [pkg.name]
        } else {
          cliCommands = Object.keys(pkg.bin)
        }
      }
    } catch (e) {
      warnings.push(`Could not parse package.json: ${e.message}`)
    }
  }

  // Check if CLI commands already exist
  for (const cmd of cliCommands) {
    if (commandExists(cmd)) {
      const resolution = 'Consider renaming the command in package.json bin field'
      warnings.push({
        type: 'cli-conflict',
        command: cmd,
        message: `CLI command "${cmd}" already exists on system`,
        resolution,
      })
    }
  }

  // Look for port usage in SKILL.md or README
  const readmePath = path.join(skillPath, 'README.md')
  const skillContent = readmePath
    ? fs.existsSync(readmePath)
      ? fs.readFileSync(readmePath, 'utf8')
      : ''
    : ''

  const portMatches = (skillContent + content).match(/(?:port|PORT)[\s:=]+(\d{4,5})/gi)
  if (portMatches) {
    const ports = [...new Set(portMatches.map((m) => m.match(/\d{4,5}/)[0]))]
    for (const port of ports) {
      warnings.push({
        type: 'port-usage',
        port,
        message: `Skill uses port ${port} - ensure no conflicts on your system`,
      })
    }
  }

  return { conflicts, warnings }
}

function checkSystemRequirements(skillPath) {
  const issues = []
  const warnings = []
  const systemInfo = getSystemInfo()

  const skillMdPath = path.join(skillPath, 'SKILL.md')
  if (!fs.existsSync(skillMdPath)) {
    return { issues, warnings }
  }

  const content = fs.readFileSync(skillMdPath, 'utf8')

  // Check for OS requirements
  const osReqs = {
    macos: { platform: 'darwin', label: 'macOS' },
    'mac os': { platform: 'darwin', label: 'macOS' },
    linux: { platform: 'linux', label: 'Linux' },
    windows: { platform: 'win32', label: 'Windows' },
  }

  let requiredOS = null
  for (const [keyword, info] of Object.entries(osReqs)) {
    if (content.toLowerCase().includes(keyword)) {
      if (
        content.toLowerCase().includes(`requires ${keyword}`) ||
        content.toLowerCase().includes(`${keyword} only`)
      ) {
        requiredOS = info
        break
      }
    }
  }

  if (requiredOS && requiredOS.platform !== systemInfo.platform) {
    issues.push(
      `Requires ${requiredOS.label}, but you're on ${systemInfo.platform} (${systemInfo.arch})`,
    )
  }

  // Check for architecture requirements
  const archReqs = {
    arm64: 'arm64',
    aarch64: 'arm64',
    x86_64: 'x64',
    x64: 'x64',
    intel: 'x64',
  }

  let requiredArch = null
  for (const [keyword, arch] of Object.entries(archReqs)) {
    if (content.toLowerCase().includes(keyword)) {
      if (
        content.toLowerCase().includes(`requires ${keyword}`) ||
        content.toLowerCase().includes(`${keyword} only`)
      ) {
        requiredArch = arch
        break
      }
    }
  }

  if (requiredArch && requiredArch !== systemInfo.arch) {
    issues.push(`Requires ${requiredArch} architecture, but you have ${systemInfo.arch}`)
  }

  // Check for Node version requirements
  const nodeMatch = content.match(/(?:requires? node|node (?:version|>=?))[\s:]*v?(\d+\.\d+\.\d+)/i)
  if (nodeMatch) {
    const required = nodeMatch[1]
    const cmp = compareVersions(systemInfo.nodeVersion, required)
    if (cmp === -1) {
      issues.push(`Requires Node.js ${required}, but you have ${systemInfo.nodeVersion}`)
    }
  }

  // Look for version requirements in package.json
  const pkgJsonPath = path.join(skillPath, 'package.json')
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
      if (pkg.engines && pkg.engines.node) {
        const nodeReq = pkg.engines.node
        // Simple parsing of >=X.Y.Z
        const match = nodeReq.match(/>=(\d+\.\d+\.\d+)|(\d+\.\d+\.\d+)/)
        if (match) {
          const required = match[1] || match[2]
          const cmp = compareVersions(systemInfo.nodeVersion, required)
          if (cmp === -1) {
            issues.push(
              `package.json requires Node.js ${nodeReq}, but you have ${systemInfo.nodeVersion}`,
            )
          }
        }
      }
    } catch (e) {
      warnings.push(`Could not parse package.json engines: ${e.message}`)
    }
  }

  return { issues, warnings }
}

function checkDependencies(skillPath) {
  const missing = []
  const apiKeysNeeded = []
  const warnings = []

  // Check for CLI tool requirements
  const readmePath = path.join(skillPath, 'README.md')
  const skillMdPath = path.join(skillPath, 'SKILL.md')
  let combinedContent = ''

  if (fs.existsSync(readmePath)) {
    combinedContent += fs.readFileSync(readmePath, 'utf8') + '\n'
  }
  if (fs.existsSync(skillMdPath)) {
    combinedContent += fs.readFileSync(skillMdPath, 'utf8') + '\n'
  }

  // Look for common tools mentioned
  const commonTools = [
    'ffmpeg',
    'python',
    'java',
    'go',
    'ruby',
    'php',
    'docker',
    'git',
    'curl',
    'wget',
  ]
  const foundTools = []

  for (const tool of commonTools) {
    const regex = new RegExp(`\\b${tool}\\b`, 'i')
    if (regex.test(combinedContent)) {
      foundTools.push(tool)
      if (!commandExists(tool)) {
        const installCmd =
          tool === 'ffmpeg'
            ? 'brew install ffmpeg'
            : tool === 'docker'
              ? 'brew install docker'
              : `brew install ${tool}`
        missing.push({
          tool,
          installCommand: installCmd,
        })
      }
    }
  }

  // Check for API key requirements
  const apiKeyPatterns = [
    /api[-_]?key|api[-_]?secret/gi,
    /groq|elevenlabs|openai|anthropic|stripe|twilio|sendgrid/gi,
  ]

  for (const pattern of apiKeyPatterns) {
    if (pattern.test(combinedContent)) {
      const matches = combinedContent.match(pattern) || []
      const keys = [...new Set(matches.map((m) => m.toLowerCase()))]
      apiKeysNeeded.push(...keys)
    }
  }

  const configuredKeys = getConfiguredApiKeys()
  const missingApiKeys = []

  for (const key of apiKeysNeeded) {
    if (!configuredKeys[key]) {
      missingApiKeys.push(key)
    }
  }

  // Check for Clawdbot version requirement
  let clawdbotVersionRequired = null
  const clawdbotMatch = combinedContent.match(/clawdbot[^0-9]*([0-9]+\.[0-9]+\.[0-9]+)/i)
  if (clawdbotMatch) {
    clawdbotVersionRequired = clawdbotMatch[1]
    // Would need to check actual Clawdbot version here
  }

  // Check package.json dependencies
  const pkgJsonPath = path.join(skillPath, 'package.json')
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }

      // Could check if npm packages are installed, but that's expensive
      // For now, just note what's required
      if (Object.keys(deps).length > 0) {
        warnings.push({
          type: 'npm-deps',
          message: `Requires ${Object.keys(deps).length} npm packages - will be installed via "npm install"`,
          packages: Object.keys(deps),
        })
      }
    } catch (e) {
      warnings.push(`Could not parse package.json: ${e.message}`)
    }
  }

  return {
    missingCLITools: missing,
    missingApiKeys: missingApiKeys,
    clawdbotVersionRequired,
    warnings,
  }
}

function runSecurityScan(skillPath) {
  try {
    const scannerPath = path.join(SKILL_DIRECTORY, 'security-scanner-skill')
    const scannerScript = path.join(scannerPath, 'scripts', 'scanner.js')

    if (!fs.existsSync(scannerScript)) {
      return {
        riskLevel: 'UNKNOWN',
        findings: [],
        message: 'security-scanner-skill not installed. Cannot perform security scan.',
      }
    }

    const result = spawnSync('node', [scannerScript, skillPath, '--output', 'json'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    if (result.error) {
      return {
        riskLevel: 'UNKNOWN',
        findings: [],
        message: `Security scan failed: ${result.error.message}`,
      }
    }

    try {
      const output = JSON.parse(result.stdout)
      return {
        riskLevel: output.riskLevel || 'UNKNOWN',
        findings: output.findings || [],
        message: output.message || '',
      }
    } catch (e) {
      // If JSON parsing fails, try to extract risk level from text
      const text = result.stdout || result.stderr || ''
      let riskLevel = 'UNKNOWN'
      if (text.includes('DANGEROUS')) riskLevel = 'DANGEROUS'
      else if (text.includes('CAUTION')) riskLevel = 'CAUTION'
      else if (text.includes('SAFE')) riskLevel = 'SAFE'

      return {
        riskLevel,
        findings: [text.substring(0, 500)],
        message: 'Security scan completed (text output)',
      }
    }
  } catch (e) {
    return {
      riskLevel: 'UNKNOWN',
      findings: [],
      message: `Could not run security scan: ${e.message}`,
    }
  }
}

// ============================================================================
// REPORTING
// ============================================================================

function determineReadiness(results) {
  const { conflicts, sysReqs, deps, security } = results

  // BLOCKED: System requirements not met or dangerous security findings
  if (sysReqs.issues.length > 0 || security.riskLevel === 'DANGEROUS') {
    return 'BLOCKED'
  }

  // CAUTION: Conflicts, missing dependencies, or caution-level security
  if (
    conflicts.conflicts.length > 0 ||
    deps.missingCLITools.length > 0 ||
    deps.missingApiKeys.length > 0 ||
    security.riskLevel === 'CAUTION'
  ) {
    return 'CAUTION'
  }

  // GO: No issues detected
  return 'GO'
}

function formatTextReport(skillPath, results) {
  const { conflicts, sysReqs, deps, security, installed } = results
  const readiness = determineReadiness(results)

  const skillMd = path.join(skillPath, 'SKILL.md')
  const meta = fs.existsSync(skillMd)
    ? parseMarkdownFrontmatter(fs.readFileSync(skillMd, 'utf8'))
    : {}

  let report = `
╔════════════════════════════════════════════════════════════════════════════╗
║                    SKILL COMPATIBILITY CHECKER REPORT                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Skill: ${meta.name || path.basename(skillPath)}
Path:  ${skillPath}
Date:  ${new Date().toISOString()}

┌─ INSTALLATION READINESS ─────────────────────────────────────────────────┐
│`

  if (readiness === 'GO') {
    report += `\n│ ✅ GO - Safe to install\n`
  } else if (readiness === 'CAUTION') {
    report += `\n│ ⚠️  CAUTION - Review issues before installation\n`
  } else {
    report += `\n│ ❌ BLOCKED - Do not install\n`
  }

  report += `│\n└────────────────────────────────────────────────────────────────────────────┘\n`

  // Conflicts
  if (conflicts.conflicts.length > 0 || conflicts.warnings.length > 0) {
    report += `\n┌─ CONFLICTS ──────────────────────────────────────────────────────────────────┐\n`

    if (conflicts.conflicts.length > 0) {
      for (const conflict of conflicts.conflicts) {
        report += `│ ❌ ${conflict}\n`
      }
    }

    if (conflicts.warnings.length > 0) {
      for (const warn of conflicts.warnings) {
        if (typeof warn === 'string') {
          report += `│ ⚠️  ${warn}\n`
        } else {
          report += `│ ⚠️  ${warn.message}\n`
          if (warn.resolution) {
            report += `│    → ${warn.resolution}\n`
          }
        }
      }
    }

    if (conflicts.conflicts.length === 0 && conflicts.warnings.length > 0) {
      report += `│ No hard conflicts, but see warnings above\n`
    }

    report += `└────────────────────────────────────────────────────────────────────────────┘\n`
  }

  // System Requirements
  if (sysReqs.issues.length > 0 || sysReqs.warnings.length > 0) {
    report += `\n┌─ SYSTEM REQUIREMENTS ────────────────────────────────────────────────────────┐\n`

    const sysInfo = getSystemInfo()
    report += `│ Your System: ${sysInfo.platform} / ${sysInfo.arch} / Node ${sysInfo.nodeVersion}\n`
    report += `│\n`

    if (sysReqs.issues.length > 0) {
      for (const issue of sysReqs.issues) {
        report += `│ ❌ ${issue}\n`
      }
    }

    if (sysReqs.warnings.length > 0) {
      for (const warn of sysReqs.warnings) {
        report += `│ ⚠️  ${warn}\n`
      }
    }

    if (sysReqs.issues.length === 0 && sysReqs.warnings.length > 0) {
      report += `│ System requirements met, but see warnings above\n`
    }

    report += `└────────────────────────────────────────────────────────────────────────────┘\n`
  }

  // Dependencies
  if (
    deps.missingCLITools.length > 0 ||
    deps.missingApiKeys.length > 0 ||
    deps.warnings.length > 0
  ) {
    report += `\n┌─ DEPENDENCIES ───────────────────────────────────────────────────────────────┐\n`

    if (deps.missingCLITools.length > 0) {
      report += `│ Missing CLI Tools:\n`
      for (const tool of deps.missingCLITools) {
        report += `│ ❌ ${tool.tool}\n`
        report += `│    Install: ${tool.installCommand}\n`
      }
    }

    if (deps.missingApiKeys.length > 0) {
      report += `│\n│ Missing API Keys/Tokens:\n`
      for (const key of deps.missingApiKeys) {
        report += `│ ⚠️  ${key} - configure in TOOLS.md or environment\n`
      }
    }

    if (deps.clawdbotVersionRequired) {
      report += `│ Clawdbot Version: ${deps.clawdbotVersionRequired} required\n`
    }

    if (deps.warnings.length > 0) {
      report += `│\n`
      for (const warn of deps.warnings) {
        if (typeof warn === 'string') {
          report += `│ ℹ️  ${warn}\n`
        } else {
          report += `│ ℹ️  ${warn.message}\n`
        }
      }
    }

    report += `└────────────────────────────────────────────────────────────────────────────┘\n`
  }

  // Security
  if (security.riskLevel !== 'UNKNOWN') {
    report += `\n┌─ SECURITY SCAN ──────────────────────────────────────────────────────────────┐\n`

    const riskIcon =
      security.riskLevel === 'SAFE'
        ? '🟢'
        : security.riskLevel === 'CAUTION'
          ? '🟡'
          : security.riskLevel === 'DANGEROUS'
            ? '🔴'
            : '❓'

    report += `│ Risk Level: ${riskIcon} ${security.riskLevel}\n`

    if (security.message) {
      report += `│ ${security.message}\n`
    }

    if (security.findings.length > 0) {
      report += `│\n│ Findings:\n`
      for (const finding of security.findings.slice(0, 5)) {
        const lines = String(finding).split('\n')
        for (const line of lines.slice(0, 2)) {
          if (line.trim()) {
            report += `│ • ${line.substring(0, 72)}\n`
          }
        }
      }
      if (security.findings.length > 5) {
        report += `│ ... and ${security.findings.length - 5} more findings\n`
      }
    }

    report += `└────────────────────────────────────────────────────────────────────────────┘\n`
  }

  // Summary & Recommendation
  report += `\n┌─ RECOMMENDATION ─────────────────────────────────────────────────────────────┐\n`

  if (readiness === 'GO') {
    report += `│ ✅ Ready to install. No blocking issues detected.\n`
    report += `│\n`
    report += `│ Next step: npm install && clawdbot skill install\n`
  } else if (readiness === 'CAUTION') {
    report += `│ ⚠️  Proceed with caution. Review all issues above.\n`
    report += `│\n`
    report += `│ Actions before installation:\n`

    if (deps.missingCLITools.length > 0) {
      report += `│ 1. Install missing CLI tools (see above)\n`
    }
    if (deps.missingApiKeys.length > 0) {
      report += `│ 2. Configure missing API keys in TOOLS.md\n`
    }
    if (conflicts.warnings.length > 0) {
      report += `│ 3. Review conflicts and ensure no port/command collisions\n`
    }
    if (security.riskLevel === 'CAUTION') {
      report += `│ 4. Review security findings and audit code if needed\n`
    }
  } else {
    report += `│ ❌ BLOCKED - Do not install.\n`
    report += `│\n`
    report += `│ Issues preventing installation:\n`

    if (sysReqs.issues.length > 0) {
      report += `│ • System requirements not met (OS/arch/Node version)\n`
    }
    if (security.riskLevel === 'DANGEROUS') {
      report += `│ • Security risk detected (dangerous patterns found)\n`
    }
    if (conflicts.conflicts.length > 0) {
      report += `│ • Skill name conflict with existing installation\n`
    }
  }

  report += `└────────────────────────────────────────────────────────────────────────────┘\n`

  return report
}

function formatJsonReport(skillPath, results) {
  const readiness = determineReadiness(results)

  const skillMd = path.join(skillPath, 'SKILL.md')
  const meta = fs.existsSync(skillMd)
    ? parseMarkdownFrontmatter(fs.readFileSync(skillMd, 'utf8'))
    : {}

  return {
    skill: {
      name: meta.name || path.basename(skillPath),
      path: skillPath,
      description: meta.description || '',
    },
    readiness,
    timestamp: new Date().toISOString(),
    system: getSystemInfo(),
    conflicts: results.conflicts,
    systemRequirements: results.sysReqs,
    dependencies: results.deps,
    security: {
      riskLevel: results.security.riskLevel,
      findings: results.security.findings,
      message: results.security.message,
    },
    recommendation: generateRecommendation(readiness, results),
  }
}

function generateRecommendation(readiness, results) {
  const steps = []

  if (readiness === 'GO') {
    return 'Ready to install. No blocking issues detected.'
  }

  if (results.sysReqs.issues.length > 0) {
    steps.push('System requirements not met - cannot install on this system')
  }

  if (results.deps.missingCLITools.length > 0) {
    steps.push(`Install ${results.deps.missingCLITools.length} missing CLI tool(s)`)
  }

  if (results.deps.missingApiKeys.length > 0) {
    steps.push(`Configure ${results.deps.missingApiKeys.length} missing API key(s)`)
  }

  if (results.conflicts.conflicts.length > 0) {
    steps.push('Resolve skill name conflicts')
  }

  if (results.conflicts.warnings.length > 0) {
    steps.push('Review port/CLI command conflicts')
  }

  if (results.security.riskLevel === 'DANGEROUS') {
    steps.push('Security risk detected - review and audit code')
  }

  if (results.security.riskLevel === 'CAUTION') {
    steps.push('Review security findings before proceeding')
  }

  if (readiness === 'BLOCKED') {
    return `Cannot install: ${steps.join('; ')}`
  }

  return steps.join('; ') || 'Ready to install'
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Skill Compatibility Checker

USAGE:
  skill-compatibility-checker <skill-path> [options]

ARGUMENTS:
  skill-path                Path to skill (local or clawdhub:skill-name)
                           Examples:
                           - ~/clawd/my-skill
                           - /path/to/skill-directory
                           - clawdhub:skill-name (not yet implemented)

OPTIONS:
  --output, -o FORMAT       Output format: text (default) or json
  --help, -h               Show this help message

EXAMPLES:
  # Check a local skill
  skill-compatibility-checker ~/clawd/my-skill

  # Output as JSON for programmatic use
  skill-compatibility-checker ~/clawd/my-skill --output json

  # Check from ClawdHub (not yet implemented)
  skill-compatibility-checker clawdhub:security-scanner
`)
    process.exit(0)
  }

  const skillPath = args[0]
  const outputFormat =
    args.includes('--output') || args.includes('-o')
      ? args[args.indexOf(args.find((a) => a === '--output' || a === '-o')) + 1] || 'text'
      : 'text'

  if (!OUTPUT_FORMATS.includes(outputFormat)) {
    console.error(`Invalid output format: ${outputFormat}`)
    process.exit(1)
  }

  try {
    const resolvedPath = resolveSkillPath(skillPath)

    if (!fs.existsSync(path.join(resolvedPath, 'SKILL.md'))) {
      console.error(
        `Error: ${resolvedPath} does not appear to be a Clawdbot skill (no SKILL.md found)`,
      )
      process.exit(1)
    }

    // Run all checks
    const installed = getInstalledSkills()
    const conflicts = checkConflicts(resolvedPath, installed)
    const sysReqs = checkSystemRequirements(resolvedPath)
    const deps = checkDependencies(resolvedPath)
    const security = runSecurityScan(resolvedPath)

    const results = {
      conflicts,
      sysReqs,
      deps,
      security,
      installed,
    }

    // Output report
    if (outputFormat === 'json') {
      console.log(JSON.stringify(formatJsonReport(resolvedPath, results), null, 2))
    } else {
      console.log(formatTextReport(resolvedPath, results))
    }

    // Exit code based on readiness
    const readiness = determineReadiness(results)
    if (readiness === 'BLOCKED') {
      process.exit(2)
    } else if (readiness === 'CAUTION') {
      process.exit(1)
    } else {
      process.exit(0)
    }
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  checkConflicts,
  checkSystemRequirements,
  checkDependencies,
  runSecurityScan,
  determineReadiness,
  formatTextReport,
  formatJsonReport,
}
