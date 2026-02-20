import { GatewayMethods } from '../../../config/gateway.config'
import { MoltGatewayClient } from '../client'

// We test that the skill RPC methods delegate to `request()` with the
// correct gateway method name and parameters. To avoid needing a real
// WebSocket connection we spy on the `request` method.

function createClient(): MoltGatewayClient {
  return new MoltGatewayClient({
    url: 'wss://test.example.com',
    token: 'test-token',
    autoReconnect: false,
  })
}

describe('MoltGatewayClient — skill methods', () => {
  let client: MoltGatewayClient
  let requestSpy: jest.SpyInstance

  beforeEach(() => {
    client = createClient()
    // Spy on the request method to capture calls without needing a real WebSocket
    requestSpy = jest.spyOn(client, 'request').mockResolvedValue(undefined)
  })

  afterEach(() => {
    requestSpy.mockRestore()
  })

  describe('teachSkill', () => {
    it('calls request with SKILLS_TEACH method and params', async () => {
      const params = {
        name: 'summarize',
        description: 'Summarize text content',
        content: 'When asked to summarize, create a concise summary.',
      }
      const mockSkill = {
        ...params,
        createdAtMs: 1700000000,
        updatedAtMs: 1700000000,
      }
      requestSpy.mockResolvedValueOnce(mockSkill)

      const result = await client.teachSkill(params)

      expect(requestSpy).toHaveBeenCalledWith(GatewayMethods.SKILLS_TEACH, params)
      expect(result).toEqual(mockSkill)
    })
  })

  describe('listSkills', () => {
    it('calls request with SKILLS_LIST method and no params', async () => {
      const mockResponse = {
        skills: [
          {
            name: 'summarize',
            description: 'Summarize text',
            content: 'Instructions...',
            createdAtMs: 1700000000,
            updatedAtMs: 1700000001,
          },
        ],
      }
      requestSpy.mockResolvedValueOnce(mockResponse)

      const result = await client.listSkills()

      expect(requestSpy).toHaveBeenCalledWith(GatewayMethods.SKILLS_LIST)
      expect(result.skills).toHaveLength(1)
      expect(result.skills[0].name).toBe('summarize')
    })
  })

  describe('removeSkill', () => {
    it('calls request with SKILLS_REMOVE method and name', async () => {
      requestSpy.mockResolvedValueOnce({ ok: true })

      await client.removeSkill('summarize')

      expect(requestSpy).toHaveBeenCalledWith(GatewayMethods.SKILLS_REMOVE, {
        name: 'summarize',
      })
    })
  })

  describe('updateSkill', () => {
    it('calls request with SKILLS_UPDATE method and params', async () => {
      const params = {
        skillKey: 'summarize',
        description: 'Updated description',
        content: 'Updated instructions',
      }
      const mockSkill = {
        name: 'summarize',
        ...params,
        createdAtMs: 1700000000,
        updatedAtMs: 1700000002,
      }
      requestSpy.mockResolvedValueOnce(mockSkill)

      const result = await client.updateSkill(params)

      expect(requestSpy).toHaveBeenCalledWith(GatewayMethods.SKILLS_UPDATE, params)
      expect(result).toEqual(mockSkill)
    })

    it('supports partial updates (description only)', async () => {
      const params = {
        skillKey: 'summarize',
        description: 'New description only',
      }
      requestSpy.mockResolvedValueOnce({
        name: 'summarize',
        description: 'New description only',
        content: 'Original content',
        createdAtMs: 1700000000,
        updatedAtMs: 1700000003,
      })

      const result = await client.updateSkill(params)

      expect(requestSpy).toHaveBeenCalledWith(GatewayMethods.SKILLS_UPDATE, params)
      expect(result.description).toBe('New description only')
    })
  })
})

describe('GatewayMethods — skills constants', () => {
  it('defines all required skill method names', () => {
    expect(GatewayMethods.SKILLS_TEACH).toBe('skills.teach')
    expect(GatewayMethods.SKILLS_LIST).toBe('skills.list')
    expect(GatewayMethods.SKILLS_REMOVE).toBe('skills.remove')
    expect(GatewayMethods.SKILLS_UPDATE).toBe('skills.update')
  })
})
