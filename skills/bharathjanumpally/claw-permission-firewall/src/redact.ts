import type { Policy } from './policy.js'

export function redactAction(
  action: any,
  policy: Policy,
  reasons: { ruleId: string; message: string }[],
) {
  const out = JSON.parse(JSON.stringify(action ?? {}))

  // redact headers
  const redactHeaders = (policy.secrets?.redactHeaders ?? []).map((h) => h.toLowerCase())
  if (out.type === 'http_request' && out.headers) {
    for (const k of Object.keys(out.headers)) {
      if (redactHeaders.includes(k.toLowerCase())) {
        out.headers[k] = '[REDACTED]'
        reasons.push({ ruleId: 'secrets.redact.header', message: `Redacted header: ${k}` })
      }
    }
  }

  // redact regex in body/content/command/url/etc
  const rules = policy.secrets?.redactRegex ?? []
  const apply = (s: string) => {
    let changed = s
    for (const r of rules) {
      const re = new RegExp(r.pattern, 'g')
      if (re.test(changed)) {
        changed = changed.replace(re, '[REDACTED]')
        reasons.push({ ruleId: 'secrets.redact.regex', message: `Redacted pattern: ${r.name}` })
      }
    }
    return changed
  }

  const walk = (v: any): any => {
    if (typeof v === 'string') return apply(v)
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) v[k] = walk(v[k])
      return v
    }
    return v
  }

  return walk(out)
}

export function detectSecretsInOutbound(action: any, policy: Policy): boolean {
  const rules = policy.secrets?.redactRegex ?? []
  const s = JSON.stringify(action ?? {})
  for (const r of rules) {
    const re = new RegExp(r.pattern, 'g')
    if (re.test(s)) return true
  }
  return false
}
