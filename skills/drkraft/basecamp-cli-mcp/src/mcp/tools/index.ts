import { Tool } from '@modelcontextprotocol/sdk/types.js'

import * as api from '../../lib/api.js'

/**
 * Tool definition with handler
 */
interface ToolWithHandler extends Tool {
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

/**
 * All MCP tools for Basecamp CLI
 */
const tools: ToolWithHandler[] = [
  // ============ PROJECTS (4) ============
  {
    name: 'basecamp_list_projects',
    description: 'List all Basecamp projects in the current account',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => api.listProjects(),
  },
  {
    name: 'basecamp_get_project',
    description: 'Get details of a specific Basecamp project including its dock (tools)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) => api.getProject(args.projectId as number),
  },
  {
    name: 'basecamp_create_project',
    description: 'Create a new Basecamp project',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the project',
        },
        description: {
          type: 'string',
          description: 'Optional description of the project',
        },
      },
      required: ['name'],
    },
    handler: async (args) =>
      api.createProject(args.name as string, args.description as string | undefined),
  },
  {
    name: 'basecamp_archive_project',
    description: 'Archive a Basecamp project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) => {
      await api.archiveProject(args.projectId as number)
      return { success: true, message: 'Project archived' }
    },
  },

  // ============ TODO LISTS (4) ============
  {
    name: 'basecamp_list_todolists',
    description: 'List all to-do lists in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) => api.listTodoLists(args.projectId as number),
  },
  {
    name: 'basecamp_get_todolist',
    description: 'Get details of a specific to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todolistId: {
          type: 'number',
          description: 'The ID of the to-do list',
        },
      },
      required: ['projectId', 'todolistId'],
    },
    handler: async (args) => api.getTodoList(args.projectId as number, args.todolistId as number),
  },
  {
    name: 'basecamp_create_todolist',
    description: 'Create a new to-do list in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        name: {
          type: 'string',
          description: 'Name of the to-do list',
        },
        description: {
          type: 'string',
          description: 'Optional description of the to-do list',
        },
      },
      required: ['projectId', 'name'],
    },
    handler: async (args) =>
      api.createTodoList(
        args.projectId as number,
        args.name as string,
        args.description as string | undefined,
      ),
  },

  // ============ TODOS (8) ============
  {
    name: 'basecamp_list_todos',
    description: 'List to-dos in a to-do list. Can filter by completion status.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todolistId: {
          type: 'number',
          description: 'The ID of the to-do list',
        },
        completed: {
          type: 'boolean',
          description: 'Filter by completion status (true for completed, false for incomplete)',
        },
      },
      required: ['projectId', 'todolistId'],
    },
    handler: async (args) =>
      api.listTodos(
        args.projectId as number,
        args.todolistId as number,
        args.completed as boolean | undefined,
      ),
  },
  {
    name: 'basecamp_get_todo',
    description: 'Get details of a specific to-do item',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todoId: {
          type: 'number',
          description: 'The ID of the to-do',
        },
      },
      required: ['projectId', 'todoId'],
    },
    handler: async (args) => api.getTodo(args.projectId as number, args.todoId as number),
  },
  {
    name: 'basecamp_create_todo',
    description: 'Create a new to-do in a to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todolistId: {
          type: 'number',
          description: 'The ID of the to-do list',
        },
        content: {
          type: 'string',
          description: 'The content/title of the to-do',
        },
        description: {
          type: 'string',
          description: 'Optional detailed description (HTML allowed)',
        },
        assigneeIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of person IDs to assign',
        },
        dueOn: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format',
        },
        startsOn: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
      },
      required: ['projectId', 'todolistId', 'content'],
    },
    handler: async (args) =>
      api.createTodo(args.projectId as number, args.todolistId as number, args.content as string, {
        description: args.description as string | undefined,
        assignee_ids: args.assigneeIds as number[] | undefined,
        due_on: args.dueOn as string | undefined,
        starts_on: args.startsOn as string | undefined,
      }),
  },
  {
    name: 'basecamp_update_todo',
    description: 'Update an existing to-do item',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todoId: {
          type: 'number',
          description: 'The ID of the to-do',
        },
        content: {
          type: 'string',
          description: 'New content/title of the to-do',
        },
        description: {
          type: 'string',
          description: 'New description (HTML allowed)',
        },
        assigneeIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of person IDs to assign',
        },
        dueOn: {
          type: ['string', 'null'],
          description: 'Due date in YYYY-MM-DD format (use null to clear)',
        },
        startsOn: {
          type: ['string', 'null'],
          description: 'Start date in YYYY-MM-DD format (use null to clear)',
        },
      },
      required: ['projectId', 'todoId'],
    },
    handler: async (args) =>
      api.updateTodo(args.projectId as number, args.todoId as number, {
        content: args.content as string | undefined,
        description: args.description as string | undefined,
        assignee_ids: args.assigneeIds as number[] | undefined,
        due_on: args.dueOn as string | null | undefined,
        starts_on: args.startsOn as string | null | undefined,
      }),
  },
  {
    name: 'basecamp_complete_todo',
    description: 'Mark a to-do as complete',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todoId: {
          type: 'number',
          description: 'The ID of the to-do',
        },
      },
      required: ['projectId', 'todoId'],
    },
    handler: async (args) => {
      await api.completeTodo(args.projectId as number, args.todoId as number)
      return { success: true, message: 'To-do marked as complete' }
    },
  },
  {
    name: 'basecamp_uncomplete_todo',
    description: 'Mark a to-do as incomplete',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todoId: {
          type: 'number',
          description: 'The ID of the to-do',
        },
      },
      required: ['projectId', 'todoId'],
    },
    handler: async (args) => {
      await api.uncompleteTodo(args.projectId as number, args.todoId as number)
      return { success: true, message: 'To-do marked as incomplete' }
    },
  },
  {
    name: 'basecamp_delete_todo',
    description: 'Delete (trash) a to-do',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todoId: {
          type: 'number',
          description: 'The ID of the to-do to delete',
        },
      },
      required: ['projectId', 'todoId'],
    },
    handler: async (args) => {
      await api.trashRecording(args.projectId as number, args.todoId as number)
      return { success: true, message: 'To-do moved to trash' }
    },
  },
  {
    name: 'basecamp_delete_todolist',
    description: 'Delete (trash) a to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todolistId: {
          type: 'number',
          description: 'The ID of the to-do list to delete',
        },
      },
      required: ['projectId', 'todolistId'],
    },
    handler: async (args) => {
      await api.trashRecording(args.projectId as number, args.todolistId as number)
      return { success: true, message: 'To-do list moved to trash' }
    },
  },
  {
    name: 'basecamp_move_todo',
    description: 'Move a to-do to a different to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todoId: {
          type: 'number',
          description: 'The ID of the to-do to move',
        },
        targetListId: {
          type: 'number',
          description: 'The ID of the destination to-do list',
        },
        position: {
          type: 'number',
          description: 'Position in the target list (default: 1)',
        },
      },
      required: ['projectId', 'todoId', 'targetListId'],
    },
    handler: async (args) => {
      await api.moveTodo(
        args.projectId as number,
        args.todoId as number,
        args.targetListId as number,
        (args.position as number) || 1,
      )
      return { success: true, message: `To-do moved to list ${args.targetListId}` }
    },
  },

  // ============ TODO GROUPS (2) ============
  {
    name: 'basecamp_list_todolist_groups',
    description: 'List to-do groups in a to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todolistId: {
          type: 'number',
          description: 'The ID of the to-do list',
        },
      },
      required: ['projectId', 'todolistId'],
    },
    handler: async (args) =>
      api.listTodolistGroups(args.projectId as number, args.todolistId as number),
  },
  {
    name: 'basecamp_create_todolist_group',
    description: 'Create a to-do group in a to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        todolistId: {
          type: 'number',
          description: 'The ID of the to-do list',
        },
        name: {
          type: 'string',
          description: 'Name of the to-do group',
        },
        color: {
          type: 'string',
          description: 'Optional color name',
        },
      },
      required: ['projectId', 'todolistId', 'name'],
    },
    handler: async (args) =>
      api.createTodolistGroup(
        args.projectId as number,
        args.todolistId as number,
        args.name as string,
        args.color as string | undefined,
      ),
  },

  // ============ MESSAGES (3) ============
  {
    name: 'basecamp_list_messages',
    description: 'List all messages in a project message board',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) => api.listMessages(args.projectId as number),
  },
  {
    name: 'basecamp_get_message',
    description: 'Get details of a specific message',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        messageId: {
          type: 'number',
          description: 'The ID of the message',
        },
      },
      required: ['projectId', 'messageId'],
    },
    handler: async (args) => api.getMessage(args.projectId as number, args.messageId as number),
  },
  {
    name: 'basecamp_create_message',
    description: 'Create a new message in the project message board',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        subject: {
          type: 'string',
          description: 'Subject line of the message',
        },
        content: {
          type: 'string',
          description: 'HTML content of the message body',
        },
      },
      required: ['projectId', 'subject'],
    },
    handler: async (args) =>
      api.createMessage(
        args.projectId as number,
        args.subject as string,
        args.content as string | undefined,
      ),
  },

  // ============ PEOPLE (3) ============
  {
    name: 'basecamp_list_people',
    description: 'List all people in the account or in a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Optional project ID to filter people by project',
        },
      },
      required: [],
    },
    handler: async (args) => api.listPeople(args.projectId as number | undefined),
  },
  {
    name: 'basecamp_get_person',
    description: 'Get details of a specific person',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          type: 'number',
          description: 'The ID of the person',
        },
      },
      required: ['personId'],
    },
    handler: async (args) => api.getPerson(args.personId as number),
  },
  {
    name: 'basecamp_get_me',
    description: 'Get the current authenticated user profile',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => api.getMe(),
  },

  // ============ COMMENTS (5) ============
  {
    name: 'basecamp_list_comments',
    description: 'List comments on a recording (to-do, message, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording (to-do, message, etc.)',
        },
      },
      required: ['projectId', 'recordingId'],
    },
    handler: async (args) => api.listComments(args.projectId as number, args.recordingId as number),
  },
  {
    name: 'basecamp_get_comment',
    description: 'Get details of a specific comment',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        commentId: {
          type: 'number',
          description: 'The ID of the comment',
        },
      },
      required: ['projectId', 'commentId'],
    },
    handler: async (args) => api.getComment(args.projectId as number, args.commentId as number),
  },
  {
    name: 'basecamp_create_comment',
    description: 'Add a comment to a recording (to-do, message, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording to comment on',
        },
        content: {
          type: 'string',
          description: 'HTML content of the comment',
        },
      },
      required: ['projectId', 'recordingId', 'content'],
    },
    handler: async (args) =>
      api.createComment(
        args.projectId as number,
        args.recordingId as number,
        args.content as string,
      ),
  },
  {
    name: 'basecamp_update_comment',
    description: 'Update a comment',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        commentId: {
          type: 'number',
          description: 'The ID of the comment',
        },
        content: {
          type: 'string',
          description: 'Updated HTML content of the comment',
        },
      },
      required: ['projectId', 'commentId', 'content'],
    },
    handler: async (args) =>
      api.updateComment(args.projectId as number, args.commentId as number, args.content as string),
  },
  {
    name: 'basecamp_delete_comment',
    description: 'Delete a comment',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        commentId: {
          type: 'number',
          description: 'The ID of the comment',
        },
      },
      required: ['projectId', 'commentId'],
    },
    handler: async (args) => {
      await api.deleteComment(args.projectId as number, args.commentId as number)
      return { success: true, message: 'Comment deleted' }
    },
  },

  // ============ VAULTS (4) ============
  {
    name: 'basecamp_list_vaults',
    description: 'List vaults (folders) in a project or within a parent vault',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        parentVaultId: {
          type: 'number',
          description: 'Optional parent vault ID to list child vaults',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) =>
      api.listVaults(args.projectId as number, args.parentVaultId as number | undefined),
  },
  {
    name: 'basecamp_get_vault',
    description: 'Get details of a specific vault',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        vaultId: {
          type: 'number',
          description: 'The ID of the vault',
        },
      },
      required: ['projectId', 'vaultId'],
    },
    handler: async (args) => api.getVault(args.projectId as number, args.vaultId as number),
  },
  {
    name: 'basecamp_create_vault',
    description: 'Create a vault (folder) in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        parentVaultId: {
          type: 'number',
          description: 'The ID of the parent vault',
        },
        title: {
          type: 'string',
          description: 'Title of the vault',
        },
      },
      required: ['projectId', 'parentVaultId', 'title'],
    },
    handler: async (args) =>
      api.createVault(args.projectId as number, args.parentVaultId as number, args.title as string),
  },
  {
    name: 'basecamp_update_vault',
    description: 'Update a vault (folder)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        vaultId: {
          type: 'number',
          description: 'The ID of the vault',
        },
        title: {
          type: 'string',
          description: 'New title of the vault',
        },
      },
      required: ['projectId', 'vaultId', 'title'],
    },
    handler: async (args) =>
      api.updateVault(args.projectId as number, args.vaultId as number, args.title as string),
  },

  // ============ DOCUMENTS (4) ============
  {
    name: 'basecamp_list_documents',
    description: 'List documents in a vault',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        vaultId: {
          type: 'number',
          description: 'The ID of the vault',
        },
      },
      required: ['projectId', 'vaultId'],
    },
    handler: async (args) => api.listDocuments(args.projectId as number, args.vaultId as number),
  },
  {
    name: 'basecamp_get_document',
    description: 'Get details of a specific document',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        documentId: {
          type: 'number',
          description: 'The ID of the document',
        },
      },
      required: ['projectId', 'documentId'],
    },
    handler: async (args) => api.getDocument(args.projectId as number, args.documentId as number),
  },
  {
    name: 'basecamp_create_document',
    description: 'Create a new document in a vault',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        vaultId: {
          type: 'number',
          description: 'The ID of the vault',
        },
        title: {
          type: 'string',
          description: 'Title of the document',
        },
        content: {
          type: 'string',
          description: 'HTML content of the document',
        },
        status: {
          type: 'string',
          description: 'Optional status (draft or published)',
        },
      },
      required: ['projectId', 'vaultId', 'title', 'content'],
    },
    handler: async (args) =>
      api.createDocument(
        args.projectId as number,
        args.vaultId as number,
        args.title as string,
        args.content as string,
        args.status as string | undefined,
      ),
  },
  {
    name: 'basecamp_update_document',
    description: 'Update an existing document',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        documentId: {
          type: 'number',
          description: 'The ID of the document',
        },
        title: {
          type: 'string',
          description: 'New title of the document',
        },
        content: {
          type: 'string',
          description: 'New HTML content of the document',
        },
      },
      required: ['projectId', 'documentId'],
    },
    handler: async (args) =>
      api.updateDocument(args.projectId as number, args.documentId as number, {
        title: args.title as string | undefined,
        content: args.content as string | undefined,
      }),
  },

  // ============ UPLOADS (4) ============
  {
    name: 'basecamp_list_uploads',
    description: 'List uploads in a vault',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        vaultId: {
          type: 'number',
          description: 'The ID of the vault',
        },
      },
      required: ['projectId', 'vaultId'],
    },
    handler: async (args) => api.listUploads(args.projectId as number, args.vaultId as number),
  },
  {
    name: 'basecamp_get_upload',
    description: 'Get details of a specific upload',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        uploadId: {
          type: 'number',
          description: 'The ID of the upload',
        },
      },
      required: ['projectId', 'uploadId'],
    },
    handler: async (args) => api.getUpload(args.projectId as number, args.uploadId as number),
  },
  {
    name: 'basecamp_create_upload',
    description: 'Create an upload in a vault from an attachable SGID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        vaultId: {
          type: 'number',
          description: 'The ID of the vault',
        },
        attachableSgid: {
          type: 'string',
          description: 'Attachable SGID from the upload pipeline',
        },
        description: {
          type: 'string',
          description: 'Optional description of the upload',
        },
        baseName: {
          type: 'string',
          description: 'Optional base name for the upload',
        },
      },
      required: ['projectId', 'vaultId', 'attachableSgid'],
    },
    handler: async (args) =>
      api.createUpload(
        args.projectId as number,
        args.vaultId as number,
        args.attachableSgid as string,
        {
          description: args.description as string | undefined,
          base_name: args.baseName as string | undefined,
        },
      ),
  },
  {
    name: 'basecamp_update_upload',
    description: 'Update an upload',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        uploadId: {
          type: 'number',
          description: 'The ID of the upload',
        },
        description: {
          type: 'string',
          description: 'New description of the upload',
        },
        baseName: {
          type: 'string',
          description: 'New base name for the upload',
        },
      },
      required: ['projectId', 'uploadId'],
    },
    handler: async (args) =>
      api.updateUpload(args.projectId as number, args.uploadId as number, {
        description: args.description as string | undefined,
        base_name: args.baseName as string | undefined,
      }),
  },

  // ============ SCHEDULES (6) ============
  {
    name: 'basecamp_get_schedule',
    description: 'Get schedule details for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) => api.getSchedule(args.projectId as number),
  },
  {
    name: 'basecamp_list_schedule_entries',
    description: 'List schedule entries (events) in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        status: {
          type: 'string',
          description: 'Filter by status (upcoming, past)',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) =>
      api.listScheduleEntries(args.projectId as number, args.status as string | undefined),
  },
  {
    name: 'basecamp_get_schedule_entry',
    description: 'Get details of a specific schedule entry',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        entryId: {
          type: 'number',
          description: 'The ID of the schedule entry',
        },
      },
      required: ['projectId', 'entryId'],
    },
    handler: async (args) => api.getScheduleEntry(args.projectId as number, args.entryId as number),
  },
  {
    name: 'basecamp_create_schedule_entry',
    description: 'Create a new schedule entry (event)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        summary: {
          type: 'string',
          description: 'Title/summary of the event',
        },
        startsAt: {
          type: 'string',
          description: 'Start date/time in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)',
        },
        description: {
          type: 'string',
          description: 'Optional HTML description',
        },
        endsAt: {
          type: 'string',
          description: 'End date/time in ISO 8601 format',
        },
        allDay: {
          type: 'boolean',
          description: 'Whether this is an all-day event',
        },
        participantIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of person IDs to add as participants',
        },
      },
      required: ['projectId', 'summary', 'startsAt'],
    },
    handler: async (args) =>
      api.createScheduleEntry(
        args.projectId as number,
        args.summary as string,
        args.startsAt as string,
        {
          description: args.description as string | undefined,
          endsAt: args.endsAt as string | undefined,
          allDay: args.allDay as boolean | undefined,
          participantIds: args.participantIds as number[] | undefined,
        },
      ),
  },
  {
    name: 'basecamp_update_schedule_entry',
    description: 'Update a schedule entry',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        entryId: {
          type: 'number',
          description: 'The ID of the schedule entry',
        },
        summary: {
          type: 'string',
          description: 'Updated summary/title',
        },
        description: {
          type: 'string',
          description: 'Updated HTML description',
        },
        startsAt: {
          type: 'string',
          description: 'Updated start date/time in ISO 8601 format',
        },
        endsAt: {
          type: 'string',
          description: 'Updated end date/time in ISO 8601 format',
        },
        allDay: {
          type: 'boolean',
          description: 'Whether this is an all-day event',
        },
        participantIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of person IDs to add as participants',
        },
      },
      required: ['projectId', 'entryId'],
    },
    handler: async (args) =>
      api.updateScheduleEntry(args.projectId as number, args.entryId as number, {
        summary: args.summary as string | undefined,
        description: args.description as string | undefined,
        starts_at: args.startsAt as string | undefined,
        ends_at: args.endsAt as string | undefined,
        all_day: args.allDay as boolean | undefined,
        participant_ids: args.participantIds as number[] | undefined,
      }),
  },
  {
    name: 'basecamp_delete_schedule_entry',
    description: 'Delete a schedule entry',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        entryId: {
          type: 'number',
          description: 'The ID of the schedule entry',
        },
      },
      required: ['projectId', 'entryId'],
    },
    handler: async (args) => {
      await api.deleteScheduleEntry(args.projectId as number, args.entryId as number)
      return { success: true, message: 'Schedule entry deleted' }
    },
  },

  // ============ CARD TABLES / KANBAN (11) ============
  {
    name: 'basecamp_get_card_table',
    description: 'Get the card table (kanban board) for a project, including all columns',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) => api.getCardTable(args.projectId as number),
  },
  {
    name: 'basecamp_get_column',
    description: 'Get details of a specific card table column',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        columnId: {
          type: 'number',
          description: 'The ID of the column',
        },
      },
      required: ['projectId', 'columnId'],
    },
    handler: async (args) => api.getColumn(args.projectId as number, args.columnId as number),
  },
  {
    name: 'basecamp_create_column',
    description: 'Create a new card table column',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        title: {
          type: 'string',
          description: 'Title of the column',
        },
        description: {
          type: 'string',
          description: 'Optional description of the column',
        },
      },
      required: ['projectId', 'title'],
    },
    handler: async (args) =>
      api.createColumn(
        args.projectId as number,
        args.title as string,
        args.description as string | undefined,
      ),
  },
  {
    name: 'basecamp_update_column',
    description: 'Update a card table column',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        columnId: {
          type: 'number',
          description: 'The ID of the column',
        },
        title: {
          type: 'string',
          description: 'Updated title',
        },
        description: {
          type: 'string',
          description: 'Updated description',
        },
      },
      required: ['projectId', 'columnId'],
    },
    handler: async (args) =>
      api.updateColumn(args.projectId as number, args.columnId as number, {
        title: args.title as string | undefined,
        description: args.description as string | undefined,
      }),
  },
  {
    name: 'basecamp_delete_column',
    description: 'Delete a card table column',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        columnId: {
          type: 'number',
          description: 'The ID of the column',
        },
      },
      required: ['projectId', 'columnId'],
    },
    handler: async (args) => {
      await api.deleteColumn(args.projectId as number, args.columnId as number)
      return { success: true, message: 'Column deleted' }
    },
  },
  {
    name: 'basecamp_list_cards',
    description: 'List cards in a card table column',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        columnId: {
          type: 'number',
          description: 'The ID of the column',
        },
      },
      required: ['projectId', 'columnId'],
    },
    handler: async (args) => api.listCards(args.projectId as number, args.columnId as number),
  },
  {
    name: 'basecamp_create_card',
    description: 'Create a new card in a card table column',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        columnId: {
          type: 'number',
          description: 'The ID of the column',
        },
        title: {
          type: 'string',
          description: 'Title of the card',
        },
        content: {
          type: 'string',
          description: 'Optional HTML content/description',
        },
        dueOn: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format',
        },
        assigneeIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of person IDs to assign',
        },
      },
      required: ['projectId', 'columnId', 'title'],
    },
    handler: async (args) =>
      api.createCard(args.projectId as number, args.columnId as number, args.title as string, {
        content: args.content as string | undefined,
        due_on: args.dueOn as string | undefined,
        assignee_ids: args.assigneeIds as number[] | undefined,
      }),
  },
  {
    name: 'basecamp_get_card',
    description: 'Get details of a specific card',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        cardId: {
          type: 'number',
          description: 'The ID of the card',
        },
      },
      required: ['projectId', 'cardId'],
    },
    handler: async (args) => api.getCard(args.projectId as number, args.cardId as number),
  },
  {
    name: 'basecamp_update_card',
    description: 'Update a card in a card table',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        cardId: {
          type: 'number',
          description: 'The ID of the card',
        },
        title: {
          type: 'string',
          description: 'Updated card title',
        },
        content: {
          type: 'string',
          description: 'Updated HTML content',
        },
        dueOn: {
          type: ['string', 'null'],
          description: 'Due date in YYYY-MM-DD format (use null to clear)',
        },
        assigneeIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of person IDs to assign',
        },
      },
      required: ['projectId', 'cardId'],
    },
    handler: async (args) =>
      api.updateCard(args.projectId as number, args.cardId as number, {
        title: args.title as string | undefined,
        content: args.content as string | undefined,
        due_on: args.dueOn as string | null | undefined,
        assignee_ids: args.assigneeIds as number[] | undefined,
      }),
  },
  {
    name: 'basecamp_move_card',
    description: 'Move a card to another column',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        cardId: {
          type: 'number',
          description: 'The ID of the card',
        },
        columnId: {
          type: 'number',
          description: 'The ID of the destination column',
        },
      },
      required: ['projectId', 'cardId', 'columnId'],
    },
    handler: async (args) => {
      await api.moveCard(args.projectId as number, args.cardId as number, args.columnId as number)
      return { success: true, message: 'Card moved' }
    },
  },
  {
    name: 'basecamp_delete_card',
    description: 'Delete a card',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        cardId: {
          type: 'number',
          description: 'The ID of the card',
        },
      },
      required: ['projectId', 'cardId'],
    },
    handler: async (args) => {
      await api.deleteCard(args.projectId as number, args.cardId as number)
      return { success: true, message: 'Card deleted' }
    },
  },

  // ============ SEARCH (1) ============
  {
    name: 'basecamp_search',
    description: 'Search across all content in Basecamp (to-dos, messages, documents, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        type: {
          type: 'string',
          description: 'Filter by content type (Todo, Message, Document, Upload, Comment, etc.)',
        },
        bucketId: {
          type: 'number',
          description: 'Filter by project ID',
        },
        creatorId: {
          type: 'number',
          description: 'Filter by creator person ID',
        },
        excludeChat: {
          type: 'boolean',
          description: 'Exclude chat/campfire results',
        },
      },
      required: ['query'],
    },
    handler: async (args) =>
      api.search(args.query as string, {
        type: args.type as string | undefined,
        bucket_id: args.bucketId as number | undefined,
        creator_id: args.creatorId as number | undefined,
        exclude_chat: args.excludeChat as boolean | undefined,
      }),
  },

  // ============ RECORDINGS (4) ============
  {
    name: 'basecamp_list_recordings',
    description: 'List recordings across projects by type (Todo, Message, Document, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Recording type (Todo, Message, Document, Upload, Comment, etc.)',
        },
        bucket: {
          type: 'string',
          description: 'Project ID(s) to filter by (comma-separated for multiple)',
        },
        status: {
          type: 'string',
          enum: ['active', 'archived', 'trashed'],
          description: 'Filter by status',
        },
        sort: {
          type: 'string',
          enum: ['created_at', 'updated_at'],
          description: 'Sort field',
        },
        direction: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction',
        },
      },
      required: ['type'],
    },
    handler: async (args) =>
      api.listRecordings(args.type as string, {
        bucket: args.bucket as string | undefined,
        status: args.status as 'active' | 'archived' | 'trashed' | undefined,
        sort: args.sort as 'created_at' | 'updated_at' | undefined,
        direction: args.direction as 'asc' | 'desc' | undefined,
      }),
  },
  {
    name: 'basecamp_archive_recording',
    description: 'Archive a recording (to-do, message, document, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording to archive',
        },
      },
      required: ['projectId', 'recordingId'],
    },
    handler: async (args) => {
      await api.archiveRecording(args.projectId as number, args.recordingId as number)
      return { success: true, message: 'Recording archived' }
    },
  },
  {
    name: 'basecamp_restore_recording',
    description: 'Restore a recording (from archive or trash)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording to restore',
        },
      },
      required: ['projectId', 'recordingId'],
    },
    handler: async (args) => {
      await api.restoreRecording(args.projectId as number, args.recordingId as number)
      return { success: true, message: 'Recording restored' }
    },
  },
  {
    name: 'basecamp_trash_recording',
    description: 'Move a recording to trash',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording to trash',
        },
      },
      required: ['projectId', 'recordingId'],
    },
    handler: async (args) => {
      await api.trashRecording(args.projectId as number, args.recordingId as number)
      return { success: true, message: 'Recording moved to trash' }
    },
  },

  // ============ SUBSCRIPTIONS (3) ============
  {
    name: 'basecamp_list_subscriptions',
    description: 'Get subscription info for a recording (who is subscribed)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording',
        },
      },
      required: ['projectId', 'recordingId'],
    },
    handler: async (args) =>
      api.getSubscriptions(args.projectId as number, args.recordingId as number),
  },
  {
    name: 'basecamp_subscribe',
    description: 'Subscribe the current user to a recording',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording to subscribe to',
        },
      },
      required: ['projectId', 'recordingId'],
    },
    handler: async (args) => api.subscribe(args.projectId as number, args.recordingId as number),
  },
  {
    name: 'basecamp_unsubscribe',
    description: 'Unsubscribe the current user from a recording',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording to unsubscribe from',
        },
      },
      required: ['projectId', 'recordingId'],
    },
    handler: async (args) => {
      await api.unsubscribe(args.projectId as number, args.recordingId as number)
      return { success: true, message: 'Unsubscribed from recording' }
    },
  },

  // ============ WEBHOOKS (6) ============
  {
    name: 'basecamp_list_webhooks',
    description: 'List webhooks in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) => api.listWebhooks(args.projectId as number),
  },
  {
    name: 'basecamp_get_webhook',
    description: 'Get details of a webhook',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        webhookId: {
          type: 'number',
          description: 'The ID of the webhook',
        },
      },
      required: ['projectId', 'webhookId'],
    },
    handler: async (args) => api.getWebhook(args.projectId as number, args.webhookId as number),
  },
  {
    name: 'basecamp_create_webhook',
    description: 'Create a webhook in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        payloadUrl: {
          type: 'string',
          description: 'HTTPS webhook payload URL',
        },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of event types',
        },
        active: {
          type: 'boolean',
          description: 'Whether the webhook is active',
        },
      },
      required: ['projectId', 'payloadUrl'],
    },
    handler: async (args) =>
      api.createWebhook(args.projectId as number, args.payloadUrl as string, {
        types: args.types as string[] | undefined,
        active: args.active as boolean | undefined,
      }),
  },
  {
    name: 'basecamp_update_webhook',
    description: 'Update a webhook in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        webhookId: {
          type: 'number',
          description: 'The ID of the webhook',
        },
        payloadUrl: {
          type: 'string',
          description: 'HTTPS webhook payload URL',
        },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of event types',
        },
        active: {
          type: 'boolean',
          description: 'Whether the webhook is active',
        },
      },
      required: ['projectId', 'webhookId'],
    },
    handler: async (args) =>
      api.updateWebhook(args.projectId as number, args.webhookId as number, {
        payloadUrl: args.payloadUrl as string | undefined,
        types: args.types as string[] | undefined,
        active: args.active as boolean | undefined,
      }),
  },
  {
    name: 'basecamp_delete_webhook',
    description: 'Delete a webhook',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        webhookId: {
          type: 'number',
          description: 'The ID of the webhook',
        },
      },
      required: ['projectId', 'webhookId'],
    },
    handler: async (args) => {
      await api.deleteWebhook(args.projectId as number, args.webhookId as number)
      return { success: true, message: 'Webhook deleted' }
    },
  },
  {
    name: 'basecamp_test_webhook',
    description: 'Send a test payload to a webhook',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        webhookId: {
          type: 'number',
          description: 'The ID of the webhook',
        },
      },
      required: ['projectId', 'webhookId'],
    },
    handler: async (args) => {
      await api.testWebhook(args.projectId as number, args.webhookId as number)
      return { success: true, message: 'Webhook test sent' }
    },
  },

  // ============ EVENTS (1) ============
  {
    name: 'basecamp_list_events',
    description: 'List events (activity) for a recording in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        recordingId: {
          type: 'number',
          description: 'The ID of the recording',
        },
      },
      required: ['projectId', 'recordingId'],
    },
    handler: async (args) => api.listEvents(args.projectId as number, args.recordingId as number),
  },

  // ============ CAMPFIRES (3) ============
  {
    name: 'basecamp_list_campfires',
    description: 'List campfires (chat rooms) in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
      },
      required: ['projectId'],
    },
    handler: async (args) => api.listCampfires(args.projectId as number),
  },
  {
    name: 'basecamp_get_campfire_lines',
    description: 'Get chat lines (messages) from a campfire',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        campfireId: {
          type: 'number',
          description: 'The ID of the campfire',
        },
      },
      required: ['projectId', 'campfireId'],
    },
    handler: async (args) =>
      api.getCampfireLines(args.projectId as number, args.campfireId as number),
  },
  {
    name: 'basecamp_send_campfire_line',
    description: 'Send a message to a campfire (chat)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project',
        },
        campfireId: {
          type: 'number',
          description: 'The ID of the campfire',
        },
        content: {
          type: 'string',
          description: 'The message content',
        },
      },
      required: ['projectId', 'campfireId', 'content'],
    },
    handler: async (args) =>
      api.sendCampfireLine(
        args.projectId as number,
        args.campfireId as number,
        args.content as string,
      ),
  },
]

/**
 * Get all available MCP tools (without handlers for listing)
 */
export async function getTools(): Promise<Tool[]> {
  return tools.map(({ handler, ...tool }) => tool)
}

/**
 * Get a tool by name with its handler
 */
export function getToolHandler(name: string): ToolWithHandler | undefined {
  return tools.find((t) => t.name === name)
}

/**
 * Execute a tool by name with arguments
 */
export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const tool = getToolHandler(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  return tool.handler(args)
}
