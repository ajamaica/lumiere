/**
 * Normalizes an Ollama server URL to ensure it has a protocol and default port.
 *
 * The Ollama SDK internally normalizes URLs via `formatHost()`, but raw `fetch()`
 * calls need the same normalization. Without it, URLs like `192.168.1.100` fail
 * because `fetch` treats them as relative paths.
 */
export function normalizeOllamaUrl(url: string): string {
  let host = url.trim().replace(/\/+$/, '')
  if (!host) return ''

  if (!host.includes('://')) {
    host = `http://${host}`
  }

  try {
    const parsed = new URL(host)
    // Add default Ollama port (11434) when no port is specified
    if (parsed.port === '' && parsed.protocol === 'http:') {
      const afterProtocol = host.replace(/^https?:\/\//, '')
      if (!afterProtocol.includes(':')) {
        host = `${parsed.protocol}//${parsed.hostname}:11434${parsed.pathname}`
        if (host.endsWith('/')) host = host.slice(0, -1)
      }
    }
  } catch {
    // If URL parsing fails, return as-is
  }

  return host
}
