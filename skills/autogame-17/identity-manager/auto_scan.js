const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// --- Configuration ---
const DB_PATH = path.resolve(__dirname, '../../memory/user_registry.json')
const GROUP_INTEL_SCRIPT = path.resolve(__dirname, '../group-intel/fetch.js')

// --- Helpers ---
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch (e) {
    console.error('Error reading DB:', e.message)
    return {}
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) // ignore stderr to keep clean
  } catch (e) {
    // console.error(`Command failed: ${cmd}`);
    return null
  }
}

// --- Main ---
function scan() {
  console.log('🔍 Starting Global Identity Scan...')

  // 1. Get Groups
  console.log('📂 Fetching group list...')
  const groupsJson = runCommand(`node "${GROUP_INTEL_SCRIPT}" list`)
  if (!groupsJson) {
    console.error('❌ Failed to fetch groups.')
    return
  }

  let groups = []
  try {
    groups = JSON.parse(groupsJson)
  } catch (e) {
    console.error('❌ Invalid JSON from group list')
    return
  }

  console.log(`✅ Found ${groups.length} groups.`)

  // 2. Load DB
  const db = loadDB()
  let newCount = 0
  let totalScanned = 0

  // 3. Scan each group
  for (const group of groups) {
    // console.log(`  > Scanning group: ${group.name} (${group.chat_id})...`);
    const membersJson = runCommand(`node "${GROUP_INTEL_SCRIPT}" members "${group.chat_id}"`)

    if (!membersJson) continue

    let members = []
    try {
      members = JSON.parse(membersJson)
    } catch (e) {
      continue
    }

    for (const member of members) {
      totalScanned++
      if (!db[member.id]) {
        // Register new user
        db[member.id] = {
          id: member.id,
          name: member.name,
          role: 'User (Auto-Scanned)',
          alias: '',
          firstSeen: new Date().toISOString(),
          sourceGroup: group.name,
        }
        newCount++
        console.log(`    🆕 Registered: ${member.name} (${member.id})`)
      } else {
        // Update name if missing or changed? (Optional, maybe skip to avoid overwriting aliases)
        // If they have no name recorded, update it
        if (!db[member.id].name) {
          db[member.id].name = member.name
          saveDB(db) // Save incremental
        }
      }
    }
  }

  // 4. Save
  if (newCount > 0) {
    saveDB(db)
    console.log(`\n🎉 Scan Complete. Registered ${newCount} new users.`)
  } else {
    console.log(`\n✨ Scan Complete. No new users found. (Total scanned: ${totalScanned})`)
  }
}

scan()
