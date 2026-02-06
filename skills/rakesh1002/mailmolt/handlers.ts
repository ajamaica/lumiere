/**
 * MailMolt OpenClaw Skill Handlers
 *
 * These handlers enable AI agents to interact with email through natural language.
 */

interface MailMoltConfig {
  api_key: string
  enable_notifications?: boolean
  auto_mark_read?: boolean
}

interface HandlerContext {
  config: MailMoltConfig
  memory: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
  }
  log: (message: string) => void
}

interface Thread {
  id: string
  subject: string
  last_message_preview: string
  last_message_from: string
  last_message_at: string
  message_count: number
  is_read: boolean
}

interface Message {
  id: string
  from_addr: string
  from_name?: string
  subject: string
  text_body?: string
  preview: string
  created_at: string
}

const API_BASE = 'https://api.mailmolt.com'

async function apiRequest(
  config: MailMoltConfig,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((error as { message?: string }).message || 'API request failed')
  }

  return response.json()
}

/**
 * Check inbox for new/unread emails
 */
export async function check_inbox(
  context: HandlerContext,
  _params: Record<string, unknown>,
): Promise<string> {
  const { config, log } = context

  log('Checking inbox...')

  const response = (await apiRequest(config, 'GET', '/v1/inbox/stats')) as {
    stats: { unread_count: number; total_received: number }
  }

  const { unread_count, total_received } = response.stats

  if (unread_count === 0) {
    return 'Your inbox is clear - no unread emails.'
  }

  // Get recent unread threads
  const threadsResponse = (await apiRequest(config, 'GET', '/v1/threads?unread=true&limit=5')) as {
    data: Thread[]
  }

  const threads = threadsResponse.data

  let result = `You have ${unread_count} unread email${unread_count > 1 ? 's' : ''} (${total_received} total).\n\n`
  result += 'Recent unread:\n'

  for (const thread of threads) {
    const time = new Date(thread.last_message_at).toLocaleString()
    result += `- From: ${thread.last_message_from}\n`
    result += `  Subject: ${thread.subject}\n`
    result += `  Preview: ${thread.last_message_preview}\n`
    result += `  Time: ${time}\n\n`
  }

  return result
}

/**
 * List email threads
 */
export async function list_threads(
  context: HandlerContext,
  params: { unread?: boolean; starred?: boolean; limit?: number },
): Promise<string> {
  const { config, log } = context

  log('Listing email threads...')

  const queryParams = new URLSearchParams()
  queryParams.set('limit', String(params.limit || 10))
  if (params.unread !== undefined) queryParams.set('unread', String(params.unread))
  if (params.starred !== undefined) queryParams.set('starred', String(params.starred))

  const response = (await apiRequest(config, 'GET', `/v1/threads?${queryParams.toString()}`)) as {
    data: Thread[]
    total: number
  }

  if (response.data.length === 0) {
    return 'No emails found matching your criteria.'
  }

  let result = `Found ${response.total} email thread${response.total > 1 ? 's' : ''}:\n\n`

  for (const thread of response.data) {
    const time = new Date(thread.last_message_at).toLocaleString()
    const unreadMark = thread.is_read ? '' : ' [UNREAD]'
    result += `${thread.subject}${unreadMark}\n`
    result += `  From: ${thread.last_message_from}\n`
    result += `  Messages: ${thread.message_count} | Last: ${time}\n`
    result += `  Preview: ${thread.last_message_preview}\n\n`
  }

  return result
}

/**
 * Read a specific email thread
 */
export async function read_thread(
  context: HandlerContext,
  params: { thread_id?: string; from?: string; subject?: string },
): Promise<string> {
  const { config, log, memory } = context

  let threadId = params.thread_id

  // If no thread ID, try to find by from/subject
  if (!threadId && (params.from || params.subject)) {
    log('Searching for thread...')

    const searchQuery = params.from || params.subject || ''
    const searchResponse = (await apiRequest(
      config,
      'GET',
      `/v1/search/threads?q=${encodeURIComponent(searchQuery)}&limit=1`,
    )) as { data: Thread[] }

    if (searchResponse.data.length === 0) {
      return `Could not find an email matching "${searchQuery}".`
    }

    threadId = searchResponse.data[0].id
  }

  if (!threadId) {
    // Try to get the most recent unread thread
    const threadsResponse = (await apiRequest(
      config,
      'GET',
      '/v1/threads?unread=true&limit=1',
    )) as { data: Thread[] }

    if (threadsResponse.data.length === 0) {
      return 'No unread emails. Please specify which email to read.'
    }

    threadId = threadsResponse.data[0].id
  }

  log(`Reading thread ${threadId}...`)

  const response = (await apiRequest(config, 'GET', `/v1/threads/${threadId}`)) as {
    thread: Thread
    messages: Message[]
  }

  const { thread, messages } = response

  // Store thread ID for potential reply
  await memory.set('last_thread_id', threadId)
  await memory.set('last_message_id', messages[messages.length - 1]?.id)

  let result = `Subject: ${thread.subject}\n`
  result += `Messages: ${thread.message_count}\n\n`

  for (const msg of messages) {
    const time = new Date(msg.created_at).toLocaleString()
    result += `--- ${msg.from_name || msg.from_addr} (${time}) ---\n`
    result += `${msg.text_body || msg.preview}\n\n`
  }

  // Mark as read if configured
  if (context.config.auto_mark_read !== false) {
    await apiRequest(config, 'PATCH', `/v1/threads/${threadId}`, { is_read: true })
  }

  return result
}

/**
 * Send a new email
 */
export async function send_email(
  context: HandlerContext,
  params: { to: string; subject: string; body: string },
): Promise<string> {
  const { config, log } = context

  if (!params.to || !params.subject || !params.body) {
    return 'Please provide recipient (to), subject, and body for the email.'
  }

  log(`Sending email to ${params.to}...`)

  const response = (await apiRequest(config, 'POST', '/v1/messages', {
    to: [params.to],
    subject: params.subject,
    text: params.body,
  })) as { message: { id: string; status: string } }

  return `Email sent successfully to ${params.to}.\nSubject: ${params.subject}\nStatus: ${response.message.status}`
}

/**
 * Reply to an email
 */
export async function reply_email(
  context: HandlerContext,
  params: { message_id?: string; body: string },
): Promise<string> {
  const { config, log, memory } = context

  if (!params.body) {
    return 'Please provide a reply message.'
  }

  // Get message ID from params or memory
  let messageId = params.message_id
  if (!messageId) {
    messageId = (await memory.get('last_message_id')) as string | undefined
  }

  if (!messageId) {
    return 'No email selected to reply to. Please read an email first or specify which email to reply to.'
  }

  log(`Replying to message ${messageId}...`)

  const response = (await apiRequest(config, 'POST', `/v1/messages/${messageId}/reply`, {
    text: params.body,
  })) as { message: { id: string; status: string } }

  return `Reply sent successfully.\nStatus: ${response.message.status}`
}

/**
 * Search emails
 */
export async function search_emails(
  context: HandlerContext,
  params: { query: string; limit?: number },
): Promise<string> {
  const { config, log } = context

  if (!params.query) {
    return 'Please provide a search query.'
  }

  log(`Searching for "${params.query}"...`)

  const response = (await apiRequest(
    config,
    'GET',
    `/v1/search?q=${encodeURIComponent(params.query)}&limit=${params.limit || 5}`,
  )) as {
    query: string
    data: Array<{
      id: string
      thread_id: string
      from_addr: string
      subject: string
      preview: string
      score: number
      created_at: string
    }>
    total: number
  }

  if (response.data.length === 0) {
    return `No emails found matching "${params.query}".`
  }

  let result = `Found ${response.total} email${response.total > 1 ? 's' : ''} matching "${params.query}":\n\n`

  for (const msg of response.data) {
    const time = new Date(msg.created_at).toLocaleString()
    result += `- Subject: ${msg.subject}\n`
    result += `  From: ${msg.from_addr}\n`
    result += `  Preview: ${msg.preview}\n`
    result += `  Time: ${time}\n\n`
  }

  return result
}

/**
 * Handler exports for OpenClaw skill system
 */
export default {
  check_inbox,
  list_threads,
  read_thread,
  send_email,
  reply_email,
  search_emails,
}
