export type LogicNodeType = 'claim' | 'premise' | 'evidence' | 'warrant' | 'conclusion'

export interface LogicNode {
  id: string
  type: LogicNodeType
  content: string
  rawQuote: string
  confidence: number
}

export interface LogicGraph {
  nodes: LogicNode[]
  edges: any[]
  undefinedTerms: string[]
}

export interface ConsensusObjection {
  targetNodeId: string
  severity: 'critical' | 'moderate' | 'minor'
  type: 'theoretical_conflict' | 'empirical_contradiction' | 'prior_art'
  argument: string
  citations: string[]
}

export interface MeritReport {
  overallScore: number
  dimensions?: any
  defenseStrategy: string
  suggestions: string[]
}

export type ProgressStage = 'deconstructing' | 'attacking' | 'judging'

export interface ProgressUpdate {
  stage: ProgressStage
  message: string
  timestamp: Date
  metadata?: any
}
