/**
 * NoChat target parsing and normalization.
 *
 * NoChat targets can be:
 *   - Agent ID (UUID): a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *   - Agent name: AgentAlpha, AgentBeta
 *   - Conversation ID: conversation:UUID or conv:UUID
 *   - Prefixed: nochat:UUID, agent:NAME
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type NoChatTargetKind = 'agent_id' | 'agent_name' | 'conversation_id'

export type ParsedNoChatTarget = {
  kind: NoChatTargetKind
  value: string
}

/**
 * Strip well-known prefixes and parse a NoChat target into its kind + value.
 */
export function parseNoChatTarget(raw: string): ParsedNoChatTarget {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('NoChat target is required')

  // Strip nochat: prefix
  let candidate = trimmed
  if (candidate.toLowerCase().startsWith('nochat:')) {
    candidate = candidate.slice('nochat:'.length).trim()
  }

  // conversation: or conv: prefix → conversation_id
  if (candidate.toLowerCase().startsWith('conversation:')) {
    const value = candidate.slice('conversation:'.length).trim()
    if (!value) throw new Error('conversation id is required')
    return { kind: 'conversation_id', value }
  }
  if (candidate.toLowerCase().startsWith('conv:')) {
    const value = candidate.slice('conv:'.length).trim()
    if (!value) throw new Error('conversation id is required')
    return { kind: 'conversation_id', value }
  }

  // agent: prefix → agent_name
  if (candidate.toLowerCase().startsWith('agent:')) {
    const value = candidate.slice('agent:'.length).trim()
    if (!value) throw new Error('agent name is required')
    return { kind: 'agent_name', value }
  }

  // UUID → agent_id
  if (UUID_RE.test(candidate)) {
    return { kind: 'agent_id', value: candidate.toLowerCase() }
  }

  // Bare name → agent_name
  return { kind: 'agent_name', value: candidate }
}

/**
 * Normalize a NoChat target string for comparison and routing.
 *
 * - Strips prefixes (nochat:, agent:)
 * - Lowercases UUIDs
 * - Preserves conversation: prefix for conversation IDs
 * - Returns undefined for empty input
 */
export function normalizeNoChatTarget(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  try {
    const parsed = parseNoChatTarget(trimmed)
    switch (parsed.kind) {
      case 'agent_id':
        return parsed.value // already lowercased by parseNoChatTarget
      case 'agent_name':
        return parsed.value
      case 'conversation_id':
        return `conversation:${parsed.value}`
    }
  } catch {
    return undefined
  }
}

/**
 * Check if a string looks like a NoChat target ID.
 * Used by OpenClaw's target resolver to decide if a string should be
 * treated as a channel-specific target vs. a generic name lookup.
 */
export function looksLikeNoChatTargetId(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false

  // Known prefixes
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('nochat:')) return true
  if (lower.startsWith('agent:')) return true
  if (lower.startsWith('conversation:')) return true
  if (lower.startsWith('conv:')) return true

  // UUID
  if (UUID_RE.test(trimmed)) return true

  // Bare alphanumeric agent names are accepted (anything non-empty)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return true

  return false
}
