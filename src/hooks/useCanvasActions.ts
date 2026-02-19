import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'

import type { CanvasAction } from '../store/canvasAtoms'
import {
  canvasActionQueueAtom,
  canvasContentAtom,
  canvasEvalResultAtom,
  canvasSnapshotAtom,
  canvasVisibleAtom,
} from '../store/canvasAtoms'
import { logger } from '../utils/logger'

const canvasLogger = logger.create('Canvas')

/**
 * Message types sent from the React Native host into the WebView.
 * The WebView bridge script listens for these and executes them.
 */
export type CanvasBridgeCommand =
  | { type: 'eval'; actionId: string; script: string }
  | { type: 'snapshot'; actionId: string }
  | { type: 'navigate'; actionId: string; url: string }

/**
 * Message types sent from the WebView back to the React Native host
 * via `window.ReactNativeWebView.postMessage()` or `window.parent.postMessage()`.
 */
export interface CanvasBridgeMessage {
  source: 'lumiere-canvas'
  type: 'eval-result' | 'snapshot-result' | 'navigate-result' | 'error'
  actionId: string
  success: boolean
  value?: string
  error?: string
  title?: string
  url?: string
}

/**
 * JavaScript bridge injected into the WebView. Handles commands from the host
 * and posts results back. Works for both react-native-webview (postMessage)
 * and iframe (window.parent.postMessage).
 */
export const CANVAS_BRIDGE_SCRIPT = `
(function() {
  if (window.__lumiereCanvasBridge) return;
  window.__lumiereCanvasBridge = true;

  function postResult(msg) {
    msg.source = 'lumiere-canvas';
    try {
      // React Native WebView
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
      // iframe (web)
      else if (window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    } catch (e) {
      // Silently fail — host may not be listening
    }
  }

  // Listen for commands from the host
  function handleCommand(cmd) {
    try {
      if (cmd.type === 'eval') {
        try {
          var result = eval(cmd.script);
          var serialized = result === undefined ? 'undefined' : JSON.stringify(result);
          postResult({
            type: 'eval-result',
            actionId: cmd.actionId,
            success: true,
            value: serialized,
            title: document.title || '',
            url: location.href
          });
        } catch (e) {
          postResult({
            type: 'eval-result',
            actionId: cmd.actionId,
            success: false,
            error: e.message || String(e)
          });
        }
      } else if (cmd.type === 'snapshot') {
        postResult({
          type: 'snapshot-result',
          actionId: cmd.actionId,
          success: true,
          value: document.documentElement.outerHTML,
          title: document.title || '',
          url: location.href
        });
      } else if (cmd.type === 'navigate') {
        try {
          location.href = cmd.url;
          postResult({
            type: 'navigate-result',
            actionId: cmd.actionId,
            success: true,
            url: cmd.url
          });
        } catch (e) {
          postResult({
            type: 'navigate-result',
            actionId: cmd.actionId,
            success: false,
            error: e.message || String(e)
          });
        }
      }
    } catch (e) {
      postResult({
        type: 'error',
        actionId: cmd.actionId || 'unknown',
        success: false,
        error: e.message || String(e)
      });
    }
  }

  // Listen for postMessage commands (used by both native and web)
  window.addEventListener('message', function(event) {
    var data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return; }
    }
    if (data && (data.type === 'eval' || data.type === 'snapshot' || data.type === 'navigate')) {
      handleCommand(data);
    }
  });
})();
true;
`

/**
 * Ref type for injecting JavaScript into the canvas WebView.
 * Abstracts over react-native-webview (injectJavaScript) and iframe (contentWindow.postMessage).
 */
export interface CanvasWebViewRef {
  injectJavaScript: (js: string) => void
  postCommand: (command: CanvasBridgeCommand) => void
}

interface UseCanvasActionsReturn {
  /** Process a single canvas action from the queue. Called by CanvasViewer when it is ready. */
  processNextAction: () => CanvasAction | null
  /** Handle a bridge message from the WebView */
  handleBridgeMessage: (message: CanvasBridgeMessage) => void
  /** Present new HTML content in the canvas */
  present: (html: string, title?: string) => void
  /** Present a URL in the canvas */
  presentUrl: (url: string, title?: string) => void
  /** Queue a navigate action */
  navigate: (actionId: string, url: string) => void
  /** Queue an eval action */
  evaluate: (actionId: string, script: string) => void
  /** Queue a snapshot action */
  snapshot: (actionId: string) => void
  /** Clear the canvas and hide it */
  clear: () => void
}

/**
 * Hook for managing interactive canvas actions. Processes the action queue,
 * dispatches commands to the WebView bridge, and handles results.
 */
export function useCanvasActions(): UseCanvasActionsReturn {
  const [actionQueue, setActionQueue] = useAtom(canvasActionQueueAtom)
  const setCanvasContent = useSetAtom(canvasContentAtom)
  const setCanvasVisible = useSetAtom(canvasVisibleAtom)
  const setEvalResult = useSetAtom(canvasEvalResultAtom)
  const setSnapshot = useSetAtom(canvasSnapshotAtom)
  const actionQueueRef = useRef(actionQueue)

  useEffect(() => {
    actionQueueRef.current = actionQueue
  }, [actionQueue])

  const processNextAction = useCallback((): CanvasAction | null => {
    const queue = actionQueueRef.current
    if (queue.length === 0) return null

    const action = queue[0]
    setActionQueue((prev) => prev.slice(1))
    return action
  }, [setActionQueue])

  const handleBridgeMessage = useCallback(
    (message: CanvasBridgeMessage) => {
      if (message.source !== 'lumiere-canvas') return

      canvasLogger.info(`Bridge message: ${message.type}`, { actionId: message.actionId })

      switch (message.type) {
        case 'eval-result':
          setEvalResult({
            actionId: message.actionId,
            success: message.success,
            value: message.value,
            error: message.error,
            completedAt: Date.now(),
          })
          break

        case 'snapshot-result':
          setSnapshot({
            actionId: message.actionId,
            html: message.value,
            url: message.url,
            title: message.title,
            capturedAt: Date.now(),
          })
          break

        case 'navigate-result':
          if (!message.success) {
            canvasLogger.error(`Navigate failed: ${message.error}`, {
              actionId: message.actionId,
            })
          }
          break

        case 'error':
          canvasLogger.error(`Canvas bridge error: ${message.error}`, {
            actionId: message.actionId,
          })
          break
      }
    },
    [setEvalResult, setSnapshot],
  )

  const present = useCallback(
    (html: string, title?: string) => {
      setCanvasContent({
        html,
        source: 'html',
        title,
        updatedAt: Date.now(),
      })
      setCanvasVisible(true)
    },
    [setCanvasContent, setCanvasVisible],
  )

  const presentUrl = useCallback(
    (url: string, title?: string) => {
      setCanvasContent({
        url,
        source: 'url',
        title,
        updatedAt: Date.now(),
      })
      setCanvasVisible(true)
    },
    [setCanvasContent, setCanvasVisible],
  )

  const navigate = useCallback(
    (actionId: string, url: string) => {
      setActionQueue((prev) => [
        ...prev,
        { id: actionId, type: 'navigate', url, queuedAt: Date.now() },
      ])
    },
    [setActionQueue],
  )

  const evaluate = useCallback(
    (actionId: string, script: string) => {
      setActionQueue((prev) => [
        ...prev,
        { id: actionId, type: 'eval', script, queuedAt: Date.now() },
      ])
    },
    [setActionQueue],
  )

  const snapshot = useCallback(
    (actionId: string) => {
      setActionQueue((prev) => [...prev, { id: actionId, type: 'snapshot', queuedAt: Date.now() }])
    },
    [setActionQueue],
  )

  const clear = useCallback(() => {
    setCanvasContent(null)
    setCanvasVisible(false)
    setActionQueue([])
    setEvalResult(null)
    setSnapshot(null)
  }, [setCanvasContent, setCanvasVisible, setActionQueue, setEvalResult, setSnapshot])

  return {
    processNextAction,
    handleBridgeMessage,
    present,
    presentUrl,
    navigate,
    evaluate,
    snapshot,
    clear,
  }
}
