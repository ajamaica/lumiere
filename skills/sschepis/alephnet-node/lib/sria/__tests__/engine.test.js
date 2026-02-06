/**
 * SRIA Engine Tests
 *
 * Tests for the core SRIA Engine functionality including:
 * - Engine initialization
 * - Summoning and dismissing
 * - Perception and encoding
 * - Decision making (free energy minimization)
 * - Learning and memory
 * - Beacon generation
 */

const { SRIAEngine } = require('../engine')
const { LifecycleState } = require('../lifecycle')
const { LIGHT_GUIDE_TEMPLATE, SummonableLayer } = require('../types')

describe('SRIAEngine', () => {
  let engine

  beforeEach(() => {
    engine = new SRIAEngine({
      name: 'test-agent',
      bodyPrimes: [2, 3, 5, 7, 11],
    })
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const defaultEngine = new SRIAEngine()

      expect(defaultEngine.bodyPrimes).toEqual(LIGHT_GUIDE_TEMPLATE.bodyPrimes)
      expect(defaultEngine.name).toBe('unnamed_sria')
      expect(defaultEngine.lifecycleState).toBe(LifecycleState.DORMANT)
      expect(defaultEngine.currentEpoch).toBe(0)
      expect(defaultEngine.session).toBeNull()
    })

    it('should initialize with custom body primes', () => {
      expect(engine.bodyPrimes).toEqual([2, 3, 5, 7, 11])
      expect(engine.name).toBe('test-agent')
    })

    it('should initialize memory phases for each body prime', () => {
      for (const prime of engine.bodyPrimes) {
        expect(engine.memoryPhases[prime]).toEqual([])
      }
    })

    it('should initialize quaternion state', () => {
      expect(engine.quaternionState).toEqual({ w: 1, x: 0, y: 0, z: 0 })
    })
  })

  describe('generateBodyHash', () => {
    it('should generate consistent hash for same primes', () => {
      const hash1 = engine.generateBodyHash()
      const hash2 = engine.generateBodyHash()

      expect(hash1).toBe(hash2)
      expect(hash1.length).toBe(16)
    })

    it('should generate different hashes for different primes', () => {
      const engine2 = new SRIAEngine({ bodyPrimes: [13, 17, 19] })

      expect(engine.generateBodyHash()).not.toBe(engine2.generateBodyHash())
    })
  })

  describe('computeResonanceKey', () => {
    it('should compute resonance key from observation', () => {
      const key = engine.computeResonanceKey('hello world')

      expect(key).toHaveProperty('primes')
      expect(key).toHaveProperty('hash')
      expect(key).toHaveProperty('timestamp')
      expect(key.primes.length).toBe(5)
      expect(key.hash.length).toBe(16)
    })

    it('should generate consistent keys for same input', () => {
      const key1 = engine.computeResonanceKey('test input')
      const key2 = engine.computeResonanceKey('test input')

      expect(key1.primes).toEqual(key2.primes)
      expect(key1.hash).toBe(key2.hash)
    })

    it('should generate different keys for different inputs', () => {
      const key1 = engine.computeResonanceKey('input one')
      const key2 = engine.computeResonanceKey('input two')

      expect(key1.hash).not.toBe(key2.hash)
    })
  })

  describe('verifyResonance', () => {
    it('should verify resonance with matching primes', () => {
      const key = { primes: [2, 3, 5], hash: 'test', timestamp: Date.now() }
      const result = engine.verifyResonance(key)

      expect(result.verified).toBe(true)
      expect(result.matchingPrimes).toEqual([2, 3, 5])
      expect(result.strength).toBeGreaterThan(0)
    })

    it('should fail resonance with no matching primes', () => {
      const key = { primes: [97, 101, 103], hash: 'test', timestamp: Date.now() }
      const result = engine.verifyResonance(key)

      expect(result.verified).toBe(false)
      expect(result.matchingPrimes).toEqual([])
    })
  })

  describe('encodePercept', () => {
    it('should encode observation into percept', () => {
      const percept = engine.encodePercept('test observation')

      expect(percept).toHaveProperty('raw', 'test observation')
      expect(percept).toHaveProperty('timestamp')
      expect(percept).toHaveProperty('encoded')
      expect(percept.encoded).toHaveProperty('primes')
      expect(percept.encoded).toHaveProperty('phases')
      expect(percept.encoded).toHaveProperty('magnitude')
    })

    it('should use body primes for encoding', () => {
      const percept = engine.encodePercept('test')

      expect(percept.encoded.primes).toEqual(engine.bodyPrimes.slice(0, 5))
    })

    it('should use custom primes when provided', () => {
      const customPrimes = [13, 17, 19]
      const percept = engine.encodePercept('test', customPrimes)

      expect(percept.encoded.primes).toEqual(customPrimes)
    })
  })

  describe('summon', () => {
    it('should summon from dormant state', () => {
      const result = engine.summon()

      expect(result.success).toBe(true)
      expect(result.sessionId).toBeDefined()
      expect(engine.lifecycleState).toBe(LifecycleState.PERCEIVING)
      expect(engine.session).not.toBeNull()
    })

    it('should fail to summon if not dormant', () => {
      engine.summon()
      const result = engine.summon()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot summon')
    })

    it('should initialize session with beliefs', () => {
      engine.summon()

      expect(engine.session.currentBeliefs.length).toBeGreaterThan(0)
      expect(engine.session.attention).toBeDefined()
      expect(engine.session.entropyTrajectory).toEqual([])
      expect(engine.session.actionHistory).toEqual([])
    })
  })

  describe('fullStep', () => {
    beforeEach(() => {
      engine.summon()
    })

    it('should execute a full perception-decision-action-learning cycle', () => {
      const actions = [
        { type: 'response', description: 'Respond', entropyCost: 0.3, confidence: 0.9 },
        { type: 'query', description: 'Query', entropyCost: 0.2, confidence: 0.8 },
      ]

      const result = engine.fullStep('test observation', actions)

      expect(result.success).toBe(true)
      expect(result.perception).toBeDefined()
      expect(result.decision).toBeDefined()
      expect(result.learning).toBeDefined()
    })

    it('should fail if not summoned', () => {
      engine.dismiss()
      const result = engine.fullStep('test', [])

      expect(result.success).toBe(false)
      expect(result.error).toContain('not summoned')
    })

    it('should update entropy trajectory', () => {
      engine.fullStep('test', [{ type: 'wait', entropyCost: 0.1, confidence: 0.9 }])

      expect(engine.session.entropyTrajectory.length).toBe(1)
    })

    it('should add to action history', () => {
      engine.fullStep('test', [{ type: 'wait', entropyCost: 0.1, confidence: 0.9 }])

      expect(engine.session.actionHistory.length).toBe(1)
    })

    it('should select action with lowest free energy', () => {
      const actions = [
        { type: 'expensive', entropyCost: 10, confidence: 0.1 },
        { type: 'cheap', entropyCost: 0.01, confidence: 0.99 },
      ]

      const result = engine.fullStep('test', actions)

      expect(result.decision.action.type).toBe('cheap')
    })
  })

  describe('dismiss', () => {
    beforeEach(() => {
      engine.summon()
    })

    it('should dismiss summoned agent', () => {
      const result = engine.dismiss()

      expect(result.success).toBe(true)
      expect(engine.lifecycleState).toBe(LifecycleState.DORMANT)
      expect(engine.session).toBeNull()
    })

    it('should fail to dismiss if not summoned', () => {
      engine.dismiss()
      const result = engine.dismiss()

      expect(result.success).toBe(false)
    })

    it('should generate beacon on dismiss', () => {
      const result = engine.dismiss()

      expect(result.beacon).toBeDefined()
      expect(result.beacon.fingerprint).toContain('beacon_')
    })

    it('should return session summary', () => {
      engine.fullStep('test', [{ type: 'wait', entropyCost: 0.1, confidence: 0.9 }])
      const result = engine.dismiss()

      expect(result.actionCount).toBe(1)
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('summonLayer', () => {
    it('should summon valid layers', () => {
      const result = engine.summonLayer(SummonableLayer.SEMANTIC)

      expect(result.layer).toBe(SummonableLayer.SEMANTIC)
      expect(result.config).toBeDefined()
      expect(result.bodyAlignment).toBeDefined()
    })

    it('should throw for invalid layer', () => {
      expect(() => engine.summonLayer('invalid')).toThrow()
    })

    it('should cache layer activations', () => {
      const result1 = engine.summonLayer(SummonableLayer.DATA)
      const result2 = engine.summonLayer(SummonableLayer.DATA)

      expect(result2.fromCache).toBe(true)
    })
  })

  describe('generateBeaconFingerprint', () => {
    it('should generate beacon', () => {
      const beacon = engine.generateBeaconFingerprint()

      expect(beacon.fingerprint).toContain('beacon_')
      expect(beacon.epoch).toBe(engine.currentEpoch)
      expect(beacon.bodyHash).toBe(engine.generateBodyHash())
    })

    it('should add beacon to history', () => {
      const initialCount = engine.beacons.length
      engine.generateBeaconFingerprint()

      expect(engine.beacons.length).toBe(initialCount + 1)
    })
  })

  describe('getState', () => {
    it('should return current state when dormant', () => {
      const state = engine.getState()

      expect(state.name).toBe('test-agent')
      expect(state.lifecycleState).toBe(LifecycleState.DORMANT)
      expect(state.session).toBeNull()
    })

    it('should return session info when summoned', () => {
      engine.summon()
      const state = engine.getState()

      expect(state.lifecycleState).toBe(LifecycleState.PERCEIVING)
      expect(state.session).not.toBeNull()
      expect(state.session.id).toBeDefined()
    })
  })

  describe('serialization', () => {
    it('should serialize engine state', () => {
      engine.summon()
      engine.fullStep('test', [{ type: 'wait', entropyCost: 0.1, confidence: 0.9 }])
      engine.dismiss()

      const serialized = engine.serialize()

      expect(serialized.name).toBe('test-agent')
      expect(serialized.bodyPrimes).toEqual([2, 3, 5, 7, 11])
      expect(serialized.currentEpoch).toBe(0)
      expect(serialized.beacons.length).toBeGreaterThan(0)
    })

    it('should deserialize engine state', () => {
      engine.generateBeaconFingerprint()
      const serialized = engine.serialize()

      const restored = SRIAEngine.deserialize(serialized)

      expect(restored.name).toBe(engine.name)
      expect(restored.bodyPrimes).toEqual(engine.bodyPrimes)
      expect(restored.currentEpoch).toBe(engine.currentEpoch)
      expect(restored.beacons.length).toBe(engine.beacons.length)
    })
  })

  describe('events', () => {
    it('should emit summoned event', (done) => {
      engine.on('summoned', (data) => {
        expect(data.sessionId).toBeDefined()
        done()
      })

      engine.summon()
    })

    it('should emit perceived event', (done) => {
      engine.summon()

      engine.on('perceived', (data) => {
        expect(data.dominantLayer).toBeDefined()
        done()
      })

      engine.fullStep('test', [{ type: 'wait', entropyCost: 0.1, confidence: 0.9 }])
    })

    it('should emit decided event', (done) => {
      engine.summon()

      engine.on('decided', (data) => {
        expect(data.action).toBeDefined()
        done()
      })

      engine.fullStep('test', [{ type: 'wait', entropyCost: 0.1, confidence: 0.9 }])
    })

    it('should emit dismissed event', (done) => {
      engine.summon()

      engine.on('dismissed', (data) => {
        expect(data.id).toBeDefined()
        done()
      })

      engine.dismiss()
    })
  })
})
