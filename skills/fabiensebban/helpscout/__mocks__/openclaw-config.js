// Mock openclaw-config for testing
const config = {
  get: jest.fn((key) => {
    const mockConfig = {
      'helpscout.apiKey': 'mock-api-key',
      'helpscout.appSecret': 'mock-app-secret',
      'helpscout.inboxIds': ['mock-inbox-id-1', 'mock-inbox-id-2'],
    }
    return mockConfig[key]
  }),
}

module.exports = config
