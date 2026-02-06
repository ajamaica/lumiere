import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from './setup'

describe('Test Infrastructure', () => {
  it('should have MSW server running', () => {
    expect(server).toBeDefined()
  })

  it('should mock Basecamp API endpoints', async () => {
    const response = await fetch('https://3.basecampapi.com/99999999/projects.json')
    const data = await response.json()

    expect(response.ok).toBe(true)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('name')
  })

  it('should allow handler overrides in tests', async () => {
    server.use(
      http.get('https://3.basecampapi.com/99999999/projects.json', () => {
        return HttpResponse.json([
          {
            id: 999,
            name: 'Override Project',
            description: 'Overridden for this test',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ])
      }),
    )

    const response = await fetch('https://3.basecampapi.com/99999999/projects.json')
    const data = await response.json()

    expect(data[0].id).toBe(999)
    expect(data[0].name).toBe('Override Project')
  })

  it('should have environment variables set', () => {
    expect(process.env.BASECAMP_CLIENT_ID).toBe('test-client-id')
    expect(process.env.BASECAMP_CLIENT_SECRET).toBe('test-client-secret')
    expect(process.env.BASECAMP_ACCESS_TOKEN).toBe('test-access-token')
  })
})
