export function buildAudit(input: {
  traceId: string
  caller: any
  policyVersion: string
  decision: string
  riskScore: number
  reasons: any[]
  fingerprint: string
}) {
  return {
    traceId: input.traceId,
    timestamp: new Date().toISOString(),
    caller: input.caller,
    policyVersion: input.policyVersion,
    decision: input.decision,
    riskScore: input.riskScore,
    reasons: input.reasons,
    actionFingerprint: input.fingerprint,
  }
}
