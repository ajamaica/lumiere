/**
 * Chat Intent Parsing
 *
 * Detects `lumiere://intent/{action}?{params}` URLs embedded in chat messages,
 * extracts them as structured intents, and strips them from the display text.
 *
 * Example URL: lumiere://intent/openApp?package=com.example.app&mode=debug
 */

export interface ChatIntent {
  /** The raw URL as it appeared in the message */
  raw: string
  /** Action name, e.g. "openApp", "navigate", "playMedia" */
  action: string
  /** Parsed query-string parameters */
  params: Record<string, string>
  /** Human-readable label derived from the action */
  label: string
}

/** Allowed intent actions. Unrecognised actions are silently ignored. */
const ALLOWED_ACTIONS = new Set([
  'openApp',
  'playMedia',
  'navigate',
  'copyToClipboard',
  'openSession',
])

/** Map action names to Ionicons icon names */
const ACTION_ICONS: Record<string, string> = {
  openApp: 'open-outline',
  playMedia: 'play-circle-outline',
  navigate: 'compass-outline',
  copyToClipboard: 'clipboard-outline',
  openSession: 'chatbubble-ellipses-outline',
}

/** Returns the Ionicons name for a given action, with a fallback. */
export function intentIcon(action: string): string {
  return ACTION_ICONS[action] ?? 'open-outline'
}

/** Regex that matches lumiere://intent/{action} with optional query string */
const INTENT_REGEX = /lumiere:\/\/intent\/(\w+)(\?[^\s)>\]]*)?/g

/** Convert a camelCase / PascalCase action name into a readable label */
function humanizeAction(action: string): string {
  // Insert space before uppercase letters, then title-case the result
  return action.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
}

/**
 * Extract all intents from a message string.
 * Returns an empty array when no intents are found.
 */
export function extractIntents(text: string): ChatIntent[] {
  const intents: ChatIntent[] = []
  let match: RegExpExecArray | null

  // Reset regex state
  INTENT_REGEX.lastIndex = 0

  while ((match = INTENT_REGEX.exec(text)) !== null) {
    const raw = match[0]
    const action = match[1]
    const queryString = match[2] ?? ''

    if (!ALLOWED_ACTIONS.has(action)) continue

    const params: Record<string, string> = {}
    if (queryString.length > 1) {
      const search = new URLSearchParams(queryString.slice(1))
      search.forEach((value, key) => {
        params[key] = value
      })
    }

    intents.push({
      raw,
      action,
      params,
      label: humanizeAction(action),
    })
  }

  return intents
}

/**
 * Remove all intent URLs from the message text so they are not rendered
 * inline. Cleans up leftover blank lines.
 */
export function stripIntents(text: string): string {
  return text
    .replace(INTENT_REGEX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
