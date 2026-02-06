jest.mock('openclaw-config') // Automatically mock openclaw-config
const nock = require('nock')
const { getToken } = require('../index')

describe('Helpscout Skill Tests with Mocked Config', () => {
  beforeEach(() => {
    nock.cleanAll()
  })

  afterAll(() => {
    nock.restore()
  })

  test('Should fetch Helpscout OAuth token', async () => {
    nock('https://api.helpscout.net')
      .post('/v2/oauth2/token')
      .reply(200, { access_token: 'mocked-token' })

    const token = await getToken()
    expect(token).toBe('mocked-token')
  })

  test('Should throw error for invalid credentials', async () => {
    nock('https://api.helpscout.net')
      .post('/v2/oauth2/token')
      .reply(400, { error: 'invalid_client' })

    await expect(getToken()).rejects.toThrow('Failed to get Helpscout token')
  })

  test('Should handle network errors gracefully', async () => {
    nock('https://api.helpscout.net').post('/v2/oauth2/token').replyWithError('Network error')

    await expect(getToken()).rejects.toThrow(
      'request to https://api.helpscout.net/v2/oauth2/token failed, reason: Network error',
    )
  })
})
