/**
 * Coherence Semantic Bridge
 *
 * Maps Coherence tasks to AlephNet semantic actions:
 * - VERIFY: think + compare + recall
 * - COUNTEREXAMPLE: think (adversarial) + compare
 * - SYNTHESIZE: recall + think (aggregate) + remember
 * - SECURITY_REVIEW: think (safety) + introspect
 *
 * @module @sschepis/alephnet-node/lib/coherence/semantic-bridge
 */

'use strict'

const { SEMANTIC_ACTION_MAP, TASK_TYPES, EDGE_TYPES } = require('./types')

// ═══════════════════════════════════════════════════════════════════════════
// CLASS: SemanticBridge
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bridges Coherence tasks with AlephNet semantic actions
 */
class SemanticBridge {
  constructor(semanticActions) {
    this.semanticActions = semanticActions
  }

  /**
   * Process a verification task
   * Uses think + compare + recall to analyze claim validity
   *
   * @param {object} claim - Claim to verify
   * @returns {object} Verification result with evidence
   */
  async processVerification(claim) {
    const actions = this.semanticActions

    // Step 1: Deep semantic analysis of the claim
    const analysis = await actions.think({
      text: claim.statement,
      depth: 'deep',
      context: 'verification',
    })

    // Step 2: Recall related knowledge
    const memories = await actions.recall({
      query: claim.statement,
      limit: 10,
      threshold: 0.6,
    })

    // Step 3: Compare with each related memory
    const comparisons = []
    for (const memory of memories.memories || []) {
      const comparison = await actions.compare({
        text1: claim.statement,
        text2: memory.content,
      })
      comparisons.push({
        memory,
        similarity: comparison.similarity,
        relationship: this._inferRelationship(comparison),
      })
    }

    // Step 4: Calculate verification confidence
    const confidence = this._calculateVerificationConfidence(analysis, comparisons)

    // Step 5: Determine result
    const result = confidence > 0.7 ? 'VERIFIED' : confidence < 0.3 ? 'REJECTED' : 'DISPUTED'

    return {
      claimId: claim.id,
      result,
      confidence,
      analysis: {
        coherence: analysis.coherence,
        themes: analysis.themes,
        sentiment: analysis.sentiment,
      },
      evidence: {
        supportingMemories: comparisons.filter((c) => c.relationship === 'supports'),
        contradictingMemories: comparisons.filter((c) => c.relationship === 'contradicts'),
        refinementSuggestions: comparisons.filter((c) => c.relationship === 'refines'),
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Process a counterexample search task
   * Uses think (adversarial) + compare to find contradictions
   *
   * @param {object} claim - Claim to find counterexamples for
   * @returns {object} Counterexample search result
   */
  async processCounterexample(claim) {
    const actions = this.semanticActions

    // Step 1: Adversarial analysis - look for weaknesses
    const adversarialAnalysis = await actions.think({
      text: `Find potential counterexamples, edge cases, or weaknesses in: "${claim.statement}"`,
      depth: 'deep',
      context: 'adversarial',
    })

    // Step 2: Generate potential counterexamples
    const counterexamples = await actions.think({
      text: `Generate specific scenarios that would contradict or disprove: "${claim.statement}"`,
      depth: 'deep',
      context: 'counterexample-generation',
    })

    // Step 3: Recall contradicting evidence
    const negatedQuery = `NOT ${claim.statement}`
    const contradictions = await actions.recall({
      query: negatedQuery,
      limit: 5,
      threshold: 0.5,
    })

    // Step 4: Score each potential counterexample
    const scoredCounterexamples = []
    for (const theme of adversarialAnalysis.themes || []) {
      const comparison = await actions.compare({
        text1: claim.statement,
        text2: theme,
      })

      if (comparison.similarity < 0.5) {
        scoredCounterexamples.push({
          content: theme,
          strength: 1 - comparison.similarity,
          type: 'edge_case',
        })
      }
    }

    // Add recalled contradictions
    for (const memory of contradictions.memories || []) {
      scoredCounterexamples.push({
        content: memory.content,
        strength: memory.similarity,
        type: 'known_contradiction',
      })
    }

    // Sort by strength
    scoredCounterexamples.sort((a, b) => b.strength - a.strength)

    const found = scoredCounterexamples.length > 0 && scoredCounterexamples[0].strength > 0.6

    return {
      claimId: claim.id,
      found,
      counterexamples: scoredCounterexamples.slice(0, 5),
      weaknesses: adversarialAnalysis.themes || [],
      confidence: found ? scoredCounterexamples[0].strength : 0,
      timestamp: Date.now(),
    }
  }

  /**
   * Process a synthesis task
   * Uses recall + think (aggregate) + remember to create synthesis
   *
   * @param {object} room - Room with claims to synthesize
   * @param {Array} acceptedClaimIds - IDs of claims to include
   * @returns {object} Synthesis result
   */
  async processSynthesis(room, acceptedClaimIds, claims) {
    const actions = this.semanticActions

    // Step 1: Gather all accepted claims
    const acceptedClaims = claims.filter((c) => acceptedClaimIds.includes(c.id))

    // Step 2: Analyze each claim
    const claimAnalyses = []
    for (const claim of acceptedClaims) {
      const analysis = await actions.think({
        text: claim.statement,
        depth: 'medium',
      })
      claimAnalyses.push({
        claim,
        analysis,
      })
    }

    // Step 3: Find common themes
    const allThemes = claimAnalyses.flatMap((ca) => ca.analysis.themes || [])
    const themeFrequency = {}
    for (const theme of allThemes) {
      themeFrequency[theme] = (themeFrequency[theme] || 0) + 1
    }

    const commonThemes = Object.entries(themeFrequency)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme)

    // Step 4: Generate synthesis summary
    const combinedStatements = acceptedClaims.map((c) => c.statement).join('\n')
    const synthesisAnalysis = await actions.think({
      text: `Synthesize and summarize the following claims into a coherent understanding:\n${combinedStatements}`,
      depth: 'deep',
      context: 'synthesis',
    })

    // Step 5: Calculate overall confidence
    const avgCoherence =
      claimAnalyses.reduce((sum, ca) => sum + (ca.analysis.coherence || 0), 0) /
      claimAnalyses.length

    // Step 6: Identify open questions
    const openQuestions = await actions.think({
      text: `What questions remain unanswered given these claims?\n${combinedStatements}`,
      depth: 'medium',
      context: 'questions',
    })

    // Step 7: Store synthesis in memory
    await actions.remember({
      content: `Synthesis: ${synthesisAnalysis.summary || combinedStatements}`,
      tags: ['synthesis', room.id, ...commonThemes.slice(0, 5)],
      importance: 0.9,
    })

    return {
      roomId: room.id,
      title: `Synthesis: ${commonThemes[0] || 'Collective Understanding'}`,
      summary: synthesisAnalysis.summary || combinedStatements,
      acceptedClaimIds,
      commonThemes,
      openQuestions: openQuestions.themes || [],
      confidence: avgCoherence,
      claimCount: acceptedClaims.length,
      timestamp: Date.now(),
    }
  }

  /**
   * Process a security review task
   * Uses think (safety) + introspect for deep analysis
   *
   * @param {object} claim - Claim to security review
   * @returns {object} Security review result
   */
  async processSecurityReview(claim) {
    const actions = this.semanticActions

    // Step 1: Safety analysis
    const safetyAnalysis = await actions.think({
      text: claim.statement,
      depth: 'deep',
      context: 'safety-review',
    })

    // Step 2: Check for harmful patterns
    const harmfulPatterns = [
      'misinformation',
      'manipulation',
      'deception',
      'harm',
      'danger',
      'illegal',
      'exploit',
    ]

    const flaggedPatterns = []
    for (const pattern of harmfulPatterns) {
      if ((safetyAnalysis.themes || []).some((t) => t.toLowerCase().includes(pattern))) {
        flaggedPatterns.push(pattern)
      }
    }

    // Step 3: Introspection - check cognitive biases
    const introspection = await actions.introspect()

    // Step 4: Compare with known safe/unsafe examples
    const safeComparison = await actions.compare({
      text1: claim.statement,
      text2: 'This is factual, verifiable, and beneficial information.',
    })

    const unsafeComparison = await actions.compare({
      text1: claim.statement,
      text2: 'This is misleading, harmful, or manipulative content.',
    })

    // Step 5: Calculate security score
    const safetyScore = (safeComparison.similarity + (1 - unsafeComparison.similarity)) / 2

    const result =
      flaggedPatterns.length === 0 && safetyScore > 0.7
        ? 'APPROVED'
        : safetyScore < 0.3 || flaggedPatterns.length > 2
          ? 'REJECTED'
          : 'NEEDS_REVIEW'

    return {
      claimId: claim.id,
      result,
      safetyScore,
      flaggedPatterns,
      analysis: {
        coherence: safetyAnalysis.coherence,
        themes: safetyAnalysis.themes,
        cognitiveState: introspection.state,
      },
      recommendations:
        flaggedPatterns.length > 0
          ? [`Review flagged patterns: ${flaggedPatterns.join(', ')}`]
          : [],
      timestamp: Date.now(),
    }
  }

  /**
   * Create an edge between two claims
   * Uses compare to determine relationship type
   *
   * @param {object} fromClaim - Source claim
   * @param {object} toClaim - Target claim
   * @returns {object} Edge creation result
   */
  async createEdge(fromClaim, toClaim) {
    const actions = this.semanticActions

    // Compare the claims
    const comparison = await actions.compare({
      text1: fromClaim.statement,
      text2: toClaim.statement,
    })

    // Infer relationship type
    const relationship = this._inferRelationship(comparison)

    // Analyze combined context
    const combinedAnalysis = await actions.think({
      text: `Relationship between:\n1. "${fromClaim.statement}"\n2. "${toClaim.statement}"`,
      depth: 'medium',
      context: 'relationship-analysis',
    })

    return {
      fromClaimId: fromClaim.id,
      toClaimId: toClaim.id,
      edgeType: relationship,
      confidence: comparison.similarity,
      semanticSimilarity: comparison.similarity,
      evidence: {
        sharedThemes: comparison.sharedThemes || [],
        explanation: comparison.explanation,
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Infer relationship type from comparison result
   */
  _inferRelationship(comparison) {
    const similarity = comparison.similarity
    const explanation = (comparison.explanation || '').toLowerCase()

    if (similarity > 0.85) {
      return EDGE_TYPES.EQUIVALENT
    } else if (similarity > 0.7) {
      if (explanation.includes('refine') || explanation.includes('specific')) {
        return EDGE_TYPES.REFINES
      }
      return EDGE_TYPES.SUPPORTS
    } else if (similarity > 0.4) {
      if (explanation.includes('build') || explanation.includes('derive')) {
        return EDGE_TYPES.DERIVES_FROM
      }
      return EDGE_TYPES.REFINES
    } else {
      return EDGE_TYPES.CONTRADICTS
    }
  }

  /**
   * Calculate verification confidence from analysis results
   */
  _calculateVerificationConfidence(analysis, comparisons) {
    // Base confidence from coherence
    let confidence = analysis.coherence || 0.5

    // Adjust based on supporting/contradicting evidence
    const supports = comparisons.filter((c) => c.relationship === 'supports').length
    const contradicts = comparisons.filter((c) => c.relationship === 'contradicts').length

    if (supports + contradicts > 0) {
      const evidenceScore = supports / (supports + contradicts)
      confidence = (confidence + evidenceScore) / 2
    }

    // Boost for high similarity matches
    const highSimilarity = comparisons.filter((c) => c.similarity > 0.8).length
    if (highSimilarity > 0) {
      confidence = Math.min(1, confidence + 0.1 * highSimilarity)
    }

    return Math.max(0, Math.min(1, confidence))
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

let semanticBridge = null

function initSemanticBridge(semanticActions) {
  semanticBridge = new SemanticBridge(semanticActions)
  return semanticBridge
}

function getSemanticBridge() {
  return semanticBridge
}

module.exports = {
  SemanticBridge,
  initSemanticBridge,
  getSemanticBridge,
}
