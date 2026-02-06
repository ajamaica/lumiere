import minimatch from 'minimatch'

export function matchGlob(filePath: string, pattern: string): boolean {
  return minimatch(filePath, pattern, { nocase: true, dot: true, matchBase: true })
}

export function matchDomain(host: string, list: string[]): boolean {
  const h = host.toLowerCase()
  for (const d of list) {
    const dd = d.toLowerCase()
    if (h === dd) return true
    if (h.endsWith('.' + dd)) return true
  }
  return false
}

export function hasDenyPattern(command: string, patterns: string[]): boolean {
  const c = command.toLowerCase()
  return patterns.some((p) => c.includes(p.toLowerCase()))
}
