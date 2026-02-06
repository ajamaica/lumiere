/**
 * Test setup for alephnet-node skill tests
 *
 * Provides necessary polyfills and global setup for the test environment.
 */

// Polyfill File global for undici compatibility (needed by some HTTP libraries)
if (typeof globalThis.File === 'undefined') {
  // @ts-expect-error - minimal File mock for undici compatibility
  globalThis.File = class File {
    name: string
    type: string
    size: number
    lastModified: number

    constructor(bits: unknown[], name: string, options?: { type?: string; lastModified?: number }) {
      this.name = name
      this.type = options?.type || ''
      this.size = bits.reduce((acc: number, b: unknown) => {
        if (typeof b === 'string') return acc + b.length
        if (b && typeof (b as { length?: number }).length === 'number') {
          return acc + (b as { length: number }).length
        }
        return acc
      }, 0)
      this.lastModified = options?.lastModified || Date.now()
    }
  }
}

// Suppress console.log in tests to reduce noise
// Uncomment if needed:
// vi.spyOn(console, 'log').mockImplementation(() => {});

export {}
