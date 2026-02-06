# Migration Plan: Port Agent Features from prime-echo-core to alephnet-node

## Executive Summary

This document outlines the comprehensive plan to:

1. **Port** all agent-level features from prime-echo-core to alephnet-node
2. **Convert** prime-echo-core to use alephnet-node as its agent backend
3. **Clean up** prime-echo-core by removing migrated code

## Current State Analysis

### alephnet-node (Target)

Current capabilities:

- ✅ Sentient Observer components (SMF, PRSC, HQE, temporal, entanglement)
- ✅ Basic Agent module with task decomposition/planning (`lib/agent.js`)
- ✅ Learning system with curiosity engine (`lib/learning/`)
- ✅ Actions system (coherence, semantic, network, social, etc.)
- ✅ Social features (Identity, Wallet, Friends, Messaging, Groups)
- ✅ Coherence network with claims verification
- ❌ Missing: SRIA (Summonable Resonant Intelligent Agent) Engine
- ❌ Missing: Multi-agent resonance/network
- ❌ Missing: Agent Teams with execution strategies
- ❌ Missing: Full agent lifecycle management
- ❌ Missing: RESTful Agent APIs

### prime-echo-core (Source)

Agent features to port:

- SRIA Engine (`src/lib/sria/SRIAEngine.ts`)
- SRIA Types (`src/lib/sria/types.ts`)
- SRIA Lifecycle (`src/lib/sria/lifecycle.ts`)
- Multi-agent Resonance (`src/lib/sria/multiAgentResonance.ts`)
- Agent hooks (`src/hooks/useAgents.ts`)
- Agent Teams hooks (`src/hooks/useAgentTeams.ts`)
- AlephNet integration (`src/hooks/useAlephNet.ts`)

---

## Architecture Design

### New Directory Structure in alephnet-node

```
lib/
├── sria/                          # NEW - SRIA Engine
│   ├── index.js                   # Main exports
│   ├── engine.js                  # SRIAEngine class
│   ├── types.js                   # Type definitions
│   ├── lifecycle.js               # Agent lifecycle management
│   ├── multi-agent.js             # Multi-agent resonance
│   └── session.js                 # Session management
├── agents/                        # NEW - Agent Management
│   ├── index.js                   # Main exports
│   ├── manager.js                 # AgentManager CRUD
│   ├── team-manager.js            # AgentTeamManager
│   ├── runner.js                  # AgentRunner for execution
│   └── types.js                   # Agent type definitions
├── app/
│   └── server/
│       ├── agent-routes.js        # NEW - Agent REST API
│       ├── team-routes.js         # NEW - Team REST API
│       └── sria-routes.js         # NEW - SRIA REST API
└── __tests__/
    ├── sria.test.ts               # NEW - SRIA tests
    ├── agents.test.ts             # NEW - Agent tests
    └── teams.test.ts              # NEW - Team tests
```

### Data Flow Diagram

```mermaid
flowchart TB
    subgraph AlephnetNode[alephnet-node]
        subgraph CoreEngine[Core Engine]
            SO[Sentient Observer]
            SMF[Sedenion Memory Field]
            PRSC[Prime Resonance]
        end

        subgraph SRIA[SRIA Engine]
            SE[SRIAEngine]
            LC[Lifecycle Manager]
            MA[Multi-Agent Resonance]
        end

        subgraph AgentMgmt[Agent Management]
            AM[AgentManager]
            TM[TeamManager]
            AR[AgentRunner]
        end

        subgraph APIs[REST APIs]
            AgentAPI[/api/agents]
            TeamAPI[/api/teams]
            SriaAPI[/api/sria]
        end

        SO --> SRIA
        SMF --> SE
        PRSC --> SE
        SE --> AM
        LC --> AM
        MA --> TM
        AM --> AgentAPI
        TM --> TeamAPI
        SE --> SriaAPI
    end

    subgraph PrimeEchoCore[prime-echo-core]
        Hooks[React Hooks]
        UI[UI Components]
        Supabase[(Supabase)]
    end

    Hooks --> AgentAPI
    Hooks --> TeamAPI
    Hooks --> SriaAPI
    Hooks --> Supabase
```

---

## Phase 1: Port Agent Features to alephnet-node

### 1.1 Port SRIA Engine

**Source Files:**

- `prime-echo-core/src/lib/sria/SRIAEngine.ts`
- `prime-echo-core/src/lib/sria/types.ts`

**Target Files:**

- `lib/sria/engine.js`
- `lib/sria/types.js`

**Key Classes to Port:**

```javascript
// lib/sria/engine.js
class SRIAEngine {
    generateBodyHash(text)
    computeResonanceKey(input)
    verifyResonance(sria, key)
    encodePercept(observation, bodyPrimes)
    updateBeliefs(currentBeliefs, percept, memory, collapseDynamics)
    calculateEntropy(phases)
    phasesToQuaternion(phases)
    minimizeFreeEnergy(beliefs, goals, memory, percept, possibleActions)
    summonLayer(sria, layer, query, memory)
    generateBeaconFingerprint(epoch, bodyPrimes, phaseState)

    // Lifecycle methods
    createLifecycleContext(sria)
    awaken(sria, resonanceKey)
    perceive(observation, sria, attention)
    decide(beliefs, percept, sria)
    learn(sria, session, percept, action, freeEnergy)
    consolidate(sria, session)
    transition(context, event)
    fullStep(context, observation)
}
```

**Type Definitions:**

```javascript
// lib/sria/types.js
const SummonableLayer = ['data', 'semantic', 'experiential', 'physical', 'predictive', 'communal']

const SRIADefinition = {
  id: String,
  agentId: String,
  bodyPrimes: Array, // [2, 3, 5, 7, 11]
  bodyHash: String,
  memoryPhases: Object, // { prime: [phases] }
  currentEpoch: Number,
  collapseDynamics: Object,
  attractorBiases: Object,
  goalPriors: Array,
  safetyConstraints: Array,
  perceptionConfig: Object,
  actionConfig: Object,
  quaternionState: Object,
  isSummoned: Boolean,
  // ... etc
}
```

### 1.2 Port Multi-Agent Resonance

**Source File:**

- `prime-echo-core/src/lib/sria/multiAgentResonance.ts`

**Target File:**

- `lib/sria/multi-agent.js`

**Key Concepts:**

- TensorBody: Multi-dimensional agent representation
- ResonanceLink: Connection between agents
- ResonanceNetwork: Graph of agent relationships
- BeliefFlow: Propagation of beliefs between agents
- CoupledPolicy: Shared decision making

### 1.3 Create AgentManager

**New File:** `lib/agents/manager.js`

```javascript
class AgentManager {
    constructor(options = {})

    // CRUD operations
    create(agentData)
    get(agentId)
    update(agentId, updates)
    delete(agentId)
    list(filters = {})

    // Agent operations
    start(agentId)
    stop(agentId)
    pause(agentId)
    resume(agentId)

    // State management
    getStatus(agentId)
    getLogs(agentId, options = {})
    getMetrics(agentId)

    // Events
    on(event, callback)
    off(event, callback)
}
```

### 1.4 Create AgentTeamManager

**New File:** `lib/agents/team-manager.js`

```javascript
class AgentTeamManager {
    constructor(options = {})

    // Team CRUD
    createTeam(teamData)
    getTeam(teamId)
    updateTeam(teamId, updates)
    deleteTeam(teamId)
    listTeams(filters = {})

    // Member management
    addMember(teamId, agentId, role)
    removeMember(teamId, agentId)
    setManagerAgent(teamId, agentId)

    // Team operations
    deploy(teamId, taskInput)
    getRunStatus(teamRunId)
    cancelRun(teamRunId)

    // Execution strategies
    executeParallel(team, task)
    executeSequential(team, task)
    executeAdaptive(team, task)
}
```

### 1.5 Create AgentRunner

**New File:** `lib/agents/runner.js`

```javascript
class AgentRunner {
    constructor(options = {})

    // Run management
    startRun(agentId, input)
    executeStep(runId, stepIndex)
    completeRun(runId, result)
    failRun(runId, error)
    cancelRun(runId)

    // Step execution
    executeThinkStep(step, context)
    executeToolStep(step, context)
    executeQueryStep(step, context)

    // Context management
    accumulateContext(runContext, stepResult)

    // Events
    on(event, callback)
}
```

---

## Phase 2: Build APIs in alephnet-node

### 2.1 Agent Routes

**New File:** `lib/app/server/agent-routes.js`

```javascript
// Agent endpoints
POST   /api/agents              // Create agent
GET    /api/agents              // List agents
GET    /api/agents/:id          // Get agent
PUT    /api/agents/:id          // Update agent
DELETE /api/agents/:id          // Delete agent

// Agent operations
POST   /api/agents/:id/start    // Start agent
POST   /api/agents/:id/stop     // Stop agent
POST   /api/agents/:id/pause    // Pause agent
POST   /api/agents/:id/resume   // Resume agent
GET    /api/agents/:id/status   // Get agent status

// Agent runs
GET    /api/agents/:id/runs              // List runs
POST   /api/agents/:id/runs              // Start new run
GET    /api/agents/:id/runs/:runId       // Get run details
DELETE /api/agents/:id/runs/:runId       // Cancel run
GET    /api/agents/:id/runs/:runId/steps // Get run steps
```

### 2.2 Team Routes

**New File:** `lib/app/server/team-routes.js`

```javascript
// Team endpoints
POST   /api/teams                      // Create team
GET    /api/teams                      // List teams
GET    /api/teams/:id                  // Get team
PUT    /api/teams/:id                  // Update team
DELETE /api/teams/:id                  // Delete team

// Team members
GET    /api/teams/:id/members          // List members
POST   /api/teams/:id/members          // Add member
DELETE /api/teams/:id/members/:agentId // Remove member

// Team execution
POST   /api/teams/:id/deploy           // Deploy team on task
GET    /api/teams/:id/runs             // List team runs
GET    /api/teams/:id/runs/:runId      // Get run status
DELETE /api/teams/:id/runs/:runId      // Cancel run
```

### 2.3 SRIA Routes

**New File:** `lib/app/server/sria-routes.js`

```javascript
// SRIA endpoints
POST   /api/sria/:agentId/summon    // Summon SRIA
POST   /api/sria/:agentId/dismiss   // Dismiss SRIA
GET    /api/sria/:agentId/session   // Get current session
POST   /api/sria/:agentId/step      // Execute step
GET    /api/sria/:agentId/layers    // List available layers
POST   /api/sria/:agentId/layer     // Invoke specific layer

// Beacon operations
POST   /api/sria/:agentId/beacon    // Emit beacon
GET    /api/sria/:agentId/beacons   // List beacons
```

### 2.4 WebSocket Support

**Updates to:** `lib/app/server/index.js`

```javascript
// WebSocket events for real-time updates
ws.on('agent:subscribe', { agentId }) // Subscribe to agent updates
ws.on('team:subscribe', { teamId }) // Subscribe to team updates
ws.on('run:subscribe', { runId }) // Subscribe to run updates

// Server-sent events
ws.emit('agent:status', { agentId, status })
ws.emit('run:step', { runId, step, status })
ws.emit('run:complete', { runId, result })
ws.emit('team:worker', { teamRunId, workerId, status })
```

---

## Phase 3: Add Tests

### Test Structure

```
lib/__tests__/
├── sria/
│   ├── engine.test.ts          # SRIAEngine unit tests
│   ├── lifecycle.test.ts       # Lifecycle tests
│   └── multi-agent.test.ts     # Multi-agent tests
├── agents/
│   ├── manager.test.ts         # AgentManager tests
│   ├── team-manager.test.ts    # TeamManager tests
│   └── runner.test.ts          # AgentRunner tests
└── integration/
    ├── agent-api.test.ts       # API integration tests
    └── team-api.test.ts        # Team API tests
```

### Key Test Cases

**SRIA Engine Tests:**

- Body hash generation consistency
- Resonance key computation
- Percept encoding accuracy
- Free energy minimization
- Lifecycle transitions

**Agent Manager Tests:**

- Agent CRUD operations
- State management
- Event emission
- Error handling

**API Integration Tests:**

- Full agent lifecycle via API
- Team deployment flow
- WebSocket event delivery
- Error responses

---

## Phase 4: Update Documentation

### New Documentation Files

| File                 | Description         |
| -------------------- | ------------------- |
| `docs/api/agents.md` | Agent API reference |
| `docs/api/teams.md`  | Team API reference  |
| `docs/api/sria.md`   | SRIA API reference  |

### Documentation Structure

```markdown
# Agent API

## Overview

Description of the agent system...

## Endpoints

### Create Agent

POST /api/agents
...

## Types

### Agent

| Field | Type | Description |
| ----- | ---- | ----------- |

...

## Examples

### Creating an Agent

javascript
const agent = await alephnet.createAgent({...});
...
```

---

## Phase 5: Update SKILL.md and README.md

### New SKILL.md Actions

```markdown
### Tier 6: Agent Orchestration

#### `agent.create`

Create a new autonomous agent.
bash
alephnet-node agent.create --name "DataAnalyzer" --trigger timer --cron "0 \* \* \* \*"

#### `agent.start`

Start an agent.
bash
alephnet-node agent.start --agentId "agent_123"

#### `team.deploy`

Deploy an agent team on a task.
bash
alephnet-node team.deploy --teamId "team_456" --task "Analyze this dataset and generate a report"
```

### README.md Updates

- Add Agent Orchestration to Features
- Add Quick Start examples for agents
- Update Core Modules table
- Add Agent-specific configuration

---

## Phase 6: Convert prime-echo-core

### 6.1 Add alephnet-node Dependency

```json
// prime-echo-core/package.json
{
  "dependencies": {
    "@sschepis/alephnet-node": "^1.3.0"
  }
}
```

### 6.2 Create Adapter Layer

**New File:** `prime-echo-core/src/lib/alephnet-adapter.ts`

```typescript
import alephnet from '@sschepis/alephnet-node'

// Adapter to bridge alephnet-node APIs with Supabase persistence
export class AlephNetAdapter {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  // Agents
  async createAgent(data: CreateAgentInput) {
    // Call alephnet-node API
    const result = await alephnet.agents.create(data)

    // Persist to Supabase
    await this.supabase.from('agents').insert({
      alephnet_id: result.id,
      ...data,
    })

    return result
  }

  // ... other methods
}
```

### 6.3 Update Hooks

**Update:** `prime-echo-core/src/hooks/useAgents.ts`

```typescript
// Before
import { supabase } from '@/integrations/supabase/client'

// After
import { useAlephNetAdapter } from '@/lib/alephnet-adapter'

export function useAgents(orgId?: string | null) {
  const adapter = useAlephNetAdapter()

  const createAgent = useCallback(
    async (agent: Partial<Agent>) => {
      // Use adapter instead of direct Supabase
      return adapter.createAgent(agent)
    },
    [adapter],
  )

  // ... rest of hook
}
```

---

## Phase 7: Clean Up prime-echo-core

### Files to Remove

```
prime-echo-core/src/lib/sria/           # Moved to alephnet-node
  ├── SRIAEngine.ts
  ├── types.ts
  ├── lifecycle.ts
  └── multiAgentResonance.ts

prime-echo-core/src/lib/alephnet/       # Using alephnet-node package
  └── constants.ts

# Note: Keep hooks and UI components
```

### Files to Update

| File                                    | Changes                |
| --------------------------------------- | ---------------------- |
| `src/hooks/useAgents.ts`                | Use AlephNetAdapter    |
| `src/hooks/useAgentTeams.ts`            | Use AlephNetAdapter    |
| `src/hooks/useSRIA.ts`                  | Use alephnet-node SRIA |
| `src/components/prnsa/AgentPanel.tsx`   | Update imports         |
| `src/components/prnsa/AgentBuilder.tsx` | Update imports         |

### Verification Checklist

- [ ] All tests pass in prime-echo-core
- [ ] Agent creation works via UI
- [ ] Agent execution works
- [ ] Team deployment works
- [ ] SRIA summoning works
- [ ] No TypeScript errors
- [ ] No runtime errors in browser console

---

## Implementation Timeline

| Phase   | Duration | Dependencies |
| ------- | -------- | ------------ |
| Phase 1 | 2-3 days | None         |
| Phase 2 | 1-2 days | Phase 1      |
| Phase 3 | 1 day    | Phases 1-2   |
| Phase 4 | 0.5 day  | Phase 2      |
| Phase 5 | 0.5 day  | Phase 2      |
| Phase 6 | 1-2 days | Phases 1-5   |
| Phase 7 | 0.5 day  | Phase 6      |

**Total Estimated Time:** 6-9 days

---

## Risk Mitigation

### Risk: Breaking Changes

**Mitigation:**

- Keep original files in prime-echo-core until verified
- Use adapter pattern for gradual migration
- Maintain backward compatibility in API design

### Risk: Type Mismatches

**Mitigation:**

- Create TypeScript definitions for alephnet-node exports
- Use shared type definitions package
- Add comprehensive type tests

### Risk: Performance Regression

**Mitigation:**

- Benchmark key operations before/after
- Add performance tests
- Profile critical paths

---

## Success Criteria

1. ✅ All SRIA functionality available in alephnet-node
2. ✅ All agent CRUD operations work via API
3. ✅ Team execution strategies functional
4. ✅ 90%+ test coverage on new code
5. ✅ Documentation complete and accurate
6. ✅ prime-echo-core uses alephnet-node without regression
7. ✅ No duplicate code in prime-echo-core
