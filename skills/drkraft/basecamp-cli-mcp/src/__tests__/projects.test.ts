import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { createProject, getProject, listProjects } from '../lib/api.js'
import { server } from './setup'

const mockProject = {
  id: 1,
  status: 'active',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z',
  name: 'Test Project',
  description: 'A test project description',
  purpose: 'topic',
  clients_enabled: false,
  bookmark_url: 'https://3.basecampapi.com/99999999/my/bookmarks/xxx.json',
  url: 'https://3.basecampapi.com/99999999/projects/1.json',
  app_url: 'https://3.basecamp.com/99999999/projects/1',
  dock: [
    {
      id: 10,
      title: 'Campfire',
      name: 'chat',
      enabled: true,
      position: 1,
    },
    {
      id: 11,
      title: 'Message Board',
      name: 'message_board',
      enabled: true,
      position: 2,
    },
    {
      id: 12,
      title: 'To-dos',
      name: 'todoset',
      enabled: true,
      position: 3,
    },
    {
      id: 13,
      title: 'Schedule',
      name: 'schedule',
      enabled: true,
      position: 4,
    },
  ],
  bookmarked: false,
}

const mockProjects = [
  mockProject,
  {
    ...mockProject,
    id: 2,
    name: 'WEDU - Marc Cassaigneau',
    description: 'Projet principal',
  },
  {
    ...mockProject,
    id: 3,
    name: 'Client - Conforma',
    description: 'Mission RGPD',
    status: 'active',
  },
  {
    ...mockProject,
    id: 4,
    name: 'Archived Project',
    description: 'Old project',
    status: 'archived',
  },
]

describe('Projects API', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  describe('listProjects', () => {
    it('should list all active projects', async () => {
      server.use(
        http.get(`https://3.basecampapi.com/:accountId/projects.json`, () => {
          return HttpResponse.json(mockProjects.filter((p) => p.status === 'active'))
        }),
      )

      const projects = await listProjects()

      expect(projects.length).toBeGreaterThan(0)
      expect(projects.every((p) => p.status === 'active')).toBe(true)
    })

    it('should return project with dock information', async () => {
      server.use(
        http.get(`https://3.basecampapi.com/:accountId/projects.json`, () => {
          return HttpResponse.json([mockProject])
        }),
      )

      const projects = await listProjects()

      expect(projects[0].dock).toBeDefined()
      expect(projects[0].dock.length).toBe(4)
      expect(projects[0].dock[0].name).toBe('chat')
    })

    it('should handle empty project list', async () => {
      server.use(
        http.get(`https://3.basecampapi.com/:accountId/projects.json`, () => {
          return HttpResponse.json([])
        }),
      )

      const projects = await listProjects()

      expect(projects).toHaveLength(0)
    })
  })

  describe('getProject', () => {
    it('should get a single project with full details', async () => {
      server.use(
        http.get(`https://3.basecampapi.com/:accountId/projects/:projectId.json`, () => {
          return HttpResponse.json(mockProject)
        }),
      )

      const project = await getProject(mockProject.id)

      expect(project.id).toBe(mockProject.id)
      expect(project.name).toBe('Test Project')
      expect(project.description).toBe('A test project description')
      expect(project.dock).toHaveLength(4)
    })

    it('should handle project not found', async () => {
      server.use(
        http.get(`https://3.basecampapi.com/:accountId/projects/:projectId.json`, () => {
          return new HttpResponse(null, { status: 404 })
        }),
      )

      await expect(getProject(9999)).rejects.toThrow()
    })
  })

  describe('createProject', () => {
    it('should create a new project', async () => {
      server.use(
        http.post(`https://3.basecampapi.com/:accountId/projects.json`, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(
            {
              ...mockProject,
              id: 100,
              name: body.name,
              description: body.description,
            },
            { status: 201 },
          )
        }),
      )

      const project = await createProject('New Project', 'Project description')

      expect(project.id).toBe(100)
      expect(project.name).toBe('New Project')
      expect(project.description).toBe('Project description')
    })

    it('should create project with minimal data', async () => {
      server.use(
        http.post(`https://3.basecampapi.com/:accountId/projects.json`, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(
            {
              ...mockProject,
              id: 101,
              name: body.name,
              description: '',
            },
            { status: 201 },
          )
        }),
      )

      const project = await createProject('Minimal Project')

      expect(project.id).toBe(101)
      expect(project.name).toBe('Minimal Project')
    })
  })
})

describe('Projects Edge Cases', () => {
  it('should handle special characters in project name', async () => {
    const specialName = 'Client - Société "ABC" & Co'

    server.use(
      http.post(`https://3.basecampapi.com/:accountId/projects.json`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            ...mockProject,
            id: 200,
            name: body.name,
          },
          { status: 201 },
        )
      }),
    )

    const project = await createProject(specialName)

    expect(project.name).toBe(specialName)
  })

  it('should handle unicode in project names', async () => {
    const unicodeName = '🧪 TEST - Basecamp CLI'

    server.use(
      http.post(`https://3.basecampapi.com/:accountId/projects.json`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            ...mockProject,
            id: 201,
            name: body.name,
          },
          { status: 201 },
        )
      }),
    )

    const project = await createProject(unicodeName)

    expect(project.name).toBe(unicodeName)
  })
})
