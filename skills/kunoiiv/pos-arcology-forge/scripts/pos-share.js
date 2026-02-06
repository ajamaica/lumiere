const { execSync } = require('child_process')
const fs = require('fs').promises
const { grind } = require('./pos-grind.js')

;(async () => {
  const paramsStr = process.argv[2]
  if (!paramsStr) {
    console.log("Usage: node pos-share.js '{json params}'")
    process.exit(1)
  }
  try {
    const simRaw = execSync(`python scripts/arcology-sim.py "${paramsStr}"`, { encoding: 'utf8' })
    const sim = JSON.parse(simRaw.trim())
    await fs.writeFile('temp-sim.json', JSON.stringify(sim))
    console.log('Sim OK:', sim)
    await grind('temp-sim.json')
    await fs.unlink('temp-sim.json')
  } catch (e) {
    console.error('💥 Sim/Grind fail:', e.message)
  }
})()
