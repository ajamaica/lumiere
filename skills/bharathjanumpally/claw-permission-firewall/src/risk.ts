import path from 'node:path'

import { matchDomain, matchGlob } from './match.js'
import type { Policy } from './policy.js'

export function scoreRisk(
  action: any,
  policy: Policy,
  workspaceRoot: string,
  reasons: { ruleId: string; message: string }[],
): number {
  let risk = 0.0

  if (action.type === 'http_request') {
    const host = String(action.host ?? '').toLowerCase()
    const allow = policy.http?.allowDomains ?? []
    const deny = policy.http?.denyDomains ?? []

    if (!matchDomain(host, allow)) {
      risk += 0.4
      reasons.push({ ruleId: 'http.not.allowlisted', message: `Domain not in allowlist: ${host}` })
    }
    if (matchDomain(host, deny)) {
      risk += 0.6 // should be hard denied earlier
    }

    const url = String(action.url ?? '')
    const blockKeys = (policy.http?.blockQueryKeys ?? []).map((k) => k.toLowerCase())
    for (const k of blockKeys) {
      if (url.toLowerCase().includes(`${k}=`)) {
        risk += 0.3
        reasons.push({
          ruleId: 'http.query.sensitive',
          message: `Sensitive query key detected: ${k}`,
        })
      }
    }

    const method = String(action.method ?? 'GET').toUpperCase()
    if (method === 'DELETE') risk += 0.35
    if (method === 'PUT' || method === 'PATCH') risk += 0.2
  }

  if (action.type === 'file_read' || action.type === 'file_write') {
    const p = String(action.path ?? '')
    const root = path.resolve(workspaceRoot) + path.sep
    if (!p.startsWith(root)) risk += 0.8

    const isWrite = action.type === 'file_write'
    const allowGlobs = isWrite
      ? (policy.files?.allowWriteGlobs ?? [])
      : (policy.files?.allowReadGlobs ?? [])
    if (allowGlobs.length && !allowGlobs.some((g) => matchGlob(p, g))) {
      risk += 0.35
      reasons.push({
        ruleId: 'files.not.allowlisted',
        message: `Path not allowlisted for ${action.type}: ${p}`,
      })
    }

    if (isWrite) risk += 0.15
  }

  if (action.type === 'exec') {
    risk += 0.9
    reasons.push({ ruleId: 'exec.high.risk', message: 'Execution is inherently high risk.' })
  }

  // clamp 0..1
  if (risk < 0) risk = 0
  if (risk > 1) risk = 1
  return risk
}
