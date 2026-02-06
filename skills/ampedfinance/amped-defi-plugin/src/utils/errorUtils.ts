/**
 * Serialize SDK error objects for readable error messages
 */
function bigintReplacer(key: string, value: any): any {
  return typeof value === 'bigint' ? value.toString() : value
}

export function serializeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error, bigintReplacer, 2)
  } catch {
    return String(error)
  }
}
