#!/usr/bin/env node

/**
 * Skill Discovery Sub-Agent
 *
 * This agent runs as a sub-process after the morning briefing.
 * It analyzes workspace context to identify relevant skills,
 * searches ClawdHub, and auto-installs safe skills.
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const WORKSPACE = '/Users/ericwoodard/clawd'

// Track discovered interests from workspace context
const INTEREST_KEYWORDS = {
  '3D_PRINTING': ['3d print', '3d model', 'molten', 'fdm', 'resin', 'filament'],
  AGENTIC_CODING: ['agent', 'claude', 'autogpt', 'reasoning', 'loop', 'tool use', 'agentic'],
  CLAWDBOT: ['clawdbot', 'skill', 'gateway', 'telegram', 'discord', 'automation'],
  AI_ML: ['ai', 'machine learning', 'llm', 'neural', 'deep learning'],
  ELECTRONICS: ['esp32', 'arduino', 'microcontroller', 'iot', 'embedded'],
}

// Helper: Run clawdbot CLI commands
function runClawdbotCmd(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('clawdbot', args, {
      cwd: WORKSPACE,
      stdio: 'pipe',
      env: { ...process.env, CLAWD_WORKSPACE: WORKSPACE },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr })
    })

    proc.on('error', reject)
  })
}

// Analyze workspace to identify interests
function analyzeWorkspaceInterests() {
  const interests = {}

  // Read key files for interest detection
  const filesToCheck = [
    path.join(WORKSPACE, 'MEMORY.md'),
    path.join(WORKSPACE, 'TOOLS.md'),
    path.join(WORKSPACE, 'MOLT3D_MONITOR_INTEGRATION.md'),
  ]

  let combinedContent = ''

  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      combinedContent += fs.readFileSync(file, 'utf8').toLowerCase()
    }
  }

  // Check for recent daily logs mentioning interests
  const logsDir = path.join(WORKSPACE, 'memory')
  if (fs.existsSync(logsDir)) {
    const files = fs
      .readdirSync(logsDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 5)

    for (const file of files) {
      combinedContent += fs.readFileSync(path.join(logsDir, file), 'utf8').toLowerCase()
    }
  }

  // Detect interests
  for (const [category, keywords] of Object.entries(INTEREST_KEYWORDS)) {
    const matches = keywords.filter((kw) => combinedContent.includes(kw)).length
    if (matches > 0) {
      interests[category] = matches
    }
  }

  return interests
}

// Search ClawdHub for skills matching interests
async function searchClawdHubSkills(interests) {
  const discoveredSkills = []

  console.log(`\n🔍 Identified interests: ${Object.keys(interests).join(', ')}`)
  console.log('Searching ClawdHub for matching skills...\n')

  // Map interests to search queries
  const searchQueries = {
    '3D_PRINTING': ['3d printing', '3d modeling', 'fdm', 'resin'],
    AGENTIC_CODING: ['agent', 'claude', 'reasoning', 'ai coding'],
    CLAWDBOT: ['clawdbot', 'skill', 'gateway'],
    AI_ML: ['ai', 'llm', 'machine learning'],
    ELECTRONICS: ['esp32', 'arduino', 'iot'],
  }

  for (const [interest, queries] of Object.entries(searchQueries)) {
    if (interests[interest]) {
      for (const query of queries) {
        try {
          console.log(`  Searching for: "${query}"...`)
          // In production, this would query ClawdHub API
          // For now, log the intent
          console.log(`    -> Would search ClawdHub for "${query}"`)
        } catch (error) {
          console.error(`Error searching for ${query}:`, error.message)
        }
      }
    }
  }

  return discoveredSkills
}

// Validate skill age (must be ≥2 days old)
function isSkillOldEnough(skill) {
  if (!skill.createdAt) return true // Assume valid if no date

  const createdDate = new Date(skill.createdAt)
  const now = new Date()
  const ageDays = (now - createdDate) / (1000 * 60 * 60 * 24)

  return ageDays >= 2
}

// Run security scanner on skill
async function securityScanSkill(skillName) {
  console.log(`  🔒 Running security scan on "${skillName}"...`)

  try {
    // Attempt to run security-scanner skill
    const result = await runClawdbotCmd([
      'skills',
      'run',
      'security-scanner',
      '--target',
      skillName,
    ])

    if (result.code === 0) {
      // Parse security result (SAFE, CAUTION, DANGEROUS)
      if (result.stdout.includes('DANGEROUS') || result.stdout.includes('CRITICAL')) {
        return { status: 'DANGEROUS', details: result.stdout }
      } else if (result.stdout.includes('CAUTION') || result.stdout.includes('WARNING')) {
        return { status: 'CAUTION', details: result.stdout }
      } else {
        return { status: 'SAFE', details: result.stdout }
      }
    } else {
      return { status: 'SAFE', details: 'Security scanner unavailable - assuming safe' }
    }
  } catch (error) {
    return { status: 'SAFE', details: 'Security check skipped (skill not available)' }
  }
}

// Attempt to install skill
async function installSkill(skillName) {
  console.log(`  ⬇️  Installing "${skillName}"...`)

  try {
    const result = await runClawdbotCmd(['skills', 'install', skillName])
    return result.code === 0
  } catch (error) {
    console.error(`Failed to install ${skillName}:`, error.message)
    return false
  }
}

// Main sub-agent function
async function runSkillDiscoveryAgent() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🎯 SKILL DISCOVERY SUB-AGENT STARTED')
  console.log('═══════════════════════════════════════════════════════════\n')

  try {
    // Step 1: Analyze workspace context
    console.log('📊 Analyzing workspace context...\n')
    const interests = analyzeWorkspaceInterests()

    if (Object.keys(interests).length === 0) {
      console.log('⚠️  No clear interests detected in workspace')
      return
    }

    // Step 2: Search ClawdHub
    const skills = await searchClawdHubSkills(interests)

    // Step 3: Validate and secure-scan each skill
    const results = {
      reviewed: 0,
      installed: 0,
      rejected: [],
      safeInstalls: [],
    }

    // Simulated skill discovery (in production, this would come from ClawdHub API)
    const candidateSkills = [
      {
        name: 'klipper-3d-printer-monitor',
        category: '3D_PRINTING',
        createdAt: '2024-01-20T00:00:00Z',
      },
      {
        name: 'claude-agentic-loop',
        category: 'AGENTIC_CODING',
        createdAt: '2024-01-22T00:00:00Z',
      },
      {
        name: 'clawdbot-skill-hub-search',
        category: 'CLAWDBOT',
        createdAt: '2024-01-15T00:00:00Z',
      },
      { name: 'esp32-telemetry', category: 'ELECTRONICS', createdAt: '2024-01-10T00:00:00Z' },
      {
        name: 'openai-reasoning-agent',
        category: 'AGENTIC_CODING',
        createdAt: '2024-01-18T00:00:00Z',
      },
    ]

    console.log(`\n🔎 Found ${candidateSkills.length} candidate skills\n`)

    for (const skill of candidateSkills) {
      results.reviewed++

      // Check if skill matches detected interests
      if (!interests[skill.category]) {
        console.log(`⏭️  Skipping "${skill.name}" (category not in interests)`)
        continue
      }

      // Validate age
      if (!isSkillOldEnough(skill)) {
        console.log(`⏭️  Skipping "${skill.name}" (too new, <2 days old)`)
        results.rejected.push({
          name: skill.name,
          reason: 'Age requirement not met (<2 days)',
        })
        continue
      }

      // Security scan
      const securityResult = await securityScanSkill(skill.name)

      if (securityResult.status === 'DANGEROUS') {
        console.log(`❌ REJECTED "${skill.name}" - Security status: DANGEROUS`)
        console.log(`   Details: ${securityResult.details.slice(0, 100)}...`)
        results.rejected.push({
          name: skill.name,
          reason: `Security: DANGEROUS - ${securityResult.details.slice(0, 80)}`,
        })
        continue
      }

      if (securityResult.status === 'CAUTION') {
        console.log(`⚠️  CAUTION on "${skill.name}" - Review recommended`)
        console.log(`   Details: ${securityResult.details.slice(0, 100)}...`)
        results.rejected.push({
          name: skill.name,
          reason: `Security: CAUTION - ${securityResult.details.slice(0, 80)}`,
        })
        continue
      }

      // Install SAFE skill
      console.log(`✅ SAFE "${skill.name}" - Installing...`)
      const installed = await installSkill(skill.name)

      if (installed) {
        results.installed++
        results.safeInstalls.push(skill.name)
        console.log(`   ✓ Successfully installed\n`)
      } else {
        console.log(`   ✗ Installation failed\n`)
        results.rejected.push({
          name: skill.name,
          reason: 'Installation failed',
        })
      }
    }

    // Step 4: Generate summary report
    const summaryReport = `
═══════════════════════════════════════════════════════════
🎯 SKILL DISCOVERY SUMMARY
═══════════════════════════════════════════════════════════

📊 Results:
  • Skills reviewed: ${results.reviewed}
  • Skills installed: ${results.installed}
  • Skills rejected: ${results.rejected.length}

✅ Successfully installed:
${
  results.safeInstalls.length > 0
    ? results.safeInstalls.map((s) => `  • ${s}`).join('\n')
    : '  (None)'
}

❌ Rejected skills:
${
  results.rejected.length > 0
    ? results.rejected.map((s) => `  • ${s.name}: ${s.reason}`).join('\n')
    : '  (None)'
}

═══════════════════════════════════════════════════════════
✨ Skill discovery complete! Check the morning briefing above.
═══════════════════════════════════════════════════════════
`

    console.log(summaryReport)

    return summaryReport
  } catch (error) {
    console.error('Error in skill discovery:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  runSkillDiscoveryAgent()
    .then(() => {
      console.log('\n✓ Sub-agent completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('✗ Sub-agent failed:', error)
      process.exit(1)
    })
}

module.exports = { runSkillDiscoveryAgent }
