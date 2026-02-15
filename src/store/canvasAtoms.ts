import { atom } from 'jotai'

/** Content currently displayed in the canvas viewer */
export interface CanvasContent {
  /** HTML content to render */
  html: string
  /** Optional title for the canvas panel header */
  title?: string
  /** Timestamp when the content was last updated */
  updatedAt: number
}

/** The latest canvas content received from the agent */
export const canvasContentAtom = atom<CanvasContent | null>(null)

/** Whether the canvas viewer panel is currently visible */
export const canvasVisibleAtom = atom(false)
