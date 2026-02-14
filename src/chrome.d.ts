/**
 * Minimal Chrome Extension API type definitions.
 *
 * Only the subset used by the Lumiere web extension hooks is declared here.
 */

interface ChromeRuntimeOnMessage {
  addListener(callback: (message: Record<string, unknown>) => void): void
  removeListener(callback: (message: Record<string, unknown>) => void): void
}

interface ChromeRuntime {
  id?: string
  getURL(path: string): string
  sendMessage(message: Record<string, unknown>): Promise<unknown>
  onMessage: ChromeRuntimeOnMessage
}

interface ChromeTabs {
  create(options: { url: string }): void
}

interface ChromeWindows {
  getCurrent(): Promise<{ id: number }>
}

interface ChromeSidePanel {
  open(options: { windowId: number }): Promise<void>
}

interface ChromeExtensionAPI {
  runtime: ChromeRuntime
  tabs: ChromeTabs
  windows: ChromeWindows
  sidePanel: ChromeSidePanel
}

declare global {
  interface Window {
    chrome?: ChromeExtensionAPI
  }
}

export {}
