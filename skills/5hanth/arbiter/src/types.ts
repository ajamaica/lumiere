/**
 * Type definitions for Arbiter Skill
 */

export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type Status = 'pending' | 'in_progress' | 'completed'

export interface DecisionOption {
  key: string
  label: string
  note?: string
}

export interface Decision {
  id: string
  title: string
  context: string
  options: DecisionOption[]
  allowCustom?: boolean
}

export interface PushArgs {
  title: string
  tag?: string
  context?: string
  priority?: Priority
  notify?: string
  agent?: string
  session?: string
  decisions: Decision[]
}

export interface PushResult {
  planId: string
  file: string
  total: number
  status: 'pending'
}

export interface DecisionStatus {
  status: Status
  answer: string | null
}

export interface StatusResult {
  planId: string
  title: string
  status: Status
  total: number
  answered: number
  remaining: number
  decisions: Record<string, DecisionStatus>
  error?: string
}

export interface GetResult {
  planId: string
  status: 'completed'
  completedAt: string
  answers: Record<string, string>
  error?: string
}

export interface Frontmatter {
  id: string
  version: number
  agent: string
  session: string
  tag: string
  title: string
  priority: Priority
  status: Status
  created_at: string
  updated_at: string
  completed_at: string | null
  total: number
  answered: number
  remaining: number
  notify_session?: string
}

export interface ParsedDecision {
  id: string
  status: Status
  answer: string | null
  answeredAt: string | null
}
