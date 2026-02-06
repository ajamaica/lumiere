#!/usr/bin/env node
/**
 * Verify Package Readiness for ClawHub
 * Checks that no user-specific data is present
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
}

const { green, yellow, red, cyan, bright, reset } = colors

let passed = 0
let failed = 0
let warnings = 0

function check(name, condition, failMessage, warnMessage = null) {
  if (condition === true) {
    console.log(`${green}✅${reset} ${name}`)
    passed++
  } else if (warnMessage) {
    console.log(`${yellow}⚠️${reset}  ${name}`)
    console.log(`   ${yellow}${warnMessage}${reset}`)
    warnings++
  } else {
    console.log(`${red}❌${reset} ${name}`)
    console.log(`   ${red}${failMessage}${reset}`)
    failed++
  }
}

function checkFileNotExists(name, path, reason) {
  const exists = existsSync(path)
  check(name, !exists, `${path} exists (${reason})`)
}

function checkFileExists(name, path) {
  const exists = existsSync(path)
  check(name, exists, `${path} missing`)
}

function checkGitignore(pattern) {
  const gitignorePath = join(SKILL_DIR, '.gitignore')
  if (!existsSync(gitignorePath)) {
    check(`.gitignore contains ${pattern}`, false, '.gitignore file missing')
    return
  }

  const content = readFileSync(gitignorePath, 'utf8')
  const hasPattern = content.includes(pattern)
  check(
    `.gitignore excludes ${pattern}`,
    hasPattern,
    `${pattern} not in .gitignore (user data could be committed!)`,
  )
}

console.log('')
console.log(`${bright}${cyan}🔍 Verifying Package Readiness for ClawHub${reset}`)
console.log('='.repeat(60))
console.log('')

// 1. User data should NOT exist
console.log(`${bright}User Data (should NOT exist):${reset}`)
checkFileNotExists('No .env file', join(SKILL_DIR, '.env'), 'contains user credentials')
checkFileNotExists(
  'No config.json',
  join(SKILL_DIR, 'config.json'),
  'contains user-specific config',
)
checkFileNotExists(
  'No bookmarks.json state',
  join(SKILL_DIR, 'bookmarks.json'),
  'contains user processing state',
)

// Check bookmarks folder is empty
const bookmarksDir = join(SKILL_DIR, '../../life/resources/bookmarks')
if (existsSync(bookmarksDir)) {
  const files = readdirSync(bookmarksDir).filter((f) => f.endsWith('.json'))
  check(
    'No analyzed bookmarks',
    files.length === 0,
    `${files.length} bookmark files in ${bookmarksDir}`,
  )
} else {
  console.log(`${green}✅${reset} No bookmarks directory (will be created on first run)`)
  passed++
}

console.log('')

// 2. Required files SHOULD exist
console.log(`${bright}Required Files (should exist):${reset}`)
checkFileExists('package.json', join(SKILL_DIR, 'package.json'))
checkFileExists('SKILL.md documentation', join(SKILL_DIR, 'SKILL.md'))
checkFileExists('README.md', join(SKILL_DIR, 'README.md'))
checkFileExists('Setup wizard', join(SKILL_DIR, 'scripts/setup.js'))
checkFileExists('Uninstall script', join(SKILL_DIR, 'scripts/uninstall.js'))
checkFileExists('monitor.js', join(SKILL_DIR, 'monitor.js'))
checkFileExists('analyzer.js', join(SKILL_DIR, 'analyzer.js'))
checkFileExists('ecosystem.config.js', join(SKILL_DIR, 'ecosystem.config.js'))
checkFileExists('config.example.json', join(SKILL_DIR, 'config.example.json'))
checkFileExists('Example analysis', join(SKILL_DIR, 'examples/sample-analysis.json'))
checkFileExists('Example notification', join(SKILL_DIR, 'examples/sample-notification.md'))

console.log('')

// 3. .gitignore protection
console.log(`${bright}.gitignore Protection:${reset}`)
checkGitignore('.env')
checkGitignore('config.json')
checkGitignore('bookmarks.json')
checkGitignore('node_modules')

console.log('')

// 4. package.json scripts
console.log(`${bright}package.json Scripts:${reset}`)
const packageJson = JSON.parse(readFileSync(join(SKILL_DIR, 'package.json'), 'utf8'))
const requiredScripts = ['setup', 'test', 'start', 'daemon', 'uninstall']
for (const script of requiredScripts) {
  check(
    `Script: ${script}`,
    !!(packageJson.scripts && packageJson.scripts[script]),
    `package.json missing "${script}" script`,
  )
}

console.log('')

// 5. Example files are valid JSON
console.log(`${bright}Example Files Validity:${reset}`)
try {
  const exampleAnalysis = JSON.parse(
    readFileSync(join(SKILL_DIR, 'examples/sample-analysis.json'), 'utf8'),
  )
  check('sample-analysis.json is valid JSON', true, '')

  // Check structure
  const hasRequiredFields = !!(
    exampleAnalysis.bookmark &&
    exampleAnalysis.analysis &&
    exampleAnalysis.processedAt
  )

  check(
    'sample-analysis.json has correct structure',
    hasRequiredFields,
    'Missing required fields (bookmark, analysis, processedAt)',
  )
} catch (error) {
  check('sample-analysis.json is valid JSON', false, error.message)
}

console.log('')

// 6. No credentials in code
console.log(`${bright}Security Checks:${reset}`)
const filesToCheck = [
  'monitor.js',
  'analyzer.js',
  'scripts/setup.js',
  'scripts/uninstall.js',
  'config.example.json',
]

let foundCredentials = false
const suspiciousPatterns = [
  /auth_token["\s]*:["\s]*[a-f0-9]{30,}/i,
  /ct0["\s]*:["\s]*[a-f0-9]{30,}/i,
  /AUTH_TOKEN=[a-f0-9]{30,}/i,
  /CT0=[a-f0-9]{30,}/i,
]

for (const file of filesToCheck) {
  const filePath = join(SKILL_DIR, file)
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf8')
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        console.log(`${red}❌${reset} ${file} contains hardcoded credentials!`)
        console.log(`   ${red}Found pattern: ${pattern}${reset}`)
        foundCredentials = true
        failed++
      }
    }
  }
}

if (!foundCredentials) {
  console.log(`${green}✅${reset} No hardcoded credentials found in source files`)
  passed++
}

console.log('')
console.log('='.repeat(60))
console.log('')

// Summary
if (failed === 0 && warnings === 0) {
  console.log(`${green}${bright}🎉 Package is ready for ClawHub!${reset}`)
  console.log(`${green}   ${passed} checks passed${reset}`)
  console.log('')
  console.log('Next steps:')
  console.log('  1. Test fresh install: npm run setup')
  console.log('  2. Review TESTING_CHECKLIST.md')
  console.log('  3. Submit to ClawHub marketplace')
} else if (failed === 0) {
  console.log(`${yellow}${bright}⚠️  Package has warnings${reset}`)
  console.log(`${green}   ${passed} passed${reset}`)
  console.log(`${yellow}   ${warnings} warnings${reset}`)
  console.log('')
  console.log('Review warnings above. May still be ready for release.')
} else {
  console.log(`${red}${bright}❌ Package NOT ready for ClawHub${reset}`)
  console.log(`${green}   ${passed} passed${reset}`)
  console.log(`${yellow}   ${warnings} warnings${reset}`)
  console.log(`${red}   ${failed} failed${reset}`)
  console.log('')
  console.log('Fix issues above before publishing.')
  process.exit(1)
}

console.log('')
