const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const SERVICE = 'com.openclaw.stranger-danger'
const ACCOUNT = 'openclaw'
const LEGACY_SERVICE = 'com.clawdbot.stranger-danger'
const LEGACY_ACCOUNT = 'clawdbot'

async function findHash(service, account) {
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-a',
      account,
      '-s',
      service,
      '-w',
    ])
    return stdout.trim()
  } catch (err) {
    if (typeof err?.stderr === 'string' && err.stderr.includes('could not be found')) {
      return null
    }
    // security returns non-zero when not found; normalize to null
    if (err?.code === 44) {
      return null
    }
    throw err
  }
}

async function deleteHashFor(service, account) {
  try {
    await execFileAsync('security', ['delete-generic-password', '-a', account, '-s', service])
  } catch (err) {
    if (typeof err?.stderr === 'string' && err.stderr.includes('could not be found')) {
      return
    }
    if (err?.code === 44) {
      return
    }
    throw err
  }
}

async function setHash(hash) {
  // Store bcrypt hash in macOS Keychain
  await execFileAsync('security', [
    'add-generic-password',
    '-a',
    ACCOUNT,
    '-s',
    SERVICE,
    '-w',
    hash,
    '-U',
  ])
}

async function getHash() {
  const hash = await findHash(SERVICE, ACCOUNT)
  if (hash) {
    return hash
  }
  const legacyHash = await findHash(LEGACY_SERVICE, LEGACY_ACCOUNT)
  if (!legacyHash) {
    return null
  }
  await setHash(legacyHash)
  await deleteHashFor(LEGACY_SERVICE, LEGACY_ACCOUNT)
  return legacyHash
}

async function deleteHash() {
  await deleteHashFor(SERVICE, ACCOUNT)
}

module.exports = {
  SERVICE,
  ACCOUNT,
  setHash,
  getHash,
  deleteHash,
}
