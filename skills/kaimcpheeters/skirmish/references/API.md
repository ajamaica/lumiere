# Skirmish Game API Reference

Complete API documentation for writing Skirmish battle strategies.

## Victory Condition

**Destroy your opponent's Spawn to win.**

- Each player starts with one Spawn structure
- When a Spawn is destroyed, that player loses
- If neither Spawn is destroyed at tick limit (default 2000), match is a draw

---

## The Arena

- **100×100 tile grid**
- Three terrain types:
  - **Plain** (0) — Normal movement
  - **Swamp** (2) — Slows movement (5x fatigue)
  - **Wall** (1) — Impassable

---

## Global Functions

### Object Queries

| Function                      | Description               |
| ----------------------------- | ------------------------- |
| `getObjectsByPrototype(Type)` | Get all objects of a type |
| `getObjectById(id)`           | Get specific object by ID |
| `getTicks()`                  | Get current tick number   |

**Type** can be: `Creep`, `StructureSpawn`, `Source`

```javascript
const myCreeps = getObjectsByPrototype(Creep).filter((c) => c.my)
const allSpawns = getObjectsByPrototype(StructureSpawn)
const sources = getObjectsByPrototype(Source)
const tick = getTicks()
```

### Distance & Pathfinding

| Function                                 | Description                          |
| ---------------------------------------- | ------------------------------------ |
| `getRange(a, b)`                         | Chebyshev distance between positions |
| `findClosestByRange(obj, targets)`       | Find nearest target by range         |
| `findClosestByPath(obj, targets, opts?)` | Find nearest reachable target        |
| `findInRange(obj, targets, range)`       | Find all targets within range        |
| `getDirection(dx, dy)`                   | Convert delta to direction constant  |
| `getTerrainAt(pos)`                      | Get terrain type at position         |
| `searchPath(origin, goal, opts?)`        | Advanced pathfinding                 |

```javascript
const dist = getRange(creep, enemySpawn)
const nearest = findClosestByRange(creep, enemies)
const inRange = findInRange(creep, enemies, 3)
const terrain = getTerrainAt({ x: 50, y: 50 }) // TERRAIN_PLAIN, TERRAIN_SWAMP, or TERRAIN_WALL
```

---

## GameObject Methods

All game objects (creeps, spawns, sources) have these instance methods:

| Method                                  | Description                   |
| --------------------------------------- | ----------------------------- |
| `obj.getRangeTo(target)`                | Distance to target            |
| `obj.findInRange(objects, range)`       | Find objects within range     |
| `obj.findClosestByRange(objects)`       | Find closest object           |
| `obj.findClosestByPath(objects, opts?)` | Find closest reachable object |
| `obj.findPathTo(target, opts?)`         | Get path array to target      |

```javascript
const dist = creep.getRangeTo(enemySpawn)
const nearbyEnemies = creep.findInRange(enemies, 3)
const closest = creep.findClosestByRange(enemies)
```

---

## Creeps

### Properties

| Property   | Type       | Description                         |
| ---------- | ---------- | ----------------------------------- |
| `id`       | string     | Unique identifier                   |
| `x`, `y`   | number     | Position                            |
| `my`       | boolean    | True if owned by you                |
| `spawning` | boolean    | True if still being spawned         |
| `hits`     | number     | Current HP                          |
| `hitsMax`  | number     | Maximum HP                          |
| `fatigue`  | number     | Current fatigue (can't move if > 0) |
| `body`     | BodyPart[] | Array of `{type, hits}` objects     |
| `store`    | Store      | Resource storage (for CARRY parts)  |

```javascript
// Filter out spawning creeps
const activeCreeps = getObjectsByPrototype(Creep).filter((c) => c.my && !c.spawning)

// Check if creep has specific body part
const isMelee = creep.body.some((p) => p.type === ATTACK)

// Check creep health
if (creep.hits < creep.hitsMax * 0.3) {
  // Retreat when below 30% HP
}
```

### Movement Actions

| Method                  | Description                     |
| ----------------------- | ------------------------------- |
| `move(direction)`       | Move one tile in direction      |
| `moveTo(target, opts?)` | Pathfind and move toward target |

**Directions:** `TOP`, `TOP_RIGHT`, `RIGHT`, `BOTTOM_RIGHT`, `BOTTOM`, `BOTTOM_LEFT`, `LEFT`, `TOP_LEFT`

```javascript
creep.moveTo(enemySpawn)
creep.moveTo({ x: 50, y: 50 })
creep.move(TOP_RIGHT)
```

**moveTo options:**

```javascript
creep.moveTo(target, {
  costMatrix: cm, // Custom pathfinding costs
  plainCost: 1, // Cost for plain tiles
  swampCost: 5, // Cost for swamp tiles
  flee: false, // Move away from target instead
  range: 1, // Stop within this range of target
})
```

### Combat Actions

| Method                 | Range | Damage                     | Requires      |
| ---------------------- | ----- | -------------------------- | ------------- |
| `attack(target)`       | 1     | 30 per ATTACK part         | ATTACK        |
| `rangedAttack(target)` | 1-3   | 10 per RANGED_ATTACK part  | RANGED_ATTACK |
| `rangedMassAttack()`   | 1-3   | AoE: 10/4/1 at range 1/2/3 | RANGED_ATTACK |

```javascript
// Melee attack
if (getRange(creep, enemy) <= 1) {
  creep.attack(enemy)
}

// Ranged attack
if (getRange(creep, enemy) <= 3) {
  creep.rangedAttack(enemy)
}

// AoE attack (hits all enemies in range)
creep.rangedMassAttack()
```

### Healing Actions

| Method               | Range | Healing             | Requires |
| -------------------- | ----- | ------------------- | -------- |
| `heal(target)`       | 1     | 12 HP per HEAL part | HEAL     |
| `rangedHeal(target)` | 1-3   | 4 HP per HEAL part  | HEAL     |

```javascript
const wounded = myCreeps.find((c) => c.hits < c.hitsMax)
if (wounded) {
  if (getRange(healer, wounded) <= 1) {
    healer.heal(wounded)
  } else if (getRange(healer, wounded) <= 3) {
    healer.rangedHeal(wounded)
  }
}
```

### Economy Actions

| Method                           | Range | Description                       | Requires |
| -------------------------------- | ----- | --------------------------------- | -------- |
| `harvest(source)`                | 1     | Gather 2 energy per WORK part     | WORK     |
| `transfer(target, resourceType)` | 1     | Give resources to structure/creep | CARRY    |
| `pickup(resource)`               | 1     | Pick up dropped resources         | CARRY    |
| `drop(resourceType, amount?)`    | —     | Drop resources                    | CARRY    |

```javascript
// Harvest from source
const source = creep.findClosestByRange(getObjectsByPrototype(Source))
if (source && getRange(creep, source) <= 1) {
  creep.harvest(source)
} else if (source) {
  creep.moveTo(source)
}

// Deposit energy to spawn
if (creep.store.energy > 0 && getRange(creep, mySpawn) <= 1) {
  creep.transfer(mySpawn, RESOURCE_ENERGY)
}
```

### Special Actions

| Method         | Range | Description                      |
| -------------- | ----- | -------------------------------- |
| `pull(target)` | 1     | Drag another creep when you move |

---

## StructureSpawn

### Properties

| Property   | Type         | Description                     |
| ---------- | ------------ | ------------------------------- |
| `id`       | string       | Unique identifier               |
| `x`, `y`   | number       | Position                        |
| `my`       | boolean      | True if owned by you            |
| `hits`     | number       | Current HP                      |
| `hitsMax`  | number       | Maximum HP (usually 5000)       |
| `store`    | Store        | Energy storage                  |
| `spawning` | object\|null | Current spawning creep, or null |

```javascript
const mySpawn = getObjectsByPrototype(StructureSpawn).find((s) => s.my)
const energy = mySpawn.store.energy
const isSpawning = mySpawn.spawning !== null
```

### Methods

| Method             | Description                         |
| ------------------ | ----------------------------------- |
| `spawnCreep(body)` | Spawn a creep with given body parts |

```javascript
// Spawn a melee attacker
mySpawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE])

// Check if spawn is ready
if (!mySpawn.spawning && mySpawn.store.energy >= 260) {
  mySpawn.spawnCreep([ATTACK, ATTACK, MOVE, MOVE])
}
```

**Spawning time:** 3 ticks per body part

---

## Body Parts

| Constant        | Cost | Function                                 |
| --------------- | ---- | ---------------------------------------- |
| `MOVE`          | 50   | Reduces fatigue, enables movement        |
| `ATTACK`        | 80   | Melee attack (30 damage, range 1)        |
| `RANGED_ATTACK` | 150  | Ranged attack (10 damage, range 1-3)     |
| `HEAL`          | 250  | Heals (12 HP close, 4 HP ranged)         |
| `WORK`          | 100  | Harvests energy (2 per tick per part)    |
| `CARRY`         | 50   | Carries resources (50 capacity per part) |
| `TOUGH`         | 10   | Cheap HP buffer (100 HP per part)        |

### Fatigue System

Moving generates fatigue based on terrain:

- **Plains:** 2 fatigue per non-MOVE, non-CARRY part
- **Swamps:** 10 fatigue per non-MOVE, non-CARRY part

Each MOVE part reduces fatigue by 2 per tick.

**Creeps cannot move while `fatigue > 0`.**

**Speed formulas:**

- Full speed on plains: 1 MOVE per 1 heavy part
- Full speed on swamps: 5 MOVE per 1 heavy part

```javascript
// Fast on plains: [ATTACK, MOVE]
// Fast on swamps: [ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE]
```

---

## CostMatrix

Custom pathfinding costs for `moveTo()` and `searchPath()`:

```javascript
const cm = new CostMatrix()

// Set costs (0 = use default, 255 = unwalkable)
cm.set(x, y, 5) // Avoid this tile
cm.set(x, y, 255) // Block completely

// Get cost at position
const cost = cm.get(x, y)

// Use in pathfinding
creep.moveTo(target, { costMatrix: cm })
```

**Common use case — avoid enemies:**

```javascript
const cm = new CostMatrix()
for (const enemy of enemies) {
  // Make tiles near enemies costly
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      cm.set(enemy.x + dx, enemy.y + dy, 50)
    }
  }
}
creep.moveTo(target, { costMatrix: cm })
```

---

## Source

Harvestable energy deposits on some maps.

### Properties

| Property         | Type   | Description       |
| ---------------- | ------ | ----------------- |
| `id`             | string | Unique identifier |
| `x`, `y`         | number | Position          |
| `energy`         | number | Remaining energy  |
| `energyCapacity` | number | Maximum energy    |

---

## Constants

### Body Parts

```javascript
;(MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, TOUGH)
```

### Terrain

```javascript
TERRAIN_PLAIN // 0
TERRAIN_WALL // 1
TERRAIN_SWAMP // 2
```

### Directions

```javascript
;(TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT)
```

### Resources

```javascript
RESOURCE_ENERGY
```

### Error Codes

```javascript
OK // 0 - Action successful
ERR_NOT_OWNER // -1
ERR_NO_PATH // -2
ERR_BUSY // -4
ERR_NOT_FOUND // -5
ERR_NOT_ENOUGH_ENERGY // -6
ERR_INVALID_TARGET // -7
ERR_FULL // -8
ERR_NOT_IN_RANGE // -9
ERR_INVALID_ARGS // -10
ERR_TIRED // -11 (fatigue > 0)
ERR_NO_BODYPART // -12
```

---

## Match Flow

1. Both players start with Spawn and starting units (map-dependent)
2. Each tick, both `loop()` functions execute
3. All intents (move, attack, spawn, etc.) are collected
4. All intents are processed simultaneously
5. Game state updates (damage applied, creeps spawn, etc.)
6. Repeat until a Spawn dies or tick limit reached

**Default tick limit:** 2000 ticks

---

## Starting Conditions (swamp map)

Each player starts with:

- **1 Spawn** — 5,000 HP, 500 energy
- **3 Workers** — `[MOVE, MOVE, CARRY, CARRY, WORK, WORK]`
- **1 Melee** — `[ATTACK, ATTACK, MOVE, MOVE, TOUGH]`

Map features:

- **4 Sources** — 3,000 energy each
- Swamp terrain between spawns
