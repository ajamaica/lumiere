const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const semver = require('semver')

// Parse args manually to avoid heavy deps if possible, or use yargs if installed.
// Minimal argument parsing:
const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(name)
  return idx !== -1 ? args[idx + 1] : null
}

const skillPath = getArg('--path')
const remoteUrl = getArg('--remote')
const bumpType = getArg('--bump') || 'patch'
const notes = getArg('--notes') || 'Auto-release'

if (!skillPath || !remoteUrl) {
  console.error(
    "Usage: node index.js --path <skill_dir> --remote <git_url> [--bump patch|minor|major] [--notes '...']",
  )
  process.exit(1)
}

const absSkillPath = path.resolve(process.cwd(), skillPath)
const pkgPath = path.join(absSkillPath, 'package.json')

if (!fs.existsSync(pkgPath)) {
  console.error(`Error: package.json not found in ${absSkillPath}`)
  process.exit(1)
}

try {
  // 1. Read and Bump Version
  console.log(`📦 Preparing release for ${skillPath}...`)
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const oldVersion = pkg.version
  const newVersion = semver.inc(oldVersion, bumpType) || bumpType // Support explicit version

  if (!semver.valid(newVersion)) {
    throw new Error(`Invalid version: ${newVersion}`)
  }

  console.log(`🆙 Bumping version: ${oldVersion} -> ${newVersion}`)
  pkg.version = newVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  // 2. Git Commit (Local Workspace)
  console.log(`💾 Committing version bump...`)
  execSync(`git add "${pkgPath}"`, { stdio: 'inherit' })
  execSync(`git commit -m "chore(${path.basename(skillPath)}): release v${newVersion}"`, {
    stdio: 'inherit',
  })

  // 3. GitHub Release (via skill-publisher)
  console.log(`🚀 Publishing to GitHub (${remoteUrl})...`)
  const publisherPath = path.resolve(__dirname, '../skill-publisher/index.js')
  const pubCmd = `node "${publisherPath}" publish "${skillPath}" --remote "${remoteUrl}" --branch main --release --tag "v${newVersion}" --notes "${notes}"`
  execSync(pubCmd, { stdio: 'inherit' })

  // 4. ClawHub Publish
  console.log(`🦀 Publishing to ClawHub...`)
  try {
    // Check if clawhub is logged in (simple check)
    execSync('clawhub whoami', { stdio: 'ignore' })

    // Execute publish
    execSync(`clawhub publish "${skillPath}" --version "${newVersion}" --yes`, { stdio: 'inherit' })
    console.log(`✅ ClawHub Publish Successful!`)
  } catch (e) {
    console.error(`⚠️ ClawHub Publish Failed!`)
    console.error(`ERROR DETAILS: ${e.message}`)
    if (e.stderr) console.error(`STDERR: ${e.stderr.toString()}`)
    console.warn(`   To fix: Run 'clawhub login' or set CLAWHUB_AUTH token.`)
  }

  console.log(`\n🎉 Release v${newVersion} Complete!`)
} catch (e) {
  console.error(`❌ Release Failed: ${e.message}`)
  process.exit(1)
}
