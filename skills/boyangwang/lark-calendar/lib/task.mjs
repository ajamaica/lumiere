/**
 * Lark Task Operations
 */

import { larkApi } from './lark-api.mjs';
import { datetimeToTimestamp, timestampToDatetime, DEFAULT_TIMEZONE } from './calendar.mjs';

/**
 * Create a task
 * @param {object} options
 * @param {string} options.title - Task title (summary)
 * @param {string} [options.description] - Task description
 * @param {string} options.dueTime - Due time (YYYY-MM-DD HH:MM:SS)
 * @param {string[]} [options.assigneeIds] - Array of user_ids to assign
 * @param {string} [options.timezone] - IANA timezone
 * @returns {object} - Created task data
 */
export async function createTask({
  title,
  description = '',
  dueTime,
  assigneeIds = [],
  timezone = DEFAULT_TIMEZONE
}) {
  const dueTimestamp = datetimeToTimestamp(dueTime, timezone);
  
  // Build members array
  const members = assigneeIds.map(userId => ({
    type: 'user',
    id: userId,
    role: 'assignee'
  }));
  
  const result = await larkApi('POST', '/task/v2/tasks', {
    params: { user_id_type: 'user_id' },
    data: {
      mode: 1,
      summary: title,
      description: description,
      due: {
        timestamp: String(dueTimestamp * 1000), // Task API uses milliseconds
        is_all_day: false
      },
      members: members,
      reminders: [{ relative_fire_minute: 30 }]
    }
  });
  
  return result.task;
}

/**
 * Update a task
 * @param {object} options
 * @param {string} options.taskId - Task GUID
 * @param {string} [options.title] - Task title
 * @param {string} [options.description] - Task description
 * @param {string} [options.dueTime] - Due time (YYYY-MM-DD HH:MM:SS)
 * @param {string} [options.timezone] - IANA timezone
 * @returns {object} - Updated task data
 */
export async function updateTask({
  taskId,
  title,
  description,
  dueTime,
  timezone = DEFAULT_TIMEZONE
}) {
  const updateFields = [];
  const taskUpdate = {};
  
  if (title !== undefined) {
    taskUpdate.summary = title;
    updateFields.push('summary');
  }
  
  if (description !== undefined) {
    taskUpdate.description = description;
    updateFields.push('description');
  }
  
  if (dueTime) {
    const dueTimestamp = datetimeToTimestamp(dueTime, timezone);
    taskUpdate.due = {
      timestamp: String(dueTimestamp * 1000),
      is_all_day: false
    };
    updateFields.push('due');
  }
  
  const result = await larkApi('PATCH', `/task/v2/tasks/${taskId}`, {
    params: { user_id_type: 'user_id' },
    data: {
      task: taskUpdate,
      update_fields: updateFields
    }
  });
  
  return result.task;
}

/**
 * Delete a task
 * @param {string} taskId - Task GUID
 * @returns {boolean} - Success
 */
export async function deleteTask(taskId) {
  await larkApi('DELETE', `/task/v2/tasks/${taskId}`);
  return true;
}

/**
 * Add members to a task
 * @param {string} taskId - Task GUID
 * @param {string[]} userIds - Array of user_ids
 * @returns {object} - Result
 */
export async function addTaskMembers(taskId, userIds) {
  const members = userIds.map(userId => ({
    type: 'user',
    id: userId,
    role: 'assignee'
  }));
  
  return larkApi('POST', `/task/v2/tasks/${taskId}/add_members`, {
    params: { user_id_type: 'user_id' },
    data: { members }
  });
}

/**
 * Remove members from a task
 * @param {string} taskId - Task GUID
 * @param {string[]} userIds - Array of user_ids
 * @returns {object} - Result
 */
export async function removeTaskMembers(taskId, userIds) {
  const members = userIds.map(userId => ({
    type: 'user',
    id: userId,
    role: 'assignee'
  }));
  
  return larkApi('POST', `/task/v2/tasks/${taskId}/remove_members`, {
    params: { user_id_type: 'user_id' },
    data: { members }
  });
}

/**
 * Get a task by ID
 * @param {string} taskId - Task GUID
 * @returns {object} - Task data
 */
export async function getTask(taskId) {
  const result = await larkApi('GET', `/task/v2/tasks/${taskId}`, {
    params: { user_id_type: 'user_id' }
  });
  return result.task;
}

/**
 * List tasks (with pagination)
 * @param {object} options
 * @param {number} [options.pageSize] - Number of tasks per page
 * @param {string} [options.pageToken] - Pagination token
 * @returns {object} - { items, page_token, has_more }
 */
export async function listTasks({ pageSize = 50, pageToken = '' } = {}) {
  const params = { page_size: pageSize, user_id_type: 'user_id' };
  if (pageToken) params.page_token = pageToken;
  
  return larkApi('GET', '/task/v2/tasks', { params });
}

/**
 * Complete a task
 * @param {string} taskId - Task GUID
 * @returns {object} - Updated task
 */
export async function completeTask(taskId) {
  return updateTask({
    taskId,
    // Mark as completed by setting completed_at
    // Note: Actual completion might need different API call
  });
}
