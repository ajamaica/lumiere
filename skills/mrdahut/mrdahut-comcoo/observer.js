const os = require('os')
const level = process.argv[2] || '1'
const nodeID = os.hostname()

console.log(`
🛰️ ARBITER TELEMETRY SYNC
-------------------------
NODE: ${nodeID}
LEVEL: ${level}
STATUS: ${level >= 3 ? 'CONSTELLATION_ACTIVE' : 'LOCAL_BOOTSTRAP'}
-------------------------
[Signal broadcasted to the @MrDahut Justice Floor]
`)
