export interface BasecampTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface BasecampAccount {
  id: number
  name: string
  product: string
  href: string
  app_href: string
}

export interface BasecampIdentity {
  id: number
  first_name: string
  last_name: string
  email_address: string
}

export interface BasecampAuthorization {
  expires_at: string
  identity: BasecampIdentity
  accounts: BasecampAccount[]
}

export interface BasecampProject {
  id: number
  status: string
  created_at: string
  updated_at: string
  name: string
  description: string
  purpose: string
  clients_enabled: boolean
  bookmark_url: string
  url: string
  app_url: string
  dock: BasecampDock[]
  bookmarked: boolean
}

export interface BasecampDock {
  id: number
  title: string
  name: string
  enabled: boolean
  position: number
  url: string
  app_url: string
}

export interface BasecampTodoList {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  description: string
  completed: boolean
  completed_ratio: string
  name: string
  todos_url: string
  groups_url: string
  app_todos_url: string
}

export interface BasecampTodo {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  description: string
  completed: boolean
  content: string
  starts_on: string | null
  due_on: string | null
  assignees: BasecampPerson[]
  completion_subscribers: BasecampPerson[]
  completion_url: string
  completion?: {
    created_at: string
    creator: BasecampPerson
  }
}

export interface BasecampTodolistGroup {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  position: number
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  description: string
  completed: boolean
  completed_ratio: string
  name: string
  todos_url: string
  group_position_url: string
  app_todos_url: string
}

export interface BasecampParent {
  id: number
  title: string
  type: string
  url: string
  app_url: string
}

export interface BasecampBucket {
  id: number
  name: string
  type: string
}

export interface BasecampPerson {
  id: number
  attachable_sgid: string
  name: string
  email_address: string
  personable_type: string
  title: string
  bio: string | null
  location: string | null
  created_at: string
  updated_at: string
  admin: boolean
  owner: boolean
  client: boolean
  employee: boolean
  time_zone: string
  avatar_url: string
  company?: BasecampCompany
  can_manage_projects: boolean
  can_manage_people: boolean
}

export interface BasecampCompany {
  id: number
  name: string
}

export interface BasecampMessage {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  content: string
  subject: string
}

export interface BasecampCampfire {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  lines_url: string
  bucket: BasecampBucket
  topic: string
}

export interface BasecampCampfireLine {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  content: string
}

export interface BasecampComment {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  content: string
}

export interface BasecampRecording {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  content?: string
  subject?: string
  description?: string
  completed?: boolean
  due_on?: string | null
  starts_on?: string | null
  assignees?: BasecampPerson[]
}

export interface BasecampEvent {
  id: number
  recording_id: number
  action: string
  details: Record<string, any>
  created_at: string
  creator: BasecampPerson
}

export interface BasecampSubscription {
  subscribed: boolean
  count: number
  url: string
  subscribers: BasecampPerson[]
}

export interface BasecampCardTable {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  bucket: BasecampBucket
  creator: BasecampPerson
  subscribers: BasecampPerson[]
  lists: BasecampColumn[]
}

export interface BasecampColumn {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  position?: number
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  description: string | null
  subscribers: BasecampPerson[]
  color: string | null
  cards_count: number
  comment_count: number
  cards_url: string
}

export interface BasecampCard {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  position: number
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  description: string
  completed: boolean
  content: string
  due_on: string | null
  assignees: BasecampPerson[]
  completion_subscribers: BasecampPerson[]
  completion_url: string
  comment_count: number
}

export interface BasecampVault {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  position: number
  parent?: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  documents_count: number
  documents_url: string
  uploads_count: number
  uploads_url: string
  vaults_count: number
  vaults_url: string
}

export interface BasecampDocument {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  position: number
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  content: string
}

export interface BasecampUpload {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  position: number
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  description: string
  content_type: string
  byte_size: number
  filename: string
  download_url: string
  app_download_url: string
  width?: number
  height?: number
}

export interface BasecampSchedule {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  position: number
  bucket: BasecampBucket
  creator: BasecampPerson
  include_due_assignments: boolean
  entries_count: number
  entries_url: string
}

export interface BasecampScheduleEntry {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  description: string
  summary: string
  all_day: boolean
  starts_at: string
  ends_at: string
  participants: BasecampPerson[]
}

export interface BasecampConfig {
  tokens?: BasecampTokens
  currentAccountId?: number
  clientId?: string
  redirectUri?: string
  // Note: clientSecret is intentionally NOT stored in config for security.
  // It must be provided via BASECAMP_CLIENT_SECRET environment variable.
}

export interface PaginatedResponse<T> {
  data: T[]
  nextPage?: string
  totalCount?: number
}

export interface WebhookDelivery {
  id: number
  created_at: string
  request: {
    headers: Record<string, string>
    body: Record<string, any>
  }
  response: {
    code: number
    headers: Record<string, string>
    message: string
    body: string
  }
}

export interface BasecampWebhook {
  id: number
  active: boolean
  created_at: string
  updated_at: string
  payload_url: string
  types: string[]
  url: string
  app_url: string
  recent_deliveries?: WebhookDelivery[]
}

export interface BasecampSearchResult {
  id: number
  status: string
  visible_to_clients: boolean
  created_at: string
  updated_at: string
  title: string
  inherits_status: boolean
  type: string
  url: string
  app_url: string
  bookmark_url: string
  subscription_url: string
  comments_count: number
  comments_url: string
  parent: BasecampParent
  bucket: BasecampBucket
  creator: BasecampPerson
  content?: string
  description?: string
  plain_text_content?: string
  starts_on?: string | null
  due_on?: string | null
  assignees?: BasecampPerson[]
  completion_subscribers?: BasecampPerson[]
  completion_url?: string
}
