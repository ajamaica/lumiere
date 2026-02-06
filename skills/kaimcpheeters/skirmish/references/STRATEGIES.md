# Skirmish Strategy Examples

Complete example strategies and common patterns.

## Example 1: The Swarm (Melee Rush)

Aggressive strategy using cheap, fast melee attackers. Overwhelm with numbers.

```javascript
/**
 * The Swarm - Aggressive melee rush strategy
 *
 * Strategy: Spawn cheap, fast melee units and rush the enemy.
 * Always be moving, always be attacking. Overwhelm with numbers.
 */

function loop() {
  const myCreeps = getObjectsByPrototype(Creep).filter((c) => c.my && !c.spawning)
  const enemies = getObjectsByPrototype(Creep).filter((c) => !c.my && !c.spawning)
  const mySpawn = getObjectsByPrototype(StructureSpawn).find((s) => s.my)
  const enemySpawn = getObjectsByPrototype(StructureSpawn).find((s) => !s.my)

  // Run each creep
  for (const creep of myCreeps) {
    runCreep(creep, enemies, enemySpawn, mySpawn)
  }

  // Spawn new creeps
  if (mySpawn && !mySpawn.spawning) {
    // Cheap and fast melee attackers
    mySpawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE])
  }
}

function runCreep(creep, enemies, enemySpawn, mySpawn) {
  // Check body parts: creep.body is an array of {type, hits} objects
  const isMelee = creep.body.some((p) => p.type === ATTACK)
  if (!isMelee) return // Skip non-combat creeps (e.g., workers)

  // Priority 1: Attack adjacent enemies
  const adjacentEnemy = findClosestByRange(
    creep,
    enemies.filter((e) => getRange(creep, e) <= 1),
  )
  if (adjacentEnemy) {
    creep.attack(adjacentEnemy)
    // Stay on them if they're still alive
    creep.moveTo(adjacentEnemy)
    return
  }

  // Priority 2: Attack enemy spawn if in range
  if (enemySpawn && getRange(creep, enemySpawn) <= 1) {
    creep.attack(enemySpawn)
    return
  }

  // Priority 3: Find and chase the nearest enemy
  const nearestEnemy = findClosestByRange(creep, enemies)
  if (nearestEnemy) {
    creep.moveTo(nearestEnemy)
    return
  }

  // Priority 4: Attack the enemy spawn
  if (enemySpawn) {
    creep.moveTo(enemySpawn)
    return
  }

  // Fallback: Patrol around our spawn (should rarely happen)
  if (mySpawn) {
    const tick = getTicks()
    const angle = (tick / 20 + creep.id.charCodeAt(0)) % (2 * Math.PI)
    creep.moveTo({
      x: Math.round(mySpawn.x + Math.cos(angle) * 5),
      y: Math.round(mySpawn.y + Math.sin(angle) * 5),
    })
  }
}
```

**Key tactics:**

- `[ATTACK, ATTACK, MOVE, MOVE]` costs 260 energy, spawns in 12 ticks
- Full speed on plains (2 MOVE for 2 ATTACK)
- Always attack adjacent enemies before spawn
- Chase enemies rather than letting them kite

---

## Example 2: The Rangers (Kiting Ranged)

Maintain distance, attack from range 3, retreat when enemies get close.

```javascript
/**
 * The Rangers - Kiting ranged attackers
 *
 * Strategy: Keep distance from enemies, attack from range.
 * Kite backwards when enemies get close, always maintain range 3.
 */

function loop() {
  const myCreeps = getObjectsByPrototype(Creep).filter((c) => c.my && !c.spawning)
  const enemies = getObjectsByPrototype(Creep).filter((c) => !c.my && !c.spawning)
  const mySpawn = getObjectsByPrototype(StructureSpawn).find((s) => s.my)
  const enemySpawn = getObjectsByPrototype(StructureSpawn).find((s) => !s.my)

  // Run each creep
  for (const creep of myCreeps) {
    runCreep(creep, enemies, enemySpawn, mySpawn)
  }

  // Spawn new creeps
  if (mySpawn && !mySpawn.spawning) {
    // Ranged attackers with good mobility
    mySpawn.spawnCreep([RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE])
  }
}

function runCreep(creep, enemies, enemySpawn, mySpawn) {
  const nearestEnemy = findClosestByRange(creep, enemies)
  const enemyRange = nearestEnemy ? getRange(creep, nearestEnemy) : Infinity

  // Priority 1: Attack enemies in range (range 3 for ranged attack)
  if (nearestEnemy && enemyRange <= 3) {
    creep.rangedAttack(nearestEnemy)

    // Kite: If enemy is too close (range 2 or less), back away
    if (enemyRange <= 2) {
      moveAway(creep, nearestEnemy)
      return
    }

    // At perfect range (3), hold position or find more targets
    return
  }

  // Priority 2: Attack enemy spawn if in range
  if (enemySpawn && getRange(creep, enemySpawn) <= 3) {
    creep.rangedAttack(enemySpawn)
    // Back off if enemies are nearby
    if (nearestEnemy && enemyRange <= 4) {
      moveAway(creep, nearestEnemy)
    }
    return
  }

  // Priority 3: Approach nearest enemy to get in range
  if (nearestEnemy) {
    creep.moveTo(nearestEnemy)
    return
  }

  // Priority 4: Attack the enemy spawn
  if (enemySpawn) {
    creep.moveTo(enemySpawn)
    return
  }

  // Fallback: Patrol around our spawn
  if (mySpawn) {
    const tick = getTicks()
    const angle = (tick / 20 + creep.id.charCodeAt(0)) % (2 * Math.PI)
    creep.moveTo({
      x: Math.round(mySpawn.x + Math.cos(angle) * 5),
      y: Math.round(mySpawn.y + Math.sin(angle) * 5),
    })
  }
}

function moveAway(creep, target) {
  // Move in the opposite direction from the target
  const dx = creep.x - target.x
  const dy = creep.y - target.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1

  creep.moveTo({
    x: Math.round(creep.x + (dx / dist) * 3),
    y: Math.round(creep.y + (dy / dist) * 3),
  })
}
```

**Key tactics:**

- `[RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE]` costs 400 energy
- Ranged attack has range 3, melee has range 1
- Kite when enemies get to range 2 or less
- Higher damage per creep, but more expensive

---

## Common Patterns

### Filtering Units

```javascript
// All my active creeps (not still spawning)
const myCreeps = getObjectsByPrototype(Creep).filter((c) => c.my && !c.spawning)

// Enemy creeps
const enemies = getObjectsByPrototype(Creep).filter((c) => !c.my && !c.spawning)

// My spawn
const mySpawn = getObjectsByPrototype(StructureSpawn).find((s) => s.my)

// Enemy spawn
const enemySpawn = getObjectsByPrototype(StructureSpawn).find((s) => !s.my)

// Energy sources
const sources = getObjectsByPrototype(Source)
```

### Role Detection

```javascript
function getRole(creep) {
  const hasAttack = creep.body.some((p) => p.type === ATTACK)
  const hasRanged = creep.body.some((p) => p.type === RANGED_ATTACK)
  const hasHeal = creep.body.some((p) => p.type === HEAL)
  const hasWork = creep.body.some((p) => p.type === WORK)

  if (hasHeal) return 'healer'
  if (hasRanged) return 'ranged'
  if (hasAttack) return 'melee'
  if (hasWork) return 'worker'
  return 'unknown'
}
```

### Spawn Management

```javascript
// Check if can spawn
function canSpawn(spawn, body) {
  if (!spawn || spawn.spawning) return false
  const cost = body.reduce((sum, part) => {
    const costs = {
      MOVE: 50,
      ATTACK: 80,
      RANGED_ATTACK: 150,
      HEAL: 250,
      WORK: 100,
      CARRY: 50,
      TOUGH: 10,
    }
    return sum + (costs[part] || 0)
  }, 0)
  return spawn.store.energy >= cost
}

// Dynamic spawning based on army composition
function spawnLogic(mySpawn, myCreeps) {
  if (!mySpawn || mySpawn.spawning) return

  const meleeCount = myCreeps.filter((c) => c.body.some((p) => p.type === ATTACK)).length
  const rangedCount = myCreeps.filter((c) => c.body.some((p) => p.type === RANGED_ATTACK)).length

  // Maintain 2:1 melee to ranged ratio
  if (meleeCount <= rangedCount * 2) {
    mySpawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE])
  } else {
    mySpawn.spawnCreep([RANGED_ATTACK, MOVE, MOVE])
  }
}
```

### Target Prioritization

```javascript
function getBestTarget(creep, enemies, enemySpawn) {
  // Priority 1: Low HP enemies (finish them off)
  const lowHp = enemies.filter((e) => e.hits < 100)
  if (lowHp.length > 0) {
    return findClosestByRange(creep, lowHp)
  }

  // Priority 2: Healers (high value targets)
  const healers = enemies.filter((e) => e.body.some((p) => p.type === HEAL))
  if (healers.length > 0) {
    return findClosestByRange(creep, healers)
  }

  // Priority 3: Ranged units (they deal damage from afar)
  const ranged = enemies.filter((e) => e.body.some((p) => p.type === RANGED_ATTACK))
  if (ranged.length > 0) {
    return findClosestByRange(creep, ranged)
  }

  // Priority 4: Nearest enemy
  if (enemies.length > 0) {
    return findClosestByRange(creep, enemies)
  }

  // Priority 5: Enemy spawn
  return enemySpawn
}
```

### Retreat Logic

```javascript
function shouldRetreat(creep) {
  return creep.hits < creep.hitsMax * 0.3 // Below 30% HP
}

function retreatTo(creep, safePoint) {
  creep.moveTo(safePoint)
}

// Usage
if (shouldRetreat(creep)) {
  retreatTo(creep, mySpawn)
} else {
  // Normal combat logic
}
```

### Formation Movement

```javascript
// Move as a group toward a target
function moveAsGroup(creeps, target) {
  // Find centroid
  const cx = creeps.reduce((sum, c) => sum + c.x, 0) / creeps.length
  const cy = creeps.reduce((sum, c) => sum + c.y, 0) / creeps.length

  for (const creep of creeps) {
    // Move toward target, but also toward group center
    const toTarget = { x: target.x - creep.x, y: target.y - creep.y }
    const toCenter = { x: cx - creep.x, y: cy - creep.y }

    // Blend: mostly toward target, slightly toward center
    creep.moveTo({
      x: creep.x + toTarget.x * 0.8 + toCenter.x * 0.2,
      y: creep.y + toTarget.y * 0.8 + toCenter.y * 0.2,
    })
  }
}
```

### Economy (Harvesting)

```javascript
function runWorker(creep, sources, mySpawn) {
  // If carrying energy, deposit to spawn
  if (creep.store && creep.store.energy > 0) {
    if (getRange(creep, mySpawn) <= 1) {
      creep.transfer(mySpawn, RESOURCE_ENERGY)
    } else {
      creep.moveTo(mySpawn)
    }
    return
  }

  // Find source with energy
  const source = findClosestByRange(
    creep,
    sources.filter((s) => s.energy > 0),
  )
  if (source) {
    if (getRange(creep, source) <= 1) {
      creep.harvest(source)
    } else {
      creep.moveTo(source)
    }
  }
}
```

---

## Army Compositions

### Rush (Early Aggression)

```javascript
// Cheap, fast units for early pressure
;[ATTACK, MOVE][(ATTACK, ATTACK, MOVE, MOVE)] // 130 energy, 6 ticks // 260 energy, 12 ticks
```

### Balanced

```javascript
// Mix of damage and survivability
;[ATTACK, ATTACK, MOVE, MOVE, TOUGH, TOUGH][(RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE)] // 280 energy // 400 energy
```

### Tank

```javascript
// High HP for absorbing damage
;[TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE] // 340 energy
```

### Healer Support

```javascript
// Pair with damage dealers
;[HEAL, MOVE, MOVE][(HEAL, HEAL, MOVE, MOVE, MOVE, MOVE)] // 350 energy (slow but can heal from range) // 700 energy (full speed healer)
```

### Swamp Mobility

```javascript
// Need 5 MOVE per heavy part for full swamp speed
;[ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE] // 330 energy, slow to spawn but fast on swamp
```

---

## Tips

1. **Actions per tick:** Creeps can do one action of each type per tick (one move, one attack, one heal)
2. **Simultaneous resolution:** All damage and healing happens at once — don't expect enemies to die mid-tick
3. **Spawn blocking:** Enemies can block your spawn by standing on it
4. **Terrain awareness:** Swamps dramatically slow non-optimized creeps
5. **Energy management:** Don't over-invest in expensive units early if you can overwhelm with cheap ones
