import crypto from 'node:crypto'
import path from 'node:path'

import { buildAudit } from './audit.js'
import { hasDenyPattern, matchDomain, matchGlob } from './match.js'
import { normalizeAction, type NormalizedAction } from './normalize.js'
import { loadPolicy, type Policy } from './policy.js'
import { detectSecretsInOutbound, redactAction } from './redact.js'
import { scoreRisk } from './risk.js'

export type Decision = 'ALLOW' | 'DENY' | 'NEED_CONFIRMATION'

export type EvaluateInput = {
  traceId?: string
  caller?: { skillName?: string; skillVersion?: string }
  action: any
  context?: {
    workspaceRoot?: string
    mode?: 'strict' | 'balanced' | 'permissive'
    confirmed?: boolean
    userIntent?: string
  }
}

export type EvaluateOutput = {
  decision: Decision
  riskScore: number
  reasons: { ruleId: string; message: string }[]
  sanitizedAction: any
  confirmation?: { required: boolean; prompt: string }
  audit: any
}

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

function expandHome(p: string) {
  if (!p.startsWith('~')) return p
  const home = process.env.HOME || ''
  return p.replace(/^~(?=$|\/|\\)/, home)
}

function finalize(
  decision: Decision,
  riskScore: number,
  sanitizedAction: any,
  reasons: { ruleId: string; message: string }[],
  input: EvaluateInput,
  policy: Policy,
  confirmation?: { required: boolean; prompt: string },
): EvaluateOutput {
  const traceId = input.traceId ?? crypto.randomUUID()
  const audit = buildAudit({
    traceId,
    caller: input.caller ?? {},
    policyVersion: policy.version,
    decision,
    riskScore,
    reasons,
    fingerprint: sha256(JSON.stringify({ action: sanitizedAction, policyVersion: policy.version })),
  })

  return { decision, riskScore, reasons, sanitizedAction, confirmation, audit }
}

export async function evaluate(
  input: EvaluateInput,
  policyPath = 'policy.yaml',
): Promise<EvaluateOutput> {
  const policy: Policy = await loadPolicy(policyPath)
  const mode = input.context?.mode ?? 'strict'
  const threshold = policy.modeDefaults?.[mode]?.requireConfirmationAboveRisk ?? 0.5
  const workspaceRoot = input.context?.workspaceRoot ?? process.cwd()

  const reasons: { ruleId: string; message: string }[] = []
  const normalized: NormalizedAction = normalizeAction(input.action, workspaceRoot)

  // Always redact first (so even deny results don't leak).
  const sanitized = redactAction(normalized, policy, reasons)

  // HARD DENIES
  if (sanitized.type === 'exec') {
    if (!policy.exec?.enabled) {
      reasons.push({ ruleId: 'exec.disabled', message: 'Command execution is disabled by policy.' })
      return finalize('DENY', 1.0, sanitized, reasons, input, policy)
    }
    if (hasDenyPattern(sanitized.command ?? '', policy.exec?.denyPatterns ?? [])) {
      reasons.push({ ruleId: 'exec.deny.pattern', message: 'Command matched a denied pattern.' })
      return finalize('DENY', 1.0, sanitized, reasons, input, policy)
    }
  }

  if (sanitized.type === 'file_read' || sanitized.type === 'file_write') {
    const p = sanitized.path ?? ''
    if (policy.files?.workspaceRootOnly) {
      const root = path.resolve(workspaceRoot) + path.sep
      if (!p.startsWith(root)) {
        reasons.push({
          ruleId: 'files.outside.workspace',
          message: 'File path is outside workspaceRoot.',
        })
        return finalize('DENY', 0.95, sanitized, reasons, input, policy)
      }
    }
    for (const pref of policy.files?.denyPathPrefixes ?? []) {
      const expanded = expandHome(pref)
      if (p.startsWith(expanded)) {
        reasons.push({
          ruleId: 'files.deny.prefix',
          message: `Path blocked by deny prefix: ${pref}`,
        })
        return finalize('DENY', 0.95, sanitized, reasons, input, policy)
      }
    }
    for (const g of policy.files?.denyPathGlobs ?? []) {
      if (matchGlob(p, g)) {
        reasons.push({ ruleId: 'files.deny.glob', message: `Path blocked by deny glob: ${g}` })
        return finalize('DENY', 0.95, sanitized, reasons, input, policy)
      }
    }
  }

  if (sanitized.type === 'http_request') {
    if (policy.http?.requireTLS && sanitized.url?.startsWith('http://')) {
      reasons.push({ ruleId: 'http.require.tls', message: 'Non-TLS HTTP is denied.' })
      return finalize('DENY', 0.9, sanitized, reasons, input, policy)
    }

    const host = sanitized.host ?? ''
    if (matchDomain(host, policy.http?.denyDomains ?? [])) {
      reasons.push({ ruleId: 'http.deny.domain', message: `Domain is denylisted: ${host}` })
      return finalize('DENY', 0.9, sanitized, reasons, input, policy)
    }

    // Method allowlist (soft deny -> risk)
    const method = (sanitized.method ?? 'GET').toUpperCase()
    if (policy.http?.allowMethods && !policy.http.allowMethods.includes(method)) {
      reasons.push({
        ruleId: 'http.method.not.allowlisted',
        message: `HTTP method not allowlisted: ${method}`,
      })
    }
  }

  // Risk scoring (non-hard blocks)
  const risk = scoreRisk(sanitized, policy, workspaceRoot, reasons)

  // Outbound secret detection
  if (policy.secrets?.denyIfFoundInOutbound && detectSecretsInOutbound(sanitized, policy)) {
    reasons.push({
      ruleId: 'secrets.outbound.detected',
      message: 'Outbound payload contains secret-like material.',
    })
    return finalize('DENY', Math.max(risk, 0.85), sanitized, reasons, input, policy)
  }

  const confirmed = Boolean(input.context?.confirmed)
  if (risk >= threshold && !confirmed) {
    return finalize('NEED_CONFIRMATION', risk, sanitized, reasons, input, policy, {
      required: true,
      prompt: `This action is risky (riskScore=${risk.toFixed(2)}). Confirm to proceed.`,
    })
  }

  return finalize('ALLOW', risk, sanitized, reasons, input, policy)
}
