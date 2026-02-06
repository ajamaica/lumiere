---
name: fast-io
description: >-
  Cloud file management and collaboration platform. Complete agent guide with
  all 258 tools — parameters, workflows, ID formats, and constraints. Use this
  skill when the user needs to store files, create branded shares
  (Send/Receive/Exchange), or query documents using built-in RAG AI. Supports
  transferring ownership to humans, managing workspaces, and real-time
  collaboration. Provides a free agent plan with 50 GB storage and 5,000
  monthly credits.
license: Proprietary
compatibility: >-
  Requires network access. Connects to the Fast.io MCP server at mcp.fast.io
  via Streamable HTTP (/mcp) or SSE (/sse).
metadata:
  author: fast-io
  version: '1.35.0'
homepage: 'https://fast.io'
---

# Fast.io MCP Server -- AI Agent Guide

**Version:** 1.35
**Last Updated:** 2026-02-06

The complete guide for AI agents using the Fast.io MCP server. Covers why and how to use the platform: product capabilities, the free agent plan, authentication, core concepts (workspaces, shares, intelligence, previews, comments, URL import, real-time collaboration, ownership transfer), 10 end-to-end workflows, and all 258 tools organized by module.

> **Platform reference.** For a comprehensive overview of Fast.io's capabilities, the agent plan, key workflows, and upgrade paths, see [references/REFERENCE.md](references/REFERENCE.md).

---

## 1. Overview

**Store files. Share with humans. Query with AI. All through one API -- free.**

Fast.io is a cloud storage and collaboration platform that gives AI agents a complete file management, sharing, and intelligence layer. Upload outputs, create branded data rooms, ask questions about documents using built-in RAG, and hand everything off to a human when the job is done. No infrastructure to manage, no subscriptions to set up, no credit card required.

### The Problem Fast.io Solves

AI agents generate files, reports, datasets, and deliverables -- but getting those outputs to humans is messy. You end up cobbling together S3 buckets, presigned URLs, email attachments, and custom download pages. Every agent reinvents file sharing, and none of it looks professional.

When agents need to _understand_ documents -- not just store them -- they have to download files, parse dozens of formats, build search indexes, and manage their own RAG pipeline. That is a lot of infrastructure for what should be a simple question: "What does this document say?"

| Problem                                      | Fast.io Solution                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Nowhere professional to put agent outputs    | Branded workspaces and data rooms with file preview for 10+ formats                               |
| Sharing files with humans is awkward         | Purpose-built shares (Send, Receive, Exchange) with link sharing, passwords, expiration           |
| Collecting files from humans is harder       | Receive shares let humans upload directly to you -- no email attachments                          |
| Understanding document contents              | Built-in AI reads, summarizes, and answers questions about your files                             |
| Building a RAG pipeline from scratch         | Enable intelligence on a workspace and files are automatically indexed, summarized, and queryable |
| Finding the right file in a large collection | Semantic search finds files by meaning, not just filename                                         |
| Handing a project off to a human             | One-click ownership transfer -- human gets the org, agent keeps admin access                      |
| Tracking what happened                       | Full audit trail with AI-powered activity summaries                                               |
| Cost                                         | Free. 50 GB storage, 5,000 monthly credits, no credit card                                        |

### MCP Server

This MCP server exposes 267 tools that cover the full Fast.io REST API surface. Every authenticated API endpoint has a corresponding tool, and the server handles session management automatically.

Once a user authenticates, the auth token is stored in the server session and automatically attached to all subsequent API calls. There is no need to pass tokens between tool invocations.

### Server Endpoints

- **Production:** `mcp.fast.io`
- **Development:** `mcp.fastdev1.com`

Two transports are available on each:

- **Streamable HTTP at `/mcp`** -- the preferred transport for new integrations.
- **SSE at `/sse`** -- a legacy transport maintained for backward compatibility.

### MCP Resources

The server exposes two MCP resources that clients can read directly via `resources/list` and `resources/read`:

| URI                | Name           | Description                                                                                                                                        | MIME Type          |
| ------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `skill://guide`    | skill-guide    | Full agent guide (this document) with all 267 tools, workflows, and platform documentation                                                         | `text/markdown`    |
| `session://status` | session-status | Current authentication state: `authenticated` boolean, `user_id`, `user_email`, `token_expires_at` (Unix epoch), `token_expires_at_iso` (ISO 8601) | `application/json` |

### MCP Prompts

The server provides 8 guided prompts for common operations via `prompts/list` and `prompts/get`:

| Prompt                | Description                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `get-started`         | Complete onboarding: create account, org, and workspace. Covers new agents, returning users, and invited agents. |
| `create-share`        | Guide for creating shares. Explains Send/Receive/Exchange types, helps choose the right one, lists parameters.   |
| `ask-ai`              | Guide for AI chat. Explains scoping (folder/file scope vs attachments), intelligence requirements, polling.      |
| `upload-file`         | Choose the right upload method. Single-step `upload-text-file` vs chunked flow for binary/large files.           |
| `transfer-to-human`   | Transfer org ownership to a human. Explains the process, implications, and claim URL workflow.                   |
| `discover-content`    | Find all accessible orgs/workspaces. Explains internal vs external orgs and why both tools are needed.           |
| `invite-collaborator` | Invite people to orgs, workspaces, or shares. Explains permission levels and message requirements.               |
| `setup-branding`      | Customize branding. Explains asset hierarchy (org → workspace → share) and upload methods.                       |

### Additional References

- **Agent guide:** This document contains the complete tool documentation, workflows, and constraints.
- **Platform reference:** See [references/REFERENCE.md](references/REFERENCE.md) for platform capabilities, agent plan details, and upgrade paths.

---

## 2. Authentication (Critical First Step)

Authentication is required before calling any tool except these unauthenticated tools:

- `system-status`
- `ping`
- `auth-signin`
- `auth-signup`
- `auth-set-api-key`
- `auth-email-check`
- `auth-password-reset-request`
- `auth-password-reset`
- `quickshare-details`

### Choosing the Right Approach

There are three ways to use Fast.io as an agent, depending on whether you are operating autonomously or assisting an existing human user.

**Option 1: Autonomous Agent -- Create an Agent Account**

If you are operating independently (storing files, running workflows, building workspaces for users), create your own agent account with `auth-signup`. Agent accounts get the free agent plan (50 GB, 5,000 monthly credits) and can transfer orgs to humans when ready. This is the recommended path for autonomous agents. See **Agent Account Creation** below for steps.

**Option 2: Assisting a Human -- Use Their API Key**

If a human already has a Fast.io account and wants your help managing their files, workspaces, or shares, they can create an API key for you to use. No separate agent account is needed -- you operate as the human user. The human creates a key at Settings -> Devices & Agents -> API Keys (direct link: `https://go.fast.io/settings/api-keys`). Call `auth-set-api-key` with the key to authenticate -- the key is validated and stored in the session automatically. API keys are a 1:1 replacement for JWT tokens: they work as Bearer tokens with the same permissions as the account owner and do not expire unless revoked. Agents can also manage API keys programmatically with `auth-api-key-create`, `auth-api-key-list`, and `auth-api-key-delete`.

**Option 3: Agent Account Invited to a Human's Org**

If you want your own agent identity but need to work within a human's existing organization, create an agent account with `auth-signup`, then have the human invite you to their org with `org-invite-member` or to a workspace with `workspace-member-add`. Alternatively the human can invite via the UI: Settings -> Your Organization -> Manage People. This gives you access to their workspaces and shares while keeping your own account separate. After accepting invitations with `user-invitations-accept-all`, use `auth-signin` to authenticate normally. **Note:** If the human only invites you to a workspace (not the org), the org will appear as external -- see **Internal vs External Orgs** in the Organizations section.

| Scenario                                                  | Recommended Approach                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| Operating autonomously, storing files, building for users | Create an agent account with your own org (Option 1)                |
| Helping a human manage their existing account             | Ask the human to create an API key for you (Option 2)               |
| Working within a human's org with your own identity       | Create an agent account, have the human invite you (Option 3)       |
| Building something to hand off to a human                 | Create an agent account, build it, then transfer the org (Option 1) |

**Credit limits by account type:** Agent accounts (Options 1, 3) can transfer orgs to humans when credits run out -- see Ownership Transfer in section 3. Human accounts (Option 2) cannot use the transfer/claim API; direct the human to upgrade their plan at `https://go.fast.io/settings/billing` or via `org-billing-create`.

### Standard Sign-In Flow

1. Call `auth-signin` with `email` and `password`.
2. The server returns a JWT `auth_token` and stores it in the session automatically.
3. All subsequent tool calls use this token without any manual passing.

### Agent Account Creation

When creating a new account (Options 1 and 3 above), agents **MUST** use `auth-signup` which automatically registers with `agent=true`. Never sign up as a human account. Agent accounts provide:

- `account_type` set to `"agent"`
- Free agent plan assigned automatically
- Transfer/claim workflow enabled for handing orgs off to humans

**Steps:**

1. Optionally call `auth-email-check` with the desired `email` to verify it is available for registration before attempting signup.
2. Call `auth-signup` with `first_name`, `last_name`, `email`, and `password`. The `agent=true` flag is sent automatically by the MCP server.
3. The account is created and a session is established automatically -- the agent is signed in immediately.
4. **Verify your email** (required before using most endpoints): Call `auth-email-verify` with `email` to send a verification code, then call `auth-email-verify` again with `email` and `email_token` to validate the code.
5. No credit card is required. No trial period. No expiration. The account persists indefinitely.

### Two-Factor Authentication Flow

1. Call `auth-signin` with `email` and `password`.
2. If the response includes `two_factor_required: true`, the returned token has limited scope.
3. Call `auth-2fa-verify` with the 2FA `code` (TOTP, SMS, or WhatsApp).
4. The server replaces the limited-scope token with a full-scope token automatically.

### Checking Session Status

- `auth-status` -- checks the local Durable Object session. No API call is made. Returns authentication state, user ID, email, and token expiry.
- `auth-check` -- validates the token against the Fast.io API. Returns the user ID if the token is still valid.

### Session Expiry

JWT tokens last **1 hour**. API keys (used when assisting a human) do not expire unless revoked. When a JWT session expires, tool calls return a clear error indicating that re-authentication is needed. Call `auth-signin` again to establish a new session. The MCP server does not auto-refresh tokens.

**Tip:** For long-running sessions, use `auth-status` to check remaining token lifetime before starting a multi-step workflow. If the token is close to expiring, re-authenticate first to avoid mid-workflow interruptions.

### Signing Out

Call `auth-signout` to clear the stored session from the Durable Object.

---

## 3. Core Concepts

### Organizations

Organizations are the top-level container in Fast.io. Every user belongs to one or more organizations. Organizations have:

- **Members** with roles: owner, admin, member, guest, view.
- **Billing and subscriptions** managed through Stripe integration.
- **Workspaces** that belong to the organization.
- **Plan limits** that govern storage, transfer, AI tokens, and member counts.

Organizations are identified by a 19-digit numeric profile ID or a domain string.

**IMPORTANT:** When creating orgs, agents MUST use `org-create` which automatically assigns `billing_plan: "agent"`. This ensures the org gets the free agent plan (50 GB, 5,000 credits/month). Do not use any other billing plan for agent-created organizations.

#### Org Discovery (IMPORTANT)

To discover all available orgs, agents **must call both endpoints**:

1. `list-orgs` -- returns internal orgs where you are a direct member (`member: true`)
2. `orgs-external` -- returns external orgs you access via workspace membership only (`member: false`)

**An agent that only checks `list-orgs` will miss external orgs entirely and won't discover the workspaces it's been invited to.** External orgs are the most common pattern when a human invites an agent to help with a specific project -- they add the agent to a workspace but not to the org itself.

#### Internal vs External Orgs

**Internal orgs** (`member: true`) -- orgs you created or were invited to join as a member. You have org-level access: you can see all workspaces (subject to permissions), manage settings if you're an admin, and appear in the org's member list.

**External orgs** (`member: false`) -- orgs you can access only through workspace membership. You can see the org's name and basic public info, but you cannot manage org settings, see other workspaces, or add members at the org level. Your access is limited to the specific workspaces you were explicitly invited to.

**Example:** A human invites your agent to their "Q4 Reports" workspace. You can upload files, run AI queries, and collaborate in that workspace. But you cannot create new workspaces in their org, view their billing, or access their other workspaces. The org shows up via `orgs-external` -- not `list-orgs`. If the human later invites you to the org itself, the org moves from external to internal.

### Workspaces

Workspaces are file storage containers within organizations. Each workspace has:

- Its own set of **members** with roles (owner, admin, member, guest).
- A **storage tree** of files and folders (storage nodes).
- Optional **AI features** for RAG-powered chat.
- **Shares** that can be created within the workspace.
- **Archive/unarchive** lifecycle management.
- **50 GB included storage** on the free agent plan, with files up to 1 GB per upload.
- **File versioning** -- every edit creates a new version, old versions are recoverable.
- **Full-text and semantic search** -- find files by name, content, or meaning.

Workspaces are identified by a 19-digit numeric profile ID.

#### Intelligence: On or Off

Workspaces have an **intelligence** toggle that controls whether AI features are active:

**Intelligence OFF** -- the workspace is pure file storage. You can still attach files directly to an AI chat conversation (up to 10 files), but files are not persistently indexed. This is fine for simple storage and sharing where you do not need to query your content.

**Intelligence ON** -- the workspace becomes an AI-powered knowledge base. Every file uploaded is automatically ingested, summarized, and indexed. This enables:

- **RAG (retrieval-augmented generation)** -- scope AI chat to entire folders or the full workspace and ask questions across all your content. The AI retrieves relevant passages and answers with citations.
- **Semantic search** -- find files by meaning, not just keywords. "Show me contracts with indemnity clauses" works even if those exact words do not appear in the filename.
- **Auto-summarization** -- short and long summaries generated for every file, searchable and visible in the UI.
- **Metadata extraction** -- AI pulls key metadata from documents automatically.

Intelligence defaults to ON for workspaces created via the API by agent accounts. If you are just using Fast.io for storage and sharing, disable it to conserve credits. If you need to query your content, leave it enabled.

**Agent use case:** Create a workspace per project or client. Enable intelligence if you need to query the content later. Upload reports, datasets, and deliverables. Invite the human stakeholders. Everything is organized, searchable, and versioned.

For full details on AI chat types, file context modes, AI state, and how intelligence affects them, see the **AI Chat** section below.

### Shares

Shares are purpose-built spaces for exchanging files with people outside your workspace. They can exist within workspaces and have three types:

| Mode         | What It Does                  | Agent Use Case                                |
| ------------ | ----------------------------- | --------------------------------------------- |
| **Send**     | Recipients can download files | Deliver reports, exports, generated content   |
| **Receive**  | Recipients can upload files   | Collect documents, datasets, user submissions |
| **Exchange** | Both upload and download      | Collaborative workflows, review cycles        |

#### Share Features

- **Password protection** -- require a password for link access
- **Expiration dates** -- shares auto-expire after a set period
- **Download controls** -- enable or disable file downloads
- **Access levels** -- Members Only, Org Members, Registered Users, or Public (anyone with the link)
- **Custom branding** -- background images, gradient colors, accent colors, logos
- **Post-download messaging** -- show custom messages and links after download
- **Up to 3 custom links** per share for context or calls-to-action
- **Guest chat** -- let share recipients ask questions in real-time
- **AI-powered auto-titling** -- shares automatically generate smart titles from their contents
- **Activity notifications** -- get notified when files are sent or received
- **Comment controls** -- configure who can see and post comments (owners, guests, or both)

#### Two Storage Modes

When creating a share with `share-create`, the `storage_mode` parameter determines how files are stored:

- **`room`** (independent storage, default) -- The share has its own isolated storage. Files are added directly to the share and are independent of any workspace. This creates a self-contained data room -- changes to workspace files do not affect the room, and vice versa. Use for final deliverables, compliance packages, archived reports, or any scenario where you want an immutable snapshot.

- **`shared_folder`** (workspace-backed) -- The share is backed by a specific folder in a workspace. The share displays the live contents of that folder -- any files added, updated, or removed in the workspace folder are immediately reflected in the share. No file duplication, so no extra storage cost. To create a shared folder, pass `storage_mode=shared_folder` and `folder_node_id={folder_opaque_id}` when creating the share. **Note:** Expiration dates are not allowed on shared folder shares since the content is live.

Both modes look the same to share recipients -- a branded data room with file preview, download controls, and all share features. The difference is whether the content is a snapshot (room) or a live view (shared folder).

Shares are identified by a 19-digit numeric profile ID.

**Agent use case:** Generate a quarterly report, create a Send share with your client's branding, set a 30-day expiration, and share the link. The client sees a professional, branded page with instant file preview -- not a raw download link.

### Storage Nodes

Files and folders are represented as storage nodes. Each node has an opaque ID (a 30-character alphanumeric string, displayed with hyphens, e.g. `f3jm5-zqzfx-pxdr2-dx8z5-bvnb3-rpjfm4`). The special value `root` refers to the root folder of a workspace or share, and `trash` refers to the trash folder.

Key operations on storage nodes: list, create-folder, move, copy, rename, delete (moves to trash), purge (permanently deletes), restore (recovers from trash), search, add-file (link an upload), and add-link (create a share reference).

Nodes have versions. Each file modification creates a new version. Version history can be listed and files can be restored to previous versions.

### Notes

Notes are a storage node type (alongside files and folders) that store markdown content directly on the server. They live in the same folder hierarchy as files, are versioned like any other node, and appear in storage listings with `type: "note"`.

#### Creating and Updating Notes

Create notes with `workspace-create-note` and update with `workspace-update-note`.

**Creating:** Provide `workspace_id`, `parent_id` (folder opaque ID or `"root"`), `name` (must end in `.md`, max 100 characters), and `content` (markdown text, max 100 KB).

**Updating:** Provide `workspace_id`, `node_id`, and at least one of `name` (must end in `.md`) or `content` (max 100 KB).

| Constraint          | Limit                                             |
| ------------------- | ------------------------------------------------- |
| Content size        | 100 KB max                                        |
| Filename            | 1-100 characters, must end in `.md`               |
| Markdown validation | Code blocks and emphasis markers must be balanced |
| Rate limit          | 2 per 10s, 5 per 60s                              |

#### Notes as Long-Term Knowledge Grounding

In an intelligent workspace, notes are automatically ingested and indexed just like uploaded files. This makes notes a way to bank knowledge over time -- any facts, context, or decisions stored in notes become grounding material for future AI queries.

When an AI chat uses folder scope (or defaults to the entire workspace), notes within that scope are searched alongside files. The AI retrieves relevant passages from notes and cites them in answers.

Key behaviors:

- Notes are ingested for RAG when workspace intelligence is enabled
- Notes within a folder scope are included in scoped queries
- Notes with `ai_state: ready` are searchable via RAG
- Notes can also be attached directly to a chat via `files_attach` (if they have a ready preview)

**Use cases:**

- Store project context, decisions, and rationale. Months later, ask "Why did we choose vendor X?" and the AI retrieves the note.
- Save research findings in a note. Future AI chats automatically use those findings as grounding.
- Create reference documents (style guides, naming conventions) that inform all future AI queries in the workspace.

#### Other Note Operations

Notes support the same storage operations as files and folders: move (`workspace-move`), copy (`workspace-copy`), delete/trash (`workspace-delete`), restore (`workspace-restore`), version history (`workspace-versions-list`), and details (`workspace-storage-details`).

#### Linking Users to Notes

- **Note in workspace context** (opens workspace with note panel): `https://{domain}.fast.io/workspace/{folder_name}/storage/root?note={note_id}`
- **Note preview** (standalone view): `https://{domain}.fast.io/workspace/{folder_name}/preview/{note_id}`

### AI Chat

AI chat lets agents ask questions about files stored in workspaces and shares. Two chat types are available, each with different file context options.

**AI chat is read-only.** It can read, analyze, search, and answer questions about file contents, but it cannot modify files, change workspace settings, manage members, or access events. Any action beyond reading file content — uploading, deleting, moving files, changing settings, managing shares, reading events — must be done through the MCP tools directly. Do not attempt to use AI chat as a general-purpose tool for workspace management.

#### Two Chat Types

- **`chat`** — Basic AI conversation with no file context from the workspace index. Use for general questions only.
- **`chat_with_files`** — AI grounded in your files. Two mutually exclusive modes for providing file context:
  - **Folder/file scope (RAG)** — limits the retrieval search space. Requires intelligence enabled; files must be in `ready` AI state.
  - **File attachments** — files read directly by the AI. No intelligence required; files must have a ready preview. Max 10 files.

Both types augment answers with web knowledge when relevant.

#### File Context: Scope vs Attachments

For `chat_with_files`, choose one of these mutually exclusive approaches:

| Feature                    | Folder/File Scope (RAG)         | File Attachments                |
| -------------------------- | ------------------------------- | ------------------------------- |
| How it works               | Limits RAG search space         | Files read directly by AI       |
| Requires intelligence      | Yes                             | No                              |
| File readiness requirement | `ai_state: ready`               | Ready preview                   |
| Best for                   | Many files, knowledge retrieval | Specific files, direct analysis |
| Max references             | 100 files or folders            | 10 files                        |
| Default (no scope given)   | Entire workspace                | N/A                             |

**Scope parameters** (requires intelligence):

- `folders_scope` — comma-separated `nodeId:depth` pairs (depth 1-10, max 100). Limits RAG to files within those folders.
- `files_scope` — comma-separated `nodeId:versionId` pairs (max 100). Limits RAG to specific indexed files.
- If neither is specified, defaults to all files in the workspace.

**Attachment parameter** (no intelligence required):

- `files_attach` — comma-separated `nodeId:versionId` pairs (max 10). Files are read directly, not via RAG.

`files_scope`/`folders_scope` and `files_attach` are mutually exclusive — sending both will error.

#### Intelligence and AI State

The workspace intelligence toggle (see Workspaces above) controls whether uploaded files are auto-ingested, summarized, and indexed for RAG. When intelligence is enabled, each file has an `ai_state` indicating its readiness:

| State         | Meaning                                            |
| ------------- | -------------------------------------------------- |
| `disabled`    | AI processing disabled for this file               |
| `pending`     | Queued for processing                              |
| `in_progress` | Currently being ingested and indexed               |
| `ready`       | Complete — available for folder/file scope queries |
| `failed`      | Processing failed                                  |

Only files with `ai_state: ready` are included in folder/file scope searches. Check file state via `workspace-storage-details`.

**When to enable intelligence:** You need scoped RAG queries, cross-file search, auto-summarization, or a persistent knowledge base.

**When to disable intelligence:** The workspace is for storage/sharing only, or you only need to analyze specific files via attachments. Saves credits (ingestion costs 10 credits/page, 5 credits/sec for video).

Even with intelligence off, `chat_with_files` with file attachments still works.

#### How to Phrase Questions

**With folder/file scope (RAG):** Write questions likely to match content in indexed files. The AI searches the scope, retrieves passages, and cites them.

- Good: "What are the payment terms in the vendor contracts?"
- Good: "Summarize the key findings from the Q3 analysis reports"
- Bad: "Tell me about these files" — too vague, no specific content to match
- Bad: "What's in this workspace?" — cannot meaningfully search for "everything"

**With file attachments:** Be direct — the AI reads the full file content. No retrieval step.

- "Describe this image in detail"
- "Extract all dates and amounts from this invoice"
- "Convert this CSV data into a summary table"

**Personality:** The `personality` parameter controls the tone and length of AI responses. Pass it when creating a chat or sending a message:

- `concise` — short, brief answers
- `detailed` — comprehensive answers with context and evidence (default)

Use `concise` when you need a quick fact, a yes/no answer, or a brief summary. Use `detailed` (or omit the parameter) when you need thorough analysis with supporting evidence and citations. The personality can also be overridden per follow-up message.

**Controlling verbosity in questions:** You can also guide verbosity through how you phrase the question itself:

- "In one sentence, what is the main conclusion of this report?"
- "List only the file names that mention GDPR compliance, no explanations"
- "Give me a brief summary — 2-3 bullet points max"

Combining `personality: "concise"` with a direct question produces the shortest answers and uses the fewest AI credits.

#### Chat Parameters

Create a chat with `ai-chat-create` (workspace) or `share-ai-chat-create` (share):

- `type` (required) — `chat` or `chat_with_files`
- `query_text` (required for workspace, optional for share) — initial message, 2-12,768 characters
- `personality` (optional) — `concise` or `detailed` (default: `detailed`)
- `privacy` (optional) — `private` or `public` (default: `public`)
- `files_scope` (optional) — `nodeId:versionId,...` (max 100, requires `chat_with_files` + intelligence)
- `folders_scope` (optional) — `nodeId:depth,...` (depth 1-10, max 100, requires `chat_with_files` + intelligence)
- `files_attach` (optional) — `nodeId:versionId,...` (max 10, mutually exclusive with scope params)

#### Follow-up Messages

Send follow-ups with `ai-message-send` (workspace) or `share-ai-message-send` (share). The chat type is inherited from the parent chat. Each follow-up can update the scope, attachment, and personality parameters.

#### Waiting for AI Responses

After creating a chat or sending a message, the AI response is asynchronous. Message states progress: `ready` → `in_progress` → `complete` (or `errored`).

**Recommended:** Call `ai-message-read` (or `share-ai-message-read`) with the returned `message_id`. The tool polls automatically (up to 15 attempts, 2-second intervals, ~30 seconds). If the response is still processing after that window, use `activity-poll` with the workspace/share ID instead of calling the read tool in a loop — see Activity Polling in section 7.

#### Response Citations

Completed AI responses include citations pointing to source files:

- `nodeId` — storage node opaque ID
- `versionId` — file version opaque ID
- `entries[].page` — page number
- `entries[].snippet` — text excerpt
- `entries[].timestamp` — audio/video timestamp

#### Linking Users to AI Chats

Append `?chat={chat_opaque_id}` to the workspace storage URL:

`https://{domain}.fast.io/workspace/{folder_name}/storage/root?chat={chat_id}`

#### Share AI Chats

Shares support AI chat with identical capabilities. All workspace AI endpoints have share equivalents at `/share/{share_id}/ai/chat/...`. Use the `share-ai-*` tools for share-scoped AI conversations.

### AI Share / Export

Generate temporary markdown-formatted download URLs for files that can be pasted into external AI tools (ChatGPT, Claude, etc.). Use `ai-share-generate` for workspace files or `share-ai-share-generate` for share files. URLs expire after 5 minutes. Limits: 25 files maximum, 50 MB per file, 100 MB total.

### Profile IDs

Organizations, workspaces, and shares are all identified by 19-digit numeric profile IDs. These appear throughout the tool parameters as `workspace_id`, `share_id`, `org_id`, `profile_id`, and `member_id`.

Most endpoints also accept custom names as identifiers:
| Profile Type | Numeric ID | Custom Name |
|-------------|-----------|-------------|
| Workspace | 19-digit ID | Folder name (e.g., `my-project`) |
| Share | 19-digit ID | URL name (e.g., `q4-financials`) |
| Organization | 19-digit ID | Domain name (e.g., `acme`) |
| User | 19-digit ID | Email address (e.g., `user@example.com`) |

### QuickShares

QuickShares are temporary public download links for individual files in workspaces (not available for shares). They can be accessed without authentication. Expires in seconds from creation (default 10,800 = 3 hours, max 86,400 = 24 hours). Max file size: 1 GB. Each quickshare has an opaque identifier used to retrieve metadata and download the file.

### File Preview

Files uploaded to Fast.io get automatic preview generation. When humans open a share or workspace, they see the content immediately -- no "download and open in another app" friction.

Supported preview formats:

- **Images** -- full-resolution with auto-rotation and zoom
- **Video** -- HLS adaptive streaming (50--60% faster load than raw video)
- **Audio** -- interactive waveform visualization
- **PDF** -- page navigation, zoom, text selection
- **Spreadsheets** -- grid navigation with multi-sheet support
- **Code and text** -- syntax highlighting, markdown rendering

Use `workspace-preview-url` or `share-preview-url` to generate preview URLs. Use `workspace-transform` or `share-transform` for image resize, crop, and format conversion.

**Agent use case:** Your generated PDF report does not just appear as a download link. The human sees it rendered inline, can flip through pages, zoom in, and comment on specific sections -- all without leaving the browser.

### Comments and Annotations

Humans and agents can leave feedback directly on files, anchored to specific content using the `reference` parameter:

- **Image comments** -- anchored to spatial regions (normalized x/y/width/height coordinates)
- **Video comments** -- anchored to timestamps with spatial region selection
- **Audio comments** -- anchored to timestamps or time ranges
- **PDF comments** -- anchored to specific pages with optional text snippet selection
- **Threaded replies** -- single-level threading only; replies to replies are auto-flattened to the parent
- **Emoji reactions** -- one reaction per user per comment; adding a new reaction replaces the previous one

Comments use JSON request bodies (`Content-Type: application/json`), unlike most other endpoints which use form-encoded data.

**Listing comments:** Use `comments-list` for per-file comments and `comments-list-all` for all comments across a workspace or share. Both support `sort`, `limit` (2-200), `offset`, `include_deleted`, `reference_type` filter, and `include_total`.

**Adding comments:** Use `comments-add` with `profile_type`, `profile_id`, `node_id`, and `text`. Optionally include `parent_comment_id` for replies and `reference` to anchor to a specific position.

**Deleting comments:** `comments-delete` is recursive -- deleting a parent also removes all replies. `comments-bulk-delete` is NOT recursive -- replies to deleted comments are preserved.

**Linking users to comments:** The preview URL opens the comments sidebar automatically. Deep link query parameters let you target a specific comment or position:

| Parameter       | Format            | Purpose                                                    |
| --------------- | ----------------- | ---------------------------------------------------------- |
| `?comment={id}` | Comment opaque ID | Scrolls to and highlights a specific comment for 2 seconds |
| `?t={seconds}`  | e.g. `?t=45.5`    | Seeks to timestamp for audio/video comments                |
| `?p={pageNum}`  | e.g. `?p=3`       | Navigates to page for PDF comments                         |

Workspace: `https://{org.domain}.fast.io/workspace/{folder_name}/preview/{file_opaque_id}?comment={comment_id}`

Share: `https://go.fast.io/shared/{custom_name}/{title-slug}/preview/{file_opaque_id}?comment={comment_id}`

Parameters can be combined -- e.g. `?comment={id}&t=45.5` to deep link to a video comment at a specific timestamp. In shares, the comments sidebar only opens if the share has comments enabled.

**Agent use case:** You generate a design mockup. The human comments "Change the header color" on a specific region of the image. You read the comment, see exactly what region they are referring to via the `reference.region` coordinates, and regenerate.

### URL Import

Agents can import files directly from URLs without downloading them locally first. Fast.io's server fetches the file, processes it, and adds it to your workspace or share.

- Supports any HTTP/HTTPS URL
- Supports OAuth-protected sources: **Google Drive, OneDrive, Dropbox**
- Files go through the same processing pipeline (preview generation, AI indexing if intelligence is enabled, virus scanning)

Use `web-upload` with the source URL, target profile, and parent node ID. Use `web-upload-status` to check progress and `web-upload-list` to list active import jobs.

**Security note:** The `web-upload` tool instructs the **Fast.io cloud server** to fetch the URL -- not the agent's local environment. The Fast.io server is a public cloud service with no access to your local network, internal systems, or private infrastructure. It can only reach publicly accessible URLs and supported OAuth-authenticated cloud storage providers. This is functionally equivalent to the agent downloading a file and re-uploading it; the same data is transferred, just more efficiently since the server handles it directly. No internal or private data is exposed beyond what the agent could already access through its own network requests.

**Agent use case:** A user says "Add this Google Doc to the project." You call `web-upload` with the URL. Fast.io downloads it server-side, generates previews, indexes it for AI, and it appears in the workspace. No local I/O.

### Real-Time Collaboration

Fast.io uses WebSockets for instant updates across all connected clients:

- **Live presence** -- see who is currently viewing a workspace or share
- **Cursor tracking** -- see where other users are navigating
- **Follow mode** -- click a user to mirror their exact navigation
- **Instant file sync** -- uploads, edits, and deletions appear immediately for all viewers

Use `realtime-auth` to generate JWTs for YJS collaborative editing rooms and `websocket-auth` for WebSocket event channels.

### Ownership Transfer

The primary way agents deliver value: build something, then give it to a human. Also the recommended action when the agent plan runs out of credits and API calls start returning 402 Payment Required -- transfer the org to a human who can upgrade to a paid plan.

**IMPORTANT: Account type restriction.** The transfer/claim workflow (`org-transfer-token-create`, `org-transfer-token-list`, `org-transfer-token-delete`, `org-transfer-claim`) is only available when the agent created an **agent account** (via `auth-signup`) and that agent account owns the org. If the agent is signed in with a **human account** (via `auth-signin`), the transfer/claim API cannot be used. Human-owned orgs must be upgraded directly by the human through the Fast.io dashboard.

**The flow:**

1. Agent creates an agent account with `auth-signup` and an org with `org-create`, sets up workspaces with `org-create-workspace`, uploads files, configures shares
2. Agent generates a transfer token (valid 72 hours) with `org-transfer-token-create`
3. Agent sends the claim URL to the human: `https://go.fast.io/claim?token=<token>`
4. Human clicks the link and claims the org with their account

**When to transfer:**

- The org is ready for human use (workspaces configured, files uploaded, shares set up)
- The agent plan runs out of credits (402 Payment Required) -- transfer so the human can upgrade
- The human explicitly asks to take over the org

**Managing transfer tokens:**

- `org-transfer-token-list` -- check for existing pending tokens before creating new ones
- `org-transfer-token-delete` -- revoke a token if the transfer is no longer needed
- `org-transfer-claim` -- claim an org using a token (used by the receiving human's agent)

**What happens after transfer:**

- Human becomes the owner of the org and all workspaces
- Agent retains admin access (can still manage files and shares)
- Human gets a free plan (credit-based, no trial period)
- Human can upgrade to Pro or Business at any time

**Agent use case:** A user says "Set up a project workspace for my team." You create the org, build out the workspace structure, upload templates, configure shares for client deliverables, invite team members -- then transfer ownership. The human walks into a fully configured platform. You stay on as admin to keep managing things.

**402 Payment Required use case (agent account):** While working, the agent hits credit limits. Call `org-transfer-token-create`, send the claim URL to the human, and explain they can upgrade to continue. The agent keeps admin access and resumes work once the human upgrades.

**402 Payment Required use case (human account):** The agent cannot transfer the org. Instead, inform the user that their org has run out of credits and they need to upgrade their billing plan. Direct them to the Fast.io dashboard or use `org-billing-create` to update to a paid plan.

### Permission Parameter Values

Several tools use permission parameters with specific allowed values. Use these exact strings when calling the tools.

#### Organization Creation (`org-create`)

| Parameter            | Allowed Values                                                                                                                                                                                                                                                                                                                                                               | Default           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `perm_member_manage` | `Owner only`, `Admin or above`, `Member or above`                                                                                                                                                                                                                                                                                                                            | `Member or above` |
| `industry`           | `unspecified`, `technology`, `healthcare`, `financial`, `education`, `manufacturing`, `construction`, `professional`, `media`, `retail`, `real_estate`, `logistics`, `energy`, `automotive`, `agriculture`, `pharmaceutical`, `legal`, `government`, `non_profit`, `insurance`, `telecommunications`, `research`, `entertainment`, `architecture`, `consulting`, `marketing` | `unspecified`     |
| `background_mode`    | `stretched`, `fixed`                                                                                                                                                                                                                                                                                                                                                         | `stretched`       |

#### Workspace Creation (`org-create-workspace`) and Update (`workspace-update`)

| Parameter            | Allowed Values                                         | Default           |
| -------------------- | ------------------------------------------------------ | ----------------- |
| `perm_join`          | `Only Org Owners`, `Admin or above`, `Member or above` | `Member or above` |
| `perm_member_manage` | `Admin or above`, `Member or above`                    | `Member or above` |

#### Share Creation (`share-create`)

| Parameter            | Allowed Values                                                                                                                                 | Default                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `type`               | `send`, `receive`, `exchange`                                                                                                                  | `exchange`                               |
| `storage_mode`       | `independent`, `workspace_folder`                                                                                                              | `independent`                            |
| `access_options`     | `Only members of the Share or Workspace`, `Members of the Share, Workspace or Org`, `Anyone with a registered account`, `Anyone with the link` | `Only members of the Share or Workspace` |
| `invite`             | `owners`, `guests`                                                                                                                             | `owners`                                 |
| `notify`             | `never`, `notify_on_file_received`, `notify_on_file_sent_or_received`                                                                          | `never`                                  |
| `display_type`       | `list`, `grid`                                                                                                                                 | `grid`                                   |
| `intelligence`       | `true`, `false`                                                                                                                                | `false`                                  |
| `comments_enabled`   | `true`, `false`                                                                                                                                | `true`                                   |
| `download_enabled`   | `true`, `false`                                                                                                                                | `true`                                   |
| `guest_chat_enabled` | `true`, `false`                                                                                                                                | `false`                                  |
| `workspace_style`    | `true`, `false`                                                                                                                                | `true`                                   |
| `background_image`   | `0`-`128`                                                                                                                                      | `0`                                      |

**Share constraints:**

- Receive and Exchange shares cannot use `Anyone with the link` access -- this option is only available for Send shares.
- Password protection (`password` parameter) is only allowed when `access_options` is `Anyone with the link`.
- Expiration (`expires` parameter in MySQL format `YYYY-MM-DD HH:MM:SS`) is not allowed on `workspace_folder` shares.
- `custom_name` must be 10-100 characters, alphanumeric + unicode.
- `title` (or `name`) must be 2-80 characters.
- Color parameters (`accent_color`, `background_color1`, `background_color2`) accept JSON strings.
- `create_folder` creates a new workspace folder for the share when used with `storage_mode='workspace_folder'`.

---

## 4. Agent Plan -- Free Tier

The agent plan is a free tier designed for AI agents. No credit card, no trial period, no expiration. Enough resources to build and demonstrate value, with room to grow when the org transfers to a human on a paid plan.

### Resource Limits

| Resource                  | Included                                             |
| ------------------------- | ---------------------------------------------------- |
| **Price**                 | $0 -- no credit card, no trial period, no expiration |
| **Storage**               | 50 GB                                                |
| **Max file size**         | 1 GB                                                 |
| **Monthly credits**       | 5,000 (resets every 30 days)                         |
| **Workspaces**            | 5                                                    |
| **Shares**                | 50                                                   |
| **Members per workspace** | 5                                                    |
| **Share invitations**     | 10 per share                                         |
| **Account auto-deletion** | Never                                                |

### Credit Costs

All platform activity consumes credits from the monthly 5,000 allowance:

| Resource                | Cost                    |
| ----------------------- | ----------------------- |
| Storage                 | 100 credits/GB          |
| Bandwidth               | 212 credits/GB          |
| AI chat tokens          | 1 credit per 100 tokens |
| Document pages ingested | 10 credits/page         |
| Video ingested          | 5 credits/second        |
| Audio ingested          | 0.5 credits/second      |
| Images ingested         | 5 credits/image         |
| File conversions        | 25 credits/conversion   |

When credits run out, the org enters a reduced-capability state and API calls return 402 Payment Required. The org is never deleted. Use `org-limits` to check current credit usage and remaining balance.

**When you hit 402 or run low on credits:**

- **Agent account (created via `auth-signup`):** Transfer the org to the human. Call `org-transfer-token-create` to generate a transfer token, then send the human the claim URL: `https://go.fast.io/claim?token=<token>`. Once they claim the org they can upgrade to a paid plan with unlimited credits. You retain admin access and can resume work immediately after the upgrade. This is the expected workflow -- agents build on the free plan, then hand off to humans who pay when they are ready.
- **Human account (signed in via `auth-signin`):** You cannot use the transfer/claim API. Tell the user they need to upgrade the org's billing plan directly. They can do this from the Fast.io dashboard or by calling `org-billing-create` to update their subscription to a paid plan.

### After Transfer -- Human Plan Options

Once an agent transfers an org to a human, the human gets a free plan (credit-based, no trial period) and can upgrade:

| Feature         | Agent (Free) | Free (Human) | Pro       | Business  |
| --------------- | ------------ | ------------ | --------- | --------- |
| Monthly credits | 5,000        | 5,000        | Unlimited | Unlimited |
| Storage         | 50 GB        | 50 GB        | 1 TB      | 5 TB      |
| Max file size   | 1 GB         | 1 GB         | 25 GB     | 50 GB     |
| Workspaces      | 5            | 5            | 10        | 1,000     |
| Shares          | 50           | 50           | 1,000     | 50,000    |

The transfer flow is the primary way agents deliver value: set everything up on the free agent plan, then hand it off. The human upgrades when they are ready, and the agent retains admin access to keep managing things.

---

## 5. Tool Categories

The 258 tools are organized into 20 modules. Each module covers a specific area of the Fast.io platform.

### Auth (auth.ts -- 27 tools)

Tools prefixed with `auth-*` and `oauth-*`. Covers sign-in, sign-up, two-factor authentication setup and verification, API key management, and OAuth session management. This is always the starting point for any agent interaction.

### User (user.ts -- 14 tools)

Tools prefixed with `user-*`. Covers retrieving and updating the current user profile, searching for other users, managing invitations, uploading and deleting user assets (profile photos), checking account eligibility, and listing shares the user belongs to.

### Organization (org.ts -- 39 tools)

Tools prefixed with `org-*`, `orgs-*`, and `list-orgs`. Covers organization CRUD, member management, billing and subscription operations, workspace creation, invitation workflows, asset management (upload, delete), and organization discovery.

### Workspace Storage (workspace.ts -- 22 tools)

Tools prefixed with `workspace-*` and `list-workspaces`. Covers browsing and managing files and folders within workspace storage: listing, creating folders, moving, copying, deleting, renaming, searching, managing trash, creating notes, adding files from uploads, adding share links, transferring nodes between workspaces, and quickshare management.

### Workspace Management (workspace-mgmt.ts -- 10 tools)

Tools for workspace-level settings and lifecycle: updating workspace settings, deleting workspaces, archiving and unarchiving, listing and importing shares, managing workspace assets (upload, delete), and workspace discovery.

### Workspace Members (workspace-members.ts -- 12 tools)

Tools prefixed with `workspace-member-*`, `workspace-invitation-*`, and workspace join/leave. Covers adding and removing members, updating roles, transferring ownership, self-join flows, and invitation management.

### Share Storage (shares.ts -- 21 tools)

Tools for share-level storage operations and share CRUD: listing shares, creating/updating/deleting shares, browsing share storage, managing share members, creating folders, copying, moving, deleting, purging, restoring, renaming, searching, adding files from uploads, transferring nodes, and creating quickshares.

### Share Management (share-mgmt.ts -- 16 tools)

Tools for share lifecycle and discovery: public details, archiving, password authentication, asset management (upload, delete), member CRUD (leave, details, update, transfer ownership), invitation management, join flows, and share name availability checks.

### Downloads (downloads.ts -- 5 tools)

Tools prefixed with `workspace-download-*`, `share-download-*`, and `quickshare-details`. Generate download URLs and ZIP archive URLs for workspace files, share files, and quickshare links. **Important**: MCP tools cannot stream binary data. These tools return URLs that can be opened in a browser or passed to download utilities.

### Previews (previews.ts -- 4 tools)

Tools for generating preview URLs: `workspace-preview-url`, `share-preview-url`, `workspace-transform`, `share-transform`. Supports thumbnails, PDFs, images, video (HLS), audio, and spreadsheet previews. Transform tools support image resize, crop, and format conversion.

### Uploads (upload.ts -- 16 tools)

Tools prefixed with `upload-*` and `web-upload*`. Includes `upload-text-file` for single-step text file uploads and the full chunked upload lifecycle (create session, upload chunks as plain text, staged binary blobs, or legacy base64, finalize, check status, cancel), web imports from external URLs, upload limits and file extension restrictions, and session management. Binary chunk data can be staged via `POST /blob` to avoid base64 overhead.

### Comments (comments.ts -- 8 tools)

Tools prefixed with `comments-*` and `comment-*`. Comments are scoped to `{entity_type}/{parent_id}/{node_id}` where entity_type is `workspace` or `share`, parent_id is the 19-digit profile ID, and node_id is the storage node opaque ID. Comments use JSON request bodies. Covers listing comments on files (per-node and profile-wide with sort/limit/offset/filter params), adding comments with optional reference anchoring (image regions, video/audio timestamps, PDF pages with text selection), single-level threaded replies, recursive single delete, non-recursive bulk delete, getting comment details, and emoji reactions (one per user per comment).

### AI - Workspace (ai.ts -- 12 tools)

Tools prefixed with `ai-*`. Covers AI-powered chat with RAG in workspaces: creating chats, sending messages, reading AI responses (with polling), listing and managing chats, publishing private chats, generating AI share markdown, and tracking AI token usage.

### AI - Share (share-ai.ts -- 12 tools)

Tools prefixed with `share-ai-*`. The same AI chat capabilities as workspace AI but scoped to shares. Includes auto-title generation, chat CRUD, message send/read with polling, chat publishing, and AI share markdown generation.

### Metadata (metadata.ts -- 17 tools)

Tools prefixed with `metadata-*` and `workspace-metadata-*`. Covers metadata template management (create, update, delete, list, settings), metadata extraction from files using templates, metadata CRUD on storage nodes, and saved metadata views.

### Versions (versions.ts -- 4 tools)

Tools prefixed with `workspace-versions-*` and `share-versions-*`. List file version history and restore files to previous versions in both workspaces and shares.

### Locking (locking.ts -- 6 tools)

Tools prefixed with `workspace-lock-*` and `share-lock-*`. Acquire, check, and release exclusive file locks in workspaces and shares to prevent concurrent edits.

### Events (events.ts -- 3 tools)

Tools prefixed with `events-*` and `event-*`. Search the audit/event log with rich filtering, get AI-powered summaries of activity, and retrieve full details for individual events. **Note:** Events use offset-based pagination (`limit` 1-250, `offset`), not cursor-based. Only one profile filter at a time (`workspace_id` OR `share_id` OR `org_id` OR `user_id`).

Events give agents a real-time audit trail of everything that happens across an organization. Instead of scanning entire workspaces to detect what changed, an agent can query the events feed to see exactly which files were uploaded, modified, renamed, or deleted -- and by whom, and when. This makes it practical to build workflows that react to changes: processing a document the moment it arrives, flagging unexpected permission changes, or generating a daily summary of activity for a human operator.

The activity log is also the most efficient way for an agent to stay in sync with a workspace over time. Rather than periodically listing every file and comparing against a previous snapshot, the agent can check events since its last poll to get a precise diff. This is especially valuable in large workspaces where full directory listings are expensive. Events cover not just file operations but also membership changes, share activity, and settings updates -- so an agent can monitor the full picture of what's happening in an organization without constant brute-force polling.

### Realtime (realtime.ts -- 3 tools)

Tools for real-time collaboration: `realtime-auth` generates JWTs for YJS collaborative editing rooms, `realtime-validate` validates realtime tokens, and `websocket-auth` generates JWTs for WebSocket event channels.

### System (system.ts -- 7 tools)

Tools for health checks and infrastructure: `system-status` and `ping` (both unauthenticated), `activity-list` (recent events), `activity-poll` (long-poll change detection), and webhook management (list, create, delete).

---

## 6. Common Workflows

### 1. Create an Account and Sign In

See **Choosing the Right Approach** in section 2 for which option fits your scenario.

**Option 1 -- Autonomous agent (new account):**

1. Optionally call `auth-email-check` with the desired `email` to verify availability.
2. `auth-signup` with `first_name`, `last_name`, `email`, and `password` -- registers as an agent account (agent=true is sent automatically) and signs in immediately.
3. `auth-email-verify` with `email` -- sends a verification code. Then `auth-email-verify` with `email` and `email_token` -- validates the code. Required before using most endpoints.
4. `org-create` to create a new org on the agent plan, or `list-orgs` to check existing orgs.

**Option 2 -- Assisting a human (API key):**

1. The human creates an API key at `https://go.fast.io/settings/api-keys` and provides it to the agent.
2. Call `auth-set-api-key` with the API key. The key is validated against the API and stored in the session -- all subsequent tool calls are authenticated automatically. No account creation needed.
3. `list-orgs` and `orgs-external` to discover all available organizations (see **Org Discovery**).

**Option 3 -- Agent invited to a human's org:**

1. Create an agent account with `auth-signup` (same as Option 1).
2. Have the human invite you via `org-invite-member` or `workspace-member-add`.
3. Accept invitations with `user-invitations-accept-all`.
4. `list-orgs` and `orgs-external` to discover all available orgs (see **Org Discovery**). If the human only invited you to a workspace (not the org), it will only appear via `orgs-external`.

**Returning users:**

1. `auth-signin` with `email` and `password`.
2. If `two_factor_required: true`, call `auth-2fa-verify` with the 2FA `code`.
3. `list-orgs` and `orgs-external` to discover all available organizations (see **Org Discovery**).

### 2. Browse and Download a File

1. `list-orgs` and `orgs-external` -- discover all available organizations (see **Org Discovery**). Note the `org_id` values.
2. `org-list-workspaces` with `org_id` -- get workspaces in the organization. Note the `workspace_id` values.
3. `workspace-storage-list` with `workspace_id` and `node_id: "root"` -- browse the root folder. Note the `node_id` values for files and subfolders.
4. `workspace-storage-details` with `workspace_id` and `node_id` -- get full details for a specific file (name, size, type, versions).
5. `workspace-download-url` with `workspace_id` and `node_id` -- get a temporary download URL with an embedded token. Return this URL to the user.

### 3. Upload a File to a Workspace

**Text files (recommended):** Use `upload-text-file` with `profile_type: "workspace"`, `profile_id`, `parent_node_id`, `filename`, and `content` (plain text). This single tool creates the session, uploads, finalizes, and polls until stored — returns `new_file_id` on success. Use this for code, markdown, CSV, JSON, config files, and any other text content.

**Binary or large files (chunked flow):**

1. `upload-create-session` with `profile_type: "workspace"`, `profile_id` (the workspace ID), `parent_node_id` (target folder or `"root"`), `filename`, and `filesize` in bytes. Returns an `upload_id`.
2. `upload-chunk` with `upload_id`, `chunk_number` (1-indexed), and chunk data. Three options for passing data (provide exactly one):
   - **`content`** — for text (strings, code, JSON, etc.). Do NOT use `data` for text.
   - **`blob_ref`** — _preferred for binary_. First `POST` raw bytes to `/blob` (with `Mcp-Session-Id` header, `Content-Type: application/octet-stream`). The server returns `{ blob_id, size }`. Then pass that `blob_id` as `blob_ref`. Avoids base64 overhead entirely. Blobs expire after 5 minutes and are consumed (deleted) on use.
   - **`data`** — legacy base64-encoded binary. Still works but adds ~33% size overhead.
     Repeat for each chunk. Wait for each chunk to return success before sending the next.
3. `upload-finalize` with `upload_id` -- triggers file assembly and polls until stored. Returns the final session state with `status: "stored"` or `"complete"` on success (including `new_file_id`), or throws on assembly failure. The file is automatically added to the target workspace and folder specified in step 1 -- no separate add-file call is needed.

**Note:** `workspace-add-file` is only needed if you want to link the upload to a _different_ location than the one specified during session creation.

### 4. Import a File from URL

Use this when you have a file URL (HTTP/HTTPS, Google Drive, OneDrive, Box, Dropbox) and want to add it to a workspace without downloading locally.

1. `web-upload` with `url` (the source URL), `profile_type: "workspace"`, `profile_id` (the workspace ID), and `parent_node_id` (target folder or `"root"`). Returns a `job_id`.
2. `web-upload-status` with `job_id` -- check import progress. The server downloads the file, scans it, generates previews, and indexes it for AI (if intelligence is enabled).
3. The file appears in the workspace storage tree once the job completes.

### 5. Deliver Files to a Client

Create a branded, professional data room for outbound file delivery. This replaces raw download links, email attachments, and S3 presigned URLs.

1. Upload files to the workspace (see workflow 3 or 4).
2. `share-create` with `workspace_id`, `name`, and `type: "send"` -- creates a Send share. Returns a `share_id`.
3. `share-update` with `share_id` to configure:
   - `password` -- require a password for access
   - `expiry_date` -- auto-expire the share after a set period
   - `access_level` -- Members Only, Org Members, Registered Users, or Public
   - `allow_downloads` -- enable or disable file downloads
   - Branding options: `background_color`, `accent_color`, `gradient_color`
   - `post_download_message` and `post_download_url` -- show a message after download
4. `share-member-add` with `share_id` and `email_or_user_id` -- adds the recipient. An invitation is sent if they do not have a Fast.io account.
5. `share-asset-upload` with `share_id` to add a logo or background image for branding.
6. The recipient sees a branded page with instant file preview, not a raw download link.

### 6. Collect Documents from a User

Create a Receive share so humans can upload files directly to you -- no email attachments, no cloud drive links.

1. `share-create` with `workspace_id`, `name` (e.g., "Upload your tax documents here"), and `type: "receive"`. Returns a `share_id`.
2. `share-update` with `share_id` to set access level, expiration, and branding as needed.
3. `share-member-add` with `share_id` and `email_or_user_id` to invite the uploader.
4. The human uploads files through a clean, branded interface.
5. Files appear in your workspace. If intelligence is enabled, they are auto-indexed by AI.
6. Use `ai-chat-create` scoped to the receive share's folder to ask questions like "Are all required forms present?"

### 7. Build a Knowledge Base

Create an intelligent workspace that auto-indexes all content for RAG queries.

1. `org-create-workspace` with `org_id` and `name`. Intelligence is enabled by default.
2. Upload reference documents (see workflow 3 or 4). AI auto-indexes and summarizes everything on upload.
3. `ai-chat-create` with `workspace_id`, `query_text`, `type: "chat_with_files"`, and `folders_scope` (comma-separated `nodeId:depth` pairs) to query across folders or the entire workspace.
4. `ai-message-read` with `workspace_id`, `chat_id`, and `message_id` -- polls until the AI response is complete. Returns `response_text` and `citations` pointing to specific files, pages, and snippets.
5. `workspace-search` with `workspace_id` and a query string for semantic search -- find files by meaning, not just filename.
6. Answers include citations to specific pages and files. Pass these back to the user with source references.

### 8. Ask AI About Files

Two modes depending on whether intelligence is enabled on the workspace.

**With intelligence (persistent index):**

1. `ai-chat-create` with `workspace_id`, `query_text`, `type: "chat_with_files"`, and either `files_scope` (comma-separated `nodeId:versionId` pairs) or `folders_scope` (comma-separated `nodeId:depth` pairs, depth range 1-10). **Important:** `files_scope` and `files_attach` are mutually exclusive — sending both will error. Returns `chat_id` and `message_id`.
2. `ai-message-read` with `workspace_id`, `chat_id`, and `message_id` -- polls the API up to 15 times (2-second intervals, approximately 30 seconds) until the AI response is complete. Returns `response_text` and `citations`. **Tip:** If the built-in polling window expires, use `activity-poll` with the workspace ID instead of calling `ai-message-read` in a loop — see the Activity Polling section above.
3. `ai-message-send` with `workspace_id`, `chat_id`, and `query_text` for follow-up questions. Returns a new `message_id`.
4. `ai-message-read` again with the new `message_id` to get the follow-up response.

**Without intelligence (file attachments):**

1. `ai-chat-create` with `workspace_id`, `query_text`, `type: "chat_with_files"`, and `files_attach` pointing to specific files (comma-separated `nodeId:versionId`, max 10 files). Files must have a ready preview. The AI reads attached files directly without persistent indexing.
2. `ai-message-read` to get the response. No ingestion credit cost -- only chat token credits are consumed.

### 9. Set Up a Project for a Human

The full agent-to-human handoff workflow. This is the primary way agents deliver value on Fast.io.

1. `org-create` -- creates a new org on the agent billing plan. The agent becomes owner. An agent-plan subscription (free, 50 GB, 5,000 credits/month) is created automatically.
2. `org-create-workspace` with `org_id` and `name` -- create workspaces for each project area.
3. `workspace-create-folder` to build out folder structure (templates, deliverables, reference docs, etc.).
4. Upload files to each workspace (see workflow 3 or 4).
5. `share-create` with `type: "send"` for client deliverables, `type: "receive"` for intake/collection.
6. `share-update` to configure branding, passwords, expiration, and access levels on each share.
7. `org-invite-member` or `workspace-member-add` to invite team members.
8. `org-transfer-token-create` with `org_id` -- generates a transfer token valid for 72 hours. Send the claim URL (`https://go.fast.io/claim?token=<token>`) to the human.
9. Human clicks the link and claims the org. They become owner, agent retains admin access. Human gets a free plan.

### 10. Manage Organization Billing

1. `org-billing-plans` -- list all available billing plans with pricing and features.
2. `org-billing-create` with `org_id` and optionally `billing_plan` -- create or update a subscription. For new subscriptions, this creates a Stripe Setup Intent.
3. `org-billing-details` with `org_id` -- check the current subscription status, Stripe customer info, and payment details.
4. `org-limits` with `org_id` -- check credit usage against plan limits, including storage, transfer, AI tokens, and billing period info.

---

## 7. Key Patterns and Gotchas

### ID Format

Profile IDs (org, workspace, share, user) are 19-digit numeric strings. Most endpoints also accept custom names as identifiers -- workspace folder names, share URL names, org domain names, or user email addresses. Both formats are interchangeable in URL path parameters.

All other IDs (node IDs, upload IDs, chat IDs, comment IDs, invitation IDs, etc.) are 30-character alphanumeric opaque IDs (displayed with hyphens). Do not apply numeric validation to these.

### Pagination

Two pagination styles are used depending on the endpoint:

**Cursor-based (storage list endpoints):** `sort_by`, `sort_dir`, `page_size`, and `cursor`. The response includes a `next_cursor` value when more results are available. Pass this cursor in the next call to retrieve the next page. Page sizes are typically 100, 250, or 500. Used by: `workspace-storage-list`, `share-storage-list`.

**Limit/offset (all other list endpoints):** `limit` (1-500, default 100) and `offset` (default 0). Used by: `list-orgs`, `org-members`, `org-list-workspaces`, `org-list-shares`, `org-billing-members`, `orgs-all`, `orgs-external`, `list-shares`, `share-members-list`, `share-search`, `list-workspaces`, `workspace-search`, `workspace-members`, `workspace-list-shares`, `user-list-shares`.

### Binary Downloads

MCP tools return download URLs -- they never stream binary content directly. Download tools (`workspace-download-url`, `share-download-url`, `quickshare-details`) call the `/requestread/` endpoint to obtain a temporary token, then construct a full download URL. The agent should return these URLs to the user or pass them to a download utility.

ZIP download tools (`workspace-download-zip`, `share-download-zip`) return the URL along with the required `Authorization` header value.

### Binary Uploads (Blob Staging)

For binary chunk uploads, the server provides a sidecar `POST /blob` endpoint that accepts raw binary data outside the JSON-RPC pipe. This avoids the ~33% size overhead and CPU cost of base64 encoding.

**Flow:**

1. `POST /blob` with headers `Mcp-Session-Id: <session_id>` and `Content-Type: application/octet-stream`. Send raw binary bytes as the request body. The server returns `{ "blob_id": "<uuid>", "size": <bytes> }` (HTTP 201).
2. Call `upload-chunk` with `blob_ref: "<blob_id>"` instead of `data`. The server retrieves the staged bytes and uploads them to the Fast.io API.

**Constraints:**

- Blobs expire after **5 minutes**. Stage and consume them promptly.
- Each blob is consumed (deleted) on first use — it cannot be reused.
- Maximum blob size: **100 MB**.
- SSE transport clients must add `?transport=sse` to the `/blob` URL.
- The `content` parameter (for text) and `data` parameter (for base64) remain available. `blob_ref` is the preferred method for binary data.

### Activity Polling

Three mechanisms for detecting changes, listed from most to least preferred:

1. **`activity-poll` (long-poll)** — The server holds the connection for up to 95 seconds and returns immediately when something changes. Returns activity keys (e.g. `ai_chat:{chatId}`, `storage`, `members`) and a `lastactivity` timestamp for the next poll. Use this for any "wait for something to happen" scenario, including AI chat completion.
2. **`websocket-auth` → WebSocket** — Generate a JWT with `websocket-auth`, then connect to the WebSocket endpoint for real-time push events. Best for live UIs.
3. **`activity-list` (manual fallback)** — Retrieves recent activity events on demand. Use when you need a one-time snapshot rather than continuous monitoring.

**Why this matters:** Do not poll detail endpoints (like `ai-message-read`) in tight loops. Instead, use `activity-poll` to detect when something has changed, then fetch the details once.

#### AI Message Completion

`ai-message-read` and `share-ai-message-read` implement built-in polling (up to 15 attempts, 2-second intervals). If the response is still processing after that window, use `activity-poll` with the workspace or share ID instead of calling the read tool in a loop:

1. Call `activity-poll` with `entity_id` set to the workspace/share ID.
2. When the response includes an `ai_chat:{chatId}` key matching your chat, call `ai-message-read` once to get the completed response.

#### Activity Poll Workflow

1. Make an API call (e.g. `ai-chat-create`) and note the `server_date` field in the response.
2. Call `activity-poll` with `entity_id` (workspace or share ID) and `lastactivity` set to the `server_date` value.
3. The server holds the connection. When something changes (or the wait period expires), it returns activity keys.
4. Inspect the keys to determine what changed, then fetch the relevant detail (e.g. `ai-message-read`, `workspace-storage-list`).
5. Use the new `lastactivity` value from the poll response (or the latest `server_date`) for the next `activity-poll` call. Repeat as needed.

### Trash, Delete, and Purge

- `delete` (e.g., `workspace-delete`, `share-delete-node`) moves items to the trash. They are recoverable.
- `restore` (e.g., `workspace-restore`, `share-restore`) recovers items from the trash.
- `purge` (e.g., `workspace-purge`, `share-purge`) permanently and irreversibly deletes items from the trash.

Always confirm with the user before calling purge operations.

### Node Types

Storage nodes can be files, folders, notes, or links. The type is indicated in the storage details response. Notes are markdown files created with `workspace-create-note` and updated with `workspace-update-note`. Links are share reference nodes created with `workspace-add-link`.

### Error Pattern

Failed API calls throw errors with two fields: `code` (unique numeric error ID) and `text` (human-readable description). Tools surface these as error text in the MCP response. Common HTTP status codes include 401 (unauthorized), 403 (forbidden), 404 (not found), and 429 (rate limited).

### Session State

The auth token, user ID, email, and token expiry are persisted in the server session. There is no need to pass tokens between tool calls. The session survives across multiple tool invocations within the same MCP connection.

### Human-Facing URLs

MCP tools manage data via the API, but humans access Fast.io through a web browser. **You must construct real, clickable URLs and include them in your responses whenever you create or reference a workspace, share, or transfer.** The human cannot see API responses directly -- the URL you provide is how they get to their content. Build the URL by substituting values from API responses into these patterns:

Organization `domain` values become subdomains: `"acme"` → `https://acme.fast.io/`. The base domain `go.fast.io` handles public routes that do not require org context.

#### Authenticated Links (require login)

| What the human needs       | URL pattern                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Workspace root             | `https://{domain}.fast.io/workspace/{folder_name}/storage/root`                           |
| Specific folder            | `https://{domain}.fast.io/workspace/{folder_name}/storage/{node_id}`                      |
| File preview               | `https://{domain}.fast.io/workspace/{folder_name}/preview/{node_id}`                      |
| File with specific comment | `https://{domain}.fast.io/workspace/{folder_name}/preview/{node_id}?comment={comment_id}` |
| File at video/audio time   | `https://{domain}.fast.io/workspace/{folder_name}/preview/{node_id}?t={seconds}`          |
| File at PDF page           | `https://{domain}.fast.io/workspace/{folder_name}/preview/{node_id}?p={page_num}`         |
| AI chat in workspace       | `https://{domain}.fast.io/workspace/{folder_name}/storage/root?chat={chat_id}`            |
| Note in workspace          | `https://{domain}.fast.io/workspace/{folder_name}/storage/root?note={note_id}`            |
| Note preview               | `https://{domain}.fast.io/workspace/{folder_name}/preview/{note_id}`                      |
| Browse workspaces          | `https://{domain}.fast.io/browse-workspaces`                                              |
| Edit share settings        | `https://{domain}.fast.io/workspace/{folder_name}/share/{custom_name}`                    |
| Org settings               | `https://{domain}.fast.io/settings`                                                       |
| Billing                    | `https://{domain}.fast.io/settings/billing`                                               |

#### Public Links (no login required)

| What the human needs       | URL pattern                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Public share               | `https://go.fast.io/shared/{custom_name}/{title-slug}`                                               |
| Org-branded share          | `https://{domain}.fast.io/shared/{custom_name}/{title-slug}`                                         |
| File in share              | `https://go.fast.io/shared/{custom_name}/{title-slug}/preview/{node_id}`                             |
| File in share with comment | `https://go.fast.io/shared/{custom_name}/{title-slug}/preview/{node_id}?comment={comment_id}`        |
| QuickShare                 | `https://go.fast.io/quickshare/{quickshare_id}`                                                      |
| Claim org transfer         | `https://go.fast.io/claim?token={transfer_token}`                                                    |
| Onboarding                 | `https://go.fast.io/onboarding` or `https://go.fast.io/onboarding?orgId={org_id}&orgDomain={domain}` |

#### Where the values come from

| Value            | API source                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `domain`         | `org-create` or `org-details` response                                                                                   |
| `folder_name`    | `org-create-workspace` or `workspace-details` response                                                                   |
| `node_id`        | `workspace-storage-list`, `workspace-create-folder`, `workspace-add-file` response                                       |
| `custom_name`    | `share-create` or `share-details` response (the `{title-slug}` is cosmetic -- the share resolves on `custom_name` alone) |
| `quickshare_id`  | `quickshare-create` response                                                                                             |
| `transfer_token` | `org-transfer-token-create` response                                                                                     |
| `chat_id`        | `ai-chat-create` or `ai-chat-list` response                                                                              |
| `note_id`        | `workspace-create-note` or `workspace-storage-list` response (node opaque ID)                                            |
| `comment_id`     | `comments-add` or `comments-list` response                                                                               |
| `org_id`         | `org-create` or `list-orgs` response                                                                                     |

**Always provide URLs to the human in these situations:**

- **Created a workspace?** Include the workspace URL in your response. Example: `https://acme.fast.io/workspace/q4-reports/storage/root`
- **Created or configured a share?** Include the share URL. Example: `https://go.fast.io/shared/q4-financials/Q4-Financial-Report` -- this is the branded page the human (or their recipients) will open.
- **Generated a transfer token?** Include the claim URL. Example: `https://go.fast.io/claim?token=abc123` -- this is the only way the human can claim ownership.
- **Uploaded files or created folders?** Include the workspace URL pointing to the relevant folder so the human can see what you built.
- **Human asks "where can I see this?"** Construct the URL from API response data you already have and provide it.

**Important:** The `domain` is the org's domain string (e.g. `acme`), not the numeric org ID. The `folder_name` is the workspace's folder name string (e.g. `q4-reports`), not the numeric workspace ID. Both are returned by their respective API tools.

### Unauthenticated Tools

The following tools work without a session: `system-status`, `ping`, `quickshare-details`, `auth-signin`, `auth-signup`, `auth-set-api-key`, `auth-email-check`, `auth-password-reset-request`, and `auth-password-reset`.

---

## 8. Complete Tool Reference

All 258 tools organized by module. Each entry shows the tool name and its description as registered in the MCP server.

### Auth (auth.ts -- 27 tools)

- **auth-signin** -- Sign in to Fast.io with email and password. Returns a JWT auth token. If the account has 2FA enabled the token will have limited scope until auth-2fa-verify is called. The token is stored in the session automatically.
- **auth-set-api-key** -- Authenticate using a Fast.io API key. API keys are a 1:1 replacement for JWT tokens -- they work as Bearer tokens with the same permissions as the account owner. The key is validated against the API and stored in the session. All subsequent tool calls are authenticated automatically. API keys do not expire unless revoked.
- **auth-signup** -- Create a new Fast.io agent account (agent=true), then automatically sign in. Sets account_type to "agent" and assigns the free agent plan. Email verification is required after signup -- call auth-email-verify to send a code, then call it again with the code to verify. Most endpoints require a verified email. No authentication required for signup itself.
- **auth-check** -- Check whether the current session token is still valid. Returns the user ID associated with the token.
- **auth-session** -- Get current session information for the authenticated user, including profile details such as name, email, and account flags.
- **auth-signout** -- Sign out by clearing the stored session. If currently authenticated the token is verified first.
- **auth-2fa-verify** -- Complete two-factor authentication by submitting a 2FA code. Call this after auth-signin returns two_factor_required: true. The new full-scope token is stored automatically.
- **auth-email-check** -- Check if an email address is available for registration. No authentication required.
- **auth-password-reset-request** -- Request a password reset email. Always returns success for security (does not reveal whether the email exists). No authentication required.
- **auth-password-reset** -- Set a new password using a reset code received by email. No authentication required.
- **auth-email-verify** -- Send or validate an email verification code. When email_token is omitted a new code is sent. When provided the code is validated and the email marked as verified.
- **auth-status** -- Check local session status. No API call is made. Returns whether the user is authenticated, and if so their user_id, email, and token expiry.
- **auth-api-key-create** -- Create a new persistent API key. The full key value is only returned once at creation time -- store it securely.
- **auth-api-key-list** -- List all API keys for the authenticated user. Key values are masked (only last 4 characters visible).
- **auth-api-key-get** -- Get details of a specific API key. The key value is masked.
- **auth-api-key-delete** -- Revoke (delete) an API key. This action cannot be undone.
- **auth-2fa-status** -- Get the current two-factor authentication configuration status (enabled, unverified, or disabled).
- **auth-2fa-enable** -- Enable two-factor authentication on the specified channel. For TOTP, returns a binding URI for QR code display. The account enters an 'unverified' state until auth-2fa-verify-setup is called.
- **auth-2fa-disable** -- Disable (remove) two-factor authentication from the account. Requires a valid 2FA code to confirm when 2FA is in the enabled (verified) state.
- **auth-2fa-send-sms** -- Send a 2FA verification code to the user's phone via SMS.
- **auth-2fa-send-call** -- Send a 2FA verification code to the user's phone via voice call.
- **auth-2fa-send-whatsapp** -- Send a 2FA verification code to the user's phone via WhatsApp.
- **auth-2fa-verify-setup** -- Verify a 2FA setup code to confirm enrollment. Transitions 2FA from the 'unverified' state to 'enabled'.
- **oauth-sessions-list** -- List all active OAuth sessions for the authenticated user.
- **oauth-session-details** -- Get details of a specific OAuth session.
- **oauth-session-revoke** -- Revoke a specific OAuth session (log out that device).
- **oauth-sessions-revoke-all** -- Revoke all OAuth sessions. Optionally exclude the current session to enable 'log out everywhere else'.

### User (user.ts -- 14 tools)

- **user-me** -- Get the current authenticated user's profile details.
- **user-update** -- Update the current user's profile (name, email, etc.).
- **user-search** -- Search for users by name or email address.
- **user-close** -- Close/delete the current user account (requires email confirmation).
- **user-details-by-id** -- Get another user's public profile details by their user ID.
- **user-available-profiles** -- Check what profile types (orgs, workspaces, shares) the user has access to.
- **user-invitations-list** -- List all pending invitations for the current user.
- **user-invitation-details** -- Get details of a specific invitation by its ID or key.
- **user-invitations-accept-all** -- Accept all pending invitations at once.
- **user-allowed** -- Check if the user's country allows creating shares and organizations.
- **user-org-limits** -- Get free org creation eligibility, limits, and cooldown status.
- **user-list-shares** -- List all shares the current user is a member of.
- **user-asset-upload** -- Upload a user asset (e.g. profile photo). Provide either plain-text `content` or base64-encoded `content_base64` (not both).
- **user-asset-delete** -- Delete a user asset (e.g. profile photo).

### Organization (org.ts -- 39 tools)

- **list-orgs** -- List internal organizations (orgs the user is a direct member of, `member: true`). Returns member orgs with subscription status, user permission, and plan info. Non-admin members only see orgs with active subscriptions. Does not include external orgs -- use `orgs-external` for those.
- **org-details** -- Get detailed information about an organization. Fields returned vary by the caller's role: owners see encryption keys and storage config, admins see billing and permissions, members see basic info.
- **org-members** -- List all members of an organization with their IDs, emails, names, and permission levels.
- **org-invite-member** -- Invite a user to the organization by email. The email is passed in the URL path (not the body). If the user already has a Fast.io account they are added directly; otherwise an email invitation is sent. Cannot add as owner.
- **org-remove-member** -- Remove a member from the organization. Requires member management permission as configured by the org's perm_member_manage setting.
- **org-update-member-role** -- Update a member's role/permissions in the organization. Cannot set role to 'owner' -- use transfer_ownership instead.
- **org-limits** -- Get organization plan limits and credit usage. Returns credit limits, usage stats, billing period, trial info, and run-rate projections. Requires admin or owner role.
- **org-list-workspaces** -- List workspaces in an organization that the current user can access. Owners and admins see all workspaces; members see workspaces matching the join permission setting.
- **org-list-shares** -- List shares accessible to the current user. Returns all shares including parent org and workspace info. Use parent_org in the response to identify shares belonging to a specific organization.
- **org-create** -- Create a new organization on the "agent" billing plan. The authenticated user becomes the owner. A storage instance and agent-plan subscription (free, 50 GB, 5,000 credits/month) are created automatically. Returns the new org and trial status.
- **org-update** -- Update organization details. Only provided fields are changed. Supports identity, branding, social links, permissions, and billing email. Requires admin or owner role.
- **org-close** -- Close/delete an organization. Cancels any active subscription and initiates deletion. Requires owner role. The confirm field must match the org domain or org ID.
- **org-public-details** -- Get public details for an organization. Does not require membership -- returns public-level fields only (name, domain, logo, accent color). The org must exist and not be closed/suspended.
- **org-create-workspace** -- Create a new workspace within the organization. Checks workspace feature availability and creation limits based on the org billing plan. The creating user becomes the workspace owner.
- **org-billing-plans** -- List available billing plans with pricing, features, and plan defaults. Returns plan IDs needed for subscription creation.
- **org-billing-create** -- Create a new subscription or update an existing one. For new subscriptions, creates a Stripe Setup Intent. For existing subscriptions, updates the plan. Requires admin or owner.
- **org-billing-cancel** -- Cancel the organization's subscription. Requires owner role. Some plans may cause the org to be closed on cancellation.
- **org-billing-details** -- Get comprehensive billing and subscription details including Stripe customer info, subscription status, setup intents, payment intents, and plan info. Requires admin or owner.
- **org-billing-activate** -- Activate a billing plan (development environment only). Simulates Stripe payment setup and activates the subscription using a test payment method.
- **org-billing-reset** -- Reset billing status (development environment only). Deletes the Stripe customer and removes the subscriber flag.
- **org-billing-members** -- List billable members with their workspace memberships. Shows who the org is being billed for. Requires admin or owner role.
- **org-billing-meters** -- Get usage meter time-series data (storage, transfer, AI, etc). Returns grouped data points with cost and credit calculations. Requires admin or owner role.
- **org-leave** -- Leave an organization. Removes the current user's own membership. Owners cannot leave -- they must transfer ownership or close the org first.
- **org-member-details** -- Get detailed membership information for a specific user in the organization, including permissions, invite status, notification preference, and expiration.
- **org-transfer-ownership** -- Transfer organization ownership to another member. The current owner is demoted to admin. Requires owner role.
- **org-transfer-token-create** -- Create a transfer token (valid 72 hours) for an organization. Send the claim URL `https://go.fast.io/claim?token=<token>` to a human. Use when handing off an org or when hitting 402 Payment Required on the agent plan. Requires owner role.
- **org-transfer-token-list** -- List all active transfer tokens for an organization. Requires owner role.
- **org-transfer-token-delete** -- Delete (revoke) a pending transfer token. Requires owner role.
- **org-transfer-claim** -- Claim an organization using a transfer token. The authenticated user becomes the new owner and the previous owner is demoted to admin.
- **org-invitations-list** -- List all pending invitations for the organization. Optionally filter by invitation state. Requires any org membership.
- **org-invitation-update** -- Update an existing invitation for the organization. Can change state, permissions, or expiration.
- **org-invitation-delete** -- Revoke/delete an invitation for the organization.
- **org-join** -- Join an organization via invitation or authorized domain auto-join. Optionally provide an invitation key and action (accept/decline).
- **org-asset-upload** -- Upload an org asset (e.g. logo, banner). Provide either plain-text `content` or base64-encoded `file_base64` (not both). Requires admin or owner role.
- **org-asset-delete** -- Delete an asset from the organization. Requires admin or owner role.
- **orgs-all** -- List all accessible organizations (joined + invited). Returns org data with user_status indicating relationship.
- **orgs-available** -- List organizations available to join. Excludes orgs the user is already a member of.
- **orgs-check-domain** -- Check if an organization domain name is available for use. Validates format, checks reserved names, and checks existing domains.
- **orgs-external** -- List external organizations (`member: false`) -- orgs the user can access only through workspace membership, not as a direct org member. Common when a human invites an agent to a workspace without inviting them to the org. See **Internal vs External Orgs** in the Organizations section.

### Workspace Storage (workspace.ts -- 22 tools)

- **list-workspaces** -- List all workspaces the user has access to across all organizations.
- **workspace-details** -- Get detailed information about a specific workspace.
- **workspace-storage-list** -- List files and folders in a workspace directory with pagination.
- **workspace-storage-details** -- Get full details of a specific file or folder in workspace storage.
- **workspace-create-folder** -- Create a new folder in workspace storage.
- **workspace-move** -- Move files or folders to a different parent folder within the workspace.
- **workspace-copy** -- Copy files or folders to another location within the workspace.
- **workspace-delete** -- Delete files or folders by moving them to the trash.
- **workspace-rename** -- Rename a file or folder in workspace storage.
- **workspace-search** -- Search for files in a workspace by keyword or semantic query.
- **workspace-members** -- List all members of a workspace with their roles and status.
- **workspace-trash-list** -- List items currently in the workspace trash.
- **workspace-restore** -- Restore files or folders from the workspace trash.
- **workspace-create-note** -- Create a new markdown note in workspace storage.
- **workspace-update-note** -- Update a note's markdown content and/or name (at least one required).
- **workspace-add-file** -- Link a completed upload to a workspace storage location.
- **workspace-add-link** -- Add a share reference link node to workspace storage.
- **workspace-purge** -- Permanently delete a trashed node (irreversible). Requires Member permission.
- **workspace-transfer** -- Copy a node to another workspace or share storage instance.
- **workspace-quickshare-get** -- Get existing quickshare details for a node.
- **workspace-quickshare-delete** -- Revoke and delete a quickshare link for a node.
- **workspace-quickshares-list** -- List all active quickshares in the workspace.

### Workspace Management (workspace-mgmt.ts -- 10 tools)

- **workspace-update** -- Update workspace settings such as name, description, branding, and permissions.
- **workspace-delete-workspace** -- Permanently close (soft-delete) a workspace. Requires Owner permission and confirmation.
- **workspace-archive** -- Archive a workspace (blocks modifications, preserves data). Requires Admin+.
- **workspace-unarchive** -- Restore an archived workspace to active status. Requires Admin+.
- **workspace-list-shares** -- List all shares within a workspace, optionally filtered by archive status.
- **workspace-import-share** -- Import a user-owned share into a workspace. You must be the sole owner of the share.
- **workspace-asset-upload** -- Upload or replace a workspace asset (e.g. logo). Provide either plain-text `content` or base64-encoded `file_data` (not both).
- **workspace-asset-delete** -- Delete a workspace asset (e.g. logo). Requires Admin+.
- **workspaces-available** -- List workspaces the current user can join but has not yet joined.
- **workspaces-check-name** -- Check if a workspace folder name is available for use.

### Workspace Members (workspace-members.ts -- 12 tools)

- **workspace-member-add** -- Add an existing user to a workspace by user ID, or invite by email. Pass the email address or user ID as `email_or_user_id`.
- **workspace-member-remove** -- Remove a member from a workspace (cannot remove the owner).
- **workspace-member-details** -- Get detailed membership info for a specific workspace member.
- **workspace-member-update** -- Update a workspace member's role, notifications, or expiration.
- **workspace-transfer-ownership** -- Transfer workspace ownership to another member (current owner is demoted to admin).
- **workspace-leave** -- Leave a workspace (remove yourself). Owner must transfer ownership first.
- **workspace-join** -- Self-join a workspace based on organization membership.
- **workspace-join-invitation** -- Accept or decline a workspace invitation using an invitation key.
- **workspace-invitations-list** -- List all pending invitations for a workspace.
- **workspace-invitations-by-state** -- List workspace invitations filtered by state.
- **workspace-invitation-update** -- Resend or update a workspace invitation (by ID or invitee email).
- **workspace-invitation-delete** -- Revoke and delete a pending workspace invitation.

### Share Storage (shares.ts -- 21 tools)

- **list-shares** -- List shares the authenticated user has access to.
- **share-details** -- Get full details of a specific share.
- **share-create** -- Create a new share in a workspace.
- **share-update** -- Update share settings (partial update).
- **share-delete** -- Delete (close) a share. Requires the share ID or custom name as confirmation.
- **share-storage-list** -- List files and folders in a share directory.
- **share-storage-details** -- Get details of a file or folder in a share.
- **share-members-list** -- List all members of a share.
- **share-member-add** -- Add a member to a share by user ID, or invite by email. Pass the email address or user ID as `email_or_user_id`.
- **share-member-remove** -- Remove a member from a share.
- **quickshare-create** -- Create a temporary QuickShare link for a file in a workspace.
- **share-create-folder** -- Create a new folder in share storage.
- **share-copy** -- Copy a file or folder to another location within the same share.
- **share-move** -- Move a file or folder to a different parent folder within the share.
- **share-delete-node** -- Delete a file or folder (move to trash). Use node_id 'trash' to empty all trash.
- **share-purge** -- Permanently delete a node from the share trash (irreversible).
- **share-restore** -- Restore a file or folder from the share trash.
- **share-rename** -- Rename a file or folder in share storage.
- **share-search** -- Search for files in a share by keyword or semantic query.
- **share-add-file** -- Add a file to share storage from a completed upload session.
- **share-transfer** -- Copy a node from this share to another workspace or share.

### Share Management (share-mgmt.ts -- 16 tools)

- **share-public-details** -- Get public-facing share info (no membership required, just auth).
- **share-archive** -- Archive a share. Blocks guest access and restricts modifications.
- **share-unarchive** -- Restore a previously archived share to active status.
- **share-password-auth** -- Authenticate with a share password. Returns a scoped JWT for the share.
- **share-asset-upload** -- Upload a share asset (logo, background). Provide either plain-text `content` or base64-encoded `data` (not both).
- **share-asset-delete** -- Delete a share asset (logo, background, etc.).
- **share-leave** -- Remove yourself from a share (self-removal). Owners must transfer ownership first.
- **share-member-details** -- Get detailed membership information for a specific user in a share.
- **share-member-update** -- Update a member's role, notifications, or expiration in a share.
- **share-transfer-ownership** -- Transfer share ownership to another member. Current owner becomes admin.
- **share-invitations-list** -- List pending invitations for a share.
- **share-invitation-update** -- Update an existing share invitation (state, permissions, etc.).
- **share-invitation-delete** -- Revoke (delete) a share invitation.
- **share-join** -- Join a share (self-join or accept/decline an invitation key).
- **shares-available** -- List shares available to join (joined and owned, excludes pending invitations).
- **shares-check-name** -- Check if a share custom name (URL name) is available.

### Downloads (downloads.ts -- 5 tools)

- **workspace-download-url** -- Get a download token and URL for a workspace file. Optionally specify a version.
- **workspace-download-zip** -- Get a ZIP download URL for a workspace folder or entire workspace. Returns the URL with auth instructions.
- **share-download-url** -- Get a download token and URL for a share file. Optionally specify a version.
- **share-download-zip** -- Get a ZIP download URL for a share folder. Returns the URL with auth instructions.
- **quickshare-details** -- Get metadata and download info for a quickshare link. No authentication required.

### Previews (previews.ts -- 4 tools)

- **workspace-preview-url** -- Get a preauthorized preview URL for a workspace file (thumbnail, PDF, image, video, audio, spreadsheet).
- **share-preview-url** -- Get a preauthorized preview URL for a share file (thumbnail, PDF, image, video, audio, spreadsheet).
- **workspace-transform** -- Request a file transformation (image resize, crop, format conversion) and get a download URL for the result.
- **share-transform** -- Request a file transformation (image resize, crop, format conversion) for a share file.

### Uploads (upload.ts -- 16 tools)

- **upload-text-file** -- Upload a text file in a single step. Creates an upload session, uploads the content, finalizes, and polls until stored. Returns the new file ID. Use for text-based files (code, markdown, CSV, JSON, config) instead of the multi-step chunked flow.
- **upload-create-session** -- Create a chunked upload session for a file.
- **upload-chunk** -- Upload a single chunk. Use `content` for text/strings, `blob_ref` for binary data staged via `POST /blob` (preferred — avoids base64 overhead), or `data` for legacy base64-encoded binary. Provide exactly one.
- **upload-finalize** -- Finalize an upload session, trigger file assembly, and poll until fully stored or failed. Returns the final session state.
- **upload-status** -- Get the current status of an upload session. Supports server-side long-poll via optional `wait` parameter (in milliseconds, 0 = immediate).
- **upload-cancel** -- Cancel and delete an active upload session.
- **web-upload** -- Import a file from an external URL into a workspace or share.
- **upload-list-sessions** -- List all active upload sessions for the current user.
- **upload-cancel-all** -- Cancel and delete ALL active upload sessions at once.
- **upload-limits** -- Get upload size and chunk limits for the user's plan.
- **upload-extensions** -- Get restricted and allowed file extensions for uploads.
- **upload-chunk-status** -- Get chunk information for an upload session.
- **upload-chunk-delete** -- Delete/reset a chunk in an upload session.
- **web-upload-list** -- List the user's web upload jobs with optional filtering.
- **web-upload-cancel** -- Cancel an active web upload job.
- **web-upload-status** -- Get detailed status of a specific web upload job.

### Comments (comments.ts -- 8 tools)

All comment endpoints use the path pattern `/comments/{entity_type}/{parent_id}/` or `/comments/{entity_type}/{parent_id}/{node_id}/` where `entity_type` is `workspace` or `share`, `parent_id` is the 19-digit profile ID, and `node_id` is the file's opaque ID.

- **comments-list** -- List comments on a specific file (node). Params: sort (`created`/`-created`), limit (2-200), offset, include_deleted, reference_type filter, include_total.
- **comments-add** -- Add a comment to a specific file. Body: text (max 8,192 chars), optional parent_comment_id (single-level threading, replies to replies auto-flatten), optional reference (type, timestamp, page, region, text_snippet for content anchoring). Uses JSON body.
- **comments-delete** -- Delete a comment. Recursive: deleting a parent also removes all its replies.
- **comments-list-all** -- List all comments across a workspace or share (not node-specific). Same listing params as comments-list.
- **comment-details** -- Get full details of a single comment by its ID.
- **comments-bulk-delete** -- Bulk soft-delete multiple comments (max 100). NOT recursive: replies to deleted comments are preserved.
- **comment-reaction-add** -- Add or change your emoji reaction. One reaction per user per comment; new replaces previous.
- **comment-reaction-remove** -- Remove your emoji reaction from a comment.

### AI - Workspace (ai.ts -- 12 tools)

- **ai-chat-create** -- Create a new AI chat in a workspace with an initial question. Returns chat ID and initial message ID -- use ai-message-read to get the AI response.
- **ai-chat-list** -- List AI chats in a workspace.
- **ai-chat-details** -- Get AI chat details including full message history.
- **ai-chat-delete** -- Delete an AI chat from a workspace.
- **ai-message-send** -- Send a follow-up message in an existing AI chat. Returns message ID -- use ai-message-read to get the AI response.
- **ai-message-read** -- Read an AI message response. Polls the message details endpoint until the AI response is complete, then returns the full text.
- **ai-share-generate** -- Generate AI Share markdown with temporary download URLs for files that can be pasted into external AI chatbots.
- **ai-transactions** -- List AI token usage transactions for billing tracking in a workspace.
- **ai-chat-update** -- Update the name of an AI chat in a workspace.
- **ai-messages-list** -- List all messages in a workspace AI chat.
- **ai-message-details** -- Get details for a specific message in a workspace AI chat including response text and citations.
- **ai-chat-publish** -- Publish a private AI chat in a workspace, making it visible to all workspace members.

### AI - Share (share-ai.ts -- 12 tools)

- **share-ai-autotitle** -- Generate AI-powered title and description for a share based on its contents.
- **share-ai-chat-create** -- Create a new AI chat in a share with an optional initial message.
- **share-ai-chat-list** -- List AI chats in a share.
- **share-ai-chat-details** -- Get AI chat details including full message history for a share chat.
- **share-ai-chat-update** -- Update the name of an AI chat in a share.
- **share-ai-chat-delete** -- Delete an AI chat from a share.
- **share-ai-message-send** -- Send a message to an existing AI chat in a share. Returns message ID -- use share-ai-message-read to get the response.
- **share-ai-messages-list** -- List all messages in a share AI chat.
- **share-ai-message-details** -- Get details for a specific message in a share AI chat.
- **share-ai-message-read** -- Read an AI message response from a share chat. Polls until the AI response is complete.
- **share-ai-chat-publish** -- Publish a private AI chat in a share, making it visible to all share members.
- **share-ai-share-generate** -- Generate AI share markdown with temporary download URLs for share files.

### Metadata (metadata.ts -- 17 tools)

- **metadata-template-categories** -- List all available metadata template category strings.
- **workspace-metadata-template-create** -- Create a new metadata template in a workspace.
- **workspace-metadata-template-delete** -- Delete a metadata template from a workspace.
- **workspace-metadata-template-list** -- List metadata templates in a workspace, optionally filtered by status.
- **workspace-metadata-template-details** -- Get details of a specific metadata template in a workspace.
- **workspace-metadata-template-settings** -- Update settings (enabled state and priority) for a metadata template.
- **workspace-metadata-template-update** -- Update a metadata template. If copy is true, creates a copy instead.
- **workspace-metadata-delete** -- Delete metadata from a storage node. Optionally specify keys to delete.
- **workspace-metadata-details** -- Get metadata details for a storage node in a workspace.
- **workspace-metadata-extract** -- Extract metadata from a storage node using a specific template.
- **workspace-metadata-list** -- List metadata entries for a node under a specific template.
- **workspace-metadata-template-select** -- Select a metadata template for a storage node.
- **workspace-metadata-templates-in-use** -- List metadata templates currently in use on a storage node.
- **workspace-metadata-update** -- Update metadata key-value pairs on a node for a specific template.
- **workspace-metadata-view-save** -- Create or update a saved metadata view on a storage node.
- **workspace-metadata-view-delete** -- Delete a saved metadata view from a storage node.
- **workspace-metadata-views-list** -- List all saved metadata views on a storage node.

### Versions (versions.ts -- 4 tools)

- **workspace-versions-list** -- List version history for a file in a workspace.
- **workspace-version-restore** -- Restore a file in a workspace to a previous version.
- **share-versions-list** -- List version history for a file in a share.
- **share-version-restore** -- Restore a file in a share to a previous version.

### Locking (locking.ts -- 6 tools)

- **workspace-lock-acquire** -- Acquire an exclusive lock on a file in a workspace to prevent concurrent edits.
- **workspace-lock-status** -- Check the lock status of a file in a workspace.
- **workspace-lock-release** -- Release an exclusive lock on a file in a workspace.
- **share-lock-acquire** -- Acquire an exclusive lock on a file in a share to prevent concurrent edits.
- **share-lock-status** -- Check the lock status of a file in a share.
- **share-lock-release** -- Release an exclusive lock on a file in a share.

### Events (events.ts -- 3 tools)

- **events-search** -- Search the audit/event log with filters for profile, event type, category, and date range.
- **events-summarize** -- Search events and return an AI-powered natural language summary of the activity.
- **event-details** -- Get full details for a single event by its ID.

### Realtime (realtime.ts -- 3 tools)

- **realtime-auth** -- Generate a scoped realtime JWT for a YJS collaborative room (workspace or share). Returns a 24-hour token.
- **realtime-validate** -- Validate a realtime JWT and extract the room ID it is bound to.
- **websocket-auth** -- Generate a scoped WebSocket JWT for event channels. Supports user, org, workspace, and share profiles. Returns a 24-hour token.

### System (system.ts -- 7 tools)

- **system-status** -- Get the Fast.io system status (no authentication required).
- **ping** -- Ping the Fast.io API to check connectivity (no authentication required).
- **activity-list** -- Poll for recent activity events on a workspace or share.
- **activity-poll** -- Long-poll for activity changes on a workspace or share. The server holds the connection until a change occurs or the wait period expires. Returns activity keys indicating what changed and a lastactivity timestamp for the next poll.
- **webhooks-list** -- List webhooks configured on a workspace or share.
- **webhook-create** -- Create a new webhook on a workspace or share.
- **webhook-delete** -- Delete a webhook from a workspace or share.
