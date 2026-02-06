// ClickUp Skill - Clawdbot Integration
// Provides tools for interacting with ClickUp API

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = join(__dirname, '..', '..', '..', 'clawd', 'TOOLS.md')

// Load credentials from TOOLS.md or environment
function getCredentials() {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, 'utf-8')
      const tokenMatch = content.match(/ClickUp.*API.*Token.*[:=]\s*`([^`]+)`/)
      const workspaceMatch = content.match(/Workspace.*ID.*[:=]\s*(\d+)/)
      if (tokenMatch && workspaceMatch) {
        return {
          apiToken: tokenMatch[1],
          workspaceId: workspaceMatch[1],
        }
      }
    }
  } catch (e) {
    // Continue to defaults
  }

  // Fallback to environment variables only - NO hardcoded credentials
  const envToken = process.env.CLICKUP_API_TOKEN
  const envWorkspace = process.env.CLICKUP_WORKSPACE_ID

  if (envToken && envWorkspace) {
    return {
      apiToken: envToken,
      workspaceId: envWorkspace,
    }
  }

  // No credentials found - fail gracefully
  throw new Error(
    'ClickUp credentials not found. Set CLICKUP_API_TOKEN and CLICKUP_WORKSPACE_ID environment variables, or configure in TOOLS.md',
  )
}

const { apiToken, workspaceId } = getCredentials()
const BASE_URL = 'https://api.clickup.com/api/v2'

/**
 * Make a request to ClickUp API
 */
async function clickupRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const headers = {
    Authorization: apiToken,
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ClickUp API error: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * List tasks in a specific list
 * @param {string} listId - The list ID to fetch tasks from
 */
export async function listTasks(listId) {
  const tasks = await clickupRequest(`/list/${listId}/task`)
  return {
    content: `Found ${tasks.tasks?.length || 0} tasks in list ${listId}:`,
    tasks: tasks.tasks || [],
  }
}

/**
 * Get all tasks in workspace
 */
export async function getAllTasks() {
  const tasks = await clickupRequest(`/team/${workspaceId}/task`)
  return {
    content: `Found ${tasks.tasks?.length || 0} tasks in workspace:`,
    tasks: tasks.tasks || [],
  }
}

/**
 * Create a new task
 * @param {string} listId - The list ID to create task in
 * @param {string} name - Task name
 * @param {string} description - Task description (optional)
 * @param {string} status - Task status (optional)
 */
export async function createTask(listId, name, description = '', status = 'active') {
  const body = {
    name,
    description,
    status,
  }

  const result = await clickupRequest(`/list/${listId}/task`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return {
    content: `Created task "${name}" successfully`,
    task: result,
  }
}

/**
 * Update task status
 * @param {string} taskId - The task ID to update
 * @param {string} status - New status
 */
export async function updateTaskStatus(taskId, status) {
  const result = await clickupRequest(`/task/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })

  return {
    content: `Updated task ${taskId} status to "${status}"`,
    task: result,
  }
}

/**
 * Get task details
 * @param {string} taskId - The task ID to fetch
 */
export async function getTask(taskId) {
  const task = await clickupRequest(`/task/${taskId}`)
  return {
    content: `Task details for ${taskId}:`,
    task,
  }
}

/**
 * Search tasks in workspace
 * @param {string} query - Search query
 */
export async function searchTasks(query) {
  const result = await clickupRequest(
    `/team/${workspaceId}/task?search=${encodeURIComponent(query)}`,
  )
  return {
    content: `Found ${result.tasks?.length || 0} tasks matching "${query}":`,
    tasks: result.tasks || [],
  }
}

// Export tools for Clawdbot
export const tools = {
  clickup_list_tasks: {
    description: 'List all tasks in a specific ClickUp list',
    parameters: {
      listId: {
        type: 'string',
        description: 'The ClickUp list ID to fetch tasks from',
      },
    },
    fn: listTasks,
  },
  clickup_get_all_tasks: {
    description: 'Get all tasks in the workspace',
    parameters: {},
    fn: getAllTasks,
  },
  clickup_create_task: {
    description: 'Create a new task in ClickUp',
    parameters: {
      listId: {
        type: 'string',
        description: 'The ClickUp list ID to create task in',
      },
      name: {
        type: 'string',
        description: 'Task name/title',
      },
      description: {
        type: 'string',
        description: 'Task description (optional)',
      },
      status: {
        type: 'string',
        description: 'Task status: active, pending, review, done (optional, default: active)',
      },
    },
    fn: createTask,
  },
  clickup_update_status: {
    description: 'Update a task status',
    parameters: {
      taskId: {
        type: 'string',
        description: 'The ClickUp task ID to update',
      },
      status: {
        type: 'string',
        description: 'New status: active, pending, review, done',
      },
    },
    fn: updateTaskStatus,
  },
  clickup_get_task: {
    description: 'Get details of a specific task',
    parameters: {
      taskId: {
        type: 'string',
        description: 'The ClickUp task ID to fetch',
      },
    },
    fn: getTask,
  },
  clickup_search: {
    description: 'Search tasks in workspace',
    parameters: {
      query: {
        type: 'string',
        description: 'Search query',
      },
    },
    fn: searchTasks,
  },
}
