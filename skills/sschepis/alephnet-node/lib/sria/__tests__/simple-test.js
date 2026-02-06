/**
 * Simple SRIA Engine Tests
 *
 * Standalone tests that can be run directly with Node.js
 */

const { SRIAEngine } = require('../engine')
const { AgentManager } = require('../agent-manager')
const { TeamManager } = require('../team-manager')

// Test utilities
let passed = 0
let failed = 0

function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result
        .then(() => {
          console.log(`  ✓ ${name}`)
          passed++
        })
        .catch((error) => {
          console.log(`  ✗ ${name}`)
          console.log(`    Error: ${error.message}`)
          failed++
        })
    }
    console.log(`  ✓ ${name}`)
    passed++
  } catch (error) {
    console.log(`  ✗ ${name}`)
    console.log(`    Error: ${error.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

async function runTests() {
  // ============= SRIA Engine Tests =============
  console.log('\nTesting SRIA Engine...')

  const engine = new SRIAEngine()

  test('Engine should have required methods', () => {
    assert(typeof engine.generateBodyHash === 'function', 'generateBodyHash should be a function')
    assert(typeof engine.verifyResonance === 'function', 'verifyResonance should be a function')
    assert(typeof engine.encodePercept === 'function', 'encodePercept should be a function')
  })

  test('encodePercept should encode observation', () => {
    const percept = engine.encodePercept('hello world', [2, 3, 5])
    assert(percept.raw === 'hello world', 'Raw should match input')
    assert(percept.encoded, 'Should have encoded data')
    assert(percept.encoded.primes, 'Should have primes in encoded')
    assert(percept.encoded.phases, 'Should have phases in encoded')
  })

  test('summon should return session info', () => {
    const mockSRIA = {
      id: 'test-id',
      bodyPrimes: [2, 3, 5, 7, 11],
      memoryPhases: {},
      attractorBiases: { harmonicWeights: {}, preferredPrimes: [], avoidedPrimes: [] },
      quaternionState: { w: 1, x: 0, y: 0, z: 0 },
      perceptionConfig: { inputLayers: ['data', 'semantic'] },
      collapseDynamics: { entropyDecayRate: 0.95, coherenceThreshold: 0.7 },
    }
    const resonanceKey = { bodyKey: 'test' }

    const result = engine.summon(mockSRIA, resonanceKey)
    assert(result, 'Should return result')
    assert(result.success || result.sessionId, 'Summon should succeed or return sessionId')
  })

  // ============= AgentManager Tests =============
  console.log('\nTesting AgentManager...')

  const agentManager = new AgentManager()

  // Note: AgentManager uses create(), get(), list() - not createAgent, etc.
  test('AgentManager should create agent with create()', () => {
    const agent = agentManager.create({ name: 'Test Agent' })
    assert(agent.id, 'Agent should have id')
    assert(agent.bodyPrimes, 'Agent should have bodyPrimes')
    assert(agent.name === 'Test Agent', 'Agent should have correct name')
  })

  test('AgentManager should list agents with list()', () => {
    const agents = agentManager.list()
    assert(Array.isArray(agents), 'Should return array')
    assert(agents.length > 0, 'Should have at least one agent')
  })

  test('AgentManager should get agent with get()', () => {
    const agents = agentManager.list()
    if (agents.length > 0) {
      const agent = agentManager.get(agents[0].id)
      assert(agent, 'Should return agent')
      assert(agent.id === agents[0].id, 'Should return correct agent')
    }
  })

  test('AgentManager should summon agent with summon()', () => {
    const agents = agentManager.list()
    if (agents.length > 0) {
      const result = agentManager.summon(agents[0].id)
      assert(result, 'Should return result')
      // Result has success flag or error
      assert(
        typeof result.success !== 'undefined' || typeof result.error !== 'undefined',
        'Should have success or error',
      )
    }
  })

  test('AgentManager should get engine with getEngine()', () => {
    const agents = agentManager.list()
    if (agents.length > 0) {
      const engine = agentManager.getEngine(agents[0].id)
      assert(engine, 'Should return engine')
    }
  })

  // ============= TeamManager Tests =============
  console.log('\nTesting TeamManager...')

  // TeamManager needs an agentManager instance
  const teamManager = new TeamManager({ agentManager })

  test('TeamManager should be created', () => {
    assert(teamManager, 'TeamManager should exist')
  })

  test('TeamManager should create team with create()', () => {
    // Get existing agents
    const agents = agentManager.list()

    if (agents.length < 2) {
      // Create agents if needed
      agentManager.create({ name: 'Team Agent 1' })
      agentManager.create({ name: 'Team Agent 2' })
    }

    const updatedAgents = agentManager.list()
    const agent1 = updatedAgents[0]
    const agent2 = updatedAgents[1]

    const team = teamManager.create({
      name: 'Test Team',
      agentIds: [agent1.id, agent2.id],
    })

    assert(team.id, 'Team should have id')
    assert(team.agentIds.length === 2, 'Team should have 2 agents')
  })

  test('TeamManager should list teams with list()', () => {
    const teams = teamManager.list()
    assert(Array.isArray(teams), 'Should return array')
    assert(teams.length > 0, 'Should have at least one team')
  })

  // ============= Summary =============
  console.log('\n' + '='.repeat(40))
  console.log(`Tests: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(40))

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
