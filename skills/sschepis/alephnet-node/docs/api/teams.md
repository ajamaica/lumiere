# Teams API

The Teams API provides endpoints for managing agent teams with multi-agent resonance networks.

## Endpoints

### List Teams

```
GET /api/teams
```

Query parameters:

- `name` (optional): Filter by team name (partial match)
- `agentId` (optional): Filter by agent ID membership

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "team_abc12345",
      "name": "Research Team",
      "description": "A team for research tasks",
      "agentIds": ["agent_1", "agent_2", "agent_3"],
      "config": {
        "couplingStrength": 0.5,
        "beliefPropagation": true,
        "phasePropagation": true,
        "collectiveDecision": "consensus"
      },
      "metadata": {},
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Team Statistics

```
GET /api/teams/stats
```

Response:

```json
{
  "success": true,
  "data": {
    "totalTeams": 5,
    "activeNetworks": 2,
    "summonedTeams": 1,
    "averageTeamSize": 3.5,
    "largestTeam": 7
  }
}
```

### Create Team

```
POST /api/teams
```

Request body:

```json
{
  "name": "My Team",
  "description": "A team for collaborative tasks",
  "agentIds": ["agent_1", "agent_2"],
  "config": {
    "couplingStrength": 0.6,
    "beliefPropagation": true,
    "phasePropagation": true,
    "collectiveDecision": "consensus"
  },
  "metadata": {}
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "team_abc12345",
    "name": "My Team",
    "description": "A team for collaborative tasks",
    "agentIds": ["agent_1", "agent_2"],
    ...
  }
}
```

### Get Team

```
GET /api/teams/:id
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "team_abc12345",
    "name": "My Team",
    ...
  }
}
```

### Update Team

```
PUT /api/teams/:id
```

Request body (partial update supported):

```json
{
  "name": "Updated Team Name",
  "config": {
    "couplingStrength": 0.8
  }
}
```

### Delete Team

```
DELETE /api/teams/:id
```

Response:

```json
{
  "success": true,
  "message": "Team deleted"
}
```

### Get Team State

```
GET /api/teams/:id/state
```

Response when inactive:

```json
{
  "success": true,
  "data": {
    "id": "team_abc12345",
    "name": "My Team",
    "active": false,
    "definition": {...},
    "agentStates": [
      { "id": "agent_1", "active": false, ... },
      { "id": "agent_2", "active": false, ... }
    ]
  }
}
```

Response when active:

```json
{
  "success": true,
  "data": {
    "id": "team_abc12345",
    "name": "My Team",
    "active": true,
    "network": {
      "name": "My Team",
      "agentCount": 3,
      "agents": [...],
      "sharedPrimes": [2, 3, 5],
      "collectiveFreeEnergy": 0.45,
      "stepCount": 10,
      "sharedBeliefs": [...]
    },
    "definition": {...}
  }
}
```

### Add Agent to Team

```
POST /api/teams/:id/agents
```

Request body:

```json
{
  "agentId": "agent_4"
}
```

Response:

```json
{
  "success": true,
  "message": "Agent added to team"
}
```

### Remove Agent from Team

```
DELETE /api/teams/:id/agents/:agentId
```

Response:

```json
{
  "success": true,
  "message": "Agent removed from team"
}
```

### Summon Team

```
POST /api/teams/:id/summon
```

Request body (optional):

```json
{
  "initialContext": "Starting team session"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "teamId": "team_abc12345",
    "results": [
      {
        "agentIndex": 0,
        "agentName": "Agent Alpha",
        "success": true,
        "sessionId": "session_1"
      },
      {
        "agentIndex": 1,
        "agentName": "Agent Beta",
        "success": true,
        "sessionId": "session_2"
      }
    ]
  }
}
```

### Dismiss Team

```
POST /api/teams/:id/dismiss
```

Response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "teamId": "team_abc12345",
    "results": [
      {
        "agentIndex": 0,
        "agentName": "Agent Alpha",
        "success": true,
        "duration": 30000,
        "actionCount": 15
      }
    ]
  }
}
```

### Execute Collective Step

```
POST /api/teams/:id/step
```

Request body:

```json
{
  "observation": "Team receives new task",
  "actions": [
    {
      "type": "response",
      "description": "Generate response",
      "entropyCost": 0.3,
      "confidence": 0.9
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "stepCount": 11,
    "agentResults": [
      {
        "agentIndex": 0,
        "agentName": "Agent Alpha",
        "success": true,
        "perception": {...},
        "decision": {...},
        "learning": {...}
      },
      {
        "agentIndex": 1,
        "agentName": "Agent Beta",
        "success": true,
        ...
      }
    ],
    "collectiveFreeEnergy": 0.42,
    "selectedActions": [
      { "agentIndex": 0, "action": {...} },
      { "agentIndex": 1, "action": {...} }
    ],
    "sharedBeliefs": [
      {
        "state": "task_acknowledged",
        "probability": 0.8,
        "entropy": 0.2,
        "primeFactors": [2, 3, 5],
        "agentContributions": [...]
      }
    ],
    "phaseAlignment": {
      "2": 0.15,
      "3": 0.23,
      "5": 0.18
    },
    "activeAgents": 2
  }
}
```

### Get Network State

```
GET /api/teams/:id/network
```

Response:

```json
{
  "success": true,
  "data": {
    "name": "My Team",
    "agentCount": 3,
    "agents": [
      {
        "index": 0,
        "name": "Agent Alpha",
        "bodyPrimes": [2, 3, 5, 7, 11],
        "lifecycleState": "perceiving",
        ...
      }
    ],
    "sharedPrimes": [2, 3, 5],
    "collectiveFreeEnergy": 0.45,
    "stepCount": 10,
    "sharedBeliefs": [...]
  }
}
```

## Multi-Agent Concepts

### Tensor Body

The tensor body represents the shared prime space between agents. When agents share primes in their body, they have stronger coupling and can propagate beliefs and phases to each other.

```
Agent A: [2, 3, 5, 7, 11]
Agent B: [3, 5, 7, 13, 17]
Shared Primes: [3, 5, 7]
Coupling Strength: 3/9 = 0.33
```

### Coupled Policy

Actions taken by one agent affect the policy weights of other coupled agents. When an agent takes a successful action, coupled agents are more likely to take similar actions.

### Belief Propagation

High-probability beliefs from one agent are dampened and propagated to coupled agents, allowing the team to share knowledge and converge on consensus.

### Phase Alignment

Memory phases for shared primes are propagated across agents, creating coherent memory patterns across the team.

## Configuration Options

Team configuration supports the following options:

| Option               | Type    | Default     | Description                                      |
| -------------------- | ------- | ----------- | ------------------------------------------------ |
| `couplingStrength`   | number  | 0.5         | Base coupling multiplier for inter-agent effects |
| `beliefPropagation`  | boolean | true        | Enable belief sharing between agents             |
| `phasePropagation`   | boolean | true        | Enable phase alignment across agents             |
| `collectiveDecision` | string  | "consensus" | Decision mode: "consensus", "majority", "leader" |

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```
