import { z } from 'zod'

export const LogicGraphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['claim', 'premise', 'evidence', 'warrant', 'conclusion']),
      content: z.string(),
      rawQuote: z.string(),
      confidence: z.number(),
    }),
  ),
  edges: z.array(z.any()),
  undefinedTerms: z.array(z.string()),
})

export const ConsensusObjectionSchema = z.object({
  targetNodeId: z.string(),
  severity: z.enum(['critical', 'moderate', 'minor']),
  type: z.enum(['theoretical_conflict', 'empirical_contradiction', 'prior_art']),
  argument: z.string(),
  citations: z.array(z.string()),
})

export const MeritReportSchema = z.object({
  overallScore: z.number(),
  dimensions: z.any(), // Simplified for brevity
  defenseStrategy: z.string(),
  suggestions: z.array(z.string()),
})
