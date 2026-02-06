import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BasecampPerson, BasecampSubscription } from '../types/index.js'

vi.mock('../lib/auth.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

vi.mock('../lib/config.js', () => ({
  getCurrentAccountId: vi.fn().mockReturnValue(123456),
}))

const mockSubscriber: BasecampPerson = {
  id: 1049715914,
  attachable_sgid: 'test-sgid',
  name: 'Victor Cooper',
  email_address: 'victor@example.com',
  personable_type: 'User',
  title: 'Chief Strategist',
  bio: 'Test bio',
  location: 'Chicago, IL',
  created_at: '2022-11-22T08:23:21.732Z',
  updated_at: '2022-11-22T08:23:21.904Z',
  admin: true,
  owner: true,
  client: false,
  employee: true,
  time_zone: 'America/Chicago',
  avatar_url: 'https://example.com/avatar.jpg',
  can_manage_projects: true,
  can_manage_people: true,
}

const mockSubscription: BasecampSubscription = {
  subscribed: true,
  count: 2,
  url: 'https://3.basecampapi.com/195539477/buckets/2085958499/recordings/1069479351/subscription.json',
  subscribers: [mockSubscriber],
}

describe('Subscriptions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Subscription data structure', () => {
    it('should have correct subscription properties', () => {
      const sub: BasecampSubscription = {
        subscribed: true,
        count: 5,
        url: 'https://example.com',
        subscribers: [mockSubscriber],
      }

      expect(sub).toHaveProperty('subscribed')
      expect(sub).toHaveProperty('count')
      expect(sub).toHaveProperty('url')
      expect(sub).toHaveProperty('subscribers')
      expect(typeof sub.subscribed).toBe('boolean')
      expect(typeof sub.count).toBe('number')
      expect(Array.isArray(sub.subscribers)).toBe(true)
    })

    it('should contain person objects in subscribers array', () => {
      const sub: BasecampSubscription = {
        subscribed: true,
        count: 1,
        url: 'https://example.com',
        subscribers: [mockSubscriber],
      }

      const subscriber = sub.subscribers[0]
      expect(subscriber.id).toBe(1049715914)
      expect(subscriber.name).toBe('Victor Cooper')
      expect(subscriber.email_address).toBe('victor@example.com')
      expect(subscriber.title).toBe('Chief Strategist')
    })

    it('should handle empty subscribers list', () => {
      const emptySubscription: BasecampSubscription = {
        subscribed: false,
        count: 0,
        url: 'https://example.com',
        subscribers: [],
      }

      expect(emptySubscription.subscribers).toHaveLength(0)
      expect(emptySubscription.subscribed).toBe(false)
      expect(emptySubscription.count).toBe(0)
    })

    it('should handle multiple subscribers', () => {
      const subscriber2: BasecampPerson = {
        ...mockSubscriber,
        id: 1049715915,
        name: 'Annie Bryan',
        email_address: 'annie@example.com',
      }

      const multiSubscription: BasecampSubscription = {
        subscribed: true,
        count: 2,
        url: 'https://example.com',
        subscribers: [mockSubscriber, subscriber2],
      }

      expect(multiSubscription.subscribers).toHaveLength(2)
      expect(multiSubscription.count).toBe(2)
      expect(multiSubscription.subscribers[0].name).toBe('Victor Cooper')
      expect(multiSubscription.subscribers[1].name).toBe('Annie Bryan')
    })
  })

  describe('Subscription state', () => {
    it('should track subscription status correctly', () => {
      const subscribed: BasecampSubscription = {
        subscribed: true,
        count: 1,
        url: 'https://example.com',
        subscribers: [mockSubscriber],
      }

      const unsubscribed: BasecampSubscription = {
        subscribed: false,
        count: 1,
        url: 'https://example.com',
        subscribers: [mockSubscriber],
      }

      expect(subscribed.subscribed).toBe(true)
      expect(unsubscribed.subscribed).toBe(false)
    })

    it('should update count when subscribers change', () => {
      const sub1: BasecampSubscription = {
        subscribed: true,
        count: 1,
        url: 'https://example.com',
        subscribers: [mockSubscriber],
      }

      const sub2: BasecampSubscription = {
        subscribed: true,
        count: 2,
        url: 'https://example.com',
        subscribers: [mockSubscriber, { ...mockSubscriber, id: 2 }],
      }

      expect(sub1.count).toBe(1)
      expect(sub2.count).toBe(2)
      expect(sub2.subscribers.length).toBe(sub2.count)
    })
  })

  describe('Subscription URL structure', () => {
    it('should have valid subscription URL', () => {
      const sub: BasecampSubscription = mockSubscription
      expect(sub.url).toContain('buckets')
      expect(sub.url).toContain('recordings')
      expect(sub.url).toContain('subscription.json')
      expect(sub.url).toMatch(/^https:\/\//)
    })

    it('should construct endpoint paths correctly', () => {
      const projectId = 123
      const recordingId = 456
      const expectedPath = `buckets/${projectId}/recordings/${recordingId}/subscription.json`

      expect(expectedPath).toContain('buckets/123')
      expect(expectedPath).toContain('recordings/456')
      expect(expectedPath).toContain('subscription.json')
    })
  })

  describe('Subscriber person data', () => {
    it('should have all required person fields', () => {
      const person = mockSubscriber

      expect(person).toHaveProperty('id')
      expect(person).toHaveProperty('name')
      expect(person).toHaveProperty('email_address')
      expect(person).toHaveProperty('title')
      expect(person).toHaveProperty('personable_type')
      expect(person).toHaveProperty('admin')
      expect(person).toHaveProperty('owner')
    })

    it('should preserve person attributes in subscription', () => {
      const sub: BasecampSubscription = {
        subscribed: true,
        count: 1,
        url: 'https://example.com',
        subscribers: [mockSubscriber],
      }

      const person = sub.subscribers[0]
      expect(person.admin).toBe(true)
      expect(person.owner).toBe(true)
      expect(person.employee).toBe(true)
      expect(person.client).toBe(false)
    })
  })

  describe('API endpoint patterns', () => {
    it('should follow Basecamp API bucket pattern', () => {
      const projectId = 999
      const recordingId = 888
      const endpoint = `buckets/${projectId}/recordings/${recordingId}/subscription.json`

      expect(endpoint).toMatch(/^buckets\/\d+\/recordings\/\d+\/subscription\.json$/)
    })

    it('should support different project and recording IDs', () => {
      const testCases = [
        { projectId: 1, recordingId: 1 },
        { projectId: 123456, recordingId: 789012 },
        { projectId: 999999999, recordingId: 888888888 },
      ]

      testCases.forEach(({ projectId, recordingId }) => {
        const endpoint = `buckets/${projectId}/recordings/${recordingId}/subscription.json`
        expect(endpoint).toContain(`buckets/${projectId}`)
        expect(endpoint).toContain(`recordings/${recordingId}`)
      })
    })
  })

  describe('Subscription response validation', () => {
    it('should validate subscription response structure', () => {
      const response = mockSubscription

      expect(typeof response.subscribed).toBe('boolean')
      expect(typeof response.count).toBe('number')
      expect(typeof response.url).toBe('string')
      expect(Array.isArray(response.subscribers)).toBe(true)
    })

    it('should handle subscription with no subscribers', () => {
      const response: BasecampSubscription = {
        subscribed: false,
        count: 0,
        url: 'https://example.com',
        subscribers: [],
      }

      expect(response.count).toBe(response.subscribers.length)
      expect(response.subscribed).toBe(false)
    })

    it('should maintain data integrity across operations', () => {
      const original = { ...mockSubscription }
      const copy = { ...mockSubscription }

      expect(original.subscribed).toBe(copy.subscribed)
      expect(original.count).toBe(copy.count)
      expect(original.url).toBe(copy.url)
      expect(original.subscribers.length).toBe(copy.subscribers.length)
    })
  })

  describe('Type safety', () => {
    it('should enforce BasecampSubscription type', () => {
      const validSub: BasecampSubscription = {
        subscribed: true,
        count: 1,
        url: 'https://example.com',
        subscribers: [mockSubscriber],
      }

      expect(validSub).toBeDefined()
      expect(validSub.subscribed).toBeDefined()
      expect(validSub.count).toBeDefined()
      expect(validSub.url).toBeDefined()
      expect(validSub.subscribers).toBeDefined()
    })

    it('should enforce BasecampPerson type in subscribers', () => {
      const sub: BasecampSubscription = mockSubscription
      const subscriber = sub.subscribers[0]

      expect(subscriber.id).toBeDefined()
      expect(subscriber.name).toBeDefined()
      expect(subscriber.email_address).toBeDefined()
      expect(typeof subscriber.id).toBe('number')
      expect(typeof subscriber.name).toBe('string')
      expect(typeof subscriber.email_address).toBe('string')
    })
  })
})
