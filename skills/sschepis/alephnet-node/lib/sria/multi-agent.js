/**
 * Multi-Agent Resonance Network
 *
 * Handles multiple SRIA agents working together with:
 * - Tensor body composition (shared primes)
 * - Coupled policy gradients
 * - Shared belief propagation
 * - Collective free energy minimization
 *
 * @module lib/sria/multi-agent
 */

const crypto = require('crypto')
const EventEmitter = require('events')
const { SRIAEngine } = require('./engine')
const { LifecycleState } = require('./lifecycle')

/**
 * Tensor Body - shared prime representation for agent coupling
 */
class TensorBody {
  /**
   * Create a tensor body from multiple agents
   * @param {SRIAEngine[]} agents - Array of SRIA engines
   */
  constructor(agents) {
    this.agents = agents
    this.sharedPrimes = this._computeSharedPrimes()
    this.couplingMatrix = this._computeCouplingMatrix()
    this.phaseAlignment = {}
  }

  /**
   * Compute primes shared by all agents
   * @private
   * @returns {number[]} Shared primes
   */
  _computeSharedPrimes() {
    if (this.agents.length === 0) return []

    // Start with first agent's primes
    let shared = new Set(this.agents[0].bodyPrimes)

    // Intersect with all other agents
    for (let i = 1; i < this.agents.length; i++) {
      const agentPrimes = new Set(this.agents[i].bodyPrimes)
      shared = new Set([...shared].filter((p) => agentPrimes.has(p)))
    }

    return Array.from(shared).sort((a, b) => a - b)
  }

  /**
   * Compute coupling strength matrix between agents
   * @private
   * @returns {number[][]} Coupling matrix
   */
  _computeCouplingMatrix() {
    const n = this.agents.length
    const matrix = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0))

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0
        } else {
          const primesI = new Set(this.agents[i].bodyPrimes)
          const primesJ = new Set(this.agents[j].bodyPrimes)
          const intersection = [...primesI].filter((p) => primesJ.has(p))
          const union = new Set([...primesI, ...primesJ])
          matrix[i][j] = intersection.length / union.size
        }
      }
    }

    return matrix
  }

  /**
   * Get coupling strength between two agents
   * @param {number} i - First agent index
   * @param {number} j - Second agent index
   * @returns {number} Coupling strength [0, 1]
   */
  getCoupling(i, j) {
    return this.couplingMatrix[i]?.[j] ?? 0
  }

  /**
   * Compute phase alignment across agents for shared primes
   * @returns {Object.<number, number>} Phase alignment per prime
   */
  computePhaseAlignment() {
    const alignment = {}

    for (const prime of this.sharedPrimes) {
      let totalPhase = 0
      let count = 0

      for (const agent of this.agents) {
        const phases = agent.memoryPhases[prime] || []
        if (phases.length > 0) {
          // Use most recent phase
          totalPhase += phases[phases.length - 1]
          count++
        }
      }

      alignment[prime] = count > 0 ? totalPhase / count : 0
    }

    this.phaseAlignment = alignment
    return alignment
  }

  /**
   * Propagate phase updates across agents
   * @param {number} sourceIndex - Source agent index
   * @param {number} prime - Prime to propagate
   * @param {number} phase - Phase value
   * @returns {Object} Propagation result
   */
  propagatePhase(sourceIndex, prime, phase) {
    const updates = []

    for (let i = 0; i < this.agents.length; i++) {
      if (i === sourceIndex) continue

      const coupling = this.getCoupling(sourceIndex, i)
      if (coupling > 0.1) {
        // Only propagate if coupling is significant
        const agent = this.agents[i]
        if (agent.bodyPrimes.includes(prime)) {
          // Apply damped phase update
          const dampedPhase = phase * coupling * 0.5
          if (!agent.memoryPhases[prime]) {
            agent.memoryPhases[prime] = []
          }
          agent.memoryPhases[prime].push(dampedPhase)

          updates.push({
            agentIndex: i,
            agentName: agent.name,
            prime,
            appliedPhase: dampedPhase,
            coupling,
          })
        }
      }
    }

    return { updates }
  }
}

/**
 * Coupled Policy - shared policy gradient for multi-agent decisions
 */
class CoupledPolicy {
  /**
   * Create a coupled policy
   * @param {TensorBody} tensorBody - Tensor body for coupling
   */
  constructor(tensorBody) {
    this.tensorBody = tensorBody
    this.policyWeights = new Map()
    this.gradientHistory = []
  }

  /**
   * Initialize policy weights
   * @param {string[]} actionTypes - Available action types
   */
  initializeWeights(actionTypes) {
    for (let i = 0; i < this.tensorBody.agents.length; i++) {
      const agentWeights = {}
      for (const actionType of actionTypes) {
        agentWeights[actionType] = 1.0 / actionTypes.length
      }
      this.policyWeights.set(i, agentWeights)
    }
  }

  /**
   * Get action probabilities for an agent
   * @param {number} agentIndex - Agent index
   * @returns {Object.<string, number>} Action probabilities
   */
  getActionProbabilities(agentIndex) {
    return { ...this.policyWeights.get(agentIndex) }
  }

  /**
   * Update policy based on action outcome
   * @param {number} agentIndex - Agent index
   * @param {string} actionType - Action taken
   * @param {number} reward - Reward signal
   * @param {number} learningRate - Learning rate
   */
  update(agentIndex, actionType, reward, learningRate = 0.1) {
    const weights = this.policyWeights.get(agentIndex)
    if (!weights) return

    // Local update
    const oldWeight = weights[actionType] || 0
    weights[actionType] = oldWeight + learningRate * reward * (1 - oldWeight)

    // Normalize
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    for (const type of Object.keys(weights)) {
      weights[type] /= total
    }

    // Coupled update - propagate to coupled agents
    const gradient = {
      agentIndex,
      actionType,
      reward,
      timestamp: Date.now(),
    }
    this.gradientHistory.push(gradient)

    for (let i = 0; i < this.tensorBody.agents.length; i++) {
      if (i === agentIndex) continue

      const coupling = this.tensorBody.getCoupling(agentIndex, i)
      if (coupling > 0.2) {
        const otherWeights = this.policyWeights.get(i)
        if (otherWeights && otherWeights[actionType] !== undefined) {
          const dampedReward = reward * coupling * 0.3
          const oldOtherWeight = otherWeights[actionType]
          otherWeights[actionType] =
            oldOtherWeight + learningRate * dampedReward * (1 - oldOtherWeight)

          // Re-normalize
          const otherTotal = Object.values(otherWeights).reduce((a, b) => a + b, 0)
          for (const type of Object.keys(otherWeights)) {
            otherWeights[type] /= otherTotal
          }
        }
      }
    }
  }
}

/**
 * Belief Network - shared belief propagation
 */
class BeliefNetwork {
  /**
   * Create a belief network
   * @param {TensorBody} tensorBody - Tensor body for coupling
   */
  constructor(tensorBody) {
    this.tensorBody = tensorBody
    this.sharedBeliefs = []
    this.beliefHistory = []
  }

  /**
   * Aggregate beliefs from all agents
   * @returns {Object[]} Aggregated beliefs
   */
  aggregateBeliefs() {
    const beliefMap = new Map()

    for (let i = 0; i < this.tensorBody.agents.length; i++) {
      const agent = this.tensorBody.agents[i]
      if (!agent.session) continue

      for (const belief of agent.session.currentBeliefs) {
        const key = belief.state
        if (!beliefMap.has(key)) {
          beliefMap.set(key, {
            state: belief.state,
            probability: 0,
            entropy: 0,
            primeFactors: [],
            agentContributions: [],
          })
        }

        const agg = beliefMap.get(key)
        agg.probability += belief.probability
        agg.entropy += belief.entropy
        agg.primeFactors = [...new Set([...agg.primeFactors, ...(belief.primeFactors || [])])]
        agg.agentContributions.push({
          agentIndex: i,
          agentName: agent.name,
          probability: belief.probability,
        })
      }
    }

    // Normalize and compute averages
    const activeAgentCount = this.tensorBody.agents.filter((a) => a.session).length || 1

    this.sharedBeliefs = Array.from(beliefMap.values()).map((belief) => ({
      ...belief,
      probability: belief.probability / activeAgentCount,
      entropy: belief.entropy / belief.agentContributions.length,
    }))

    return this.sharedBeliefs
  }

  /**
   * Propagate a belief update to all agents
   * @param {Object} belief - Belief to propagate
   * @param {number} sourceIndex - Source agent index
   * @returns {Object} Propagation result
   */
  propagateBelief(belief, sourceIndex) {
    const updates = []

    for (let i = 0; i < this.tensorBody.agents.length; i++) {
      if (i === sourceIndex) continue

      const agent = this.tensorBody.agents[i]
      if (!agent.session) continue

      const coupling = this.tensorBody.getCoupling(sourceIndex, i)
      if (coupling > 0.15) {
        // Add damped belief to agent
        const dampedBelief = {
          ...belief,
          probability: belief.probability * coupling * 0.4,
          state: `shared_${belief.state}`,
          source: sourceIndex,
        }

        agent.session.currentBeliefs.push(dampedBelief)

        // Normalize
        const total = agent.session.currentBeliefs.reduce((s, b) => s + b.probability, 0)
        agent.session.currentBeliefs.forEach((b) => (b.probability /= total))

        updates.push({
          agentIndex: i,
          agentName: agent.name,
          beliefState: dampedBelief.state,
          probability: dampedBelief.probability,
        })
      }
    }

    this.beliefHistory.push({
      belief: belief.state,
      sourceIndex,
      timestamp: Date.now(),
      propagatedTo: updates.length,
    })

    return { updates }
  }
}

/**
 * Multi-Agent Resonance Network
 * Orchestrates multiple SRIA agents working together
 *
 * @extends EventEmitter
 */
class MultiAgentNetwork extends EventEmitter {
  /**
   * Create a multi-agent network
   * @param {Object} options - Network options
   * @param {string} [options.name] - Network name
   */
  constructor(options = {}) {
    super()

    this.name = options.name || 'unnamed_network'
    this.agents = []
    this.tensorBody = null
    this.coupledPolicy = null
    this.beliefNetwork = null
    this.collectiveFreeEnergy = 1.0
    this.stepCount = 0
  }

  /**
   * Add an agent to the network
   * @param {SRIAEngine} agent - Agent to add
   * @returns {number} Agent index
   */
  addAgent(agent) {
    const index = this.agents.length
    this.agents.push(agent)

    // Rebuild tensor body
    this.tensorBody = new TensorBody(this.agents)
    this.coupledPolicy = new CoupledPolicy(this.tensorBody)
    this.beliefNetwork = new BeliefNetwork(this.tensorBody)

    // Initialize policy weights with common action types
    this.coupledPolicy.initializeWeights([
      'query',
      'response',
      'memory_write',
      'layer_shift',
      'wait',
    ])

    this.emit('agent_added', { index, name: agent.name })

    return index
  }

  /**
   * Remove an agent from the network
   * @param {number} index - Agent index
   * @returns {boolean} Success
   */
  removeAgent(index) {
    if (index < 0 || index >= this.agents.length) {
      return false
    }

    const removed = this.agents.splice(index, 1)[0]

    // Rebuild tensor body
    this.tensorBody = new TensorBody(this.agents)
    this.coupledPolicy = new CoupledPolicy(this.tensorBody)
    this.beliefNetwork = new BeliefNetwork(this.tensorBody)

    this.coupledPolicy.initializeWeights([
      'query',
      'response',
      'memory_write',
      'layer_shift',
      'wait',
    ])

    this.emit('agent_removed', { index, name: removed.name })

    return true
  }

  /**
   * Summon all agents in the network
   * @param {Object} [options] - Summon options
   * @returns {Object[]} Summon results
   */
  summonAll(options = {}) {
    const results = []

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i]
      const result = agent.summon({
        ...options,
        initialContext: options.initialContext || `network_${this.name}_agent_${i}`,
      })
      results.push({
        agentIndex: i,
        agentName: agent.name,
        ...result,
      })
    }

    this.emit('network_summoned', { results })

    return results
  }

  /**
   * Execute a collective step across all agents
   * @param {string} observation - Shared observation
   * @param {Object[]} possibleActions - Available actions
   * @returns {Object} Collective step result
   */
  collectiveStep(observation, possibleActions) {
    this.stepCount++

    const agentResults = []
    let totalFreeEnergy = 0
    const selectedActions = []

    // Each agent takes a step
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i]

      if (agent.lifecycleState === LifecycleState.DORMANT) {
        agentResults.push({
          agentIndex: i,
          agentName: agent.name,
          skipped: true,
          reason: 'dormant',
        })
        continue
      }

      // Get action probabilities from coupled policy
      const actionProbs = this.coupledPolicy.getActionProbabilities(i)

      // Bias possible actions based on coupled policy
      const biasedActions = possibleActions.map((action) => ({
        ...action,
        entropyCost: action.entropyCost * (1 / (actionProbs[action.type] || 0.1)),
      }))

      const result = agent.fullStep(observation, biasedActions)

      if (result.success) {
        totalFreeEnergy += result.decision.freeEnergy
        selectedActions.push({
          agentIndex: i,
          action: result.decision.action,
        })

        // Update coupled policy based on outcome
        const reward = 1 - result.decision.freeEnergy // Lower energy = higher reward
        this.coupledPolicy.update(i, result.decision.action.type, reward)

        // Propagate beliefs
        if (agent.session?.currentBeliefs?.length > 0) {
          const topBelief = agent.session.currentBeliefs.sort(
            (a, b) => b.probability - a.probability,
          )[0]
          this.beliefNetwork.propagateBelief(topBelief, i)
        }

        // Propagate phase updates for shared primes
        for (const prime of this.tensorBody.sharedPrimes) {
          const phases = agent.memoryPhases[prime]
          if (phases && phases.length > 0) {
            this.tensorBody.propagatePhase(i, prime, phases[phases.length - 1])
          }
        }
      }

      agentResults.push({
        agentIndex: i,
        agentName: agent.name,
        ...result,
      })
    }

    // Compute collective free energy
    const activeAgents = agentResults.filter((r) => !r.skipped).length
    this.collectiveFreeEnergy = activeAgents > 0 ? totalFreeEnergy / activeAgents : 1.0

    // Aggregate shared beliefs
    const sharedBeliefs = this.beliefNetwork.aggregateBeliefs()

    // Compute phase alignment
    const phaseAlignment = this.tensorBody.computePhaseAlignment()

    const result = {
      stepCount: this.stepCount,
      agentResults,
      collectiveFreeEnergy: this.collectiveFreeEnergy,
      selectedActions,
      sharedBeliefs: sharedBeliefs.slice(0, 5),
      phaseAlignment,
      activeAgents,
    }

    this.emit('collective_step', result)

    return result
  }

  /**
   * Dismiss all agents
   * @returns {Object[]} Dismiss results
   */
  dismissAll() {
    const results = []

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i]
      const result = agent.dismiss()
      results.push({
        agentIndex: i,
        agentName: agent.name,
        ...result,
      })
    }

    this.emit('network_dismissed', { results })

    return results
  }

  /**
   * Get network state
   * @returns {Object} Network state
   */
  getState() {
    return {
      name: this.name,
      agentCount: this.agents.length,
      agents: this.agents.map((a, i) => ({
        index: i,
        ...a.getState(),
      })),
      sharedPrimes: this.tensorBody?.sharedPrimes || [],
      collectiveFreeEnergy: this.collectiveFreeEnergy,
      stepCount: this.stepCount,
      sharedBeliefs: this.beliefNetwork?.sharedBeliefs?.slice(0, 5) || [],
    }
  }

  /**
   * Serialize network
   * @returns {Object} Serialized network
   */
  serialize() {
    return {
      name: this.name,
      agents: this.agents.map((a) => a.serialize()),
      collectiveFreeEnergy: this.collectiveFreeEnergy,
      stepCount: this.stepCount,
    }
  }

  /**
   * Deserialize network
   * @param {Object} data - Serialized data
   * @returns {MultiAgentNetwork} Network instance
   */
  static deserialize(data) {
    const network = new MultiAgentNetwork({ name: data.name })

    for (const agentData of data.agents) {
      const agent = SRIAEngine.deserialize(agentData)
      network.addAgent(agent)
    }

    network.collectiveFreeEnergy = data.collectiveFreeEnergy || 1.0
    network.stepCount = data.stepCount || 0

    return network
  }
}

module.exports = {
  TensorBody,
  CoupledPolicy,
  BeliefNetwork,
  MultiAgentNetwork,
}
