import path from 'node:path'
import { URL } from 'node:url'

export type NormalizedAction =
  | {
      type: 'http_request'
      method: string
      url: string
      host: string
      headers: Record<string, string>
      body?: any
    }
  | { type: 'file_read' | 'file_write'; path: string; content?: any }
  | { type: 'exec'; command: string }
  | { type: string; [k: string]: any }

function normalizeHeaders(h: any): Record<string, string> {
  const out: Record<string, string> = {}
  if (!h || typeof h !== 'object') return out
  for (const [k, v] of Object.entries(h)) {
    out[String(k).toLowerCase()] = typeof v === 'string' ? v : JSON.stringify(v)
  }
  return out
}

export function normalizeAction(action: any, workspaceRoot: string): NormalizedAction {
  const type = action?.type

  if (type === 'http_request') {
    const method = String(action.method ?? 'GET').toUpperCase()
    const url = String(action.url ?? '')
    const u = new URL(url)
    return {
      type,
      method,
      url,
      host: u.hostname.toLowerCase(),
      headers: normalizeHeaders(action.headers),
      body: action.body,
    }
  }

  if (type === 'file_read' || type === 'file_write') {
    const p = String(action.path ?? '')
    const resolved = path.resolve(workspaceRoot, p)
    return { type, path: resolved, content: action.content }
  }

  if (type === 'exec') {
    return { type, command: String(action.command ?? '') }
  }

  return { type: String(type ?? 'unknown'), ...action }
}
