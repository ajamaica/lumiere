# Logseq Plugin API Reference

Complete reference for the Logseq Plugin API, extracted from `@logseq/libs` type definitions.

## Table of Contents

1. [App API](#app-api)
2. [Editor API](#editor-api)
3. [DB API](#db-api)
4. [UI API](#ui-api)
5. [Git API](#git-api)
6. [Assets API](#assets-api)
7. [Data Types](#data-types)

## App API

Application-level operations and configuration.

### Methods

#### `getInfo(key?: string)`

Get app information (version, etc.).

```javascript
const info = await logseq.App.getInfo()
// { version: '0.10.9', ... }

const version = await logseq.App.getInfo('version')
// '0.10.9'
```

#### `getUserInfo()`

Get current user information.

```javascript
const user = await logseq.App.getUserInfo()
```

#### `getUserConfigs()`

Get user configuration preferences.

```javascript
const configs = await logseq.App.getUserConfigs()
// {
//   preferredThemeMode: 'dark',
//   preferredFormat: 'markdown',
//   preferredDateFormat: 'MMM do, yyyy',
//   preferredLanguage: 'en',
//   currentGraph: 'my-graph',
//   ...
// }
```

#### `getCurrentGraph()`

Get current graph information.

```javascript
const graph = await logseq.App.getCurrentGraph()
// {
//   name: 'my-notes',
//   path: '/path/to/graph',
//   url: 'logseq://graph/my-notes'
// }
```

#### `getCurrentGraphConfigs(...keys)`

Get graph-specific configuration values.

```javascript
const config = await logseq.App.getCurrentGraphConfigs('default-page')
```

#### `setCurrentGraphConfigs(configs)`

Update graph-specific configuration.

```javascript
await logseq.App.setCurrentGraphConfigs({
  'default-page': 'Home',
})
```

#### `registerCommand(type, opts, action)`

Register a custom command.

```javascript
logseq.App.registerCommand(
  'my-plugin',
  {
    key: 'my-command',
    label: 'My Custom Command',
    desc: 'Description here',
    palette: true, // Show in command palette
    keybinding: {
      mode: 'global',
      binding: 'ctrl+shift+x',
    },
  },
  async () => {
    console.log('Command executed!')
  },
)
```

#### `registerCommandPalette(opts, action)`

Register a command in the command palette.

```javascript
logseq.App.registerCommandPalette(
  {
    key: 'quick-action',
    label: 'Quick Action',
    keybinding: {
      binding: 'ctrl+q',
    },
  },
  async () => {
    // Command logic
  },
)
```

#### `invokeExternalCommand(type, ...args)`

Invoke built-in Logseq commands.

```javascript
// Available commands:
// 'logseq.go/home'
// 'logseq.go/journals'
// 'logseq.go/search'
// 'logseq.editor/zoom-in'
// 'logseq.editor/zoom-out'
// 'logseq.ui/toggle-left-sidebar'
// ... and many more

await logseq.App.invokeExternalCommand('logseq.go/home')
```

#### `pushState(route, params?, query?)`

Navigate to a route.

```javascript
// Go to a page
logseq.App.pushState('page', { name: 'Project Notes' })

// Go to a block
logseq.App.pushState('page', { name: 'My Page' }, { anchor: 'block-uuid' })
```

#### `replaceState(route, params?, query?)`

Replace current route (doesn't add to history).

```javascript
logseq.App.replaceState('page', { name: 'New Page' })
```

### Events

#### `onCurrentGraphChanged(callback)`

Triggered when graph changes.

```javascript
logseq.App.onCurrentGraphChanged(() => {
  console.log('Graph changed!')
})
```

#### `onThemeModeChanged(callback)`

Triggered when theme mode changes (light/dark).

```javascript
logseq.App.onThemeModeChanged(({ mode }) => {
  console.log('Theme is now:', mode)
})
```

#### `onTodayJournalCreated(callback)`

Triggered when today's journal is created.

```javascript
logseq.App.onTodayJournalCreated(({ title }) => {
  console.log('Journal created:', title)
})
```

---

## Editor API

Block and page manipulation.

### Block Operations

#### `getBlock(identity, opts?)`

Get a block by UUID or page name.

```javascript
const block = await logseq.Editor.getBlock('uuid-here')
const block = await logseq.Editor.getBlock({ uuid: 'uuid-here' })

// Include children
const blockWithChildren = await logseq.Editor.getBlock('uuid', {
  includeChildren: true,
})
```

#### `insertBlock(target, content, opts?)`

Insert a new block.

```javascript
// Insert as child
await logseq.Editor.insertBlock('parent-uuid', 'New block content', {
  sibling: false, // Insert as child
})

// Insert as sibling (after)
await logseq.Editor.insertBlock('sibling-uuid', 'New block', {
  sibling: true,
  before: false,
})

// Insert before
await logseq.Editor.insertBlock('target-uuid', 'New block', {
  sibling: true,
  before: true,
})

// With properties
await logseq.Editor.insertBlock('parent', 'Block with properties', {
  properties: {
    tags: 'important',
    priority: 'high',
  },
})
```

#### `updateBlock(uuid, content, opts?)`

Update block content.

```javascript
await logseq.Editor.updateBlock('uuid', 'Updated content')

// Update properties
await logseq.Editor.updateBlock('uuid', 'Content', {
  properties: {
    status: 'done',
  },
})
```

#### `removeBlock(uuid)`

Delete a block.

```javascript
await logseq.Editor.removeBlock('uuid-here')
```

#### `moveBlock(uuid, target, opts?)`

Move a block to a new location.

```javascript
// Move as child
await logseq.Editor.moveBlock('block-uuid', 'target-uuid', {
  children: true,
})

// Move as sibling
await logseq.Editor.moveBlock('block-uuid', 'target-uuid', {
  before: false,
})
```

#### `insertBatchBlock(target, batch, opts?)`

Insert multiple blocks at once.

```javascript
const blocks = [
  {
    content: 'First block',
    properties: { tag: 'work' },
  },
  {
    content: 'Second block',
    children: [{ content: 'Nested block' }],
  },
]

await logseq.Editor.insertBatchBlock('parent-uuid', blocks, {
  sibling: false,
})
```

#### `getCurrentBlock()`

Get the currently focused block.

```javascript
const block = await logseq.Editor.getCurrentBlock()
if (block) {
  console.log('Current block:', block.content)
}
```

#### `getSelectedBlocks()`

Get all currently selected blocks.

```javascript
const blocks = await logseq.Editor.getSelectedBlocks()
if (blocks) {
  blocks.forEach((b) => console.log(b.content))
}
```

### Page Operations

#### `createPage(pageName, properties?, opts?)`

Create a new page.

```javascript
await logseq.Editor.createPage(
  'Project Notes',
  {
    tags: 'project, work',
    status: 'active',
  },
  {
    redirect: false, // Don't navigate to page
    createFirstBlock: true,
    journal: false,
  },
)
```

#### `deletePage(pageName)`

Delete a page.

```javascript
await logseq.Editor.deletePage('Old Notes')
```

#### `getPage(identity, opts?)`

Get a page by name or ID.

```javascript
const page = await logseq.Editor.getPage('Project Notes')
const page = await logseq.Editor.getPage(42) // By entity ID

// Include children
const pageWithBlocks = await logseq.Editor.getPage('Notes', {
  includeChildren: true,
})
```

#### `renamePage(oldName, newName)`

Rename a page.

```javascript
await logseq.Editor.renamePage('Old Name', 'New Name')
```

#### `getCurrentPage()`

Get the current page.

```javascript
const page = await logseq.Editor.getCurrentPage()
if (page) {
  console.log('On page:', page.originalName)
}
```

#### `getCurrentPageBlocksTree()`

Get all blocks on current page as tree.

```javascript
const blocks = await logseq.Editor.getCurrentPageBlocksTree()
// Returns array of top-level blocks with nested children
```

#### `getPageBlocksTree(pageName)`

Get all blocks for a specific page.

```javascript
const blocks = await logseq.Editor.getPageBlocksTree('Daily Notes')
```

#### `getPageLinkedReferences(page)`

Get all backlinks to a page.

```javascript
const refs = await logseq.Editor.getPageLinkedReferences('Project A')
// Returns: [[page1, [block1, block2]], [page2, [block3]], ...]
```

#### `getPagesFromNamespace(namespace)`

Get all pages under a namespace.

```javascript
const pages = await logseq.Editor.getPagesFromNamespace('project')
// Returns pages like: project/alpha, project/beta, etc.
```

### Editor State

#### `checkEditing()`

Check if editor is in editing mode.

```javascript
const editing = await logseq.Editor.checkEditing()
if (editing) {
  console.log('Editing block:', editing) // Returns block UUID
}
```

#### `exitEditingMode(selectBlock?)`

Exit editing mode.

```javascript
await logseq.Editor.exitEditingMode(true) // Select the block
```

#### `getEditingCursorPosition()`

Get cursor position info.

```javascript
const pos = await logseq.Editor.getEditingCursorPosition()
// { left, top, height, pos, rect }
```

#### `getEditingBlockContent()`

Get content of currently editing block.

```javascript
const content = await logseq.Editor.getEditingBlockContent()
```

#### `insertAtEditingCursor(text)`

Insert text at cursor position.

```javascript
await logseq.Editor.insertAtEditingCursor('inserted text')
```

### Custom Commands

#### `registerSlashCommand(tag, action)`

Add a custom slash command.

```javascript
logseq.Editor.registerSlashCommand('Say Hello', async ({ uuid }) => {
  await logseq.Editor.updateBlock(uuid, 'Hello, World!')
})

// With command array
logseq.Editor.registerSlashCommand('Custom Action', [
  ['editor/input', 'Text to insert'],
  ['editor/clear-current-slash'],
])
```

#### `registerBlockContextMenuItem(label, action)`

Add item to block context menu (right-click).

```javascript
logseq.Editor.registerBlockContextMenuItem('Export Block', async ({ uuid }) => {
  const block = await logseq.Editor.getBlock(uuid)
  console.log('Exporting:', block.content)
})
```

---

## DB API

Database queries using Datalog.

### Methods

#### `q(query, ...inputs)`

Run a Datalog query.

```javascript
// Find all TODO blocks
const todos = await logseq.DB.q(`
  [:find (pull ?b [*])
   :where
   [?b :block/marker "TODO"]]
`)

// Find blocks with specific tag
const tagged = await logseq.DB.q(`
  [:find (pull ?b [*])
   :where
   [?b :block/properties ?props]
   [(get ?props :tags) ?tags]
   [(= ?tags "important")]]
`)

// With input parameters
const results = await logseq.DB.q(
  `
  [:find (pull ?b [*])
   :in $ ?tag
   :where
   [?b :block/properties ?props]
   [(get ?props :tags) ?t]
   [(= ?t ?tag)]]
`,
  'work',
)
```

#### `datascriptQuery(query, ...inputs)`

Direct Datascript query (same as `q`).

```javascript
const results = await logseq.DB.datascriptQuery('[:find (pull ?e [*]) :where [?e :block/uuid]]')
```

### Common Query Patterns

```javascript
// All pages
await logseq.DB.q('[:find (pull ?p [*]) :where [?p :block/name]]')

// All journals
await logseq.DB.q('[:find (pull ?p [*]) :where [?p :block/journal? true]]')

// Blocks on specific page
await logseq.DB.q(
  `
  [:find (pull ?b [*])
   :in $ ?page-name
   :where
   [?p :block/name ?page-name]
   [?b :block/page ?p]]
`,
  'my-page',
)

// Blocks with links to a page
await logseq.DB.q(`
  [:find (pull ?b [*])
   :where
   [?b :block/refs ?ref]
   [?ref :block/name "target-page"]]
`)
```

---

## UI API

UI manipulation and notifications.

### Methods

#### `showMsg(content, status?)`

Show a toast notification.

```javascript
logseq.UI.showMsg('✅ Task completed!', 'success')
logseq.UI.showMsg('⚠️ Warning message', 'warning')
logseq.UI.showMsg('❌ Error occurred', 'error')
logseq.UI.showMsg('ℹ️ Info message') // Default
```

#### `queryElementById(id)`

Query DOM element by ID.

```javascript
const element = await logseq.UI.queryElementById('my-element')
```

---

## Git API

Git operations for the current graph.

### Methods

#### `execCommand(args)`

Execute git command.

```javascript
// Git status
const status = await logseq.Git.execCommand(['status'])

// Git log
const log = await logseq.Git.execCommand(['log', '-10', '--oneline'])

// Git commit
await logseq.Git.execCommand(['commit', '-m', 'Update notes'])
```

---

## Assets API

Asset and file management.

### Methods

#### `listFilesOfCurrentGraph(path?)`

List files in the current graph.

```javascript
const files = await logseq.Assets.listFilesOfCurrentGraph()
// Returns array of file paths

const imagesInAssets = await logseq.Assets.listFilesOfCurrentGraph('assets')
```

---

## Data Types

### BlockEntity

```typescript
{
  id: number;              // Entity ID
  uuid: string;            // Block UUID (stable identifier)
  content: string;         // Block content text
  format: 'markdown' | 'org';
  page: { id: number };    // Parent page reference
  parent: { id: number };  // Parent block reference
  left: { id: number };    // Previous sibling reference
  properties?: {           // Block properties
    [key: string]: any;
  };
  marker?: string;         // TODO/DOING/DONE/etc
  level?: number;          // Indentation level
  children?: Array<BlockEntity | [string, BlockUUID]>;
  file?: { id: number };
  anchor?: string;
  meta?: {
    timestamps: any;
    properties: any;
    startPos: number;
    endPos: number;
  };
}
```

### PageEntity

```typescript
{
  id: number;
  uuid: string;
  name: string;              // Lowercase page name
  originalName: string;      // Original case page name
  'journal?': boolean;       // Is journal page?
  file?: { id: number };
  namespace?: { id: number };
  children?: Array<PageEntity>;
  properties?: {
    [key: string]: any;
  };
  format?: 'markdown' | 'org';
  journalDay?: number;       // YYYYMMDD for journals
  updatedAt?: number;
}
```

### AppUserConfigs

```typescript
{
  preferredThemeMode: 'dark' | 'light';
  preferredFormat: 'markdown' | 'org';
  preferredDateFormat: string;
  preferredStartOfWeek: string;
  preferredLanguage: string;
  preferredWorkflow: string;
  currentGraph: string;
  showBracket: boolean;
  enabledFlashcards: boolean;
  enabledJournals: boolean;
  [key: string]: unknown;
}
```

### AppGraphInfo

```typescript
{
  name: string;     // Graph name
  url: string;      // Graph URL (logseq://...)
  path: string;     // Filesystem path
  [key: string]: unknown;
}
```

---

## Plugin Lifecycle

```javascript
import '@logseq/libs'

// Main entry point
function main() {
  console.log('Plugin loaded!')

  // Register commands, UI elements, etc.
  logseq.Editor.registerSlashCommand('My Command', () => {
    logseq.UI.showMsg('Command executed!')
  })
}

// Bootstrap
logseq.ready(main).catch(console.error)
```

## Plugin Model (Callbacks)

```javascript
// Provide model with callbacks
logseq
  .ready({
    async myCallback(args) {
      console.log('Callback invoked:', args)
      return 'result'
    },
  })
  .then(() => {
    // Plugin initialized
    console.log('Ready!')
  })
```

---

## Additional Resources

- **Type Definitions**: `@logseq/libs` package on npm
- **Plugin Samples**: https://github.com/logseq/logseq-plugin-samples
- **API Docs**: https://logseq.github.io/plugins/
- **Discord**: https://discord.gg/KpN4eHY
