# Agents API

The Agents API provides endpoints for managing SRIA (Summonable Resonant Intelligent Agent) agents.

## Endpoints

### List Agents

```
GET /api/agents
```

Query parameters:

- `name` (optional): Filter by agent name (partial match)
- `bodyPrimes` (optional): Filter by body primes (comma-separated)

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "agent_abc12345",
      "name": "My Agent",
      "bodyPrimes": [2, 3, 5, 7, 11],
      "perceptionConfig": {...},
      "goalPriors": [...],
      "attractorBiases": {...},
      "collapseDynamics": {...},
      "safetyConstraints": [...],
      "metadata": {},
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Agent Templates

```
GET /api/agents/templates
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "light-guide",
      "name": "Light Guide",
      "bodyPrimes": [2, 3, 5, 7, 11],
      "perceptionConfig": {...}
    },
    {
      "id": "data-analyst",
      "name": "Data Analyst",
      "bodyPrimes": [2, 3, 5, 7, 11, 13, 17]
    }
  ],
  "count": 4
}
```

### Get Agent Statistics

```
GET /api/agents/stats
```

Response:

```json
{
  "success": true,
  "data": {
    "totalAgents": 10,
    "activeEngines": 3,
    "summonedAgents": 2,
    "templates": 4,
    "primeDistribution": {
      "2": 8,
      "3": 7,
      "5": 6
    }
  }
}
```

### Create Agent

```
POST /api/agents
```

Request body:

```json
{
  "name": "My New Agent",
  "templateId": "light-guide",
  "bodyPrimes": [2, 3, 5, 7, 11],
  "perceptionConfig": {
    "inputLayers": ["data", "semantic"],
    "outputLayers": ["semantic", "experiential"],
    "attentionSpan": 7
  },
  "goalPriors": [{ "type": "safety", "weight": 0.3, "costFunction": "safety" }],
  "safetyConstraints": [],
  "metadata": { "purpose": "testing" }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "agent_abc12345",
    "name": "My New Agent",
    ...
  }
}
```

### Get Agent

```
GET /api/agents/:id
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "agent_abc12345",
    "name": "My Agent",
    ...
  }
}
```

### Update Agent

```
PUT /api/agents/:id
```

Request body (partial update supported):

```json
{
  "name": "Updated Name",
  "metadata": { "version": 2 }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "agent_abc12345",
    "name": "Updated Name",
    ...
  }
}
```

### Delete Agent

```
DELETE /api/agents/:id
```

Response:

```json
{
  "success": true,
  "message": "Agent deleted"
}
```

### Get Agent State

```
GET /api/agents/:id/state
```

Response when dormant:

```json
{
  "success": true,
  "data": {
    "id": "agent_abc12345",
    "name": "My Agent",
    "active": false,
    "definition": {...}
  }
}
```

Response when summoned:

```json
{
  "success": true,
  "data": {
    "id": "agent_abc12345",
    "active": true,
    "engine": {
      "name": "My Agent",
      "bodyPrimes": [2, 3, 5, 7, 11],
      "quaternionState": { "w": 1, "x": 0, "y": 0, "z": 0 },
      "lifecycleState": "perceiving",
      "currentEpoch": 0,
      "session": {
        "id": "session_xyz",
        "summonedAt": "2024-01-15T12:00:00.000Z",
        "beliefCount": 5,
        "actionCount": 3
      }
    }
  }
}
```

### Summon Agent

```
POST /api/agents/:id/summon
```

Request body (optional):

```json
{
  "initialContext": "Starting a new conversation",
  "resonanceKey": {
    "primes": [2, 3, 5],
    "hash": "abc123"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "sessionId": "session_xyz",
    "resonanceStrength": 0.6,
    "initialBeliefs": [...]
  }
}
```

### Dismiss Agent

```
POST /api/agents/:id/dismiss
```

Response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "id": "session_xyz",
    "duration": 30000,
    "actionCount": 5,
    "entropyReduction": 0.3,
    "beacon": {
      "fingerprint": "beacon_0_abc123",
      "epoch": 0
    }
  }
}
```

### Execute Step

```
POST /api/agents/:id/step
```

Request body:

```json
{
  "observation": "User says hello",
  "actions": [
    {
      "type": "response",
      "description": "Generate response",
      "entropyCost": 0.3,
      "confidence": 0.9
    },
    {
      "type": "query",
      "description": "Ask for clarification",
      "entropyCost": 0.2,
      "confidence": 0.8
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "perception": {
      "dominantLayer": "semantic",
      "entropy": 0.5
    },
    "decision": {
      "action": {
        "type": "response",
        "description": "Generate response"
      },
      "alternatives": [...],
      "freeEnergy": 0.4
    },
    "learning": {
      "quaternionDelta": {"w": -0.01, "x": 0.02},
      "epochAdvance": false,
      "beliefCount": 6
    }
  }
}
```

## Runner Endpoints

These endpoints are available when an AgentRunner is configured.

### Start Run

```
POST /api/agents/:id/run
```

Request body:

```json
{
  "initialObservation": "Starting context",
  "actions": [...]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "runId": "run_123456_abc",
    "agentId": "agent_abc12345"
  }
}
```

### Get Run Status

```
GET /api/agents/:id/run/:runId
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "run_123456_abc",
    "agentId": "agent_abc12345",
    "status": "running",
    "steps": 15,
    "errors": 0,
    "startTime": 1705320000000,
    "duration": 5000
  }
}
```

### Get Run Results

```
GET /api/agents/:id/run/:runId/results
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "step": 0,
      "observation": "...",
      "perception": {...},
      "decision": {...},
      "actionResult": {...},
      "learning": {...},
      "timestamp": 1705320000000,
      "duration": 50
    }
  ],
  "count": 15
}
```

### Stop Run

```
POST /api/agents/:id/run/:runId/stop
```

Response:

```json
{
  "success": true,
  "message": "Run stopped"
}
```

### Pause Run

```
POST /api/agents/:id/run/:runId/pause
```

### Resume Run

```
POST /api/agents/:id/run/:runId/resume
```

### Get Runner Telemetry

```
GET /api/agents/runner/telemetry
```

Response:

```json
{
  "success": true,
  "data": {
    "totalSteps": 1500,
    "totalRuns": 25,
    "errors": 3,
    "averageStepTime": 45,
    "activeRuns": 2
  }
}
```

### List Active Runs

```
GET /api/agents/runner/active
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "run_123456_abc",
      "agentId": "agent_abc12345",
      "status": "running",
      "steps": 15
    }
  ],
  "count": 1
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:

- `400`: Bad request (invalid input)
- `404`: Resource not found
- `500`: Internal server error
