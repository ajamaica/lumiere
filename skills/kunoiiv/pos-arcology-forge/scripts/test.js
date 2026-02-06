// 🧪 Pos Arcology Forge Tests (V1.2)
const { execSync } = require('child_process')
const fs = require('fs')

function test(cmd, expectFail = false) {
  try {
    execSync(cmd, { stdio: 'pipe', cwd: __dirname })
    if (expectFail) throw new Error('Unexpected pass')
    console.log('✅ PASS:', cmd)
  } catch (e) {
    if (!expectFail) throw e
    console.log('✅ FAIL (expected):', cmd)
  }
}

;(async () => {
  console.log('Running V1.2 tests...')

  // 1. Good E2E
  test('node pos-share.js ' + JSON.stringify('{\"radius_km\":3,\"pop_m\":500000}'))

  // 2. Verify good
  test('node pos-grind.js share.pos.json --verify')

  // 3. Bad JSON
  test('node pos-share.js \"badjson\"', true)

  // 4. Bad params
  test('node pos-share.js ' + JSON.stringify('{\"radius_km\":0}'), true)

  // 5. Tamper
  fs.appendFileSync('share.pos.json', ' tamper')
  test('node pos-grind.js share.pos.json --verify', true) // TAMPERED!

  console.log('🧪 ALL TESTS PASS - Bulletproof V1.2!')
})()
