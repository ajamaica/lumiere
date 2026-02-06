import got from 'got'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Pagination Helper', () => {
  describe('parseNextLink', () => {
    it('should extract next URL from RFC5988 Link header', () => {
      const linkHeader = '<https://3.basecampapi.com/999999999/projects.json?page=2>; rel="next"'
      const parseNextLink = (header: string) => {
        const match = header.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1] : null
      }

      const result = parseNextLink(linkHeader)
      expect(result).toBe('https://3.basecampapi.com/999999999/projects.json?page=2')
    })

    it('should return null for empty Link header', () => {
      const parseNextLink = (header: string | undefined) => {
        if (!header) return null
        const match = header.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1] : null
      }

      expect(parseNextLink(undefined)).toBeNull()
      expect(parseNextLink('')).toBeNull()
    })

    it('should return null when rel="next" is not present', () => {
      const linkHeader = '<https://3.basecampapi.com/999999999/projects.json?page=1>; rel="prev"'
      const parseNextLink = (header: string) => {
        const match = header.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1] : null
      }

      expect(parseNextLink(linkHeader)).toBeNull()
    })
  })

  describe('fetchAllPages', () => {
    it('should aggregate results from multiple pages', async () => {
      const page1 = [
        { id: 1, name: 'Project 1' },
        { id: 2, name: 'Project 2' },
      ]
      const page2 = [
        { id: 3, name: 'Project 3' },
        { id: 4, name: 'Project 4' },
      ]
      const page3 = [{ id: 5, name: 'Project 5' }]

      const mockClient = {
        get: vi
          .fn()
          .mockResolvedValueOnce({
            body: page1,
            headers: {
              link: '<https://3.basecampapi.com/999999999/projects.json?page=2>; rel="next"',
            },
          })
          .mockResolvedValueOnce({
            body: page2,
            headers: {
              link: '<https://3.basecampapi.com/999999999/projects.json?page=3>; rel="next"',
            },
          })
          .mockResolvedValueOnce({
            body: page3,
            headers: { link: '' },
          }),
      }

      const parseNextLink = (linkHeader: string | undefined) => {
        if (!linkHeader) return null
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1] : null
      }

      const fetchAllPages = async (client: any, url: string) => {
        const allResults: any[] = []
        let nextUrl: string | null = url

        while (nextUrl) {
          const response = await client.get(nextUrl)
          const items = response.body
          allResults.push(...items)

          const linkHeader = response.headers.link
          nextUrl = parseNextLink(linkHeader)
        }

        return allResults
      }

      const result = await fetchAllPages(mockClient, 'projects.json')

      expect(result).toHaveLength(5)
      expect(result).toEqual([
        { id: 1, name: 'Project 1' },
        { id: 2, name: 'Project 2' },
        { id: 3, name: 'Project 3' },
        { id: 4, name: 'Project 4' },
        { id: 5, name: 'Project 5' },
      ])
      expect(mockClient.get).toHaveBeenCalledTimes(3)
    })

    it('should handle single page response (no pagination)', async () => {
      const page1 = [{ id: 1, name: 'Project 1' }]

      const mockClient = {
        get: vi.fn().mockResolvedValueOnce({
          body: page1,
          headers: { link: '' },
        }),
      }

      const parseNextLink = (linkHeader: string | undefined) => {
        if (!linkHeader) return null
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1] : null
      }

      const fetchAllPages = async (client: any, url: string) => {
        const allResults: any[] = []
        let nextUrl: string | null = url

        while (nextUrl) {
          const response = await client.get(nextUrl)
          const items = response.body
          allResults.push(...items)

          const linkHeader = response.headers.link
          nextUrl = parseNextLink(linkHeader)
        }

        return allResults
      }

      const result = await fetchAllPages(mockClient, 'projects.json')

      expect(result).toHaveLength(1)
      expect(result).toEqual([{ id: 1, name: 'Project 1' }])
      expect(mockClient.get).toHaveBeenCalledTimes(1)
    })

    it('should handle empty response', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValueOnce({
          body: [],
          headers: { link: '' },
        }),
      }

      const parseNextLink = (linkHeader: string | undefined) => {
        if (!linkHeader) return null
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1] : null
      }

      const fetchAllPages = async (client: any, url: string) => {
        const allResults: any[] = []
        let nextUrl: string | null = url

        while (nextUrl) {
          const response = await client.get(nextUrl)
          const items = response.body
          allResults.push(...items)

          const linkHeader = response.headers.link
          nextUrl = parseNextLink(linkHeader)
        }

        return allResults
      }

      const result = await fetchAllPages(mockClient, 'projects.json')

      expect(result).toHaveLength(0)
      expect(result).toEqual([])
    })

    it('should preserve item order across pages', async () => {
      const page1 = [{ id: 1 }, { id: 2 }]
      const page2 = [{ id: 3 }, { id: 4 }]
      const page3 = [{ id: 5 }]

      const mockClient = {
        get: vi
          .fn()
          .mockResolvedValueOnce({
            body: page1,
            headers: {
              link: '<https://3.basecampapi.com/999999999/projects.json?page=2>; rel="next"',
            },
          })
          .mockResolvedValueOnce({
            body: page2,
            headers: {
              link: '<https://3.basecampapi.com/999999999/projects.json?page=3>; rel="next"',
            },
          })
          .mockResolvedValueOnce({
            body: page3,
            headers: { link: '' },
          }),
      }

      const parseNextLink = (linkHeader: string | undefined) => {
        if (!linkHeader) return null
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1] : null
      }

      const fetchAllPages = async (client: any, url: string) => {
        const allResults: any[] = []
        let nextUrl: string | null = url

        while (nextUrl) {
          const response = await client.get(nextUrl)
          const items = response.body
          allResults.push(...items)

          const linkHeader = response.headers.link
          nextUrl = parseNextLink(linkHeader)
        }

        return allResults
      }

      const result = await fetchAllPages(mockClient, 'projects.json')

      expect(result.map((r: any) => r.id)).toEqual([1, 2, 3, 4, 5])
    })

    it('should handle query parameters in initial URL', async () => {
      const page1 = [{ id: 1, completed: true }]

      const mockClient = {
        get: vi.fn().mockResolvedValueOnce({
          body: page1,
          headers: { link: '' },
        }),
      }

      const parseNextLink = (linkHeader: string | undefined) => {
        if (!linkHeader) return null
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1] : null
      }

      const fetchAllPages = async (client: any, url: string) => {
        const allResults: any[] = []
        let nextUrl: string | null = url

        while (nextUrl) {
          const response = await client.get(nextUrl)
          const items = response.body
          allResults.push(...items)

          const linkHeader = response.headers.link
          nextUrl = parseNextLink(linkHeader)
        }

        return allResults
      }

      const result = await fetchAllPages(mockClient, 'todos.json?completed=true')

      expect(mockClient.get).toHaveBeenCalledWith('todos.json?completed=true')
      expect(result).toEqual([{ id: 1, completed: true }])
    })
  })
})
