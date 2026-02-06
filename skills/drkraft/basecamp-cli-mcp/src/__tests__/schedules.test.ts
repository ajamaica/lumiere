import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createScheduleEntry,
  deleteScheduleEntry,
  getSchedule,
  getScheduleEntry,
  listScheduleEntries,
  updateScheduleEntry,
} from '../lib/api.js'

vi.mock('../lib/auth.js', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

vi.mock('../lib/config.js', () => ({
  getCurrentAccountId: vi.fn().mockReturnValue(123456),
}))

const mockSchedule = {
  id: 1069479342,
  status: 'active',
  visible_to_clients: false,
  created_at: '2022-11-22T08:23:58.237Z',
  updated_at: '2022-11-22T08:25:04.318Z',
  title: 'Schedule',
  inherits_status: true,
  type: 'Schedule',
  url: 'https://3.basecampapi.com/195539477/buckets/2085958499/schedules/1069479342.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/2085958499/schedules/1069479342',
  bookmark_url: 'https://3.basecampapi.com/195539477/my/bookmarks/test.json',
  position: 5,
  bucket: {
    id: 2085958499,
    name: 'Test Project',
    type: 'Project',
  },
  creator: {
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
  },
  include_due_assignments: true,
  entries_count: 1,
  entries_url:
    'https://3.basecampapi.com/195539477/buckets/2085958499/schedules/1069479342/entries.json',
}

const mockScheduleEntry = {
  id: 1069479847,
  status: 'active',
  visible_to_clients: false,
  created_at: '2022-11-22T08:25:04.190Z',
  updated_at: '2022-11-22T08:25:04.316Z',
  title: 'Team Meeting',
  inherits_status: true,
  type: 'Schedule::Entry',
  url: 'https://3.basecampapi.com/195539477/buckets/2085958499/schedule_entries/1069479847.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/2085958499/schedule_entries/1069479847',
  bookmark_url: 'https://3.basecampapi.com/195539477/my/bookmarks/test.json',
  subscription_url:
    'https://3.basecampapi.com/195539477/buckets/2085958499/recordings/1069479847/subscription.json',
  comments_count: 0,
  comments_url:
    'https://3.basecampapi.com/195539477/buckets/2085958499/recordings/1069479847/comments.json',
  parent: {
    id: 1069479342,
    title: 'Schedule',
    type: 'Schedule',
    url: 'https://3.basecampapi.com/195539477/buckets/2085958499/schedules/1069479342.json',
    app_url: 'https://3.basecamp.com/195539477/buckets/2085958499/schedules/1069479342',
  },
  bucket: {
    id: 2085958499,
    name: 'Test Project',
    type: 'Project',
  },
  creator: {
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
  },
  description: '<div>Time to synergize!</div>',
  summary: 'Team Meeting',
  all_day: false,
  starts_at: '2022-11-23T10:25:04.177Z',
  ends_at: '2022-11-23T14:25:04.177Z',
  participants: [
    {
      id: 1049715921,
      attachable_sgid: 'test-sgid-2',
      name: 'Steve Marsh',
      email_address: 'steve@example.com',
      personable_type: 'User',
      title: 'Legacy Directives Strategist',
      bio: 'You can do it!',
      location: null,
      created_at: '2022-11-22T08:23:21.991Z',
      updated_at: '2022-11-22T08:23:21.991Z',
      admin: false,
      owner: false,
      client: false,
      employee: true,
      time_zone: 'Etc/UTC',
      avatar_url: 'https://example.com/avatar2.jpg',
      can_manage_projects: true,
      can_manage_people: true,
    },
  ],
}

describe('Schedules API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSchedule', () => {
    it('should fetch schedule for a project', async () => {
      const result = await getSchedule(1)
      expect(result).toBeDefined()
      expect(result.id).toBe(mockSchedule.id)
      expect(result.title).toBe('Schedule')
    })

    it('should throw error if schedule not enabled', async () => {
      await expect(getSchedule(999)).rejects.toThrow('Schedule not enabled')
    })
  })

  describe('listScheduleEntries', () => {
    it('should list all schedule entries', async () => {
      const result = await listScheduleEntries(1)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should filter entries by status', async () => {
      const result = await listScheduleEntries(1, 'archived')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should throw error if schedule not enabled', async () => {
      await expect(listScheduleEntries(999)).rejects.toThrow('Schedule not enabled')
    })
  })

  describe('getScheduleEntry', () => {
    it('should fetch a specific schedule entry', async () => {
      const result = await getScheduleEntry(1, 1069479847)
      expect(result).toBeDefined()
      expect(result.id).toBe(mockScheduleEntry.id)
      expect(result.summary).toBe('Team Meeting')
    })

    it('should include all entry properties', async () => {
      const result = await getScheduleEntry(1, 1069479847)
      expect(result.all_day).toBe(false)
      expect(result.starts_at).toBeDefined()
      expect(result.ends_at).toBeDefined()
      expect(result.participants).toBeDefined()
    })
  })

  describe('createScheduleEntry', () => {
    it('should create a schedule entry with required fields', async () => {
      const result = await createScheduleEntry(1, 'New Event', '2024-12-25T10:00:00Z')
      expect(result).toBeDefined()
      expect(result.summary).toBe('New Event')
    })

    it('should create entry with optional fields', async () => {
      const result = await createScheduleEntry(1, 'Meeting', '2024-12-25T10:00:00Z', {
        description: 'Team sync',
        endsAt: '2024-12-25T11:00:00Z',
        allDay: false,
        participantIds: [123, 456],
      })
      expect(result).toBeDefined()
      expect(result.summary).toBe('Meeting')
    })

    it('should create all-day event', async () => {
      const result = await createScheduleEntry(1, 'Holiday', '2024-12-25', {
        allDay: true,
      })
      expect(result).toBeDefined()
      expect(result.all_day).toBe(true)
    })

    it('should throw error if schedule not enabled', async () => {
      await expect(createScheduleEntry(999, 'Event', '2024-12-25T10:00:00Z')).rejects.toThrow(
        'Schedule not enabled',
      )
    })
  })

  describe('updateScheduleEntry', () => {
    it('should update entry summary', async () => {
      const result = await updateScheduleEntry(1, 1069479847, {
        summary: 'Updated Meeting',
      })
      expect(result).toBeDefined()
      expect(result.summary).toBe('Updated Meeting')
    })

    it('should update multiple fields', async () => {
      const result = await updateScheduleEntry(1, 1069479847, {
        summary: 'New Title',
        description: 'New description',
        starts_at: '2024-12-26T10:00:00Z',
        ends_at: '2024-12-26T11:00:00Z',
      })
      expect(result).toBeDefined()
      expect(result.summary).toBe('New Title')
    })

    it('should update participants', async () => {
      const result = await updateScheduleEntry(1, 1069479847, {
        participant_ids: [789, 101112],
      })
      expect(result).toBeDefined()
      expect(result.participants).toBeDefined()
    })

    it('should handle partial updates', async () => {
      const result = await updateScheduleEntry(1, 1069479847, {
        summary: 'Only summary changed',
      })
      expect(result).toBeDefined()
    })
  })

  describe('deleteScheduleEntry', () => {
    it('should delete a schedule entry', async () => {
      await expect(deleteScheduleEntry(1, 1069479847)).resolves.toBeUndefined()
    })

    it('should handle deletion of non-existent entry gracefully', async () => {
      await expect(deleteScheduleEntry(1, 999999)).resolves.toBeUndefined()
    })
  })

  describe('Schedule Entry Properties', () => {
    it('should have correct timestamp format', async () => {
      const result = await getScheduleEntry(1, 1069479847)
      expect(result.starts_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(result.ends_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should include creator information', async () => {
      const result = await getScheduleEntry(1, 1069479847)
      expect(result.creator).toBeDefined()
      expect(result.creator.name).toBeDefined()
      expect(result.creator.email_address).toBeDefined()
    })

    it('should include participant list', async () => {
      const result = await getScheduleEntry(1, 1069479847)
      expect(Array.isArray(result.participants)).toBe(true)
      if (result.participants.length > 0) {
        expect(result.participants[0].name).toBeDefined()
      }
    })

    it('should include parent schedule reference', async () => {
      const result = await getScheduleEntry(1, 1069479847)
      expect(result.parent).toBeDefined()
      expect(result.parent.type).toBe('Schedule')
    })
  })

  describe('Schedule Properties', () => {
    it('should have correct schedule structure', async () => {
      const result = await getSchedule(1)
      expect(result.id).toBeDefined()
      expect(result.title).toBeDefined()
      expect(result.entries_count).toBeDefined()
      expect(result.include_due_assignments).toBeDefined()
    })

    it('should include bucket information', async () => {
      const result = await getSchedule(1)
      expect(result.bucket).toBeDefined()
      expect(result.bucket.name).toBeDefined()
      expect(result.bucket.type).toBe('Project')
    })

    it('should include creator information', async () => {
      const result = await getSchedule(1)
      expect(result.creator).toBeDefined()
      expect(result.creator.name).toBeDefined()
    })
  })

  describe('Date Handling', () => {
    it('should accept ISO 8601 datetime format', async () => {
      const result = await createScheduleEntry(1, 'Event', '2024-12-25T10:30:00Z')
      expect(result).toBeDefined()
    })

    it('should accept ISO 8601 date format for all-day events', async () => {
      const result = await createScheduleEntry(1, 'Holiday', '2024-12-25', {
        allDay: true,
      })
      expect(result).toBeDefined()
    })

    it('should handle timezone-aware datetimes', async () => {
      const result = await createScheduleEntry(1, 'Event', '2024-12-25T10:30:00-05:00')
      expect(result).toBeDefined()
    })
  })

  describe('Participant Management', () => {
    it('should create entry with multiple participants', async () => {
      const result = await createScheduleEntry(1, 'Team Meeting', '2024-12-25T10:00:00Z', {
        participantIds: [123, 456, 789],
      })
      expect(result).toBeDefined()
      expect(result.participants).toBeDefined()
    })

    it('should update entry participants', async () => {
      const result = await updateScheduleEntry(1, 1069479847, {
        participant_ids: [111, 222, 333],
      })
      expect(result).toBeDefined()
    })

    it('should handle empty participant list', async () => {
      const result = await createScheduleEntry(1, 'Solo Event', '2024-12-25T10:00:00Z', {
        participantIds: [],
      })
      expect(result).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid project ID', async () => {
      await expect(getSchedule(-1)).rejects.toThrow()
    })

    it('should handle invalid entry ID', async () => {
      await expect(getScheduleEntry(1, -1)).rejects.toThrow()
    })

    it('should handle missing required fields in create', async () => {
      await expect(createScheduleEntry(1, '', '2024-12-25T10:00:00Z')).rejects.toThrow()
    })
  })
})
