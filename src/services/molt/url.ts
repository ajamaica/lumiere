/**
 * Molt URL utilities.
 *
 * Molt servers expose both a WebSocket endpoint (wss://) and an HTTP RPC
 * endpoint (https://).  Users may enter either scheme — these helpers
 * normalise to the correct one depending on context.
 *
 * Mapping:
 *   https:// ↔ wss://
 *   http://  ↔ ws://
 *   bare host (no scheme) → wss:// / https:// (secure by default)
 */

/**
 * Ensure the URL uses a WebSocket scheme (`wss://` or `ws://`).
 *
 * - `https://` is converted to `wss://`
 * - `http://`  is converted to `ws://`
 * - `wss://` / `ws://` are kept as-is
 * - Bare hostnames get `wss://` prepended
 */
export function toWebSocketUrl(url: string): string {
  if (url.startsWith('wss://') || url.startsWith('ws://')) {
    return url
  }
  if (url.startsWith('https://')) {
    return url.replace(/^https:\/\//, 'wss://')
  }
  if (url.startsWith('http://')) {
    return url.replace(/^http:\/\//, 'ws://')
  }
  return `wss://${url}`
}

/**
 * Ensure the URL uses an HTTP scheme (`https://` or `http://`).
 *
 * - `wss://` is converted to `https://`
 * - `ws://`  is converted to `http://`
 * - `https://` / `http://` are kept as-is
 * - Bare hostnames get `https://` prepended
 */
export function toHttpUrl(url: string): string {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  }
  if (url.startsWith('wss://')) {
    return url.replace(/^wss:\/\//, 'https://')
  }
  if (url.startsWith('ws://')) {
    return url.replace(/^ws:\/\//, 'http://')
  }
  return `https://${url}`
}
