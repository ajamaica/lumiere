import { describe, expect, it } from 'vitest'

import {
  listNoChatAccountIds,
  resolveDefaultNoChatAccountId,
  resolveNoChatAccount,
} from '../src/accounts.js'

describe('NoChat Accounts', () => {
  // ── listNoChatAccountIds ──────────────────────────────────────────────

  describe('listNoChatAccountIds', () => {
    it("returns ['default'] when no accounts section exists (flat config)", () => {
      const cfg = {
        channels: {
          nochat: {
            serverUrl: 'https://nochat-server.fly.dev',
            apiKey: 'nochat_sk_test',
            agentName: 'Coda',
          },
        },
      }
      expect(listNoChatAccountIds(cfg)).toEqual(['default'])
    })

    it('returns account keys when accounts section exists', () => {
      const cfg = {
        channels: {
          nochat: {
            accounts: {
              default: { serverUrl: 'https://a.com', apiKey: 'nochat_sk_a', agentName: 'A' },
              secondary: { serverUrl: 'https://b.com', apiKey: 'nochat_sk_b', agentName: 'B' },
            },
          },
        },
      }
      const ids = listNoChatAccountIds(cfg)
      expect(ids).toContain('default')
      expect(ids).toContain('secondary')
      expect(ids).toHaveLength(2)
    })

    it("returns ['default'] when channels.nochat is missing", () => {
      const cfg = { channels: {} }
      expect(listNoChatAccountIds(cfg)).toEqual(['default'])
    })

    it("returns ['default'] when cfg is empty", () => {
      expect(listNoChatAccountIds({})).toEqual(['default'])
    })

    it('filters out empty keys', () => {
      const cfg = {
        channels: {
          nochat: {
            accounts: {
              '': { serverUrl: 'https://a.com', apiKey: 'sk', agentName: 'A' },
              valid: { serverUrl: 'https://b.com', apiKey: 'sk', agentName: 'B' },
            },
          },
        },
      }
      const ids = listNoChatAccountIds(cfg)
      expect(ids).toEqual(['valid'])
    })

    it('sorts account ids alphabetically', () => {
      const cfg = {
        channels: {
          nochat: {
            accounts: {
              zebra: { serverUrl: 'https://z.com', apiKey: 'sk', agentName: 'Z' },
              alpha: { serverUrl: 'https://a.com', apiKey: 'sk', agentName: 'A' },
            },
          },
        },
      }
      expect(listNoChatAccountIds(cfg)).toEqual(['alpha', 'zebra'])
    })
  })

  // ── resolveNoChatAccount ──────────────────────────────────────────────

  describe('resolveNoChatAccount', () => {
    it('resolves flat config (no accounts section) as default', () => {
      const cfg = {
        channels: {
          nochat: {
            enabled: true,
            serverUrl: 'https://nochat-server.fly.dev',
            apiKey: 'nochat_sk_test',
            agentName: 'Coda',
            agentId: 'coda-uuid',
            trust: { default: 'untrusted' as const, agents: {} },
          },
        },
      }
      const account = resolveNoChatAccount({ cfg })
      expect(account.accountId).toBe('default')
      expect(account.name).toBe('Coda')
      expect(account.enabled).toBe(true)
      expect(account.configured).toBe(true)
      expect(account.baseUrl).toBe('https://nochat-server.fly.dev')
      expect(account.config.serverUrl).toBe('https://nochat-server.fly.dev')
    })

    it('resolves specific account from multi-account config', () => {
      const cfg = {
        channels: {
          nochat: {
            enabled: true,
            accounts: {
              default: {
                serverUrl: 'https://a.com',
                apiKey: 'nochat_sk_a',
                agentName: 'A',
                trust: { default: 'untrusted' as const, agents: {} },
              },
              secondary: {
                serverUrl: 'https://b.com',
                apiKey: 'nochat_sk_b',
                agentName: 'B',
                enabled: true,
                trust: { default: 'untrusted' as const, agents: {} },
              },
            },
          },
        },
      }
      const account = resolveNoChatAccount({ cfg, accountId: 'secondary' })
      expect(account.accountId).toBe('secondary')
      expect(account.name).toBe('B')
      expect(account.baseUrl).toBe('https://b.com')
    })

    it('returns unconfigured account when serverUrl is missing', () => {
      const cfg = {
        channels: {
          nochat: {
            apiKey: 'nochat_sk_test',
            agentName: 'Coda',
            trust: { default: 'untrusted' as const, agents: {} },
          },
        },
      }
      const account = resolveNoChatAccount({ cfg })
      expect(account.configured).toBe(false)
    })

    it('returns unconfigured account when apiKey is missing', () => {
      const cfg = {
        channels: {
          nochat: {
            serverUrl: 'https://nochat-server.fly.dev',
            agentName: 'Coda',
            trust: { default: 'untrusted' as const, agents: {} },
          },
        },
      }
      const account = resolveNoChatAccount({ cfg })
      expect(account.configured).toBe(false)
    })

    it("normalizes null/undefined accountId to 'default'", () => {
      const cfg = {
        channels: {
          nochat: {
            serverUrl: 'https://nochat-server.fly.dev',
            apiKey: 'nochat_sk_test',
            agentName: 'Coda',
            trust: { default: 'untrusted' as const, agents: {} },
          },
        },
      }
      const a1 = resolveNoChatAccount({ cfg, accountId: undefined })
      const a2 = resolveNoChatAccount({ cfg, accountId: null as any })
      expect(a1.accountId).toBe('default')
      expect(a2.accountId).toBe('default')
    })

    it('respects enabled=false on top-level section', () => {
      const cfg = {
        channels: {
          nochat: {
            enabled: false,
            serverUrl: 'https://nochat-server.fly.dev',
            apiKey: 'nochat_sk_test',
            agentName: 'Coda',
            trust: { default: 'untrusted' as const, agents: {} },
          },
        },
      }
      const account = resolveNoChatAccount({ cfg })
      expect(account.enabled).toBe(false)
    })

    it('respects enabled=false on individual account', () => {
      const cfg = {
        channels: {
          nochat: {
            enabled: true,
            accounts: {
              default: {
                serverUrl: 'https://a.com',
                apiKey: 'nochat_sk_a',
                agentName: 'A',
                enabled: false,
                trust: { default: 'untrusted' as const, agents: {} },
              },
            },
          },
        },
      }
      const account = resolveNoChatAccount({ cfg, accountId: 'default' })
      expect(account.enabled).toBe(false)
    })

    it('strips trailing slash from baseUrl', () => {
      const cfg = {
        channels: {
          nochat: {
            serverUrl: 'https://nochat-server.fly.dev/',
            apiKey: 'nochat_sk_test',
            agentName: 'Coda',
            trust: { default: 'untrusted' as const, agents: {} },
          },
        },
      }
      const account = resolveNoChatAccount({ cfg })
      expect(account.baseUrl).toBe('https://nochat-server.fly.dev')
    })

    it('handles completely missing config gracefully', () => {
      const account = resolveNoChatAccount({ cfg: {} })
      expect(account.accountId).toBe('default')
      expect(account.configured).toBe(false)
      expect(account.enabled).toBe(false)
    })

    it('merges base-level config with account-level config', () => {
      const cfg = {
        channels: {
          nochat: {
            enabled: true,
            serverUrl: 'https://base.com',
            apiKey: 'nochat_sk_base',
            agentName: 'Base',
            trust: { default: 'untrusted' as const, agents: {} },
            accounts: {
              custom: {
                agentName: 'Custom',
                // inherits serverUrl and apiKey from base
              },
            },
          },
        },
      }
      const account = resolveNoChatAccount({ cfg, accountId: 'custom' })
      expect(account.name).toBe('Custom')
      expect(account.baseUrl).toBe('https://base.com')
      expect(account.config.apiKey).toBe('nochat_sk_base')
    })
  })

  // ── resolveDefaultNoChatAccountId ─────────────────────────────────────

  describe('resolveDefaultNoChatAccountId', () => {
    it("returns 'default' when it exists in accounts", () => {
      const cfg = {
        channels: {
          nochat: {
            accounts: {
              default: { serverUrl: 'https://a.com', apiKey: 'sk', agentName: 'A' },
              other: { serverUrl: 'https://b.com', apiKey: 'sk', agentName: 'B' },
            },
          },
        },
      }
      expect(resolveDefaultNoChatAccountId(cfg)).toBe('default')
    })

    it("returns first sorted id when 'default' doesn't exist", () => {
      const cfg = {
        channels: {
          nochat: {
            accounts: {
              beta: { serverUrl: 'https://b.com', apiKey: 'sk', agentName: 'B' },
              alpha: { serverUrl: 'https://a.com', apiKey: 'sk', agentName: 'A' },
            },
          },
        },
      }
      expect(resolveDefaultNoChatAccountId(cfg)).toBe('alpha')
    })

    it("returns 'default' for flat config", () => {
      const cfg = {
        channels: {
          nochat: {
            serverUrl: 'https://a.com',
            apiKey: 'sk',
            agentName: 'A',
          },
        },
      }
      expect(resolveDefaultNoChatAccountId(cfg)).toBe('default')
    })
  })
})
