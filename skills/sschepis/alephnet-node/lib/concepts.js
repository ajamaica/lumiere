/**
 * ConceptGraph
 *
 * Knowledge graph for tracking relationships between concepts.
 * Uses hypercomplex embeddings for semantic similarity.
 */

const fs = require('fs')
const path = require('path')

class ConceptGraph {
  /**
   * Create a ConceptGraph
   * @param {Object} backend - TinyAleph SemanticBackend instance
   * @param {Object} options - Configuration options
   */
  constructor(backend, options = {}) {
    this.backend = backend
    this.storePath = options.storePath || null

    // Nodes: concept -> { embedding, metadata }
    this.nodes = new Map()

    // Edges: concept -> Map<relationType, Set<targetConcept>>
    this.edges = new Map()

    // Reverse edges for bidirectional traversal
    this.reverseEdges = new Map()

    // Load persisted graph
    if (this.storePath) {
      this.load()
    }
  }

  /**
   * Add a concept node
   * @param {string} concept - Concept name
   * @param {Object} metadata - Optional metadata
   * @returns {boolean} True if newly added
   */
  addConcept(concept, metadata = {}) {
    const normalized = concept.toLowerCase().trim()

    if (this.nodes.has(normalized)) {
      // Update metadata
      const node = this.nodes.get(normalized)
      node.metadata = { ...node.metadata, ...metadata }
      node.lastSeen = Date.now()
      node.mentions++
      return false
    }

    // Create embedding
    const embedding = this.backend.textToOrderedState(normalized)

    this.nodes.set(normalized, {
      concept: normalized,
      embedding: Array.from(embedding.c),
      metadata,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      mentions: 1,
    })

    // Initialize edge maps
    this.edges.set(normalized, new Map())
    this.reverseEdges.set(normalized, new Map())

    return true
  }

  /**
   * Add a relation between concepts
   * @param {string} from - Source concept
   * @param {string} relation - Relation type
   * @param {string} to - Target concept
   */
  addRelation(from, relation, to) {
    const fromNorm = from.toLowerCase().trim()
    const toNorm = to.toLowerCase().trim()
    const relNorm = relation.toLowerCase().trim()

    // Ensure both concepts exist
    this.addConcept(fromNorm)
    this.addConcept(toNorm)

    // Add forward edge
    if (!this.edges.get(fromNorm).has(relNorm)) {
      this.edges.get(fromNorm).set(relNorm, new Set())
    }
    this.edges.get(fromNorm).get(relNorm).add(toNorm)

    // Add reverse edge
    if (!this.reverseEdges.get(toNorm).has(relNorm)) {
      this.reverseEdges.get(toNorm).set(relNorm, new Set())
    }
    this.reverseEdges.get(toNorm).get(relNorm).add(fromNorm)
  }

  /**
   * Query concepts related to a given concept
   * @param {string} concept - Query concept
   * @param {Object} options - Query options
   * @returns {Object} Related concepts
   */
  query(concept, options = {}) {
    const normalized = concept.toLowerCase().trim()
    const maxDepth = options.maxDepth || 2
    const limit = options.limit || 10

    if (!this.nodes.has(normalized)) {
      // Return semantically similar concepts
      return {
        exact: null,
        similar: this.findSimilar(concept, limit),
      }
    }

    const node = this.nodes.get(normalized)
    const related = {
      exact: node,
      outgoing: {},
      incoming: {},
      similar: [],
    }

    // Collect outgoing relations
    for (const [relation, targets] of this.edges.get(normalized) || []) {
      related.outgoing[relation] = Array.from(targets).map((t) => ({
        concept: t,
        ...this.nodes.get(t),
      }))
    }

    // Collect incoming relations
    for (const [relation, sources] of this.reverseEdges.get(normalized) || []) {
      related.incoming[relation] = Array.from(sources).map((s) => ({
        concept: s,
        ...this.nodes.get(s),
      }))
    }

    // Find semantically similar concepts
    related.similar = this.findSimilar(concept, limit)

    return related
  }

  /**
   * Find semantically similar concepts
   * @param {string} query - Query text
   * @param {number} topK - Number of results
   * @returns {Array<Object>}
   */
  findSimilar(query, topK = 5) {
    const queryEmbed = this.backend.textToOrderedState(query.toLowerCase())
    const results = []

    for (const [concept, node] of this.nodes) {
      const similarity = this._cosineSimilarity(Array.from(queryEmbed.c), node.embedding)
      results.push({
        concept,
        similarity,
        mentions: node.mentions,
      })
    }

    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, topK)
  }

  /**
   * Find related concepts by semantic path
   * @param {string} from - Source concept
   * @param {string} to - Target concept
   * @returns {Array|null} Path or null if not found
   */
  findPath(from, to) {
    const fromNorm = from.toLowerCase().trim()
    const toNorm = to.toLowerCase().trim()

    if (!this.nodes.has(fromNorm) || !this.nodes.has(toNorm)) {
      return null
    }

    // BFS
    const visited = new Set()
    const queue = [[fromNorm, [fromNorm]]]

    while (queue.length > 0) {
      const [current, path] = queue.shift()

      if (current === toNorm) {
        return path
      }

      if (visited.has(current)) continue
      visited.add(current)

      // Explore neighbors
      for (const [_, targets] of this.edges.get(current) || []) {
        for (const target of targets) {
          if (!visited.has(target)) {
            queue.push([target, [...path, target]])
          }
        }
      }
    }

    return null
  }

  /**
   * Extract and store concepts from text
   * @param {string} text - Text to process
   * @returns {Object} Extraction results
   */
  extractAndStore(text) {
    const concepts = this._extractConcepts(text)
    const newConcepts = []
    const newRelations = []

    // Add concepts
    for (const concept of concepts) {
      if (this.addConcept(concept)) {
        newConcepts.push(concept)
      }
    }

    // Infer relations from proximity
    for (let i = 0; i < concepts.length - 1; i++) {
      this.addRelation(concepts[i], 'related_to', concepts[i + 1])
      newRelations.push([concepts[i], 'related_to', concepts[i + 1]])
    }

    return {
      concepts,
      newConcepts,
      newRelations,
    }
  }

  /**
   * Extract concepts from text
   * @private
   */
  _extractConcepts(text) {
    const concepts = new Set()
    const lower = text.toLowerCase()

    // Noun phrases (simplified)
    const phrases = lower.match(/\b[a-z]+(?:\s+[a-z]+){0,2}\b/g) || []

    for (const phrase of phrases) {
      // Filter out common words and short phrases
      const words = phrase.split(/\s+/)
      if (words.length === 1 && words[0].length < 4) continue
      if (this._isStopPhrase(phrase)) continue

      concepts.add(phrase.trim())
    }

    // Technical terms
    const techTerms = text.match(/\b[a-z]+(?:[A-Z][a-z]+)+\b/g) || []
    for (const term of techTerms) {
      concepts.add(term.toLowerCase())
    }

    return Array.from(concepts).slice(0, 10)
  }

  /**
   * Check if phrase is a stop phrase
   * @private
   */
  _isStopPhrase(phrase) {
    const stopPhrases = new Set([
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'a',
      'an',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
    ])
    return stopPhrases.has(phrase)
  }

  /**
   * Compute cosine similarity
   * @private
   */
  _cosineSimilarity(a, b) {
    let dot = 0,
      magA = 0,
      magB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      magA += a[i] * a[i]
      magB += b[i] * b[i]
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10)
  }

  /**
   * Get graph statistics
   * @returns {Object}
   */
  getStats() {
    let edgeCount = 0
    for (const [_, relations] of this.edges) {
      for (const [_, targets] of relations) {
        edgeCount += targets.size
      }
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount,
      avgDegree: edgeCount / (this.nodes.size || 1),
    }
  }

  /**
   * Export graph to JSON
   * @returns {Object}
   */
  toJSON() {
    const edges = {}
    for (const [from, relations] of this.edges) {
      edges[from] = {}
      for (const [relation, targets] of relations) {
        edges[from][relation] = Array.from(targets)
      }
    }

    return {
      nodes: Object.fromEntries(this.nodes),
      edges,
    }
  }

  /**
   * Import graph from JSON
   * @param {Object} json - Graph data
   */
  fromJSON(json) {
    // Import nodes
    if (json.nodes) {
      for (const [concept, data] of Object.entries(json.nodes)) {
        this.nodes.set(concept, data)
        this.edges.set(concept, new Map())
        this.reverseEdges.set(concept, new Map())
      }
    }

    // Import edges
    if (json.edges) {
      for (const [from, relations] of Object.entries(json.edges)) {
        for (const [relation, targets] of Object.entries(relations)) {
          for (const to of targets) {
            this.addRelation(from, relation, to)
          }
        }
      }
    }
  }

  /**
   * Save graph to file
   */
  save() {
    if (!this.storePath) return

    const dir = path.dirname(this.storePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(this.storePath, JSON.stringify(this.toJSON(), null, 2))
  }

  /**
   * Load graph from file
   */
  load() {
    if (!this.storePath || !fs.existsSync(this.storePath)) return

    try {
      const data = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
      this.fromJSON(data)
    } catch (e) {
      console.error('Failed to load concept graph:', e.message)
    }
  }

  /**
   * Clear the graph
   */
  clear() {
    this.nodes.clear()
    this.edges.clear()
    this.reverseEdges.clear()
  }
}

module.exports = { ConceptGraph }
