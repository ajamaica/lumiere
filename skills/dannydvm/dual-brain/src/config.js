const fs = require('fs')
const path = require('path')
const os = require('os')
const readline = require('readline')

const CONFIG_DIR = path.join(os.homedir(), '.dual-brain')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const STATE_FILE = path.join(CONFIG_DIR, 'state.json')
const PERSPECTIVE_DIR = path.join(CONFIG_DIR, 'perspectives')
const LOG_FILE = path.join(CONFIG_DIR, 'dual-brain.log')

const DEFAULTS = {
  provider: 'ollama',
  model: 'llama3.2',
  apiKey: '',
  pollInterval: 10000,
  perspectiveDir: PERSPECTIVE_DIR,
  ownerIds: [],
  maxTokens: 300,
  temperature: 0.7,
  engramIntegration: true,
  ollamaHost: 'http://localhost:11434',
  contextFile: '',
  logFile: LOG_FILE,
  pidFile: path.join(CONFIG_DIR, 'dual-brain.pid'),
  stateFile: STATE_FILE,
}

const PROVIDERS = {
  ollama: { name: 'Ollama (local, free)', needsKey: false, defaultModel: 'llama3.2' },
  moonshot: { name: 'Kimi / Moonshot', needsKey: true, defaultModel: 'moonshot-v1-auto' },
  openai: { name: 'OpenAI (GPT-4o)', needsKey: true, defaultModel: 'gpt-4o-mini' },
  groq: { name: 'Groq (fast, free tier)', needsKey: true, defaultModel: 'llama-3.1-70b-versatile' },
}

function ensureDirs() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.mkdirSync(PERSPECTIVE_DIR, { recursive: true })
}

function load() {
  ensureDirs()
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) }
    }
  } catch (e) {
    console.error(`Failed to parse config: ${e.message}`)
  }
  return { ...DEFAULTS }
}

// Alias for backward compatibility
const loadConfig = load

function save(config) {
  ensureDirs()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  } catch {}
  return { lastProcessed: {} }
}

function saveState(state) {
  ensureDirs()
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close()
      resolve(ans.trim())
    }),
  )
}

async function interactiveSetup() {
  console.log('\n🧠 Dual-Brain Setup\n')
  console.log('Choose your secondary LLM provider:\n')

  const providerKeys = Object.keys(PROVIDERS)
  providerKeys.forEach((key, i) => {
    console.log(`  ${i + 1}. ${PROVIDERS[key].name}`)
  })

  const choice = await ask('\nProvider [1]: ')
  const idx = Math.max(0, Math.min(providerKeys.length - 1, parseInt(choice || '1', 10) - 1))
  const provider = providerKeys[idx]
  const providerInfo = PROVIDERS[provider]

  let apiKey = ''
  if (providerInfo.needsKey) {
    apiKey = await ask(`API key for ${providerInfo.name}: `)
    if (!apiKey) {
      console.log('⚠️  No API key provided. You can add it later in ~/.dual-brain/config.json')
    }
  }

  const model = (await ask(`Model [${providerInfo.defaultModel}]: `)) || providerInfo.defaultModel
  const ownerInput = await ask('Your Discord/user ID(s) (comma-separated, optional): ')
  const ownerIds = ownerInput
    ? ownerInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const config = { ...DEFAULTS, provider, model, apiKey, ownerIds }
  save(config)

  console.log(`\n✅ Config saved to ${CONFIG_FILE}`)
  console.log(`   Provider: ${providerInfo.name}`)
  console.log(`   Model: ${model}`)
  console.log(
    `\nNext: dual-brain start (foreground) or dual-brain install-daemon (background service)`,
  )
}

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  STATE_FILE,
  PERSPECTIVE_DIR,
  LOG_FILE,
  DEFAULTS,
  PROVIDERS,
  load,
  loadConfig,
  save,
  loadState,
  saveState,
  ensureDirs,
  interactiveSetup,
}
