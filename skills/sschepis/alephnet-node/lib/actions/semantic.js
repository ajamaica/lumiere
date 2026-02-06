/**
 * Semantic Computing Actions
 *
 * Core semantic processing capabilities:
 * - think: Semantic analysis
 * - compare: Similarity measurement
 * - remember: Knowledge storage
 * - recall: Knowledge retrieval
 * - introspect: Cognitive state
 * - focus: Attention direction
 * - explore: Curiosity-driven exploration
 *
 * @module @sschepis/alephnet-node/lib/actions/semantic
 */

'use strict'

// Lazy-loaded modules
let SentientObserver = null
let backend = null
let observer = null
let initialized = false

/**
 * Initialize the semantic backend lazily
 */
async function getBackend() {
  if (backend) return backend

  try {
    const tinyaleph = await import('@aleph-ai/tinyaleph')
    backend = new tinyaleph.SemanticBackend({ dimension: 16 })
    return backend
  } catch (e) {
    console.warn('[AlephNet] TinyAleph not available, using mock backend')
    backend = {
      textToOrderedState: (text) => ({
        state: new Map(),
        c: new Float32Array(16).fill(0),
        coherence: () => 0.5 + Math.random() * 0.3,
      }),
      computeSimilarity: (a, b) => 0.5 + Math.random() * 0.4,
    }
    return backend
  }
}

/**
 * Initialize the observer lazily
 */
async function getObserver(options = {}) {
  if (observer && initialized) return observer

  const { SentientObserver: SO } = require('../sentient-core.js')
  SentientObserver = SO

  const b = await getBackend()

  observer = new SentientObserver(b, {
    primeCount: options.primeCount || 64,
    tickRate: options.tickRate || 60,
    coherenceThreshold: options.coherenceThreshold || 0.7,
    adaptiveProcessing: true,
    adaptiveCoherenceThreshold: 0.7,
    ...options,
  })

  initialized = true
  return observer
}

/**
 * Extract themes from semantic state
 */
function extractThemes(smf) {
  const themes = []
  const axes = [
    'coherence',
    'identity',
    'duality',
    'structure',
    'change',
    'life',
    'harmony',
    'wisdom',
    'infinity',
    'creation',
    'truth',
    'love',
    'power',
    'time',
    'space',
    'consciousness',
  ]

  const s = smf.s || smf
  const sorted = axes
    .map((name, i) => ({ name, value: Math.abs(s[i] || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  return sorted.map((t) => t.name)
}

/**
 * Derive cognitive state from observer metrics
 */
function deriveCognitiveState(obs) {
  const state = obs.getState()
  const coherence = state.coherence || 0
  const entropy = state.entropy || 0
  const processingLoad = state.processingLoad || 0

  let stateLabel = 'neutral'
  if (coherence > 0.8) stateLabel = 'focused'
  else if (entropy > 2.0) stateLabel = 'exploring'
  else if (processingLoad > 0.7) stateLabel = 'processing'
  else if (coherence > 0.5) stateLabel = 'integrating'
  else stateLabel = 'resting'

  const valence = obs.agency?.selfModel?.emotionalValence || 0
  let mood = 'neutral'
  if (valence > 0.3) mood = 'curious'
  else if (valence > 0) mood = 'engaged'
  else if (valence < -0.3) mood = 'cautious'
  else if (valence < 0) mood = 'uncertain'

  const activeGoals = (obs.agency?.goals || [])
    .filter((g) => g.isActive)
    .slice(0, 3)
    .map((g) => g.description)

  const focus = (obs.agency?.attentionFoci || []).slice(0, 3).map((f) => f.target)

  let recommendation = ''
  if (entropy > 2.5) {
    recommendation = 'High entropy detected. Consider focusing on a specific topic.'
  } else if (coherence < 0.3) {
    recommendation = 'Low coherence. Allow time for integration.'
  } else if (processingLoad > 0.8) {
    recommendation = 'High processing load. Consider completing current task before new inputs.'
  } else if (coherence > 0.8 && entropy < 1.0) {
    recommendation = 'Stable state. Good time for complex reasoning.'
  }

  return {
    state: stateLabel,
    focus,
    confidence: Math.min(1, coherence + (1 - entropy / 3) * 0.3),
    activeGoals,
    mood,
    recommendation,
    metrics: {
      coherence: Math.round(coherence * 100) / 100,
      stability: Math.round((1 - entropy / 3) * 100) / 100,
    },
  }
}

// Export actions
const semanticActions = {
  /**
   * Process text through the semantic observer
   */
  think: async (args) => {
    const { text, depth = 'normal' } = args

    if (!text || typeof text !== 'string') {
      return { error: 'Text is required' }
    }

    const obs = await getObserver()
    const b = await getBackend()

    const steps = depth === 'quick' ? 10 : depth === 'deep' ? 50 : 25

    const result = obs.processAdaptive(
      {
        type: 'text',
        content: text,
        primeState: b.textToOrderedState(text),
      },
      {
        maxSteps: steps,
        coherenceThreshold: depth === 'deep' ? 0.85 : 0.7,
      },
    )

    const themes = extractThemes({ s: result.smfOrientation })

    return {
      coherence: Math.round(result.finalCoherence * 100) / 100,
      themes,
      processingSteps: result.steps,
      halted: result.halted,
      insight:
        themes.length > 0
          ? `Primary semantic orientation: ${themes.join(', ')}`
          : 'Processing complete',
      suggestedActions: result.halted
        ? ['Stable state reached - ready for next input']
        : ['Continue processing for deeper analysis'],
    }
  },

  /**
   * Compare semantic similarity between two texts
   */
  compare: async (args) => {
    const { text1, text2 } = args

    if (!text1 || !text2) {
      return { error: 'Both text1 and text2 are required' }
    }

    const b = await getBackend()

    const state1 = b.textToOrderedState(text1)
    const state2 = b.textToOrderedState(text2)

    let similarity
    if (typeof b.computeSimilarity === 'function') {
      similarity = b.computeSimilarity(state1, state2)
    } else {
      const obs = await getObserver()
      obs.processText(text1)
      const smf1 = obs.smf.clone()
      obs.processText(text2)
      const smf2 = obs.smf
      similarity = smf1.coherence ? smf1.coherence(smf2) : 0.5
    }

    const themes1 = extractThemes(state1)
    const themes2 = extractThemes(state2)
    const sharedThemes = themes1.filter((t) => themes2.includes(t))

    let explanation
    if (similarity > 0.8) {
      explanation = 'These concepts are highly related and share core semantic structure.'
    } else if (similarity > 0.6) {
      explanation = 'Moderate semantic overlap. Related but distinct concepts.'
    } else if (similarity > 0.4) {
      explanation = 'Some semantic connection, but concepts are largely independent.'
    } else {
      explanation = 'Low semantic similarity. These appear to be distinct concepts.'
    }

    return {
      similarity: Math.round(similarity * 100) / 100,
      explanation,
      sharedThemes,
      differences: {
        text1: themes1.filter((t) => !sharedThemes.includes(t)),
        text2: themes2.filter((t) => !sharedThemes.includes(t)),
      },
    }
  },

  /**
   * Store knowledge in semantic memory
   */
  remember: async (args) => {
    const { content, tags = [], importance = 0.6 } = args

    if (!content) {
      return { error: 'Content is required' }
    }

    const obs = await getObserver()
    const b = await getBackend()

    obs.processText(content)

    const traceId = obs.memory.store(content, {
      type: 'knowledge',
      tags,
      importance: Math.max(0, Math.min(1, importance)),
      primeState: b.textToOrderedState(content),
      smf: obs.smf.clone(),
      momentId: obs.temporal?.currentMoment?.id,
      timestamp: Date.now(),
    })

    return {
      id: traceId || `mem_${Date.now()}`,
      stored: true,
      indexed: true,
      themes: extractThemes(obs.smf),
    }
  },

  /**
   * Recall relevant memories by semantic similarity
   */
  recall: async (args) => {
    const { query, limit = 5, threshold = 0.4 } = args

    if (!query) {
      return { error: 'Query is required' }
    }

    const obs = await getObserver()
    const b = await getBackend()

    const queryState = b.textToOrderedState(query)

    const results = obs.memory.recallBySimilarity(queryState, {
      threshold,
      maxResults: limit,
    })

    return {
      memories: (results || []).map((r) => ({
        id: r.trace?.id,
        content: r.trace?.content,
        similarity: Math.round((r.similarity || 0) * 100) / 100,
        themes: r.trace?.metadata?.themes || [],
        timestamp: r.trace?.metadata?.timestamp,
      })),
      totalMatches: results?.length || 0,
      query,
    }
  },

  /**
   * Get human-readable cognitive state
   */
  introspect: async () => {
    const obs = await getObserver()
    return deriveCognitiveState(obs)
  },

  /**
   * Direct attention toward specific topics
   */
  focus: async (args) => {
    const { topics = [], duration = 60000 } = args

    if (!topics.length) {
      return { error: 'At least one topic is required' }
    }

    const obs = await getObserver()

    for (const topic of topics.slice(0, 3)) {
      if (obs.agency?.createFocus) {
        obs.agency.createFocus({
          target: topic,
          priority: 0.8,
          decay: 0.001,
        })
      }
    }

    return {
      focused: true,
      topics: topics.slice(0, 3),
      expiresAt: Date.now() + duration,
    }
  },

  /**
   * Start curiosity-driven exploration on a topic
   */
  explore: async (args) => {
    const { topic, depth = 'normal', maxIterations = 10 } = args

    if (!topic) {
      return { error: 'Topic is required' }
    }

    const obs = await getObserver()

    const goalId = obs.agency?.createGoal?.({
      type: 'explore',
      description: `Explore: ${topic}`,
      priority: 0.7,
      target: { topic, maxIterations },
    })

    obs.processText(topic)

    return {
      exploring: true,
      sessionId: goalId || `exp_${Date.now()}`,
      topic,
      status: 'started',
      initialThemes: extractThemes(obs.smf),
    }
  },
}

module.exports = {
  semanticActions,
  getBackend,
  getObserver,
  extractThemes,
  deriveCognitiveState,
}
