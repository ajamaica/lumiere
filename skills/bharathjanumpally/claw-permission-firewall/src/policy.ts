import fs from 'node:fs'

import yaml from 'js-yaml'

export type Policy = {
  version: string
  modeDefaults?: Record<string, { requireConfirmationAboveRisk: number }>
  http?: {
    allowDomains?: string[]
    denyDomains?: string[]
    allowMethods?: string[]
    requireTLS?: boolean
    blockQueryKeys?: string[]
  }
  files?: {
    workspaceRootOnly?: boolean
    allowReadGlobs?: string[]
    allowWriteGlobs?: string[]
    denyPathGlobs?: string[]
    denyPathPrefixes?: string[]
  }
  exec?: {
    enabled?: boolean
    denyPatterns?: string[]
  }
  secrets?: {
    redactHeaders?: string[]
    redactRegex?: { name: string; pattern: string }[]
    denyIfFoundInOutbound?: boolean
  }
}

export async function loadPolicy(policyPath: string): Promise<Policy> {
  const text = fs.readFileSync(policyPath, 'utf8')
  const obj = yaml.load(text) as Policy
  if (!obj?.version) throw new Error("policy.yaml missing 'version'")
  return obj
}
