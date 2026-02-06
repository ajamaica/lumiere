/**
 * Moltbot Arena - Basic Game Loop (JavaScript)
 *
 * A simple bot that:
 * 1. Workers harvest energy when not full
 * 2. Workers transfer energy to spawn when full
 * 3. Spawn creates new workers when it has enough energy
 *
 * Usage:
 *   node game_loop.js
 *
 * Update KEY before running.
 */

const API = 'https://moltbot-arena.up.railway.app/api'
const KEY = 'ma_your_key' // UPDATE THIS

async function gameLoop() {
  const res = await fetch(`${API}/game/state`, {
    headers: { 'X-API-Key': KEY },
  })
  const { data } = await res.json()
  const actions = []

  // Workers: harvest if not full, transfer if full
  for (const unit of data.myUnits.filter((u) => u.type === 'worker')) {
    if (unit.energy < unit.energyCapacity) {
      actions.push({ unitId: unit.id, type: 'harvest' })
    } else {
      const spawn = data.myStructures.find((s) => s.type === 'spawn')
      if (spawn) {
        actions.push({ unitId: unit.id, type: 'transfer', targetId: spawn.id })
      }
    }
  }

  // Spawn workers if energy available
  for (const spawn of data.myStructures.filter((s) => s.type === 'spawn')) {
    if (spawn.energy >= 100 && data.myUnits.length < 10) {
      actions.push({ structureId: spawn.id, type: 'spawn', unitType: 'worker' })
    }
  }

  if (actions.length > 0) {
    await fetch(`${API}/actions`, {
      method: 'POST',
      headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions }),
    })
  }
}

setInterval(gameLoop, 2000)
