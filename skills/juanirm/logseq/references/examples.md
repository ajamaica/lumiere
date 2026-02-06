# Logseq Plugin API Examples

Practical code examples for common Logseq automation tasks.

## Table of Contents

1. [Setup & Connection](#setup--connection)
2. [Reading Content](#reading-content)
3. [Creating Content](#creating-content)
4. [Task Management](#task-management)
5. [Queries & Search](#queries--search)
6. [Automation Workflows](#automation-workflows)
7. [Custom Commands](#custom-commands)

---

## Setup & Connection

### Basic Plugin Structure

```javascript
import '@logseq/libs'

async function main() {
  console.log('Plugin loaded')

  // Get current graph info
  const graph = await logseq.App.getCurrentGraph()
  console.log('Graph:', graph.name)

  // Get user preferences
  const configs = await logseq.App.getUserConfigs()
  console.log('Format:', configs.preferredFormat)
}

logseq.ready(main).catch(console.error)
```

### HTTP Bridge (for external scripts)

If you need to call Logseq API from external Node.js scripts, create a bridge plugin:

```javascript
// bridge-plugin/index.js
import '@logseq/libs'

logseq
  .ready({
    async call({ method, namespace, args }) {
      const proxy = logseq[namespace]
      if (!proxy || !proxy[method]) {
        throw new Error(`Unknown method: ${namespace}.${method}`)
      }
      return await proxy[method](...args)
    },
  })
  .then(() => {
    // Listen on HTTP or expose IPC
    console.log('Bridge ready')
  })
```

---

## Reading Content

### Get Current Page

```javascript
const page = await logseq.Editor.getCurrentPage()

if (page) {
  console.log('Current page:', page.originalName)
  console.log('Is journal?', page['journal?'])
  console.log('Properties:', page.properties)
}
```

### Get All Blocks on a Page

```javascript
const blocks = await logseq.Editor.getPageBlocksTree('Project Notes')

function printBlocks(blocks, indent = 0) {
  blocks.forEach((block) => {
    console.log(' '.repeat(indent * 2) + block.content)
    if (block.children) {
      printBlocks(block.children, indent + 1)
    }
  })
}

printBlocks(blocks)
```

### Get Specific Block

```javascript
const block = await logseq.Editor.getBlock('block-uuid-here')

if (block) {
  console.log('Content:', block.content)
  console.log('Properties:', block.properties)
  console.log('Marker:', block.marker) // TODO/DONE/etc
  console.log('Page:', block.page)
}
```

### Get Block with Children

```javascript
const blockTree = await logseq.Editor.getBlock('uuid', {
  includeChildren: true,
})

console.log('Block:', blockTree.content)
console.log('Children count:', blockTree.children?.length || 0)
```

### Find Page Backlinks

```javascript
const refs = await logseq.Editor.getPageLinkedReferences('Project A')

refs.forEach(([page, blocks]) => {
  console.log(`\nPage: ${page.originalName}`)
  blocks.forEach((block) => {
    console.log(`  - ${block.content}`)
  })
})
```

---

## Creating Content

### Create a New Page

```javascript
// Simple page
await logseq.Editor.createPage('Meeting Notes')

// With properties
await logseq.Editor.createPage(
  'Project Alpha',
  {
    status: 'active',
    tags: 'project, work',
    owner: 'John',
  },
  {
    redirect: false, // Don't navigate to page
  },
)

// Create journal page
const today = new Date()
const journalDay = parseInt(today.toISOString().slice(0, 10).replace(/-/g, ''))

await logseq.Editor.createPage(
  `Journal ${today.toDateString()}`,
  {},
  {
    journal: true,
    createFirstBlock: true,
  },
)
```

### Insert Single Block

```javascript
// Insert as child
const newBlock = await logseq.Editor.insertBlock('parent-uuid', '- New task item', {
  sibling: false,
})

console.log('Created block:', newBlock.uuid)

// Insert as sibling (after)
await logseq.Editor.insertBlock('existing-block-uuid', 'New sibling block', {
  sibling: true,
  before: false,
})

// Insert before
await logseq.Editor.insertBlock('target-uuid', 'Insert above target', {
  sibling: true,
  before: true,
})
```

### Insert Multiple Blocks

```javascript
const blocks = [
  {
    content: 'TODO Review documentation',
    properties: { priority: 'high' },
  },
  {
    content: 'TODO Update examples',
    children: [{ content: 'Add code samples' }, { content: 'Test all examples' }],
  },
  {
    content: 'DONE Setup project',
  },
]

await logseq.Editor.insertBatchBlock('parent-uuid', blocks, {
  sibling: false, // Insert as children
})
```

### Update Block Content

```javascript
// Simple update
await logseq.Editor.updateBlock('uuid', 'Updated content')

// Update with properties
await logseq.Editor.updateBlock('uuid', 'Content text', {
  properties: {
    status: 'completed',
    reviewed: 'true',
  },
})

// Update marker (task status)
const block = await logseq.Editor.getBlock('uuid')
const newContent = block.content.replace(/^TODO/, 'DONE')
await logseq.Editor.updateBlock('uuid', newContent)
```

### Move Blocks

```javascript
// Move as child of target
await logseq.Editor.moveBlock('block-uuid', 'target-uuid', {
  children: true,
})

// Move as sibling after target
await logseq.Editor.moveBlock('block-uuid', 'target-uuid', {
  before: false,
})

// Move before target
await logseq.Editor.moveBlock('block-uuid', 'target-uuid', {
  before: true,
})
```

---

## Task Management

### Find All TODO Items

```javascript
const todos = await logseq.DB.q(`
  [:find (pull ?b [*])
   :where
   [?b :block/marker ?marker]
   [(contains? #{"TODO" "DOING"} ?marker)]]
`)

console.log(`Found ${todos.length} tasks`)

todos.forEach(([block]) => {
  console.log(`${block.marker}: ${block.content}`)
})
```

### Mark Task as Complete

```javascript
async function completeTask(uuid) {
  const block = await logseq.Editor.getBlock(uuid)

  if (!block) return

  // Replace TODO/DOING with DONE
  const updated = block.content.replace(/^TODO\s+/, 'DONE ').replace(/^DOING\s+/, 'DONE ')

  await logseq.Editor.updateBlock(uuid, updated)
  logseq.UI.showMsg('✅ Task completed!', 'success')
}

await completeTask('task-uuid-here')
```

### Get Tasks on Current Page

```javascript
const page = await logseq.Editor.getCurrentPage()
const blocks = await logseq.Editor.getPageBlocksTree(page.name)

const tasks = blocks.filter((b) => b.marker === 'TODO' || b.marker === 'DOING')

console.log(`${tasks.length} active tasks on this page`)
```

### Create Daily Task List

```javascript
async function createDailyTasks() {
  const today = new Date().toISOString().slice(0, 10)
  const page = await logseq.Editor.getPage(today)

  if (!page) {
    await logseq.Editor.createPage(today, {}, { journal: true })
  }

  const tasks = [
    { content: 'TODO Review emails' },
    { content: 'TODO Team standup' },
    { content: 'TODO Write progress report' },
  ]

  const blocks = await logseq.Editor.getPageBlocksTree(today)
  const firstBlock = blocks[0]

  await logseq.Editor.insertBatchBlock(firstBlock.uuid, tasks, {
    sibling: false,
  })

  logseq.UI.showMsg('📝 Daily tasks created!')
}

await createDailyTasks()
```

### Filter High Priority Tasks

```javascript
const highPriority = await logseq.DB.q(`
  [:find (pull ?b [*])
   :where
   [?b :block/marker ?m]
   [(contains? #{"TODO" "DOING"} ?m)]
   [?b :block/properties ?props]
   [(get ?props :priority) ?p]
   [(= ?p "high")]]
`)

console.log('High priority tasks:', highPriority.length)
```

---

## Queries & Search

### Find Blocks with Specific Tag

```javascript
const tagged = await logseq.DB.q(`
  [:find (pull ?b [*])
   :where
   [?b :block/properties ?props]
   [(get ?props :tags) ?tags]
   [(clojure.string/includes? ?tags "important")]]
`)
```

### Find All Pages in a Namespace

```javascript
const projectPages = await logseq.Editor.getPagesFromNamespace('project')

projectPages.forEach((page) => {
  console.log(page.originalName)
})
```

### Search Block Content

```javascript
const results = await logseq.DB.q(`
  [:find (pull ?b [*])
   :where
   [?b :block/content ?content]
   [(clojure.string/includes? ?content "keyword")]]
`)
```

### Get All Journal Pages

```javascript
const journals = await logseq.DB.q(`
  [:find (pull ?p [*])
   :where
   [?p :block/journal? true]]
`)

// Sort by date
journals.sort((a, b) => b[0].journalDay - a[0].journalDay)

console.log('Latest journals:', journals.slice(0, 5))
```

### Find Blocks Linking to Page

```javascript
const backlinks = await logseq.DB.q(
  `
  [:find (pull ?b [*])
   :in $ ?page-name
   :where
   [?p :block/name ?page-name]
   [?b :block/refs ?p]]
`,
  'target-page',
)
```

---

## Automation Workflows

### Auto-Archive Completed Tasks

```javascript
async function archiveCompletedTasks() {
  const done = await logseq.DB.q(`
    [:find (pull ?b [*])
     :where
     [?b :block/marker "DONE"]]
  `)

  // Create archive page
  const archivePage = `Archive/${new Date().getFullYear()}`
  await logseq.Editor.createPage(archivePage, {}, { redirect: false })

  const archiveBlocks = await logseq.Editor.getPageBlocksTree(archivePage)
  const targetBlock = archiveBlocks[0]

  // Move completed tasks
  for (const [block] of done) {
    await logseq.Editor.moveBlock(block.uuid, targetBlock.uuid, {
      children: true,
    })
  }

  logseq.UI.showMsg(`📦 Archived ${done.length} completed tasks`)
}
```

### Weekly Review Generator

```javascript
async function generateWeeklyReview() {
  const today = new Date()
  const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000)

  // Create review page
  const reviewPage = `Weekly Review ${today.toISOString().slice(0, 10)}`
  await logseq.Editor.createPage(
    reviewPage,
    {
      type: 'review',
      date: today.toISOString(),
    },
    { redirect: true },
  )

  const pageBlocks = await logseq.Editor.getCurrentPageBlocksTree()
  const firstBlock = pageBlocks[0]

  // Get completed tasks
  const completed = await logseq.DB.q(`
    [:find (pull ?b [*])
     :where
     [?b :block/marker "DONE"]]
  `)

  // Build review content
  const reviewBlocks = [
    { content: '## Completed This Week' },
    ...completed.map(([b]) => ({
      content: `- ${b.content}`,
    })),
    { content: '## Key Learnings' },
    { content: '## Next Week Goals' },
  ]

  await logseq.Editor.insertBatchBlock(firstBlock.uuid, reviewBlocks, {
    sibling: false,
  })
}
```

### Auto-Tag Pages

````javascript
async function autoTagPages() {
  const pages = await logseq.DB.q(`
    [:find (pull ?p [*])
     :where
     [?p :block/name]]
  `)

  for (const [page] of pages) {
    const blocks = await logseq.Editor.getPageBlocksTree(page.name)

    // Analyze content and add tags
    const hasCode = blocks.some((b) => b.content.includes('```') || b.content.includes('code::'))

    if (hasCode && !page.properties?.tags?.includes('technical')) {
      await logseq.Editor.updateBlock(page.uuid, page.content, {
        properties: {
          ...page.properties,
          tags: [...(page.properties?.tags || []), 'technical'],
        },
      })
    }
  }
}
````

---

## Custom Commands

### Slash Command Example

```javascript
logseq.Editor.registerSlashCommand('Insert Current Time', async ({ uuid }) => {
  const now = new Date().toLocaleTimeString()
  await logseq.Editor.insertAtEditingCursor(now)
})
```

### Block Context Menu Command

```javascript
logseq.Editor.registerBlockContextMenuItem('📋 Copy Block Link', async ({ uuid }) => {
  const block = await logseq.Editor.getBlock(uuid)
  const page = await logseq.Editor.getPage(block.page.id)

  const link = `[[${page.originalName}#${uuid}]]`

  // Copy to clipboard (browser API)
  await navigator.clipboard.writeText(link)

  logseq.UI.showMsg('📋 Block link copied!', 'success')
})
```

### Command Palette Entry

```javascript
logseq.App.registerCommandPalette(
  {
    key: 'create-template',
    label: 'Create New Template',
    keybinding: {
      mode: 'global',
      binding: 'ctrl+shift+t',
    },
  },
  async () => {
    const name = await logseq.UI.queryElementById('template-name')
    // ... template creation logic
  },
)
```

### Toolbar Button

```javascript
logseq.App.registerUIItem('toolbar', {
  key: 'quick-note',
  template: `
    <a class="button" data-on-click="createQuickNote">
      📝 Quick Note
    </a>
  `,
})

logseq.provideModel({
  async createQuickNote() {
    const note = prompt('Enter your note:')
    if (!note) return

    const today = new Date().toISOString().slice(0, 10)
    const blocks = await logseq.Editor.getPageBlocksTree(today)

    await logseq.Editor.insertBlock(blocks[0].uuid, `- ${note}`, {
      sibling: false,
    })

    logseq.UI.showMsg('📝 Note added!')
  },
})
```

---

## Error Handling

Always check for null/undefined returns:

```javascript
async function safeGetBlock(uuid) {
  try {
    const block = await logseq.Editor.getBlock(uuid)

    if (!block) {
      logseq.UI.showMsg('❌ Block not found', 'error')
      return null
    }

    return block
  } catch (error) {
    console.error('Error fetching block:', error)
    logseq.UI.showMsg('❌ Error: ' + error.message, 'error')
    return null
  }
}
```

## Performance Tips

1. **Batch operations**: Use `insertBatchBlock` instead of multiple `insertBlock` calls
2. **Limit queries**: Add limits to Datalog queries to avoid loading entire database
3. **Cache page lookups**: Store frequently accessed page IDs
4. **Use UUIDs**: Block UUIDs are more stable than entity IDs

---

## Testing Your Plugin

```javascript
// Add debug logging
const DEBUG = true

function log(...args) {
  if (DEBUG) {
    console.log('[Plugin]', ...args)
  }
}

// Test with simple operations first
async function test() {
  log('Testing plugin...')

  const page = await logseq.Editor.getCurrentPage()
  log('Current page:', page?.originalName)

  const configs = await logseq.App.getUserConfigs()
  log('User format:', configs.preferredFormat)

  log('Test complete!')
}

logseq.ready(test)
```
