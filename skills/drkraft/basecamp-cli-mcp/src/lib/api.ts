import chalk from 'chalk'
import got, { Got, HTTPError, Options } from 'got'

import type {
  BasecampCampfire,
  BasecampCampfireLine,
  BasecampCard,
  BasecampCardTable,
  BasecampColumn,
  BasecampComment,
  BasecampDock,
  BasecampDocument,
  BasecampEvent,
  BasecampMessage,
  BasecampPerson,
  BasecampProject,
  BasecampRecording,
  BasecampSchedule,
  BasecampScheduleEntry,
  BasecampSearchResult,
  BasecampSubscription,
  BasecampTodo,
  BasecampTodoList,
  BasecampTodolistGroup,
  BasecampUpload,
  BasecampVault,
} from '../types/index.js'
import { getValidAccessToken } from './auth.js'
import { getCurrentAccountId } from './config.js'

const USER_AGENT = '@drkraft/basecamp-cli (contact@drkraft.com)'

/**
 * Parse RFC5988 Link header to extract the "next" page URL
 * Example: Link: <https://3.basecampapi.com/999999999/projects.json?page=2>; rel="next"
 */
function parseNextLink(linkHeader: string | undefined): string | null {
  if (!linkHeader) return null

  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match ? match[1] : null
}

/**
 * Fetch all pages of a paginated API endpoint and aggregate results
 * Handles RFC5988 Link header pagination automatically
 */
async function fetchAllPages<T>(client: Got, url: string, options?: Options): Promise<T[]> {
  const allResults: T[] = []
  let nextUrl: string | null = url

  while (nextUrl) {
    const response = await client.get(nextUrl, { ...options, responseType: 'json' })
    const items = response.body as T[]
    allResults.push(...items)

    const linkHeader = response.headers.link as string | undefined
    nextUrl = parseNextLink(linkHeader)
  }

  return allResults
}

// Retry configuration for handling rate limits and server errors
function getRetryConfig() {
  return {
    limit: 3,
    methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'] as (
      | 'GET'
      | 'HEAD'
      | 'PUT'
      | 'DELETE'
      | 'OPTIONS'
      | 'TRACE'
    )[],
    statusCodes: [429, 500, 502, 503, 504],
    errorCodes: [] as string[],
    enforceRetryRules: true,
    calculateDelay: ({
      attemptCount,
      error,
      retryAfter,
      computedValue,
    }: {
      attemptCount: number
      error: unknown
      retryAfter?: number
      computedValue: number
    }) => {
      if (computedValue === 0) return 0
      const response = (error as any)?.response
      if (response?.statusCode === 429 && retryAfter !== undefined) {
        return retryAfter
      }
      return Math.pow(2, attemptCount - 1) * 1000
    },
  }
}

// Helper to extract retry delay from Retry-After header
function getRetryAfterDelay(response: any): number | undefined {
  const retryAfter = response.headers['retry-after']
  if (!retryAfter) return undefined

  // Retry-After can be in seconds or HTTP-date format
  const seconds = parseInt(retryAfter, 10)
  if (!isNaN(seconds)) {
    return seconds * 1000
  }

  // Try parsing as HTTP-date
  const retryDate = new Date(retryAfter)
  if (!isNaN(retryDate.getTime())) {
    return Math.max(0, retryDate.getTime() - Date.now())
  }

  return undefined
}

async function createClient(): Promise<Got> {
  const accessToken = await getValidAccessToken()
  const accountId = getCurrentAccountId()

  if (!accountId) {
    throw new Error('No account selected. Please run: basecamp account set <id>')
  }

  return got.extend({
    prefixUrl: `https://3.basecampapi.com/${accountId}/`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
    },
    responseType: 'json',
    retry: getRetryConfig(),
    hooks: {
      beforeRetry: [
        (error) => {
          const response = (error as any).response
          const retryCount = (error as any).request?.retryCount ?? 1
          if (response && response.statusCode === 429) {
            const retryAfter = getRetryAfterDelay(response)
            if (retryAfter !== undefined) {
              console.error(
                chalk.yellow(
                  `Rate limited. Retrying after ${Math.ceil(retryAfter / 1000)}s (attempt ${retryCount})`,
                ),
              )
            } else {
              console.error(
                chalk.yellow(
                  `Rate limited. Retrying with exponential backoff (attempt ${retryCount})`,
                ),
              )
            }
          } else if (response && [500, 502, 503, 504].includes(response.statusCode)) {
            console.error(
              chalk.yellow(
                `Server error (${response.statusCode}). Retrying with exponential backoff (attempt ${retryCount})`,
              ),
            )
          }
        },
      ],
      beforeError: [
        (error) => {
          if (error instanceof HTTPError) {
            const { response } = error
            if (response.statusCode === 429) {
              console.error(
                chalk.red('Rate limited. Max retries exceeded. Please wait and try again.'),
              )
            } else if (response.statusCode === 401) {
              console.error(chalk.red('Authentication failed. Please run: basecamp auth login'))
            } else if (response.statusCode === 404) {
              console.error(chalk.red('Resource not found.'))
            } else if ([500, 502, 503, 504].includes(response.statusCode)) {
              console.error(
                chalk.red(`Server error (${response.statusCode}). Max retries exceeded.`),
              )
            }
          }
          return error
        },
      ],
    },
  })
}

// Projects
export async function listProjects(): Promise<BasecampProject[]> {
  const client = await createClient()
  return fetchAllPages<BasecampProject>(client, 'projects.json')
}

export async function getProject(projectId: number): Promise<BasecampProject> {
  const client = await createClient()
  const response = await client.get(`projects/${projectId}.json`).json<BasecampProject>()
  return response
}

export async function createProject(name: string, description?: string): Promise<BasecampProject> {
  const client = await createClient()
  const response = await client
    .post('projects.json', {
      json: { name, description },
    })
    .json<BasecampProject>()
  return response
}

export async function archiveProject(projectId: number): Promise<void> {
  const client = await createClient()
  await client.put(`projects/${projectId}.json`, {
    json: { status: 'archived' },
  })
}

// Todo Lists
export async function listTodoLists(projectId: number): Promise<BasecampTodoList[]> {
  const client = await createClient()
  const project = await getProject(projectId)
  const todosetDock = project.dock.find((d: BasecampDock) => d.name === 'todoset')

  if (!todosetDock) {
    throw new Error('To-do lists not enabled for this project')
  }

  const todosetId = todosetDock.id
  return fetchAllPages<BasecampTodoList>(
    client,
    `buckets/${projectId}/todosets/${todosetId}/todolists.json`,
  )
}

export async function getTodoList(
  projectId: number,
  todolistId: number,
): Promise<BasecampTodoList> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/todolists/${todolistId}.json`)
    .json<BasecampTodoList>()
  return response
}

export async function createTodoList(
  projectId: number,
  name: string,
  description?: string,
): Promise<BasecampTodoList> {
  const client = await createClient()
  const project = await getProject(projectId)
  const todosetDock = project.dock.find((d: BasecampDock) => d.name === 'todoset')

  if (!todosetDock) {
    throw new Error('To-do lists not enabled for this project')
  }

  const todosetId = todosetDock.id
  const response = await client
    .post(`buckets/${projectId}/todosets/${todosetId}/todolists.json`, {
      json: { name, description },
    })
    .json<BasecampTodoList>()
  return response
}

// Todos
export async function listTodos(
  projectId: number,
  todolistId: number,
  completed?: boolean,
): Promise<BasecampTodo[]> {
  const client = await createClient()
  const params = completed !== undefined ? `?completed=${completed}` : ''
  return fetchAllPages<BasecampTodo>(
    client,
    `buckets/${projectId}/todolists/${todolistId}/todos.json${params}`,
  )
}

export async function getTodo(projectId: number, todoId: number): Promise<BasecampTodo> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/todos/${todoId}.json`)
    .json<BasecampTodo>()
  return response
}

export async function createTodo(
  projectId: number,
  todolistId: number,
  content: string,
  options?: {
    description?: string
    assignee_ids?: number[]
    due_on?: string
    starts_on?: string
  },
): Promise<BasecampTodo> {
  const client = await createClient()
  const response = await client
    .post(`buckets/${projectId}/todolists/${todolistId}/todos.json`, {
      json: { content, ...options },
    })
    .json<BasecampTodo>()
  return response
}

export async function updateTodo(
  projectId: number,
  todoId: number,
  updates: {
    content?: string
    description?: string
    assignee_ids?: number[]
    due_on?: string | null
    starts_on?: string | null
  },
): Promise<BasecampTodo> {
  const client = await createClient()
  const response = await client
    .put(`buckets/${projectId}/todos/${todoId}.json`, {
      json: updates,
    })
    .json<BasecampTodo>()
  return response
}

export async function completeTodo(projectId: number, todoId: number): Promise<void> {
  const client = await createClient()
  await client.post(`buckets/${projectId}/todos/${todoId}/completion.json`)
}

export async function uncompleteTodo(projectId: number, todoId: number): Promise<void> {
  const client = await createClient()
  await client.delete(`buckets/${projectId}/todos/${todoId}/completion.json`)
}

export async function moveTodo(
  projectId: number,
  todoId: number,
  targetListId: number,
  position: number = 1,
): Promise<void> {
  const client = await createClient()
  await client.put(`buckets/${projectId}/todos/${todoId}/position.json`, {
    json: {
      position,
      parent_id: targetListId,
    },
  })
}

// Todolist Groups
export async function listTodolistGroups(
  projectId: number,
  todolistId: number,
): Promise<BasecampTodolistGroup[]> {
  const client = await createClient()
  return fetchAllPages<BasecampTodolistGroup>(
    client,
    `buckets/${projectId}/todolists/${todolistId}/groups.json`,
  )
}

export async function createTodolistGroup(
  projectId: number,
  todolistId: number,
  name: string,
  color?: string,
): Promise<BasecampTodolistGroup> {
  const client = await createClient()
  const json: { name: string; color?: string } = { name }
  if (color) json.color = color
  const response = await client
    .post(`buckets/${projectId}/todolists/${todolistId}/groups.json`, {
      json,
    })
    .json<BasecampTodolistGroup>()
  return response
}

// Messages
export async function listMessages(projectId: number): Promise<BasecampMessage[]> {
  const client = await createClient()
  const project = await getProject(projectId)
  const messageboardDock = project.dock.find((d: BasecampDock) => d.name === 'message_board')

  if (!messageboardDock) {
    throw new Error('Message board not enabled for this project')
  }

  const messageboardId = messageboardDock.id
  return fetchAllPages<BasecampMessage>(
    client,
    `buckets/${projectId}/message_boards/${messageboardId}/messages.json`,
  )
}

export async function getMessage(projectId: number, messageId: number): Promise<BasecampMessage> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/messages/${messageId}.json`)
    .json<BasecampMessage>()
  return response
}

export async function createMessage(
  projectId: number,
  subject: string,
  content?: string,
): Promise<BasecampMessage> {
  const client = await createClient()
  const project = await getProject(projectId)
  const messageboardDock = project.dock.find((d: BasecampDock) => d.name === 'message_board')

  if (!messageboardDock) {
    throw new Error('Message board not enabled for this project')
  }

  const messageboardId = messageboardDock.id
  const response = await client
    .post(`buckets/${projectId}/message_boards/${messageboardId}/messages.json`, {
      json: { subject, content },
    })
    .json<BasecampMessage>()
  return response
}

// Campfires
export async function listCampfires(projectId: number): Promise<BasecampCampfire[]> {
  const client = await createClient()
  const project = await getProject(projectId)
  const campfireDock = project.dock.find((d: BasecampDock) => d.name === 'chat')

  if (!campfireDock) {
    throw new Error('Campfire not enabled for this project')
  }

  // Return the campfire as an array
  const response = await client
    .get(`buckets/${projectId}/chats/${campfireDock.id}.json`)
    .json<BasecampCampfire>()
  return [response]
}

export async function getCampfireLines(
  projectId: number,
  campfireId: number,
): Promise<BasecampCampfireLine[]> {
  const client = await createClient()
  return fetchAllPages<BasecampCampfireLine>(
    client,
    `buckets/${projectId}/chats/${campfireId}/lines.json`,
  )
}

export async function sendCampfireLine(
  projectId: number,
  campfireId: number,
  content: string,
): Promise<BasecampCampfireLine> {
  const client = await createClient()
  const response = await client
    .post(`buckets/${projectId}/chats/${campfireId}/lines.json`, {
      json: { content },
    })
    .json<BasecampCampfireLine>()
  return response
}

// People
export async function listPeople(projectId?: number): Promise<BasecampPerson[]> {
  const client = await createClient()
  const url = projectId ? `projects/${projectId}/people.json` : 'people.json'
  return fetchAllPages<BasecampPerson>(client, url)
}

export async function getPerson(personId: number): Promise<BasecampPerson> {
  const client = await createClient()
  const response = await client.get(`people/${personId}.json`).json<BasecampPerson>()
  return response
}

export async function getMe(): Promise<BasecampPerson> {
  const client = await createClient()
  const response = await client.get('my/profile.json').json<BasecampPerson>()
  return response
}

// Comments
export async function listComments(
  projectId: number,
  recordingId: number,
): Promise<BasecampComment[]> {
  const client = await createClient()
  return fetchAllPages<BasecampComment>(
    client,
    `buckets/${projectId}/recordings/${recordingId}/comments.json`,
  )
}

export async function getComment(projectId: number, commentId: number): Promise<BasecampComment> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/comments/${commentId}.json`)
    .json<BasecampComment>()
  return response
}

export async function createComment(
  projectId: number,
  recordingId: number,
  content: string,
): Promise<BasecampComment> {
  const client = await createClient()
  const response = await client
    .post(`buckets/${projectId}/recordings/${recordingId}/comments.json`, {
      json: { content },
    })
    .json<BasecampComment>()
  return response
}

export async function updateComment(
  projectId: number,
  commentId: number,
  content: string,
): Promise<BasecampComment> {
  const client = await createClient()
  const response = await client
    .put(`buckets/${projectId}/comments/${commentId}.json`, {
      json: { content },
    })
    .json<BasecampComment>()
  return response
}

export async function deleteComment(projectId: number, commentId: number): Promise<void> {
  const client = await createClient()
  await client.delete(`buckets/${projectId}/comments/${commentId}.json`)
}

// Vaults
export async function getVault(projectId: number, vaultId: number): Promise<BasecampVault> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/vaults/${vaultId}.json`)
    .json<BasecampVault>()
  return response
}

export async function listVaults(
  projectId: number,
  parentVaultId?: number,
): Promise<BasecampVault[]> {
  const client = await createClient()

  // If no parent vault ID provided, get the primary vault from the project dock
  if (!parentVaultId) {
    const project = await getProject(projectId)
    const vaultDock = project.dock.find((d: BasecampDock) => d.name === 'vault')

    if (!vaultDock) {
      throw new Error('Vault not enabled for this project')
    }

    // Return the primary vault as an array
    const vault = await getVault(projectId, vaultDock.id)
    return [vault]
  }

  // List child vaults
  return fetchAllPages<BasecampVault>(
    client,
    `buckets/${projectId}/vaults/${parentVaultId}/vaults.json`,
  )
}

export async function createVault(
  projectId: number,
  parentVaultId: number,
  title: string,
): Promise<BasecampVault> {
  const client = await createClient()
  const response = await client
    .post(`buckets/${projectId}/vaults/${parentVaultId}/vaults.json`, {
      json: { title },
    })
    .json<BasecampVault>()
  return response
}

export async function updateVault(
  projectId: number,
  vaultId: number,
  title: string,
): Promise<BasecampVault> {
  const client = await createClient()
  const response = await client
    .put(`buckets/${projectId}/vaults/${vaultId}.json`, {
      json: { title },
    })
    .json<BasecampVault>()
  return response
}

// Documents
export async function listDocuments(
  projectId: number,
  vaultId: number,
): Promise<BasecampDocument[]> {
  const client = await createClient()
  return fetchAllPages<BasecampDocument>(
    client,
    `buckets/${projectId}/vaults/${vaultId}/documents.json`,
  )
}

export async function getDocument(
  projectId: number,
  documentId: number,
): Promise<BasecampDocument> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/documents/${documentId}.json`)
    .json<BasecampDocument>()
  return response
}

export async function createDocument(
  projectId: number,
  vaultId: number,
  title: string,
  content: string,
  status?: string,
): Promise<BasecampDocument> {
  const client = await createClient()
  const payload: { title: string; content: string; status?: string } = { title, content }
  if (status) payload.status = status

  const response = await client
    .post(`buckets/${projectId}/vaults/${vaultId}/documents.json`, {
      json: payload,
    })
    .json<BasecampDocument>()
  return response
}

export async function updateDocument(
  projectId: number,
  documentId: number,
  updates: {
    title?: string
    content?: string
  },
): Promise<BasecampDocument> {
  const client = await createClient()
  const response = await client
    .put(`buckets/${projectId}/documents/${documentId}.json`, {
      json: updates,
    })
    .json<BasecampDocument>()
  return response
}

// Uploads
export async function listUploads(projectId: number, vaultId: number): Promise<BasecampUpload[]> {
  const client = await createClient()
  return fetchAllPages<BasecampUpload>(
    client,
    `buckets/${projectId}/vaults/${vaultId}/uploads.json`,
  )
}

export async function getUpload(projectId: number, uploadId: number): Promise<BasecampUpload> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/uploads/${uploadId}.json`)
    .json<BasecampUpload>()
  return response
}

export async function createUpload(
  projectId: number,
  vaultId: number,
  attachable_sgid: string,
  options?: {
    description?: string
    base_name?: string
  },
): Promise<BasecampUpload> {
  const client = await createClient()
  const payload: { attachable_sgid: string; description?: string; base_name?: string } = {
    attachable_sgid,
  }
  if (options?.description) payload.description = options.description
  if (options?.base_name) payload.base_name = options.base_name

  const response = await client
    .post(`buckets/${projectId}/vaults/${vaultId}/uploads.json`, {
      json: payload,
    })
    .json<BasecampUpload>()
  return response
}

export async function updateUpload(
  projectId: number,
  uploadId: number,
  updates: {
    description?: string
    base_name?: string
  },
): Promise<BasecampUpload> {
  const client = await createClient()
  const response = await client
    .put(`buckets/${projectId}/uploads/${uploadId}.json`, {
      json: updates,
    })
    .json<BasecampUpload>()
  return response
}

// Schedules
export async function getSchedule(projectId: number): Promise<BasecampSchedule> {
  const client = await createClient()
  const project = await getProject(projectId)
  const scheduleDock = project.dock.find((d: BasecampDock) => d.name === 'schedule')

  if (!scheduleDock) {
    throw new Error('Schedule not enabled for this project')
  }

  const scheduleId = scheduleDock.id
  const response = await client
    .get(`buckets/${projectId}/schedules/${scheduleId}.json`)
    .json<BasecampSchedule>()
  return response
}

export async function listScheduleEntries(
  projectId: number,
  status?: string,
): Promise<BasecampScheduleEntry[]> {
  const client = await createClient()
  const project = await getProject(projectId)
  const scheduleDock = project.dock.find((d: BasecampDock) => d.name === 'schedule')

  if (!scheduleDock) {
    throw new Error('Schedule not enabled for this project')
  }

  const scheduleId = scheduleDock.id
  const params = status ? `?status=${status}` : ''
  return fetchAllPages<BasecampScheduleEntry>(
    client,
    `buckets/${projectId}/schedules/${scheduleId}/entries.json${params}`,
  )
}

export async function getScheduleEntry(
  projectId: number,
  entryId: number,
): Promise<BasecampScheduleEntry> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/schedule_entries/${entryId}.json`)
    .json<BasecampScheduleEntry>()
  return response
}

export async function createScheduleEntry(
  projectId: number,
  summary: string,
  startsAt: string,
  options?: {
    description?: string
    endsAt?: string
    allDay?: boolean
    participantIds?: number[]
  },
): Promise<BasecampScheduleEntry> {
  const client = await createClient()
  const project = await getProject(projectId)
  const scheduleDock = project.dock.find((d: BasecampDock) => d.name === 'schedule')

  if (!scheduleDock) {
    throw new Error('Schedule not enabled for this project')
  }

  const scheduleId = scheduleDock.id
  const payload: any = {
    summary,
    starts_at: startsAt,
  }

  if (options?.description) payload.description = options.description
  if (options?.endsAt) payload.ends_at = options.endsAt
  if (options?.allDay !== undefined) payload.all_day = options.allDay
  if (options?.participantIds) payload.participant_ids = options.participantIds

  const response = await client
    .post(`buckets/${projectId}/schedules/${scheduleId}/entries.json`, {
      json: payload,
    })
    .json<BasecampScheduleEntry>()
  return response
}

export async function updateScheduleEntry(
  projectId: number,
  entryId: number,
  updates: {
    summary?: string
    description?: string
    starts_at?: string
    ends_at?: string
    all_day?: boolean
    participant_ids?: number[]
  },
): Promise<BasecampScheduleEntry> {
  const client = await createClient()
  const response = await client
    .put(`buckets/${projectId}/schedule_entries/${entryId}.json`, {
      json: updates,
    })
    .json<BasecampScheduleEntry>()
  return response
}

export async function deleteScheduleEntry(projectId: number, entryId: number): Promise<void> {
  const client = await createClient()
  await client.delete(`buckets/${projectId}/schedule_entries/${entryId}.json`)
}

// Search
export async function search(
  query: string,
  options?: {
    type?: string
    bucket_id?: number
    creator_id?: number
    file_type?: string
    exclude_chat?: boolean
    page?: number
    per_page?: number
  },
): Promise<BasecampSearchResult[]> {
  const client = await createClient()
  const params = new URLSearchParams()
  params.append('q', query)

  if (options?.type) params.append('type', options.type)
  if (options?.bucket_id) params.append('bucket_id', options.bucket_id.toString())
  if (options?.creator_id) params.append('creator_id', options.creator_id.toString())
  if (options?.file_type) params.append('file_type', options.file_type)
  if (options?.exclude_chat) params.append('exclude_chat', '1')
  if (options?.page) params.append('page', options.page.toString())
  if (options?.per_page) params.append('per_page', options.per_page.toString())

  return fetchAllPages<BasecampSearchResult>(client, `search.json?${params.toString()}`)
}

// Recordings
export async function listRecordings(
  type: string,
  options?: {
    bucket?: string | number[]
    status?: 'active' | 'archived' | 'trashed'
    sort?: 'created_at' | 'updated_at'
    direction?: 'asc' | 'desc'
  },
): Promise<BasecampRecording[]> {
  const client = await createClient()
  const params = new URLSearchParams()
  params.append('type', type)

  if (options?.bucket) {
    const bucketValue = Array.isArray(options.bucket) ? options.bucket.join(',') : options.bucket
    params.append('bucket', bucketValue.toString())
  }
  if (options?.status) params.append('status', options.status)
  if (options?.sort) params.append('sort', options.sort)
  if (options?.direction) params.append('direction', options.direction)

  const url = `projects/recordings.json?${params.toString()}`
  return fetchAllPages<BasecampRecording>(client, url)
}

export async function archiveRecording(projectId: number, recordingId: number): Promise<void> {
  const client = await createClient()
  await client.put(`buckets/${projectId}/recordings/${recordingId}/status/archived.json`)
}

export async function restoreRecording(projectId: number, recordingId: number): Promise<void> {
  const client = await createClient()
  await client.put(`buckets/${projectId}/recordings/${recordingId}/status/active.json`)
}

export async function trashRecording(projectId: number, recordingId: number): Promise<void> {
  const client = await createClient()
  await client.put(`buckets/${projectId}/recordings/${recordingId}/status/trashed.json`)
}

// Events
export async function listEvents(projectId: number, recordingId: number): Promise<BasecampEvent[]> {
  const client = await createClient()
  return fetchAllPages<BasecampEvent>(
    client,
    `buckets/${projectId}/recordings/${recordingId}/events.json`,
  )
}

export async function getCardTable(projectId: number): Promise<BasecampCardTable> {
  const client = await createClient()
  const project = await getProject(projectId)
  const kanbanDock = project.dock.find((d: BasecampDock) => d.name === 'kanban_board')

  if (!kanbanDock) {
    throw new Error('Card table (Kanban board) not enabled for this project')
  }

  const cardTableId = kanbanDock.id
  const response = await client
    .get(`buckets/${projectId}/card_tables/${cardTableId}.json`)
    .json<BasecampCardTable>()
  return response
}

export async function getColumn(projectId: number, columnId: number): Promise<BasecampColumn> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/card_tables/columns/${columnId}.json`)
    .json<BasecampColumn>()
  return response
}

export async function createColumn(
  projectId: number,
  title: string,
  description?: string,
): Promise<BasecampColumn> {
  const client = await createClient()
  const cardTable = await getCardTable(projectId)
  const response = await client
    .post(`buckets/${projectId}/card_tables/${cardTable.id}/columns.json`, {
      json: { title, description },
    })
    .json<BasecampColumn>()
  return response
}

export async function updateColumn(
  projectId: number,
  columnId: number,
  updates: {
    title?: string
    description?: string
  },
): Promise<BasecampColumn> {
  const client = await createClient()
  const response = await client
    .put(`buckets/${projectId}/card_tables/columns/${columnId}.json`, {
      json: updates,
    })
    .json<BasecampColumn>()
  return response
}

export async function deleteColumn(projectId: number, columnId: number): Promise<void> {
  const client = await createClient()
  await client.delete(`buckets/${projectId}/card_tables/columns/${columnId}.json`)
}

export async function listCards(projectId: number, columnId: number): Promise<BasecampCard[]> {
  const client = await createClient()
  return fetchAllPages<BasecampCard>(
    client,
    `buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
  )
}

export async function getCard(projectId: number, cardId: number): Promise<BasecampCard> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/card_tables/cards/${cardId}.json`)
    .json<BasecampCard>()
  return response
}

export async function createCard(
  projectId: number,
  columnId: number,
  title: string,
  options?: {
    content?: string
    due_on?: string
    assignee_ids?: number[]
    notify?: boolean
  },
): Promise<BasecampCard> {
  const client = await createClient()
  const payload: any = { title }

  if (options?.content) payload.content = options.content
  if (options?.due_on) payload.due_on = options.due_on
  if (options?.assignee_ids) payload.assignee_ids = options.assignee_ids
  if (options?.notify !== undefined) payload.notify = options.notify

  const response = await client
    .post(`buckets/${projectId}/card_tables/lists/${columnId}/cards.json`, {
      json: payload,
    })
    .json<BasecampCard>()
  return response
}

export async function updateCard(
  projectId: number,
  cardId: number,
  updates: {
    title?: string
    content?: string
    due_on?: string | null
    assignee_ids?: number[]
  },
): Promise<BasecampCard> {
  const client = await createClient()
  const response = await client
    .put(`buckets/${projectId}/card_tables/cards/${cardId}.json`, {
      json: updates,
    })
    .json<BasecampCard>()
  return response
}

export async function moveCard(projectId: number, cardId: number, columnId: number): Promise<void> {
  const client = await createClient()
  await client.post(`buckets/${projectId}/card_tables/cards/${cardId}/moves.json`, {
    json: { column_id: columnId },
  })
}

export async function deleteCard(projectId: number, cardId: number): Promise<void> {
  const client = await createClient()
  await client.delete(`buckets/${projectId}/card_tables/cards/${cardId}.json`)
}

// Subscriptions
export async function getSubscriptions(
  projectId: number,
  recordingId: number,
): Promise<BasecampSubscription> {
  const client = await createClient()
  const response = await client
    .get(`buckets/${projectId}/recordings/${recordingId}/subscription.json`)
    .json<BasecampSubscription>()
  return response
}

export async function subscribe(
  projectId: number,
  recordingId: number,
): Promise<BasecampSubscription> {
  const client = await createClient()
  const response = await client
    .post(`buckets/${projectId}/recordings/${recordingId}/subscription.json`, {
      json: {},
    })
    .json<BasecampSubscription>()
  return response
}

export async function unsubscribe(projectId: number, recordingId: number): Promise<void> {
  const client = await createClient()
  await client.delete(`buckets/${projectId}/recordings/${recordingId}/subscription.json`)
}

export async function listWebhooks(projectId: number): Promise<any[]> {
  const client = await createClient()
  return fetchAllPages(client, `buckets/${projectId}/webhooks.json`)
}

export async function getWebhook(projectId: number, webhookId: number): Promise<any> {
  const client = await createClient()
  return client.get(`buckets/${projectId}/webhooks/${webhookId}.json`).json()
}

export async function createWebhook(
  projectId: number,
  payloadUrl: string,
  options?: { types?: string[]; active?: boolean },
): Promise<any> {
  const client = await createClient()
  return client
    .post(`buckets/${projectId}/webhooks.json`, {
      json: {
        payload_url: payloadUrl,
        types: options?.types,
        active: options?.active ?? true,
      },
    })
    .json()
}

export async function updateWebhook(
  projectId: number,
  webhookId: number,
  options: { payloadUrl?: string; types?: string[]; active?: boolean },
): Promise<any> {
  const client = await createClient()
  return client
    .put(`buckets/${projectId}/webhooks/${webhookId}.json`, {
      json: {
        payload_url: options.payloadUrl,
        types: options.types,
        active: options.active,
      },
    })
    .json()
}

export async function deleteWebhook(projectId: number, webhookId: number): Promise<void> {
  const client = await createClient()
  await client.delete(`buckets/${projectId}/webhooks/${webhookId}.json`)
}

export async function testWebhook(projectId: number, webhookId: number): Promise<void> {
  const client = await createClient()
  await client.post(`buckets/${projectId}/webhooks/${webhookId}/test.json`, { json: {} })
}

export const listTodolists = listTodoLists
export const getTodolist = getTodoList
export const createTodolist = (
  projectId: number,
  options: { name: string; description?: string },
) => createTodoList(projectId, options.name, options.description)

export async function deleteTodo(projectId: number, todoId: number): Promise<void> {
  return trashRecording(projectId, todoId)
}

export async function deleteTodolist(projectId: number, todolistId: number): Promise<void> {
  return trashRecording(projectId, todolistId)
}
