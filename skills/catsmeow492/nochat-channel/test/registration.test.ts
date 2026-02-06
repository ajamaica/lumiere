import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('NoChat Plugin Registration', () => {
  let registerChannelMock: ReturnType<typeof vi.fn>
  let registerServiceMock: ReturnType<typeof vi.fn>
  let mockApi: any

  beforeEach(() => {
    registerChannelMock = vi.fn()
    registerServiceMock = vi.fn()
    mockApi = {
      registerChannel: registerChannelMock,
      registerService: registerServiceMock,
      runtime: {},
      config: {
        channels: {
          nochat: {
            enabled: true,
            serverUrl: 'https://nochat-server.fly.dev',
            apiKey: 'nochat_sk_test',
            agentName: 'Coda',
          },
        },
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }
  })

  it('register() calls api.registerChannel()', async () => {
    const mod = await import('../index.js')
    const plugin = mod.default
    plugin.register(mockApi)

    expect(registerChannelMock).toHaveBeenCalledTimes(1)
    expect(registerChannelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plugin: expect.objectContaining({ id: 'nochat' }),
      }),
    )
  })

  it('register() calls api.registerService()', async () => {
    const mod = await import('../index.js')
    const plugin = mod.default
    plugin.register(mockApi)

    expect(registerServiceMock).toHaveBeenCalledTimes(1)
    expect(registerServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'nochat-transport',
      }),
    )
  })

  it('registered service has start and stop functions', async () => {
    const mod = await import('../index.js')
    const plugin = mod.default
    plugin.register(mockApi)

    const serviceCall = registerServiceMock.mock.calls[0][0]
    expect(serviceCall.start).toBeTypeOf('function')
    expect(serviceCall.stop).toBeTypeOf('function')
  })

  it('plugin has correct id and name', async () => {
    const mod = await import('../index.js')
    const plugin = mod.default
    expect(plugin.id).toBe('nochat-channel')
    expect(plugin.name).toBe('NoChat Channel')
  })

  it('plugin has configSchema', async () => {
    const mod = await import('../index.js')
    const plugin = mod.default
    expect(plugin.configSchema).toBeDefined()
  })
})
