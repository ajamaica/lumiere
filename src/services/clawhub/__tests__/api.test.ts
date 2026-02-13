import { getClawHubSkillContent, getClawHubSkillDetail, searchClawHubSkills } from '../api'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('searchClawHubSkills', () => {
  it('returns mapped search results from the primary API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            score: 0.95,
            slug: 'summarize-text',
            displayName: 'Summarize Text',
            summary: 'Summarize any text content',
            version: '1.0.0',
            updatedAt: 1700000000,
          },
          {
            score: 0.8,
            slug: 'translate',
            displayName: 'Translate',
            summary: null,
            version: null,
            updatedAt: 1700000001,
          },
        ],
      }),
    })

    const results = await searchClawHubSkills('summarize')

    expect(mockFetch).toHaveBeenCalledWith('https://clawhub.ai/api/v1/search?q=summarize&limit=20')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      slug: 'summarize-text',
      name: 'Summarize Text',
      description: 'Summarize any text content',
      content: '',
      author: undefined,
      installs: undefined,
    })
    expect(results[1]).toEqual({
      slug: 'translate',
      name: 'Translate',
      description: '',
      content: '',
      author: undefined,
      installs: undefined,
    })
  })

  it('URL-encodes the search query', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    await searchClawHubSkills('hello world & more')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://clawhub.ai/api/v1/search?q=hello%20world%20%26%20more&limit=20',
    )
  })

  it('falls back to secondary URL when primary returns 500', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const results = await searchClawHubSkills('test')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://clawhub.ai/api/v1/search?q=test&limit=20')
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://onlycrabs.ai/api/v1/search?q=test&limit=20',
    )
    expect(results).toEqual([])
  })

  it('falls back to secondary URL when primary throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const results = await searchClawHubSkills('test')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(results).toEqual([])
  })

  it('throws when both primary and fallback fail', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    await expect(searchClawHubSkills('test')).rejects.toThrow(
      'ClawHub search failed with status 500',
    )
  })

  it('throws on non-500 error without falling back', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

    await expect(searchClawHubSkills('test')).rejects.toThrow(
      'ClawHub search failed with status 404',
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('handles empty results array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const results = await searchClawHubSkills('nonexistent')
    expect(results).toEqual([])
  })

  it('handles missing results field gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const results = await searchClawHubSkills('test')
    expect(results).toEqual([])
  })

  it('uses slug as name when displayName is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            score: 0.5,
            slug: 'my-skill',
            displayName: '',
            summary: 'A skill',
            version: '1.0.0',
            updatedAt: 1700000000,
          },
        ],
      }),
    })

    const results = await searchClawHubSkills('skill')
    expect(results[0].name).toBe('my-skill')
  })
})

describe('getClawHubSkillDetail', () => {
  it('returns skill detail from the primary API', async () => {
    const detailResponse = {
      skill: {
        slug: 'summarize',
        displayName: 'Summarize',
        summary: 'Summarize text',
        tags: { category: 'text' },
        stats: { installs: 42 },
        createdAt: 1700000000,
        updatedAt: 1700000001,
      },
      latestVersion: {
        version: '1.2.0',
        createdAt: 1700000001,
        changelog: 'Bug fixes',
      },
      owner: {
        handle: 'testuser',
        displayName: 'Test User',
        image: null,
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => detailResponse,
    })

    const result = await getClawHubSkillDetail('summarize')

    expect(mockFetch).toHaveBeenCalledWith('https://clawhub.ai/api/v1/skills/summarize')
    expect(result).toEqual(detailResponse)
  })

  it('encodes the slug parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skill: {}, latestVersion: null, owner: null }),
    })

    await getClawHubSkillDetail('my skill/name')

    expect(mockFetch).toHaveBeenCalledWith('https://clawhub.ai/api/v1/skills/my%20skill%2Fname')
  })

  it('throws when skill is not found', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

    await expect(getClawHubSkillDetail('nonexistent')).rejects.toThrow(
      'Failed to fetch skill details for "nonexistent" (status 404)',
    )
  })
})

describe('getClawHubSkillContent', () => {
  it('returns skill content as text from the primary API', async () => {
    const skillContent = '# My Skill\n\nDo this and that.'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => skillContent,
    })

    const result = await getClawHubSkillContent('my-skill')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://clawhub.ai/api/v1/skills/my-skill/file?path=SKILL.md',
    )
    expect(result).toBe(skillContent)
  })

  it('throws when content fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    // Fallback also fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    await expect(getClawHubSkillContent('broken')).rejects.toThrow(
      'Failed to fetch skill content for "broken" (status 500)',
    )
  })

  it('falls back to secondary URL for content fetch', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Primary down')).mockResolvedValueOnce({
      ok: true,
      text: async () => 'Fallback content',
    })

    const result = await getClawHubSkillContent('my-skill')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://onlycrabs.ai/api/v1/skills/my-skill/file?path=SKILL.md',
    )
    expect(result).toBe('Fallback content')
  })
})
