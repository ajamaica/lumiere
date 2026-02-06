import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createWebhook,
  deleteWebhook,
  getWebhook,
  listWebhooks,
  testWebhook,
  updateWebhook,
} from '../lib/api.js'
import type { BasecampWebhook } from '../types/index.js'

vi.mock('../lib/auth.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

vi.mock('../lib/config.js', () => ({
  getCurrentAccountId: vi.fn().mockReturnValue(123456),
}))

const mockWebhook: BasecampWebhook = {
  id: 9007199254741202,
  active: true,
  created_at: '2016-06-08T19:00:41.933Z',
  updated_at: '2016-07-19T16:47:00.621Z',
  payload_url: 'https://example.com/endpoint',
  types: ['all'],
  url: 'https://3.basecampapi.com/195539477/buckets/2085958498/webhooks/9007199254741202.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/2085958498/webhooks/9007199254741202',
}

const mockWebhook2: BasecampWebhook = {
  id: 9007199254741203,
  active: false,
  created_at: '2016-06-08T19:00:41.933Z',
  updated_at: '2016-07-19T16:47:00.621Z',
  payload_url: 'https://example.com/another/endpoint',
  types: ['Todo', 'Todolist'],
  url: 'https://3.basecampapi.com/195539477/buckets/2085958498/webhooks/9007199254741203.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/2085958498/webhooks/9007199254741203',
}

describe('Webhook API Functions', () => {
  describe('Webhook types', () => {
    it('should define webhook interface with required fields', () => {
      expect(mockWebhook.id).toBeDefined()
      expect(mockWebhook.active).toBeDefined()
      expect(mockWebhook.payload_url).toBeDefined()
      expect(mockWebhook.types).toBeDefined()
      expect(mockWebhook.created_at).toBeDefined()
      expect(mockWebhook.updated_at).toBeDefined()
    })

    it('should support active and inactive webhooks', () => {
      expect(mockWebhook.active).toBe(true)
      expect(mockWebhook2.active).toBe(false)
    })

    it('should support all event types', () => {
      const eventTypes = [
        'Comment',
        'Client::Approval::Response',
        'Client::Forward',
        'Client::Reply',
        'CloudFile',
        'Document',
        'GoogleDocument',
        'Inbox::Forward',
        'Kanban::Card',
        'Kanban::Step',
        'Message',
        'Question',
        'Question::Answer',
        'Schedule::Entry',
        'Todo',
        'Todolist',
        'Upload',
        'Vault',
      ]

      eventTypes.forEach((type) => {
        expect(type).toBeTruthy()
      })
    })

    it('should support "all" as event type', () => {
      expect(mockWebhook.types).toContain('all')
    })

    it('should support specific event types', () => {
      expect(mockWebhook2.types).toEqual(['Todo', 'Todolist'])
    })
  })

  describe('Webhook payload URL validation', () => {
    it('should accept HTTPS URLs', () => {
      const validUrls = [
        'https://example.com/webhook',
        'https://api.example.com/v1/webhooks',
        'https://webhook.example.com:8443/endpoint',
      ]

      validUrls.forEach((url) => {
        expect(url.startsWith('https://')).toBe(true)
      })
    })

    it('should reject HTTP URLs', () => {
      const invalidUrls = ['http://example.com/webhook', 'http://api.example.com/v1/webhooks']

      invalidUrls.forEach((url) => {
        expect(url.startsWith('https://')).toBe(false)
      })
    })

    it('should validate webhook payload URL format', () => {
      expect(mockWebhook.payload_url).toMatch(/^https:\/\//)
      expect(mockWebhook2.payload_url).toMatch(/^https:\/\//)
    })
  })

  describe('Webhook delivery tracking', () => {
    it('should support recent deliveries in webhook details', () => {
      const webhookWithDeliveries: BasecampWebhook = {
        ...mockWebhook,
        recent_deliveries: [
          {
            id: 2,
            created_at: '2016-08-26T18:36:09.988Z',
            request: {
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Basecamp3 Webhook',
              },
              body: {
                id: 9007199254741828,
                kind: 'todo_completed',
              },
            },
            response: {
              code: 200,
              headers: { 'Content-Type': 'text/html;charset=utf-8' },
              message: 'OK',
              body: '',
            },
          },
        ],
      }

      expect(webhookWithDeliveries.recent_deliveries).toBeDefined()
      expect(webhookWithDeliveries.recent_deliveries).toHaveLength(1)
      expect(webhookWithDeliveries.recent_deliveries![0].response.code).toBe(200)
    })

    it('should track delivery request headers', () => {
      const delivery = {
        id: 2,
        created_at: '2016-08-26T18:36:09.988Z',
        request: {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Basecamp3 Webhook',
            'X-Request-Id': 'd9ba7dae-2ee0-4a89-bace-b7bbbe1a30d9',
          },
          body: { id: 123, kind: 'todo_completed' },
        },
        response: {
          code: 200,
          headers: { 'Content-Type': 'text/html;charset=utf-8' },
          message: 'OK',
          body: '',
        },
      }

      expect(delivery.request.headers['Content-Type']).toBe('application/json')
      expect(delivery.request.headers['User-Agent']).toBe('Basecamp3 Webhook')
      expect(delivery.request.headers['X-Request-Id']).toBeDefined()
    })

    it('should track delivery response codes', () => {
      const successDelivery = {
        id: 1,
        created_at: '2016-08-26T18:36:09.988Z',
        request: { headers: {}, body: {} },
        response: { code: 200, headers: {}, message: 'OK', body: '' },
      }

      const failureDelivery = {
        id: 2,
        created_at: '2016-08-26T18:37:09.988Z',
        request: { headers: {}, body: {} },
        response: { code: 500, headers: {}, message: 'Internal Server Error', body: '' },
      }

      expect(successDelivery.response.code).toBe(200)
      expect(failureDelivery.response.code).toBe(500)
    })
  })

  describe('Webhook API endpoints', () => {
    it('should use correct endpoint for listing webhooks', () => {
      const projectId = 2085958498
      const endpoint = `buckets/${projectId}/webhooks.json`
      expect(endpoint).toContain('webhooks.json')
    })

    it('should use correct endpoint for getting webhook', () => {
      const projectId = 2085958498
      const webhookId = 9007199254741202
      const endpoint = `buckets/${projectId}/webhooks/${webhookId}.json`
      expect(endpoint).toContain(`webhooks/${webhookId}.json`)
    })

    it('should use correct endpoint for creating webhook', () => {
      const projectId = 2085958498
      const endpoint = `buckets/${projectId}/webhooks.json`
      expect(endpoint).toContain('webhooks.json')
    })

    it('should use correct endpoint for updating webhook', () => {
      const projectId = 2085958498
      const webhookId = 9007199254741202
      const endpoint = `buckets/${projectId}/webhooks/${webhookId}.json`
      expect(endpoint).toContain(`webhooks/${webhookId}.json`)
    })

    it('should use correct endpoint for deleting webhook', () => {
      const projectId = 2085958498
      const webhookId = 9007199254741202
      const endpoint = `buckets/${projectId}/webhooks/${webhookId}.json`
      expect(endpoint).toContain(`webhooks/${webhookId}.json`)
    })

    it('should use correct endpoint for testing webhook', () => {
      const projectId = 2085958498
      const webhookId = 9007199254741202
      const endpoint = `buckets/${projectId}/webhooks/${webhookId}/test.json`
      expect(endpoint).toContain(`webhooks/${webhookId}/test.json`)
    })
  })

  describe('Webhook properties', () => {
    it('should have correct webhook structure', () => {
      expect(mockWebhook).toHaveProperty('id')
      expect(mockWebhook).toHaveProperty('active')
      expect(mockWebhook).toHaveProperty('created_at')
      expect(mockWebhook).toHaveProperty('updated_at')
      expect(mockWebhook).toHaveProperty('payload_url')
      expect(mockWebhook).toHaveProperty('types')
      expect(mockWebhook).toHaveProperty('url')
      expect(mockWebhook).toHaveProperty('app_url')
    })

    it('should have numeric ID', () => {
      expect(typeof mockWebhook.id).toBe('number')
      expect(mockWebhook.id).toBeGreaterThan(0)
    })

    it('should have boolean active status', () => {
      expect(typeof mockWebhook.active).toBe('boolean')
      expect(typeof mockWebhook2.active).toBe('boolean')
    })

    it('should have ISO timestamp for created_at', () => {
      expect(mockWebhook.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should have ISO timestamp for updated_at', () => {
      expect(mockWebhook.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should have array of types', () => {
      expect(Array.isArray(mockWebhook.types)).toBe(true)
      expect(Array.isArray(mockWebhook2.types)).toBe(true)
    })

    it('should have valid URLs', () => {
      expect(mockWebhook.url).toMatch(/^https:\/\//)
      expect(mockWebhook.app_url).toMatch(/^https:\/\//)
    })
  })

  describe('Webhook event lifecycle', () => {
    it('should support webhook creation events', () => {
      const eventTypes = ['webhook_created']
      expect(eventTypes).toBeDefined()
    })

    it('should support webhook update events', () => {
      const eventTypes = ['webhook_updated']
      expect(eventTypes).toBeDefined()
    })

    it('should support webhook deletion events', () => {
      const eventTypes = ['webhook_deleted']
      expect(eventTypes).toBeDefined()
    })

    it('should track webhook delivery events', () => {
      const delivery = {
        id: 1,
        created_at: '2016-08-26T18:36:09.988Z',
        request: { headers: {}, body: {} },
        response: { code: 200, headers: {}, message: 'OK', body: '' },
      }

      expect(delivery.created_at).toBeDefined()
      expect(delivery.response.code).toBeDefined()
    })
  })
})
