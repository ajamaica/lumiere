import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  completeTodo,
  createTodo,
  deleteTodo,
  getTodo,
  listTodos,
  moveTodo,
  uncompleteTodo,
  updateTodo,
} from '../lib/api.js'
import { server } from './setup'

const ACCOUNT_ID = 99999999
const PROJECT_ID = 1
const TODOLIST_ID = 100

const mockTodo = {
  id: 1001,
  status: 'active',
  visible_to_clients: false,
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z',
  title: 'Test Todo',
  inherits_status: true,
  type: 'Todo',
  content: 'Test Todo Content',
  description: '',
  completed: false,
  due_on: '2024-02-01',
  starts_on: null,
  assignees: [
    {
      id: 1,
      name: 'Test User',
      email_address: 'test@example.com',
    },
  ],
  completion_subscribers: [],
  parent: {
    id: TODOLIST_ID,
    title: 'Test Todolist',
    type: 'Todolist',
  },
  bucket: {
    id: PROJECT_ID,
    name: 'Test Project',
    type: 'Project',
  },
  creator: {
    id: 1,
    name: 'Test User',
    email_address: 'test@example.com',
  },
}

const mockTodos = [
  mockTodo,
  {
    ...mockTodo,
    id: 1002,
    content: 'Second Todo',
    completed: true,
  },
  {
    ...mockTodo,
    id: 1003,
    content: 'Third Todo',
    due_on: null,
  },
]

describe('Todos API', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  describe('listTodos', () => {
    it('should list todos in a todolist', async () => {
      server.use(
        http.get(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todolists/:todolistId/todos.json`,
          () => {
            return HttpResponse.json(mockTodos)
          },
        ),
      )

      const todos = await listTodos(PROJECT_ID, TODOLIST_ID)

      expect(todos).toHaveLength(3)
      expect(todos[0].content).toBe('Test Todo Content')
      expect(todos[1].completed).toBe(true)
    })

    it('should handle empty todolist', async () => {
      server.use(
        http.get(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todolists/:todolistId/todos.json`,
          () => {
            return HttpResponse.json([])
          },
        ),
      )

      const todos = await listTodos(PROJECT_ID, TODOLIST_ID)

      expect(todos).toHaveLength(0)
    })

    it('should include completed todos when requested', async () => {
      server.use(
        http.get(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todolists/:todolistId/todos.json`,
          ({ request }) => {
            const url = new URL(request.url)
            const completed = url.searchParams.get('completed')
            if (completed === 'true') {
              return HttpResponse.json(mockTodos.filter((t) => t.completed))
            }
            return HttpResponse.json(mockTodos.filter((t) => !t.completed))
          },
        ),
      )

      const activeTodos = await listTodos(PROJECT_ID, TODOLIST_ID)
      expect(activeTodos.every((t) => !t.completed)).toBe(true)
    })
  })

  describe('getTodo', () => {
    it('should get a single todo', async () => {
      server.use(
        http.get(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todos/:todoId.json`,
          () => {
            return HttpResponse.json(mockTodo)
          },
        ),
      )

      const todo = await getTodo(PROJECT_ID, mockTodo.id)

      expect(todo.id).toBe(mockTodo.id)
      expect(todo.content).toBe('Test Todo Content')
      expect(todo.due_on).toBe('2024-02-01')
    })

    it('should handle todo not found', async () => {
      server.use(
        http.get(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todos/:todoId.json`,
          () => {
            return new HttpResponse(null, { status: 404 })
          },
        ),
      )

      await expect(getTodo(PROJECT_ID, 9999)).rejects.toThrow()
    })
  })

  describe('createTodo', () => {
    it('should create a new todo', async () => {
      server.use(
        http.post(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todolists/:todolistId/todos.json`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>
            return HttpResponse.json(
              {
                ...mockTodo,
                id: 2001,
                content: body.content,
                description: body.description,
                due_on: body.due_on,
              },
              { status: 201 },
            )
          },
        ),
      )

      const todo = await createTodo(PROJECT_ID, TODOLIST_ID, 'New Todo', {
        description: 'Description here',
        due_on: '2024-03-01',
        assignee_ids: [1],
      })

      expect(todo.id).toBe(2001)
      expect(todo.content).toBe('New Todo')
      expect(todo.due_on).toBe('2024-03-01')
    })

    it('should create todo with minimal data', async () => {
      server.use(
        http.post(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todolists/:todolistId/todos.json`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>
            return HttpResponse.json(
              {
                ...mockTodo,
                id: 2002,
                content: body.content,
              },
              { status: 201 },
            )
          },
        ),
      )

      const todo = await createTodo(PROJECT_ID, TODOLIST_ID, 'Simple Todo')

      expect(todo.id).toBe(2002)
      expect(todo.content).toBe('Simple Todo')
    })
  })

  describe('updateTodo', () => {
    it('should update a todo', async () => {
      server.use(
        http.put(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todos/:todoId.json`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>
            return HttpResponse.json({
              ...mockTodo,
              content: body.content,
              due_on: body.due_on,
            })
          },
        ),
      )

      const todo = await updateTodo(PROJECT_ID, mockTodo.id, {
        content: 'Updated Content',
        due_on: '2024-04-01',
      })

      expect(todo.content).toBe('Updated Content')
      expect(todo.due_on).toBe('2024-04-01')
    })

    it('should clear due date when set to null', async () => {
      server.use(
        http.put(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todos/:todoId.json`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>
            return HttpResponse.json({
              ...mockTodo,
              content: body.content,
              due_on: body.due_on ?? null,
            })
          },
        ),
      )

      const todo = await updateTodo(PROJECT_ID, mockTodo.id, {
        content: 'Updated Content',
        due_on: undefined,
      })

      expect(todo.due_on).toBeNull()
    })
  })

  describe('completeTodo', () => {
    it('should mark a todo as complete', async () => {
      server.use(
        http.post(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todos/:todoId/completion.json`,
          () => {
            return new HttpResponse(null, { status: 204 })
          },
        ),
      )

      await expect(completeTodo(PROJECT_ID, mockTodo.id)).resolves.not.toThrow()
    })
  })

  describe('uncompleteTodo', () => {
    it('should mark a todo as incomplete', async () => {
      server.use(
        http.delete(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todos/:todoId/completion.json`,
          () => {
            return new HttpResponse(null, { status: 204 })
          },
        ),
      )

      await expect(uncompleteTodo(PROJECT_ID, mockTodo.id)).resolves.not.toThrow()
    })
  })

  describe('deleteTodo', () => {
    it('should trash a todo', async () => {
      server.use(
        http.put(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/recordings/:recordingId/status/trashed.json`,
          () => {
            return new HttpResponse(null, { status: 204 })
          },
        ),
      )

      await expect(deleteTodo(PROJECT_ID, mockTodo.id)).resolves.not.toThrow()
    })
  })

  describe('moveTodo', () => {
    it('should move a todo to another list', async () => {
      const targetListId = 200

      server.use(
        http.put(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todos/:todoId/position.json`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>
            expect(body.parent_id).toBe(targetListId)
            expect(body.position).toBe(1)
            return new HttpResponse(null, { status: 204 })
          },
        ),
      )

      await expect(moveTodo(PROJECT_ID, mockTodo.id, targetListId)).resolves.not.toThrow()
    })

    it('should move a todo to specific position', async () => {
      const targetListId = 200
      const position = 5

      server.use(
        http.put(
          `https://3.basecampapi.com/:accountId/buckets/:projectId/todos/:todoId/position.json`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>
            expect(body.parent_id).toBe(targetListId)
            expect(body.position).toBe(position)
            return new HttpResponse(null, { status: 204 })
          },
        ),
      )

      await expect(moveTodo(PROJECT_ID, mockTodo.id, targetListId, position)).resolves.not.toThrow()
    })
  })
})

describe('Todos Edge Cases', () => {
  it('should handle special characters in todo content', async () => {
    const specialContent = 'Todo with émojis 🎉 & "quotes" <html>'

    server.use(
      http.post(
        `https://3.basecampapi.com/:accountId/buckets/:projectId/todolists/:todolistId/todos.json`,
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(
            {
              ...mockTodo,
              id: 3001,
              content: body.content,
            },
            { status: 201 },
          )
        },
      ),
    )

    const todo = await createTodo(PROJECT_ID, TODOLIST_ID, specialContent)

    expect(todo.content).toBe(specialContent)
  })
})
