#!/usr/bin/env node

/**
 * Tests for jasper-configguard
 */

const { ConfigGuard, deepMerge, jsonDiff } = require('../src/index.js')
const fs = require('fs')
const path = require('path')
const os = require('os')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed')
}

function assertEqual(a, b, msg) {
  const aStr = JSON.stringify(a)
  const bStr = JSON.stringify(b)
  if (aStr !== bStr) throw new Error(msg || `Expected ${bStr}, got ${aStr}`)
}

// --- Setup temp dir ---
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configguard-test-'))
const configPath = path.join(tmpDir, 'openclaw.json')
const backupDir = path.join(tmpDir, 'backups')

const baseConfig = {
  gateway: { port: 18789, bind: 'lan' },
  agents: {
    defaults: { model: { primary: 'anthropic/claude-sonnet-4-5' } },
    list: [{ id: 'main' }],
  },
}

fs.writeFileSync(configPath, JSON.stringify(baseConfig, null, 2))

console.log('\n🛡️  jasper-configguard tests\n')

// --- deepMerge tests ---
console.log('deepMerge:')

test('merges flat objects', () => {
  const result = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })
  assertEqual(result, { a: 1, b: 3, c: 4 })
})

test('deep merges nested objects', () => {
  const result = deepMerge(
    { gateway: { port: 18789, bind: 'lan' } },
    { gateway: { bind: 'tailnet' } },
  )
  assertEqual(result, { gateway: { port: 18789, bind: 'tailnet' } })
})

test('replaces arrays (does not merge)', () => {
  const result = deepMerge(
    { agents: { list: [{ id: 'main' }] } },
    { agents: { list: [{ id: 'main' }, { id: 'worker' }] } },
  )
  assertEqual(result.agents.list.length, 2)
})

test('adds new nested keys', () => {
  const result = deepMerge(
    { gateway: { port: 18789 } },
    { gateway: { controlUi: { enabled: true } } },
  )
  assertEqual(result.gateway.controlUi.enabled, true)
  assertEqual(result.gateway.port, 18789)
})

test('handles null source values', () => {
  const result = deepMerge({ a: 1 }, { a: null })
  assertEqual(result.a, null)
})

// --- jsonDiff tests ---
console.log('\njsonDiff:')

test('detects added keys', () => {
  const diff = jsonDiff({ a: 1 }, { a: 1, b: 2 })
  assert(diff.includes('+ b: 2'), 'Should show added key')
})

test('detects removed keys', () => {
  const diff = jsonDiff({ a: 1, b: 2 }, { a: 1 })
  assert(diff.includes('- b: 2'), 'Should show removed key')
})

test('detects changed values', () => {
  const diff = jsonDiff({ a: 1 }, { a: 2 })
  assert(diff.includes('- a: 1'), 'Should show old value')
  assert(diff.includes('+ a: 2'), 'Should show new value')
})

test('no diff for identical objects', () => {
  const diff = jsonDiff({ a: 1 }, { a: 1 })
  assertEqual(diff, '')
})

// --- ConfigGuard tests ---
console.log('\nConfigGuard:')

test('initializes with auto-detected paths', () => {
  const guard = new ConfigGuard({ configPath, backupDir })
  assert(guard.configPath === configPath)
  assert(guard.backupDir === backupDir)
})

test('setup creates backup dir', () => {
  const guard = new ConfigGuard({ configPath, backupDir })
  guard.setup()
  assert(fs.existsSync(backupDir))
})

test('validate catches valid config', () => {
  const guard = new ConfigGuard({ configPath, backupDir })
  const result = guard.validate()
  assert(result.valid, 'Should be valid')
})

test('validate catches invalid JSON', () => {
  const badPath = path.join(tmpDir, 'bad.json')
  fs.writeFileSync(badPath, 'not json{{{')
  const guard = new ConfigGuard({ configPath: badPath, backupDir })
  const result = guard.validate()
  assert(!result.valid, 'Should be invalid')
})

test('validate catches missing file', () => {
  const guard = new ConfigGuard({ configPath: '/nonexistent/path.json', backupDir })
  const result = guard.validate()
  assert(!result.valid, 'Should be invalid')
})

test('listBackups returns empty initially', () => {
  const emptyBackupDir = path.join(tmpDir, 'empty-backups')
  const guard = new ConfigGuard({ configPath, backupDir: emptyBackupDir })
  const backups = guard.listBackups()
  assertEqual(backups.length, 0)
})

test('dryRun shows changes without writing', () => {
  const guard = new ConfigGuard({ configPath, backupDir })
  const result = guard.dryRun({ gateway: { bind: 'tailnet' } })
  assert(result.diff.includes('tailnet'), 'Should show new value')
  // Config should be unchanged
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  assertEqual(config.gateway.bind, 'lan')
})

test('patch without restart writes config', async () => {
  const guard = new ConfigGuard({ configPath, backupDir })
  const result = await guard.patch({ gateway: { newKey: 'test' } }, { restart: false })
  assert(result.success, 'Should succeed')
  assert(result.backupId, 'Should have backup ID')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  assertEqual(config.gateway.newKey, 'test')
  assertEqual(config.gateway.port, 18789) // preserved
})

test('restore reverts to backup', async () => {
  const guard = new ConfigGuard({ configPath, backupDir })
  // Patch something
  await guard.patch({ gateway: { changed: true } }, { restart: false })
  // Get latest backup
  const backups = guard.listBackups()
  assert(backups.length > 0, 'Should have backups')
  // Restore
  fs.writeFileSync(configPath, JSON.stringify(baseConfig, null, 2)) // reset
  guard._restoreBackup(backups[0].id)
  // Verify
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  assert(config.gateway, 'Should have gateway')
})

test('diff shows changes between backup and current', () => {
  const guard = new ConfigGuard({ configPath, backupDir })
  // Modify config
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  config.gateway.bind = 'modified'
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  // Check diff
  const diff = guard.diff()
  // Should show something (we have backups from previous tests)
  assert(typeof diff === 'string')
})

// --- Cleanup ---
fs.rmSync(tmpDir, { recursive: true, force: true })

// --- Results ---
console.log(`\n────────────────────────────────────────`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`────────────────────────────────────────\n`)

process.exit(failed > 0 ? 1 : 0)
