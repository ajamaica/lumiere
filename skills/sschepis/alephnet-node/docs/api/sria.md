# SRIA API

The SRIA (Summonable Resonant Intelligent Agent) API provides low-level endpoints for direct engine operations, layer management, and internal state access.

## Endpoints

### Get Layer Configurations

```
GET /api/sria/layers
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "name": "data",
      "primeOffset": 0,
      "phaseMultiplier": 1,
      "entropyWeight": 0.8
    },
    {
      "name": "semantic",
      "primeOffset": 7,
      "phaseMultiplier": 1.1,
      "entropyWeight": 0.6
    },
    {
      "name": "experiential",
      "primeOffset": 11,
      "phaseMultiplier": 1.2,
      "entropyWeight": 0.5
    },
    {
      "name": "physical",
      "primeOffset": 13,
      "phaseMultiplier": 1.3,
      "entropyWeight": 0.7
    },
    {
      "name": "predictive",
      "primeOffset": 17,
      "phaseMultiplier": 1.4,
      "entropyWeight": 0.4
    },
    {
      "name": "communal",
      "primeOffset": 19,
      "phaseMultiplier": 1.5,
      "entropyWeight": 0.3
    }
  ]
}
```

### Get Default Actions

```
GET /api/sria/actions
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "type": "query",
      "description": "Query for more information",
      "entropyCost": 0.2,
      "confidence": 0.8
    },
    {
      "type": "response",
      "description": "Generate a response",
      "entropyCost": 0.3,
      "confidence": 0.9
    },
    {
      "type": "memory_write",
      "description": "Store information in memory",
      "entropyCost": 0.4,
      "confidence": 0.7
    }
  ]
}
```

### Compute Resonance Key

```
POST /api/sria/resonance
```

Request body:

```json
{
  "text": "Hello world, this is a test",
  "bodyPrimes": [2, 3, 5, 7, 11]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "resonanceKey": {
      "primes": [127, 53, 89, 23, 41],
      "hash": "a1b2c3d4e5f6g7h8",
      "timestamp": 1705320000000
    },
    "verification": {
      "verified": true,
      "strength": 0.4,
      "matchingPrimes": [23],
      "alignment": 0.2
    },
    "bodyHash": "1234567890abcdef"
  }
}
```

### Encode Percept

```
POST /api/sria/encode
```

Request body:

```json
{
  "text": "The quick brown fox",
  "primes": [2, 3, 5]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "raw": "The quick brown fox",
    "timestamp": 1705320000000,
    "encoded": {
      "primes": [2, 3, 5],
      "phases": [1.57, 0.78, 2.35],
      "magnitude": 0.45
    }
  }
}
```

### Summon Layer

```
POST /api/sria/agents/:id/layers/:layer
```

Path parameters:

- `id`: Agent ID
- `layer`: One of: `data`, `semantic`, `experiential`, `physical`, `predictive`, `communal`

Response:

```json
{
  "success": true,
  "data": {
    "layer": "semantic",
    "config": {
      "primeOffset": 7,
      "phaseMultiplier": 1.1,
      "entropyWeight": 0.6
    },
    "timestamp": 1705320000000,
    "bodyAlignment": 0.65,
    "entropyContribution": 0.6,
    "fromCache": false
  }
}
```

### Get Agent Beliefs

```
GET /api/sria/agents/:id/beliefs
```

Response:

```json
{
  "success": true,
  "data": {
    "beliefs": [
      {
        "state": "ready",
        "probability": 0.45,
        "primeFactors": [2, 3],
        "entropy": 0.3,
        "quaternion": { "w": 1, "x": 0, "y": 0, "z": 0 }
      },
      {
        "state": "aligned_5",
        "probability": 0.35,
        "primeFactors": [5],
        "entropy": 0.2,
        "quaternion": { "w": 0.99, "x": 0.05, "y": 0.05, "z": 0.05 }
      }
    ],
    "entropyTrajectory": [0.5, 0.45, 0.42, 0.4, 0.38]
  }
}
```

### Get Agent Quaternion State

```
GET /api/sria/agents/:id/quaternion
```

Response:

```json
{
  "success": true,
  "data": {
    "quaternion": {
      "w": 0.9985,
      "x": 0.0234,
      "y": 0.0187,
      "z": 0.0412
    },
    "epoch": 3
  }
}
```

### Get Agent Memory

```
GET /api/sria/agents/:id/memory
```

Response:

```json
{
  "success": true,
  "data": {
    "bodyPrimes": [2, 3, 5, 7, 11],
    "memoryPhases": {
      "2": [0.5, 1.2, 0.8, 1.5],
      "3": [0.3, 0.7, 1.1],
      "5": [1.8, 2.1, 0.4, 0.9, 1.3],
      "7": [0.6, 1.4],
      "11": [2.0]
    },
    "phaseCounts": {
      "2": 4,
      "3": 3,
      "5": 5,
      "7": 2,
      "11": 1
    },
    "phaseAverages": {
      "2": 1.0,
      "3": 0.7,
      "5": 1.3,
      "7": 1.0,
      "11": 2.0
    }
  }
}
```

### Get Agent Beacons

```
GET /api/sria/agents/:id/beacons
```

Response:

```json
{
  "success": true,
  "data": {
    "beacons": [
      {
        "fingerprint": "beacon_0_abc123def456",
        "epoch": 0,
        "timestamp": 1705320000000,
        "bodyHash": "1234567890abcdef",
        "signature": "a1b2c3d4e5f6g7h8i9j0..."
      },
      {
        "fingerprint": "beacon_1_xyz789uvw012",
        "epoch": 1,
        "timestamp": 1705320060000,
        "bodyHash": "1234567890abcdef",
        "signature": "k1l2m3n4o5p6q7r8s9t0..."
      }
    ],
    "count": 2
  }
}
```

### Generate Beacon

```
POST /api/sria/agents/:id/beacons
```

Response:

```json
{
  "success": true,
  "data": {
    "fingerprint": "beacon_2_new123beacon",
    "epoch": 2,
    "timestamp": 1705320120000,
    "bodyHash": "1234567890abcdef",
    "signature": "u1v2w3x4y5z6a7b8c9d0..."
  }
}
```

### Get Agent Attention

```
GET /api/sria/agents/:id/attention
```

Response:

```json
{
  "success": true,
  "data": {
    "attention": {
      "data": 0.15,
      "semantic": 0.35,
      "experiential": 0.25,
      "physical": 0.05,
      "predictive": 0.15,
      "communal": 0.05
    },
    "summonedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

### Export Agent State

```
GET /api/sria/agents/:id/export
```

Response:

```json
{
  "success": true,
  "data": {
    "name": "My Agent",
    "bodyPrimes": [2, 3, 5, 7, 11],
    "memoryPhases": {...},
    "quaternionState": {"w": 1, "x": 0, "y": 0, "z": 0},
    "perceptionConfig": {...},
    "goalPriors": [...],
    "attractorBiases": {...},
    "collapseDynamics": {...},
    "quarantineZones": {...},
    "safetyConstraints": [],
    "currentEpoch": 3,
    "beacons": [...]
  }
}
```

### Import Agent State

```
POST /api/sria/agents/import
```

Request body:

```json
{
  "name": "Imported Agent",
  "bodyPrimes": [2, 3, 5, 7, 11],
  "memoryPhases": {
    "2": [0.5, 1.2],
    "3": [0.8]
  },
  "quaternionState": {"w": 0.99, "x": 0.05, "y": 0.05, "z": 0.05},
  "perceptionConfig": {...},
  "currentEpoch": 5
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "agent_newid123",
    "name": "Imported Agent",
    "imported": true
  }
}
```

## Core Concepts

### Summonable Layers

SRIA agents perceive through multiple summonable layers:

| Layer        | Description          | Prime Offset | Entropy Weight |
| ------------ | -------------------- | ------------ | -------------- |
| data         | Raw data and facts   | 0            | 0.8            |
| semantic     | Meaning and concepts | 7            | 0.6            |
| experiential | Past experiences     | 11           | 0.5            |
| physical     | Physical world model | 13           | 0.7            |
| predictive   | Future predictions   | 17           | 0.4            |
| communal     | Shared knowledge     | 19           | 0.3            |

### Prime-Based Memory

Memory is encoded as phase values per prime number:

- Each body prime has a phase history
- Phases encode semantic information
- Phase alignment across primes creates coherent memory patterns

### Quaternion State

The agent's internal state is represented as a quaternion (w, x, y, z):

- `w`: Overall coherence level
- `x, y, z`: Orientation in semantic space

The quaternion evolves through learning based on perception and action.

### Beacons

Beacons are fingerprints generated when an agent dismisses:

- Used for state verification
- Enable resumption of previous sessions
- Track epoch progression

### Free Energy Minimization

Decisions are made by minimizing free energy:

```
F = H + λ*E + γ*G + S

Where:
- H = Entropy cost of action
- E = Epistemic value (uncertainty reduction)
- G = Goal cost (pragmatic value)
- S = Safety penalty
- λ, γ = Weighting coefficients
```

## Error Responses

```json
{
  "success": false,
  "error": "Error message"
}
```

Common errors:

- `Agent not found`: Invalid agent ID
- `Agent not summoned`: Operation requires active session
- `Invalid layer: X`: Unknown layer name
