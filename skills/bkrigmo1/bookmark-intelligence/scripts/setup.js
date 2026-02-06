#!/usr/bin/env node
/**
 * Bookmark Intelligence Setup Wizard
 * Interactive setup for first-time users
 */

import { execSync } from 'child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

const { green, yellow, blue, red, cyan, bright, reset } = colors

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Promisify readline question
function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

// Print with color
function print(message, color = reset) {
  console.log(`${color}${message}${reset}`)
}

function printHeader(text) {
  console.log('')
  console.log(`${bright}${blue}${'='.repeat(60)}${reset}`)
  console.log(`${bright}${blue}${text}${reset}`)
  console.log(`${bright}${blue}${'='.repeat(60)}${reset}`)
  console.log('')
}

// Check if command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Check dependencies
async function checkDependencies() {
  printHeader('🔍 Checking Dependencies')

  const deps = [
    { name: 'bird', command: 'bird', installCmd: 'npm install -g bird', required: true },
    { name: 'pm2', command: 'pm2', installCmd: 'npm install -g pm2', required: false },
    { name: 'node', command: 'node', installCmd: 'Visit https://nodejs.org', required: true },
  ]

  const missing = []

  for (const dep of deps) {
    const exists = commandExists(dep.command)
    if (exists) {
      print(`✅ ${dep.name} is installed`, green)
    } else {
      print(`❌ ${dep.name} is NOT installed`, red)
      if (dep.required) {
        missing.push(dep)
      } else {
        print(`   (Optional: needed for daemon mode)`, yellow)
      }
    }
  }

  if (missing.length > 0) {
    console.log('')
    print('Missing required dependencies:', red)
    for (const dep of missing) {
      print(`  • ${dep.name}: ${dep.installCmd}`, yellow)
    }
    console.log('')
    const proceed = await ask('Continue anyway? (y/N): ')
    if (proceed.toLowerCase() !== 'y') {
      print('Setup cancelled. Please install dependencies and try again.', yellow)
      process.exit(1)
    }
  }

  console.log('')
}

// Show cookie extraction guide
function showCookieGuide() {
  printHeader('🍪 How to Get Your X (Twitter) Cookies')

  print(
    `
You need two cookies from X.com to use this skill:
  1. ${bright}auth_token${reset}
  2. ${bright}ct0${reset}

${bright}Step-by-step instructions:${reset}

${yellow}Chrome / Edge:${reset}
  1. Open ${cyan}https://x.com${reset} in your browser
  2. Make sure you're logged in
  3. Press ${bright}F12${reset} to open DevTools
  4. Click the ${bright}Application${reset} tab (or ${bright}Storage${reset} in Firefox)
  5. In the left sidebar, expand ${bright}Cookies${reset} → ${cyan}https://x.com${reset}
  6. Find ${bright}auth_token${reset} in the list, copy its ${bright}Value${reset}
  7. Find ${bright}ct0${reset} in the list, copy its ${bright}Value${reset}

${yellow}Firefox:${reset}
  1. Open ${cyan}https://x.com${reset}
  2. Press ${bright}F12${reset} to open DevTools
  3. Click ${bright}Storage${reset} tab
  4. Expand ${bright}Cookies${reset} → ${cyan}https://x.com${reset}
  5. Find and copy ${bright}auth_token${reset} and ${bright}ct0${reset} values

${yellow}Safari:${reset}
  1. Enable Developer menu: Safari → Preferences → Advanced → Show Develop menu
  2. Open ${cyan}https://x.com${reset}
  3. Develop → Show Web Inspector
  4. Storage tab → Cookies → x.com
  5. Copy ${bright}auth_token${reset} and ${bright}ct0${reset}

${red}⚠️  IMPORTANT:${reset}
  • These cookies are like your password - keep them secret!
  • Don't share them with anyone
  • They expire periodically - you'll need to update them
  • This skill stores them locally in .env (permissions: 600)

`,
    reset,
  )

  print('Cookie values are usually 40-100+ characters long.\n', yellow)
}

// Get credentials from user
async function getCredentials() {
  printHeader('🔐 X (Twitter) Credentials')

  showCookieGuide()

  print('Please paste your cookies below:\n', cyan)

  const authToken = await ask(`${bright}auth_token:${reset} `)
  const ct0 = await ask(`${bright}ct0:${reset} `)

  if (!authToken || authToken.length < 20) {
    print('\n❌ Invalid auth_token (too short)', red)
    return null
  }

  if (!ct0 || ct0.length < 20) {
    print('\n❌ Invalid ct0 (too short)', red)
    return null
  }

  return { authToken: authToken.trim(), ct0: ct0.trim() }
}

// Test credentials
async function testCredentials(authToken, ct0) {
  printHeader('🧪 Testing Credentials')

  print('Verifying your credentials with X...', yellow)

  try {
    // Test with bird whoami
    const cmd = `AUTH_TOKEN="${authToken}" CT0="${ct0}" bird whoami --json 2>&1`
    const result = execSync(cmd, { encoding: 'utf8', timeout: 15000 })

    // Parse response
    try {
      const data = JSON.parse(result)
      if (data.screen_name || data.username) {
        const username = data.screen_name || data.username
        print(`\n✅ Success! Logged in as @${username}`, green)
        return { success: true, username }
      }
    } catch {
      // bird might output differently, check for error patterns
      if (
        result.includes('error') ||
        result.includes('unauthorized') ||
        result.includes('invalid')
      ) {
        print(`\n❌ Authentication failed. Please check your cookies.`, red)
        return { success: false }
      }
      // If we got here, assume success (bird might have different output format)
      print(`\n✅ Credentials appear valid`, green)
      return { success: true }
    }
  } catch (error) {
    print(`\n❌ Error testing credentials: ${error.message}`, red)
    print('This might be a network issue or invalid cookies.', yellow)
    return { success: false }
  }

  return { success: false }
}

// Get user's projects and interests
async function getProjectContext() {
  printHeader('🎯 Your Projects & Interests')

  print(
    `
This skill analyzes bookmarks and relates them to YOUR interests.
The more specific you are, the better the AI can help!

${yellow}Examples:${reset}
  • Building a trading bot for crypto
  • Learning Rust and systems programming
  • Growing a SaaS product
  • AI agents and automation
  • Personal productivity tools

`,
    cyan,
  )

  const projects = []

  print('Enter your active projects (one per line, blank line to finish):\n', bright)

  let count = 1
  while (true) {
    const project = await ask(`${count}. `)
    if (!project.trim()) break
    projects.push(project.trim())
    count++
  }

  if (projects.length === 0) {
    print('\nNo projects specified. Using generic defaults.', yellow)
    return ['automation', 'productivity', 'learning']
  }

  print(`\n✅ Tracking ${projects.length} project(s)`, green)
  return projects
}

// Configure monitoring settings
async function configureSettings() {
  printHeader('⚙️  Monitoring Settings')

  print('\nHow many recent bookmarks should we check each time?', cyan)
  const bookmarkCount = (await ask(`Bookmark count (default: 50): `)) || '50'

  print('\nHow often should we check for new bookmarks (in minutes)?', cyan)
  const checkInterval = (await ask(`Check interval (default: 60): `)) || '60'

  print('\nSend Telegram notifications for important insights?', cyan)
  const notifyResponse = await ask(`Enable Telegram (y/N): `)
  const notifyTelegram = notifyResponse.toLowerCase() === 'y'

  return {
    bookmarkCount: parseInt(bookmarkCount),
    checkIntervalMinutes: parseInt(checkInterval),
    notifyTelegram,
  }
}

// Create .env file
function createEnvFile(authToken, ct0) {
  const envPath = join(SKILL_DIR, '.env')
  const content = `# X (Twitter) Credentials
# Keep these secret! Don't commit to git.

AUTH_TOKEN=${authToken}
CT0=${ct0}
`

  writeFileSync(envPath, content)
  chmodSync(envPath, 0o600) // Read/write for owner only

  print(`\n✅ Created .env file (permissions: 600)`, green)
  print(`   ${envPath}`, cyan)
}

// Create config.json
function createConfigFile(projects, settings) {
  const configPath = join(SKILL_DIR, 'config.json')

  const config = {
    credentialsFile: '.env',
    bookmarkCount: settings.bookmarkCount,
    checkIntervalMinutes: settings.checkIntervalMinutes,
    storageDir: '../../life/resources/bookmarks',
    notifyTelegram: settings.notifyTelegram,
    contextProjects: projects,
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2))

  print(`\n✅ Created config.json`, green)
  print(`   ${configPath}`, cyan)
}

// Show next steps
function showNextSteps(haspm2) {
  printHeader('🚀 Setup Complete!')

  print(
    `
${green}Your Bookmark Intelligence skill is ready!${reset}

${bright}Next steps:${reset}

1. ${yellow}Test the setup:${reset}
   ${cyan}cd skills/bookmark-intelligence${reset}
   ${cyan}npm test${reset}

2. ${yellow}Run once to process current bookmarks:${reset}
   ${cyan}npm start${reset}

`,
    reset,
  )

  if (haspm2) {
    print(
      `3. ${yellow}Run as background daemon (recommended):${reset}
   ${cyan}npm run daemon${reset}
   
   ${bright}Daemon management:${reset}
   ${cyan}pm2 status bookmark-intelligence${reset}  - Check status
   ${cyan}pm2 logs bookmark-intelligence${reset}    - View logs
   ${cyan}pm2 stop bookmark-intelligence${reset}    - Stop daemon
   ${cyan}pm2 restart bookmark-intelligence${reset} - Restart daemon

`,
      reset,
    )
  } else {
    print(
      `3. ${yellow}Install PM2 for background daemon mode:${reset}
   ${cyan}npm install -g pm2${reset}
   ${cyan}npm run daemon${reset}

`,
      reset,
    )
  }

  print(
    `${bright}Files created:${reset}
  • ${cyan}.env${reset} - Your credentials (keep secret!)
  • ${cyan}config.json${reset} - Your preferences
  • ${cyan}bookmarks.json${reset} - Processing state (auto-created on first run)

${bright}Where insights are stored:${reset}
  • ${cyan}life/resources/bookmarks/bookmark-*.json${reset}

${yellow}Need help?${reset} Check ${cyan}SKILL.md${reset} for troubleshooting.

`,
    reset,
  )
}

// Main setup flow
async function main() {
  try {
    printHeader('🔖 Bookmark Intelligence - Setup Wizard')

    print('Welcome! This wizard will help you set up Bookmark Intelligence.\n', cyan)

    // 1. Check dependencies
    await checkDependencies()

    const haspm2 = commandExists('pm2')

    // 2. Get credentials
    let credentials = null
    while (!credentials) {
      credentials = await getCredentials()
      if (!credentials) {
        console.log('')
        const retry = await ask('Try again? (Y/n): ')
        if (retry.toLowerCase() === 'n') {
          print('\nSetup cancelled.', yellow)
          rl.close()
          process.exit(1)
        }
      }
    }

    // 3. Test credentials
    const testResult = await testCredentials(credentials.authToken, credentials.ct0)
    if (!testResult.success) {
      const proceed = await ask('\nCredentials test failed. Continue anyway? (y/N): ')
      if (proceed.toLowerCase() !== 'y') {
        print('\nSetup cancelled.', yellow)
        rl.close()
        process.exit(1)
      }
    }

    // 4. Get project context
    const projects = await getProjectContext()

    // 5. Configure settings
    const settings = await configureSettings()

    // 6. Create files
    printHeader('📝 Creating Configuration Files')
    createEnvFile(credentials.authToken, credentials.ct0)
    createConfigFile(projects, settings)

    // 7. Ensure storage directory exists
    const storageDir = join(SKILL_DIR, '../../life/resources/bookmarks')
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true })
      print(`\n✅ Created storage directory: ${storageDir}`, green)
    }

    // 8. Show next steps
    showNextSteps(haspm2)

    rl.close()
  } catch (error) {
    print(`\n\n❌ Setup failed: ${error.message}`, red)
    console.error(error.stack)
    rl.close()
    process.exit(1)
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  print('\n\nSetup cancelled.', yellow)
  rl.close()
  process.exit(0)
})

main()
