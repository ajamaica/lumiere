import { afterEach, describe, expect, it, vi } from 'vitest'

const { execFileSyncMock, spawnSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
  spawnSyncMock: vi.fn(),
}))

vi.mock('child_process', () => ({
  execFileSync: execFileSyncMock,
  spawnSync: spawnSyncMock,
}))

async function loadSearchModule() {
  vi.resetModules()
  return await import('./search.js')
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('search qmd dependency', () => {
  it('returns false when qmd is not available', async () => {
    spawnSyncMock.mockReturnValue({ error: new Error('missing') })
    const { hasQmd } = await loadSearchModule()
    expect(hasQmd()).toBe(false)
  })

  it('throws when searching without qmd installed', async () => {
    spawnSyncMock.mockReturnValue({ error: new Error('missing') })
    const { SearchEngine, QmdUnavailableError } = await loadSearchModule()
    const engine = new SearchEngine()
    expect(() => engine.search('hello')).toThrow(QmdUnavailableError)
  })

  it('converts qmd results and applies filters', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined })
    execFileSyncMock.mockReturnValue(
      JSON.stringify([
        {
          docid: '1',
          score: 10,
          file: 'qmd://vault/projects/demo.md',
          title: 'Demo',
          snippet: '@@ -1,2 @@ (1 before, 2 after)\nLine1\nLine2\nLine3\nLine4',
        },
        {
          docid: '2',
          score: 5,
          file: 'qmd://vault/notes/other.md',
          title: 'Other',
          snippet: 'Other snippet',
        },
      ]),
    )

    const { SearchEngine } = await loadSearchModule()
    const engine = new SearchEngine()
    engine.setCollection('vault')
    engine.setVaultPath('/vault')
    engine.setCollectionRoot('/vault')
    engine.addDocument({
      id: 'projects/demo',
      path: '/vault/projects/demo.md',
      category: 'projects',
      title: 'Demo',
      content: 'content',
      frontmatter: {},
      links: [],
      tags: ['keep'],
      modified: new Date(),
    })

    const results = engine.search('hello', {
      tags: ['keep'],
      category: 'projects',
      limit: 5,
    })

    expect(results).toHaveLength(1)
    expect(results[0].document.id).toBe('projects/demo')
    expect(results[0].document.path).toBe('/vault/projects/demo.md')
    expect(results[0].score).toBe(1)
    expect(results[0].snippet).not.toContain('@@')
    expect(results[0].snippet).toContain('Line1')
  })

  it('parses qmd output from error streams', async () => {
    spawnSyncMock.mockReturnValue({ error: undefined })
    execFileSyncMock.mockImplementation(() => {
      const err: any = new Error('qmd failed')
      err.stdout =
        'noise\n[{"docid":"1","score":2,"file":"qmd://vault/notes/a.md","title":"A","snippet":"hi"}]'
      throw err
    })

    const { SearchEngine } = await loadSearchModule()
    const engine = new SearchEngine()
    engine.setCollectionRoot('/vault')
    engine.setVaultPath('/vault')

    const results = engine.search('fallback', { limit: 1 })
    expect(results).toHaveLength(1)
    expect(results[0].document.path).toBe('/vault/notes/a.md')
  })
})
