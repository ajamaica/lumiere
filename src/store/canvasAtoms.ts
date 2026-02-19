import { atom } from 'jotai'

// ─── Canvas Content ─────────────────────────────────────────────────────────────

/** Source type for canvas content */
export type CanvasSourceType = 'html' | 'url'

/** Content currently displayed in the canvas viewer */
export interface CanvasContent {
  /** HTML content to render (when source is 'html') */
  html?: string
  /** URL to navigate to (when source is 'url') */
  url?: string
  /** Source type: 'html' for inline content, 'url' for external pages */
  source: CanvasSourceType
  /** Optional title for the canvas panel header */
  title?: string
  /** Timestamp when the content was last updated */
  updatedAt: number
}

/** The latest canvas content received from the agent */
export const canvasContentAtom = atom<CanvasContent | null>(null)

/** Whether the canvas viewer panel is currently visible */
export const canvasVisibleAtom = atom(false)

// ─── Canvas Actions ─────────────────────────────────────────────────────────────

/** Canvas action types that agents can dispatch */
export type CanvasActionType = 'present' | 'navigate' | 'eval' | 'snapshot'

/** A canvas action queued by an agent tool event */
export interface CanvasAction {
  /** Unique ID for correlating results back to the gateway */
  id: string
  /** The type of action to execute */
  type: CanvasActionType
  /** JavaScript code to evaluate (for 'eval' actions) */
  script?: string
  /** URL to navigate to (for 'navigate' actions) */
  url?: string
  /** HTML content to present (for 'present' actions) */
  html?: string
  /** Title for the canvas panel (for 'present' actions) */
  title?: string
  /** Timestamp when the action was queued */
  queuedAt: number
}

/** Queue of canvas actions waiting to be processed by the WebView */
export const canvasActionQueueAtom = atom<CanvasAction[]>([])

// ─── Canvas Eval Results ────────────────────────────────────────────────────────

/** Result of a JavaScript eval execution in the canvas WebView */
export interface CanvasEvalResult {
  /** The action ID this result corresponds to */
  actionId: string
  /** Whether the eval succeeded */
  success: boolean
  /** The return value (JSON-serialized) */
  value?: string
  /** Error message if the eval failed */
  error?: string
  /** Timestamp when the result was produced */
  completedAt: number
}

/** Most recent eval result, consumed by the gateway reporter */
export const canvasEvalResultAtom = atom<CanvasEvalResult | null>(null)

// ─── Canvas Snapshot ────────────────────────────────────────────────────────────

/** Result of a canvas snapshot capture */
export interface CanvasSnapshot {
  /** The action ID this snapshot corresponds to */
  actionId: string
  /** Current HTML content of the canvas (via document.documentElement.outerHTML) */
  html?: string
  /** Current URL of the canvas (if loaded from a URL) */
  url?: string
  /** Title of the canvas page */
  title?: string
  /** Timestamp when the snapshot was taken */
  capturedAt: number
}

/** Most recent snapshot result, consumed by the gateway reporter */
export const canvasSnapshotAtom = atom<CanvasSnapshot | null>(null)
