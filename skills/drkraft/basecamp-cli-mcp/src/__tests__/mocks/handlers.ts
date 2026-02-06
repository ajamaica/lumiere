import { http, HttpResponse } from 'msw'

const BASECAMP_API_BASE = 'https://3.basecampapi.com'
const OAUTH_BASE = 'https://launchpad.37signals.com'

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

const mockVault = {
  id: 1,
  status: 'active',
  visible_to_clients: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  title: 'Documents',
  inherits_status: true,
  type: 'Vault',
  url: 'https://3.basecampapi.com/195539477/buckets/1/vaults/1.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/1/vaults/1',
  bookmark_url: 'https://3.basecampapi.com/195539477/my/bookmarks/1.json',
  position: 1,
  bucket: {
    id: 1,
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
  documents_count: 1,
  documents_url: 'https://3.basecampapi.com/195539477/buckets/1/vaults/1/documents.json',
  uploads_count: 1,
  uploads_url: 'https://3.basecampapi.com/195539477/buckets/1/vaults/1/uploads.json',
  vaults_count: 1,
  vaults_url: 'https://3.basecampapi.com/195539477/buckets/1/vaults/1/vaults.json',
}

const mockChildVault = {
  ...mockVault,
  id: 2,
  title: 'Specs',
  url: 'https://3.basecampapi.com/195539477/buckets/1/vaults/2.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/1/vaults/2',
  documents_url: 'https://3.basecampapi.com/195539477/buckets/1/vaults/2/documents.json',
  uploads_url: 'https://3.basecampapi.com/195539477/buckets/1/vaults/2/uploads.json',
  vaults_url: 'https://3.basecampapi.com/195539477/buckets/1/vaults/2/vaults.json',
  vaults_count: 0,
}

const mockDocument = {
  id: 5001,
  status: 'active',
  visible_to_clients: false,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  title: 'Test Doc',
  inherits_status: true,
  type: 'Document',
  url: 'https://3.basecampapi.com/195539477/buckets/1/documents/5001.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/1/documents/5001',
  bookmark_url: 'https://3.basecampapi.com/195539477/my/bookmarks/5001.json',
  subscription_url:
    'https://3.basecampapi.com/195539477/buckets/1/recordings/5001/subscription.json',
  comments_count: 0,
  comments_url: 'https://3.basecampapi.com/195539477/buckets/1/recordings/5001/comments.json',
  parent: {
    id: mockVault.id,
    title: mockVault.title,
    type: 'Vault',
    url: mockVault.url,
    app_url: mockVault.app_url,
  },
  bucket: mockVault.bucket,
  creator: mockVault.creator,
  content: '<p>Content</p>',
}

const mockSearchResult = {
  id: 7001,
  status: 'active',
  visible_to_clients: false,
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-03T00:00:00Z',
  title: 'Search Result',
  inherits_status: true,
  type: 'Document',
  url: 'https://3.basecampapi.com/195539477/buckets/1/documents/7001.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/1/documents/7001',
  bookmark_url: 'https://3.basecampapi.com/195539477/my/bookmarks/7001.json',
  subscription_url:
    'https://3.basecampapi.com/195539477/buckets/1/recordings/7001/subscription.json',
  comments_count: 0,
  comments_url: 'https://3.basecampapi.com/195539477/buckets/1/recordings/7001/comments.json',
  parent: {
    id: mockVault.id,
    title: mockVault.title,
    type: 'Vault',
    url: mockVault.url,
    app_url: mockVault.app_url,
  },
  bucket: mockVault.bucket,
  creator: mockVault.creator,
  content: 'Search content',
}

const mockColumn = {
  id: 1069482092,
  status: 'active',
  visible_to_clients: false,
  created_at: '2022-11-18T09:51:27.242Z',
  updated_at: '2022-11-18T09:51:41.806Z',
  title: 'Triage',
  inherits_status: true,
  type: 'Kanban::Triage',
  url: 'https://3.basecampapi.com/195539477/buckets/2085958499/card_tables/columns/1069482092.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/2085958499/card_tables/columns/1069482092',
  bookmark_url: 'https://3.basecampapi.com/test',
  parent: {
    id: 1069482091,
    title: 'Card Table',
    type: 'Kanban::Board',
    url: 'https://3.basecampapi.com/test',
    app_url: 'https://3.basecamp.com/test',
  },
  bucket: {
    id: 2085958499,
    name: 'Test Project',
    type: 'Project',
  },
  creator: {
    id: 1049716070,
    attachable_sgid: 'test-sgid',
    name: 'Victor Cooper',
    email_address: 'victor@example.com',
    personable_type: 'User',
    title: 'Chief Strategist',
    bio: 'Test bio',
    location: 'Chicago, IL',
    created_at: '2022-11-18T09:50:54.566Z',
    updated_at: '2022-11-18T09:50:54.760Z',
    admin: true,
    owner: true,
    client: false,
    employee: true,
    time_zone: 'America/Chicago',
    avatar_url: 'https://example.com/avatar.jpg',
    can_manage_projects: true,
    can_manage_people: true,
  },
  description: null,
  subscribers: [],
  color: null,
  cards_count: 1,
  comment_count: 0,
  cards_url:
    'https://3.basecampapi.com/195539477/buckets/2085958499/card_tables/lists/1069482092/cards.json',
}

const mockCardTable = {
  id: 1069482091,
  status: 'active',
  visible_to_clients: false,
  created_at: '2022-11-18T09:51:27.237Z',
  updated_at: '2022-11-18T09:51:41.811Z',
  title: 'Card Table',
  inherits_status: true,
  type: 'Kanban::Board',
  url: 'https://3.basecampapi.com/195539477/buckets/2085958499/card_tables/1069482091.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/2085958499/card_tables/1069482091',
  bookmark_url: 'https://3.basecampapi.com/test',
  subscription_url: 'https://3.basecampapi.com/test',
  bucket: {
    id: 2085958499,
    name: 'Test Project',
    type: 'Project',
  },
  creator: {
    id: 1049716070,
    attachable_sgid: 'test-sgid',
    name: 'Victor Cooper',
    email_address: 'victor@example.com',
    personable_type: 'User',
    title: 'Chief Strategist',
    bio: 'Test bio',
    location: 'Chicago, IL',
    created_at: '2022-11-18T09:50:54.566Z',
    updated_at: '2022-11-18T09:50:54.760Z',
    admin: true,
    owner: true,
    client: false,
    employee: true,
    time_zone: 'America/Chicago',
    avatar_url: 'https://example.com/avatar.jpg',
    can_manage_projects: true,
    can_manage_people: true,
  },
  subscribers: [],
  lists: [mockColumn],
}

const mockCard = {
  id: 1069482295,
  status: 'active',
  visible_to_clients: false,
  created_at: '2022-11-18T13:42:27.150Z',
  updated_at: '2022-11-18T13:42:27.150Z',
  title: 'New and fancy UI',
  inherits_status: true,
  type: 'Kanban::Card',
  url: 'https://3.basecampapi.com/195539477/buckets/2085958499/card_tables/cards/1069482295.json',
  app_url: 'https://3.basecamp.com/195539477/buckets/2085958499/card_tables/cards/1069482295',
  bookmark_url: 'https://3.basecampapi.com/test',
  subscription_url: 'https://3.basecampapi.com/test',
  comments_count: 0,
  comments_url: 'https://3.basecampapi.com/test',
  position: 1,
  parent: {
    id: 1069482092,
    title: 'Triage',
    type: 'Kanban::Triage',
    url: 'https://3.basecampapi.com/test',
    app_url: 'https://3.basecamp.com/test',
  },
  bucket: {
    id: 2085958499,
    name: 'Test Project',
    type: 'Project',
  },
  creator: {
    id: 1049716070,
    attachable_sgid: 'test-sgid',
    name: 'Victor Cooper',
    email_address: 'victor@example.com',
    personable_type: 'User',
    title: 'Chief Strategist',
    bio: 'Test bio',
    location: 'Chicago, IL',
    created_at: '2022-11-18T09:50:54.566Z',
    updated_at: '2022-11-18T09:50:54.760Z',
    admin: true,
    owner: true,
    client: false,
    employee: true,
    time_zone: 'America/Chicago',
    avatar_url: 'https://example.com/avatar.jpg',
    can_manage_projects: true,
    can_manage_people: true,
  },
  description: 'Design a new and fancy UI',
  completed: false,
  content: 'Design a new and fancy UI',
  due_on: null,
  assignees: [],
  completion_subscribers: [],
  completion_url: 'https://3.basecampapi.com/test',
  comment_count: 0,
}

export const handlers = [
  http.post(`${OAUTH_BASE}/authorization/token`, () => {
    return HttpResponse.json({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
    })
  }),

  http.get(`${OAUTH_BASE}/authorization.json`, () => {
    return HttpResponse.json({
      expires_at: '2025-12-31T23:59:59Z',
      identity: {
        id: 1,
        first_name: 'Test',
        last_name: 'User',
        email_address: 'test@example.com',
      },
      accounts: [
        {
          id: 99999999,
          name: 'Test Account',
          product: 'bc3',
          href: 'https://3.basecampapi.com/99999999',
          app_href: 'https://3.basecamp.com/99999999',
        },
      ],
    })
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/projects.json`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Project',
        description: 'A test project',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        dock: [],
      },
    ])
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/projects/:id.json`, ({ params }) => {
    if (params.id === 'recordings') {
      return HttpResponse.json([
        {
          id: 1,
          title: 'Recording',
          type: 'Todo',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
    }
    const projectId = Number(params.id)
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return HttpResponse.json({ error: 'Invalid project ID' }, { status: 404 })
    }

    if (projectId === 999) {
      return HttpResponse.json({
        id: projectId,
        name: 'Project Without Tools',
        description: 'No schedule or card table',
        status: 'active',
        purpose: 'topic',
        clients_enabled: false,
        created_at: '2022-11-18T09:50:54.566Z',
        updated_at: '2022-11-18T09:50:54.760Z',
        bookmark_url: 'https://3.basecampapi.com/test',
        url: `https://3.basecampapi.com/195539477/projects/${projectId}.json`,
        app_url: `https://3.basecamp.com/195539477/projects/${projectId}`,
        bookmarked: false,
        dock: [],
      })
    }

    if (projectId === 2085958499) {
      return HttpResponse.json({
        id: 2085958499,
        name: 'Test Project',
        description: 'Test Description',
        status: 'active',
        purpose: 'topic',
        clients_enabled: false,
        created_at: '2022-11-18T09:50:54.566Z',
        updated_at: '2022-11-18T09:50:54.760Z',
        bookmark_url: 'https://3.basecampapi.com/test',
        url: 'https://3.basecampapi.com/195539477/projects/2085958499.json',
        app_url: 'https://3.basecamp.com/195539477/projects/2085958499',
        bookmarked: false,
        dock: [
          {
            id: mockCardTable.id,
            title: 'Card Table',
            name: 'kanban_board',
            enabled: true,
            position: 1,
            url: mockCardTable.url,
            app_url: mockCardTable.app_url,
          },
        ],
      })
    }

    if (projectId === 1) {
      return HttpResponse.json({
        id: projectId,
        name: 'Test Project',
        description: 'Project with all tools enabled',
        status: 'active',
        purpose: 'topic',
        clients_enabled: false,
        created_at: '2022-11-18T09:50:54.566Z',
        updated_at: '2022-11-18T09:50:54.760Z',
        bookmark_url: 'https://3.basecampapi.com/test',
        url: `https://3.basecampapi.com/195539477/projects/${projectId}.json`,
        app_url: `https://3.basecamp.com/195539477/projects/${projectId}`,
        bookmarked: false,
        dock: [
          {
            id: mockVault.id,
            title: 'Docs',
            name: 'vault',
            enabled: true,
            position: 1,
            url: mockVault.url,
            app_url: mockVault.app_url,
          },
          {
            id: mockSchedule.id,
            title: 'Schedule',
            name: 'schedule',
            enabled: true,
            position: 2,
            url: mockSchedule.url,
            app_url: mockSchedule.app_url,
          },
          {
            id: 50,
            title: 'To-dos',
            name: 'todoset',
            enabled: true,
            position: 3,
            url: `https://3.basecampapi.com/195539477/buckets/${projectId}/todosets/50.json`,
            app_url: `https://3.basecamp.com/195539477/buckets/${projectId}/todosets/50`,
          },
          {
            id: 3000,
            title: 'Message Board',
            name: 'message_board',
            enabled: true,
            position: 4,
            url: `https://3.basecampapi.com/195539477/buckets/${projectId}/message_boards/3000.json`,
            app_url: `https://3.basecamp.com/195539477/buckets/${projectId}/message_boards/3000`,
          },
        ],
      })
    }

    return HttpResponse.json({
      id: projectId,
      name: `Project ${projectId}`,
      description: 'Default project',
      status: 'active',
      purpose: 'topic',
      clients_enabled: false,
      created_at: '2022-11-18T09:50:54.566Z',
      updated_at: '2022-11-18T09:50:54.760Z',
      bookmark_url: 'https://3.basecampapi.com/test',
      url: `https://3.basecampapi.com/195539477/projects/${projectId}.json`,
      app_url: `https://3.basecamp.com/195539477/projects/${projectId}`,
      bookmarked: false,
      dock: [
        {
          id: mockCardTable.id,
          title: 'Card Table',
          name: 'kanban_board',
          enabled: true,
          position: 1,
          url: mockCardTable.url,
          app_url: mockCardTable.app_url,
        },
        {
          id: mockSchedule.id,
          title: 'Schedule',
          name: 'schedule',
          enabled: true,
          position: 2,
          url: mockSchedule.url,
          app_url: mockSchedule.app_url,
        },
        {
          id: 3000,
          title: 'Message Board',
          name: 'message_board',
          enabled: true,
          position: 3,
          url: `https://3.basecampapi.com/195539477/buckets/${projectId}/message_boards/3000.json`,
          app_url: `https://3.basecamp.com/195539477/buckets/${projectId}/message_boards/3000`,
        },
      ],
    })
  }),

  http.post(`${BASECAMP_API_BASE}/:accountId/projects.json`, () => {
    return HttpResponse.json({
      id: 2,
      name: 'New Project',
      description: '',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      dock: [],
    })
  }),

  http.put(`${BASECAMP_API_BASE}/:accountId/projects/:id.json`, () => {
    return HttpResponse.json({})
  }),

  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todosets/:todosetId/todolists.json`,
    () => {
      return HttpResponse.json([
        {
          id: 1,
          name: 'Test To-Do List',
          description: 'A test to-do list',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
    },
  ),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todolists/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      name: 'Test To-Do List',
      description: 'A test to-do list',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todosets/:todosetId/todolists.json`,
    () => {
      return HttpResponse.json({
        id: 2,
        name: 'New To-Do List',
        description: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
    },
  ),

  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todolists/:listId/todos.json`,
    () => {
      return HttpResponse.json([
        {
          id: 1,
          content: 'Test to-do',
          completed: false,
          due_on: '2024-12-31',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
    },
  ),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todos/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      content: 'Test to-do',
      completed: false,
      due_on: '2024-12-31',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todolists/:listId/todos.json`,
    () => {
      return HttpResponse.json({
        id: 2,
        content: 'New to-do',
        completed: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
    },
  ),

  http.put(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todos/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      content: 'Updated to-do',
      completed: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.post(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todos/:id/completion.json`, () => {
    return HttpResponse.json({})
  }),

  http.delete(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todos/:id/completion.json`,
    () => {
      return HttpResponse.json({})
    },
  ),

  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/message_boards/:boardId/messages.json`,
    () => {
      return HttpResponse.json([
        {
          id: 1,
          subject: 'Test Message',
          content: '<p>Test message content</p>',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
    },
  ),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/messages/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      subject: 'Test Message',
      content: '<p>Test message content</p>',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/message_boards/:boardId/messages.json`,
    () => {
      return HttpResponse.json({
        id: 2,
        subject: 'New Message',
        content: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
    },
  ),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/chats/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      title: 'Test Campfire',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/chats/:chatId/lines.json`, () => {
    return HttpResponse.json([
      {
        id: 1,
        content: 'Test campfire line',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  http.post(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/chats/:chatId/lines.json`, () => {
    return HttpResponse.json({
      id: 2,
      content: 'New campfire line',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/people.json`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test User',
        email_address: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/projects/:projectId/people.json`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Project User',
        email_address: 'project@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/people/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      name: 'Test User',
      email_address: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/my/profile.json`, () => {
    return HttpResponse.json({
      id: 1,
      name: 'Current User',
      email_address: 'me@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:recordingId/comments.json`,
    () => {
      return HttpResponse.json([
        {
          id: 1,
          status: 'active',
          visible_to_clients: true,
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          title: 'Comment',
          inherits_status: false,
          type: 'Comment',
          url: 'https://3.basecampapi.com/:accountId/comments/1.json',
          app_url: 'https://basecamp.com/:accountId/projects/999/comments/1',
          parent: {
            id: 888,
            title: 'Recording',
            type: 'Todo',
            url: 'https://3.basecampapi.com/:accountId/todos/888.json',
            app_url: 'https://basecamp.com/:accountId/projects/999/todos/888',
          },
          bucket: {
            id: 999,
            name: 'Test Project',
            type: 'Project',
          },
          creator: {
            id: 1,
            attachable_sgid: 'sgid-123',
            name: 'John Doe',
            email_address: 'john@example.com',
            personable_type: 'User',
            title: 'Developer',
            bio: null,
            location: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            admin: false,
            owner: false,
            client: false,
            employee: true,
            time_zone: 'UTC',
            avatar_url: 'https://example.com/avatar.jpg',
            can_manage_projects: false,
            can_manage_people: false,
          },
          content: 'This is a test comment',
        },
      ])
    },
  ),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/comments/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      status: 'active',
      visible_to_clients: true,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      title: 'Comment',
      inherits_status: false,
      type: 'Comment',
      url: 'https://3.basecampapi.com/:accountId/comments/1.json',
      app_url: 'https://basecamp.com/:accountId/projects/999/comments/1',
      parent: {
        id: 888,
        title: 'Recording',
        type: 'Todo',
        url: 'https://3.basecampapi.com/:accountId/todos/888.json',
        app_url: 'https://basecamp.com/:accountId/projects/999/todos/888',
      },
      bucket: {
        id: 999,
        name: 'Test Project',
        type: 'Project',
      },
      creator: {
        id: 1,
        attachable_sgid: 'sgid-123',
        name: 'John Doe',
        email_address: 'john@example.com',
        personable_type: 'User',
        title: 'Developer',
        bio: null,
        location: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        admin: false,
        owner: false,
        client: false,
        employee: true,
        time_zone: 'UTC',
        avatar_url: 'https://example.com/avatar.jpg',
        can_manage_projects: false,
        can_manage_people: false,
      },
      content: 'This is a test comment',
    })
  }),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:recordingId/comments.json`,
    () => {
      return HttpResponse.json({
        id: 2,
        status: 'active',
        visible_to_clients: true,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        title: 'Comment',
        inherits_status: false,
        type: 'Comment',
        url: 'https://3.basecampapi.com/:accountId/comments/2.json',
        app_url: 'https://basecamp.com/:accountId/projects/999/comments/2',
        parent: {
          id: 888,
          title: 'Recording',
          type: 'Todo',
          url: 'https://3.basecampapi.com/:accountId/todos/888.json',
          app_url: 'https://basecamp.com/:accountId/projects/999/todos/888',
        },
        bucket: {
          id: 999,
          name: 'Test Project',
          type: 'Project',
        },
        creator: {
          id: 1,
          attachable_sgid: 'sgid-123',
          name: 'John Doe',
          email_address: 'john@example.com',
          personable_type: 'User',
          title: 'Developer',
          bio: null,
          location: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          admin: false,
          owner: false,
          client: false,
          employee: true,
          time_zone: 'UTC',
          avatar_url: 'https://example.com/avatar.jpg',
          can_manage_projects: false,
          can_manage_people: false,
        },
        content: 'New test comment',
      })
    },
  ),

  http.put(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/comments/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      status: 'active',
      visible_to_clients: true,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T11:00:00Z',
      title: 'Comment',
      inherits_status: false,
      type: 'Comment',
      url: 'https://3.basecampapi.com/:accountId/comments/1.json',
      app_url: 'https://basecamp.com/:accountId/projects/999/comments/1',
      parent: {
        id: 888,
        title: 'Recording',
        type: 'Todo',
        url: 'https://3.basecampapi.com/:accountId/todos/888.json',
        app_url: 'https://basecamp.com/:accountId/projects/999/todos/888',
      },
      bucket: {
        id: 999,
        name: 'Test Project',
        type: 'Project',
      },
      creator: {
        id: 1,
        attachable_sgid: 'sgid-123',
        name: 'John Doe',
        email_address: 'john@example.com',
        personable_type: 'User',
        title: 'Developer',
        bio: null,
        location: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        admin: false,
        owner: false,
        client: false,
        employee: true,
        time_zone: 'UTC',
        avatar_url: 'https://example.com/avatar.jpg',
        can_manage_projects: false,
        can_manage_people: false,
      },
      content: 'Updated comment content',
    })
  }),

  http.delete(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/comments/:id.json`, () => {
    return HttpResponse.json({})
  }),

  // Card Tables
  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/:id.json`, () => {
    return HttpResponse.json(mockCardTable)
  }),

  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/columns/:id.json`,
    () => {
      return HttpResponse.json(mockColumn)
    },
  ),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/:tableId/columns.json`,
    () => {
      return HttpResponse.json(mockColumn)
    },
  ),

  http.put(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/columns/:id.json`,
    async ({ request }) => {
      const updates = (await request.json()) as { title?: string; description?: string }
      return HttpResponse.json({
        ...mockColumn,
        title: updates.title ?? mockColumn.title,
        description: updates.description ?? mockColumn.description,
      })
    },
  ),

  http.delete(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/columns/:id.json`,
    () => {
      return HttpResponse.json({})
    },
  ),

  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/lists/:columnId/cards.json`,
    () => {
      return HttpResponse.json([mockCard])
    },
  ),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/cards/:id.json`, () => {
    return HttpResponse.json(mockCard)
  }),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/lists/:columnId/cards.json`,
    () => {
      return HttpResponse.json(mockCard)
    },
  ),

  http.put(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/cards/:id.json`,
    async ({ request }) => {
      const updates = (await request.json()) as {
        title?: string
        content?: string
        due_on?: string | null
      }
      return HttpResponse.json({
        ...mockCard,
        title: updates.title ?? mockCard.title,
        content: updates.content ?? mockCard.content,
        due_on: updates.due_on ?? mockCard.due_on,
      })
    },
  ),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/cards/:id/moves.json`,
    () => {
      return HttpResponse.json({})
    },
  ),

  http.delete(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/card_tables/cards/:id.json`,
    () => {
      return HttpResponse.json({})
    },
  ),

  // Schedules
  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/schedules/:id.json`,
    ({ params }) => {
      const projectId = Number(params.projectId)
      if (!Number.isFinite(projectId) || projectId <= 0) {
        return HttpResponse.json({ error: 'Invalid project ID' }, { status: 404 })
      }
      if (projectId === 999) {
        return HttpResponse.json({ error: 'Schedule not enabled' }, { status: 404 })
      }
      return HttpResponse.json(mockSchedule)
    },
  ),

  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/schedules/:scheduleId/entries.json`,
    () => {
      return HttpResponse.json([mockScheduleEntry])
    },
  ),

  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/schedule_entries/:id.json`,
    ({ params }) => {
      const entryId = Number(params.id)
      if (!Number.isFinite(entryId) || entryId <= 0) {
        return HttpResponse.json({ error: 'Invalid entry ID' }, { status: 404 })
      }
      return HttpResponse.json(mockScheduleEntry)
    },
  ),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/schedules/:scheduleId/entries.json`,
    async ({ params, request }) => {
      const projectId = Number(params.projectId)
      if (projectId === 999) {
        return HttpResponse.json({ error: 'Schedule not enabled' }, { status: 404 })
      }
      const payload = (await request.json()) as {
        summary?: string
        description?: string
        starts_at?: string
        ends_at?: string
        all_day?: boolean
        participant_ids?: number[]
      }

      if (!payload.summary) {
        return HttpResponse.json({ error: 'Missing summary' }, { status: 422 })
      }

      const participants = (payload.participant_ids ?? []).map((id) => ({
        id,
        name: `Participant ${id}`,
        email_address: `participant-${id}@example.com`,
      }))

      return HttpResponse.json({
        ...mockScheduleEntry,
        id: 2,
        summary: payload.summary,
        description: payload.description ?? mockScheduleEntry.description,
        starts_at: payload.starts_at ?? mockScheduleEntry.starts_at,
        ends_at: payload.ends_at ?? mockScheduleEntry.ends_at,
        all_day: payload.all_day ?? false,
        participants,
      })
    },
  ),

  http.put(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/schedule_entries/:id.json`,
    async ({ request, params }) => {
      const entryId = Number(params.id)
      if (!Number.isFinite(entryId) || entryId <= 0) {
        return HttpResponse.json({ error: 'Invalid entry ID' }, { status: 404 })
      }
      const updates = (await request.json()) as {
        summary?: string
        description?: string
        starts_at?: string
        ends_at?: string
        all_day?: boolean
        participant_ids?: number[]
      }

      const participants = updates.participant_ids
        ? updates.participant_ids.map((id) => ({
            id,
            name: `Participant ${id}`,
            email_address: `participant-${id}@example.com`,
          }))
        : mockScheduleEntry.participants

      return HttpResponse.json({
        ...mockScheduleEntry,
        summary: updates.summary ?? mockScheduleEntry.summary,
        description: updates.description ?? mockScheduleEntry.description,
        starts_at: updates.starts_at ?? mockScheduleEntry.starts_at,
        ends_at: updates.ends_at ?? mockScheduleEntry.ends_at,
        all_day: updates.all_day ?? mockScheduleEntry.all_day,
        participants,
      })
    },
  ),

  http.delete(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/schedule_entries/:id.json`,
    ({ params }) => {
      const entryId = Number(params.id)
      if (!Number.isFinite(entryId) || entryId <= 0) {
        return HttpResponse.json({ error: 'Invalid entry ID' }, { status: 404 })
      }
      return HttpResponse.json({})
    },
  ),

  // Recordings
  http.get(`${BASECAMP_API_BASE}/:accountId/projects/recordings.json`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Recording',
        type: 'Todo',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  // Move todo (reposition)
  http.put(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todos/:id/position.json`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.put(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:id/status/archived.json`,
    ({ params }) => {
      const projectId = Number(params.projectId)
      if (projectId === 999) {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return HttpResponse.json({})
    },
  ),

  http.put(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:id/status/active.json`,
    ({ params }) => {
      const projectId = Number(params.projectId)
      if (projectId === 999) {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return HttpResponse.json({})
    },
  ),

  http.put(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:id/status/trashed.json`,
    ({ params }) => {
      const projectId = Number(params.projectId)
      if (projectId === 999) {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return HttpResponse.json({})
    },
  ),

  // Events
  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:recordingId/events.json`,
    ({ params }) => {
      const projectId = Number(params.projectId)
      const recordingId = Number(params.recordingId)
      if (projectId === 999) {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 })
      }
      if (recordingId === 999) {
        return HttpResponse.json([])
      }
      return HttpResponse.json([
        {
          id: 1,
          recording_id: 888,
          action: 'created',
          created_at: '2024-01-01T00:00:00Z',
          creator: {
            id: 1,
            name: 'Event Creator',
            email_address: 'creator@example.com',
          },
        },
      ])
    },
  ),

  // Search
  http.get(`${BASECAMP_API_BASE}/:accountId/search.json`, () => {
    return HttpResponse.json([mockSearchResult])
  }),

  // Vaults
  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/vaults/:vaultId.json`, () => {
    return HttpResponse.json(mockVault)
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/vaults/:vaultId/vaults.json`, () => {
    return HttpResponse.json([mockChildVault])
  }),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/vaults/:vaultId/vaults.json`,
    async ({ request }) => {
      const payload = (await request.json()) as { title?: string }
      return HttpResponse.json({
        ...mockChildVault,
        id: 3,
        title: payload.title ?? mockChildVault.title,
      })
    },
  ),

  http.put(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/vaults/:vaultId.json`,
    async ({ request }) => {
      const payload = (await request.json()) as { title?: string }
      return HttpResponse.json({
        ...mockVault,
        title: payload.title ?? mockVault.title,
      })
    },
  ),

  // Documents
  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/vaults/:vaultId/documents.json`,
    () => {
      return HttpResponse.json([mockDocument])
    },
  ),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/documents/:id.json`, () => {
    return HttpResponse.json(mockDocument)
  }),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/vaults/:vaultId/documents.json`,
    async ({ request }) => {
      const payload = (await request.json()) as {
        title?: string
        content?: string
        status?: string
      }
      return HttpResponse.json({
        ...mockDocument,
        id: 5002,
        title: payload.title ?? mockDocument.title,
        content: payload.content ?? mockDocument.content,
        status: payload.status ?? mockDocument.status,
      })
    },
  ),

  http.put(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/documents/:id.json`,
    async ({ request }) => {
      const payload = (await request.json()) as {
        title?: string
        content?: string
        status?: string
      }
      return HttpResponse.json({
        ...mockDocument,
        title: payload.title ?? mockDocument.title,
        content: payload.content ?? mockDocument.content,
        status: payload.status ?? mockDocument.status,
      })
    },
  ),

  // Uploads
  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/vaults/:vaultId/uploads.json`,
    () => {
      return HttpResponse.json([
        {
          id: 1,
          filename: 'file.txt',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
    },
  ),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/uploads/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      filename: 'file.txt',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/vaults/:vaultId/uploads.json`,
    () => {
      return HttpResponse.json({
        id: 2,
        filename: 'newfile.txt',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
    },
  ),

  http.put(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/uploads/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      filename: 'updated.txt',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  // Webhooks
  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/webhooks.json`, () => {
    return HttpResponse.json([
      {
        id: 1,
        payload_url: 'https://example.com/webhook',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  http.get(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/webhooks/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      payload_url: 'https://example.com/webhook',
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.post(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/webhooks.json`, () => {
    return HttpResponse.json({
      id: 2,
      payload_url: 'https://example.com/webhook2',
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.put(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/webhooks/:id.json`, () => {
    return HttpResponse.json({
      id: 1,
      payload_url: 'https://example.com/webhook',
      active: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.delete(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/webhooks/:id.json`, () => {
    return HttpResponse.json({})
  }),

  http.post(`${BASECAMP_API_BASE}/:accountId/buckets/:projectId/webhooks/:id/test.json`, () => {
    return HttpResponse.json({})
  }),

  // Todo Groups
  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todolists/:todolistId/groups.json`,
    () => {
      return HttpResponse.json([
        {
          id: 1,
          name: 'Group',
          position: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
    },
  ),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/todolists/:todolistId/groups.json`,
    () => {
      return HttpResponse.json({
        id: 2,
        name: 'New Group',
        position: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
    },
  ),

  // Subscriptions
  http.get(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:recordingId/subscriptions.json`,
    () => {
      return HttpResponse.json({
        subscribed: true,
        created_at: '2024-01-01T00:00:00Z',
      })
    },
  ),

  http.post(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:recordingId/subscription.json`,
    () => {
      return HttpResponse.json({
        subscribed: true,
        created_at: '2024-01-01T00:00:00Z',
      })
    },
  ),

  http.delete(
    `${BASECAMP_API_BASE}/:accountId/buckets/:projectId/recordings/:recordingId/subscription.json`,
    () => {
      return HttpResponse.json({})
    },
  ),
]
