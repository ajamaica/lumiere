const fs = require('fs')
const path = require('path')

// --- Configuration ---
const DB_PATH = path.resolve(__dirname, '../../memory/user_registry.json')

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
  console.log(`✅ Registry saved to ${DB_PATH}`)
}

// --- Commands ---

function lookup(id) {
  const db = loadDB()
  const user = db[id]
  if (user) {
    console.log(JSON.stringify(user, null, 2))
  } else {
    console.log(`User not found: ${id}`)
    // Fallback: Check USER.md content if simple lookup fails?
    // For now, strict DB only to avoid ambiguity.
  }
}

function register(args) {
  const idArg = args.indexOf('--id')
  const nameArg = args.indexOf('--name')
  const roleArg = args.indexOf('--role')
  const aliasArg = args.indexOf('--alias')

  if (idArg === -1 || nameArg === -1) {
    console.error('Usage: register --id <ou_...> --name <Name> [--role <Role>] [--alias <Alias>]')
    process.exit(1)
  }

  const id = args[idArg + 1]
  const name = args[nameArg + 1]
  const role = roleArg !== -1 ? args[roleArg + 1] : 'User'
  const alias = aliasArg !== -1 ? args[aliasArg + 1] : ''

  const db = loadDB()
  db[id] = {
    id,
    name,
    role,
    alias,
    updatedAt: new Date().toISOString(),
  }
  saveDB(db)
  console.log(`Registered: ${name} (${id})`)
}

function list() {
  const db = loadDB()
  console.table(
    Object.values(db).map((u) => ({
      Name: u.name,
      Role: u.role,
      Alias: u.alias,
      ID: u.id,
    })),
  )
}

// --- CLI Entry ---
const cmd = process.argv[2]
const args = process.argv.slice(3)

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
}

switch (cmd) {
  case 'lookup':
    lookup(args[0])
    break
  case 'register':
    register(args)
    break
  case 'list':
    list()
    break
  default:
    console.log('Commands: lookup <id>, register --id ... --name ..., list')
}
