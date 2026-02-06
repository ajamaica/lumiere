/**
 * AgentManager Tests
 *
 * Tests for agent CRUD operations and lifecycle management
 */

const { AgentManager } = require('../agent-manager')
const { LifecycleState } = require('../lifecycle')

describe('AgentManager', () => {
  let manager

  beforeEach(() => {
    manager = new AgentManager()
  })

  describe('create', () => {
    it('should create agent with default values', () => {
      const agent = manager.create()

      expect(agent.id).toBeDefined()
      expect(agent.id.startsWith('agent_')).toBe(true)
      expect(agent.name).toBe('Unnamed Agent')
      expect(agent.bodyPrimes).toBeDefined()
      expect(agent.createdAt).toBeDefined()
      expect(agent.updatedAt).toBeDefined()
    })

    it('should create agent with custom values', () => {
      const agent = manager.create({
        name: 'Test Agent',
        bodyPrimes: [13, 17, 19],
        metadata: { purpose: 'testing' },
      })

      expect(agent.name).toBe('Test Agent')
      expect(agent.bodyPrimes).toEqual([13, 17, 19])
      expect(agent.metadata.purpose).toBe('testing')
    })

    it('should create agent from template', () => {
      const agent = manager.create({
        templateId: 'light-guide',
        name: 'My Light Guide',
      })

      expect(agent.name).toBe('My Light Guide')
      expect(agent.bodyPrimes).toEqual([2, 3, 5, 7, 11])
    })

    it('should emit agent_created event', (done) => {
      manager.on('agent_created', (agent) => {
        expect(agent.id).toBeDefined()
        done()
      })

      manager.create()
    })
  })

  describe('get', () => {
    it('should get agent by id', () => {
      const created = manager.create({ name: 'Test' })
      const retrieved = manager.get(created.id)

      expect(retrieved).toEqual(created)
    })

    it('should return null for non-existent id', () => {
      const result = manager.get('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    beforeEach(() => {
      manager.create({ name: 'Alpha Agent', bodyPrimes: [2, 3, 5] })
      manager.create({ name: 'Beta Agent', bodyPrimes: [7, 11, 13] })
      manager.create({ name: 'Gamma Bot', bodyPrimes: [2, 17, 19] })
    })

    it('should list all agents', () => {
      const agents = manager.list()

      expect(agents.length).toBe(3)
    })

    it('should filter by name', () => {
      const agents = manager.list({ name: 'Agent' })

      expect(agents.length).toBe(2)
      expect(agents.every((a) => a.name.includes('Agent'))).toBe(true)
    })

    it('should filter by bodyPrimes', () => {
      const agents = manager.list({ bodyPrimes: [2] })

      expect(agents.length).toBe(2)
    })
  })

  describe('update', () => {
    it('should update agent properties', () => {
      const agent = manager.create({ name: 'Original' })
      const updated = manager.update(agent.id, { name: 'Updated' })

      expect(updated.name).toBe('Updated')
      expect(updated.id).toBe(agent.id)
      expect(updated.createdAt).toBe(agent.createdAt)
      expect(updated.updatedAt).not.toBe(agent.updatedAt)
    })

    it('should return null for non-existent agent', () => {
      const result = manager.update('nonexistent', { name: 'Test' })

      expect(result).toBeNull()
    })

    it('should emit agent_updated event', (done) => {
      const agent = manager.create()

      manager.on('agent_updated', (updated) => {
        expect(updated.name).toBe('New Name')
        done()
      })

      manager.update(agent.id, { name: 'New Name' })
    })
  })

  describe('delete', () => {
    it('should delete agent', () => {
      const agent = manager.create()
      const result = manager.delete(agent.id)

      expect(result).toBe(true)
      expect(manager.get(agent.id)).toBeNull()
    })

    it('should return false for non-existent agent', () => {
      const result = manager.delete('nonexistent')

      expect(result).toBe(false)
    })

    it('should dismiss engine if active', () => {
      const agent = manager.create()
      manager.summon(agent.id)

      manager.delete(agent.id)

      expect(manager.engines.has(agent.id)).toBe(false)
    })

    it('should emit agent_deleted event', (done) => {
      const agent = manager.create()

      manager.on('agent_deleted', (data) => {
        expect(data.id).toBe(agent.id)
        done()
      })

      manager.delete(agent.id)
    })
  })

  describe('getEngine', () => {
    it('should create engine for agent', () => {
      const agent = manager.create({ name: 'Engine Test' })
      const engine = manager.getEngine(agent.id)

      expect(engine).toBeDefined()
      expect(engine.name).toBe('Engine Test')
    })

    it('should return same engine on subsequent calls', () => {
      const agent = manager.create()
      const engine1 = manager.getEngine(agent.id)
      const engine2 = manager.getEngine(agent.id)

      expect(engine1).toBe(engine2)
    })

    it('should return null for non-existent agent', () => {
      const engine = manager.getEngine('nonexistent')

      expect(engine).toBeNull()
    })
  })

  describe('summon', () => {
    it('should summon agent', () => {
      const agent = manager.create()
      const result = manager.summon(agent.id)

      expect(result.success).toBe(true)
      expect(result.sessionId).toBeDefined()
    })

    it('should return error for non-existent agent', () => {
      const result = manager.summon('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('dismiss', () => {
    it('should dismiss summoned agent', () => {
      const agent = manager.create()
      manager.summon(agent.id)
      const result = manager.dismiss(agent.id)

      expect(result.success).toBe(true)
    })

    it('should return error if not active', () => {
      const result = manager.dismiss('nonexistent')

      expect(result.success).toBe(false)
    })
  })

  describe('step', () => {
    it('should execute step for summoned agent', () => {
      const agent = manager.create()
      manager.summon(agent.id)

      const result = manager.step(agent.id, 'test observation', [
        { type: 'wait', entropyCost: 0.1, confidence: 0.9 },
      ])

      expect(result.success).toBe(true)
      expect(result.decision).toBeDefined()
    })

    it('should return error if not active', () => {
      const result = manager.step('nonexistent', 'test', [])

      expect(result.success).toBe(false)
    })
  })

  describe('getState', () => {
    it('should return inactive state for dormant agent', () => {
      const agent = manager.create()
      const state = manager.getState(agent.id)

      expect(state.active).toBe(false)
      expect(state.definition).toBeDefined()
    })

    it('should return active state for summoned agent', () => {
      const agent = manager.create()
      manager.summon(agent.id)
      const state = manager.getState(agent.id)

      expect(state.active).toBe(true)
      expect(state.engine).toBeDefined()
    })

    it('should return null for non-existent agent', () => {
      const state = manager.getState('nonexistent')

      expect(state).toBeNull()
    })
  })

  describe('templates', () => {
    it('should list available templates', () => {
      const templates = manager.listTemplates()

      expect(templates.length).toBeGreaterThan(0)
      expect(templates.some((t) => t.id === 'light-guide')).toBe(true)
      expect(templates.some((t) => t.id === 'data-analyst')).toBe(true)
    })

    it('should add custom template', () => {
      manager.addTemplate('custom', {
        name: 'Custom Template',
        bodyPrimes: [23, 29, 31],
      })

      const templates = manager.listTemplates()
      expect(templates.some((t) => t.id === 'custom')).toBe(true)
    })

    it('should create agent from custom template', () => {
      manager.addTemplate('custom', {
        name: 'Custom',
        bodyPrimes: [23, 29, 31],
      })

      const agent = manager.create({ templateId: 'custom' })

      expect(agent.bodyPrimes).toEqual([23, 29, 31])
    })
  })

  describe('getStats', () => {
    it('should return statistics', () => {
      manager.create()
      manager.create()
      const agent = manager.create()
      manager.summon(agent.id)

      const stats = manager.getStats()

      expect(stats.totalAgents).toBe(3)
      expect(stats.activeEngines).toBe(1)
      expect(stats.summonedAgents).toBe(1)
      expect(stats.primeDistribution).toBeDefined()
    })
  })
})
