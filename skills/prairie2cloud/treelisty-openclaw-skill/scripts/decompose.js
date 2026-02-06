/**
 * TreeListy Decomposition Engine
 * Applies hierarchical patterns to structure content
 *
 * Copyright (c) 2024-2026 Prairie2Cloud LLC
 * Licensed under Apache-2.0
 */

const { getPattern } = require('./patterns')

/**
 * Generate a short unique ID
 */
function generateId() {
  return 'n_' + Math.random().toString(16).substr(2, 8)
}

/**
 * Generate tree-level ID
 */
function generateTreeId() {
  return 'tree_' + Math.random().toString(16).substr(2, 8)
}

/**
 * Create a node with standard structure
 */
function createNode(name, level, type = null, patternKey = 'generic') {
  const pattern = getPattern(patternKey)
  const levelNames = ['root', 'phase', 'item', 'subtask']

  return {
    id: generateId(),
    nodeGuid: generateId(),
    name,
    type: levelNames[level] || 'item',
    patternType: type,
    description: '',
    expanded: true,
    children: level === 0 ? [] : undefined,
    items: level === 1 ? [] : undefined,
    subtasks: level === 2 ? [] : undefined,
  }
}

/**
 * Parse input text into hierarchical structure
 * Supports multiple formats:
 * - Plain text (one item per line)
 * - Indented lists (spaces/tabs indicate depth)
 * - Numbered lists (1. 1.1 1.1.1 format)
 * - Markdown headers (# ## ### ####)
 *
 * Hierarchy mapping:
 * - # = root (depth 0)
 * - ## = phase (depth 1)
 * - - bullet under ## = item (depth 2)
 * - ### or indented bullet = subtask (depth 3)
 */
function parseInput(input) {
  const lines = input.split('\n').filter((line) => line.trim())
  const items = []

  // Track current context for relative depth
  let lastHeaderDepth = 0

  for (const line of lines) {
    // Check for markdown headers
    const headerMatch = line.match(/^(#{1,4})\s*(.+)$/)
    if (headerMatch) {
      const headerLevel = headerMatch[1].length
      lastHeaderDepth = headerLevel
      items.push({
        depth: Math.min(headerLevel - 1, 3),
        text: headerMatch[2].trim(),
      })
      continue
    }

    // Check for numbered format (1.1.1)
    const numberedMatch = line.match(/^(\d+(?:\.\d+)*)\s*[.):]\s*(.+)$/)
    if (numberedMatch) {
      const depth = numberedMatch[1].split('.').length
      items.push({
        depth: Math.min(depth, 3),
        text: numberedMatch[2].trim(),
      })
      continue
    }

    // Check for bullet points (with or without indentation)
    const bulletMatch = line.match(/^(\s*)[-*+]\s*(.+)$/)
    if (bulletMatch) {
      const indent = bulletMatch[1].length
      // Bullets after a ## header are items (depth 2)
      // Indented bullets are subtasks (depth 3)
      let depth
      if (indent === 0) {
        // Non-indented bullet: one level below last header
        depth = Math.min(lastHeaderDepth, 2)
      } else {
        // Indented bullet: subtask level
        depth = Math.min(lastHeaderDepth + Math.floor(indent / 2), 3)
      }
      items.push({
        depth,
        text: bulletMatch[2].trim(),
      })
      continue
    }

    // Check for indentation only (no bullet, no header)
    const indentMatch = line.match(/^(\s+)(.+)$/)
    if (indentMatch) {
      const indent = indentMatch[1].length
      const depth = Math.min(Math.floor(indent / 2) + 1, 3)
      items.push({
        depth,
        text: indentMatch[2].trim(),
      })
      continue
    }

    // Plain text line (no indent, no bullet, no header)
    // Treat as phase level
    items.push({
      depth: 1,
      text: line.trim(),
    })
  }

  return items
}

/**
 * Build tree from parsed items
 */
function buildTree(items, patternKey) {
  const pattern = getPattern(patternKey)
  if (!pattern) {
    throw new Error(`Unknown pattern: ${patternKey}`)
  }

  // Create root
  const rootName =
    items.length > 0 && items[0].depth === 0 ? items[0].text : `New ${pattern.levels[0]}`

  const root = {
    id: generateId(),
    nodeGuid: generateId(),
    treeId: generateTreeId(),
    schemaVersion: 2,
    name: rootName,
    type: 'root',
    pattern: patternKey,
    icon: pattern.icon,
    description: '',
    expanded: true,
    children: [],
  }

  // Track current position in hierarchy
  let currentPhase = null
  let currentItem = null

  // Start from 1 if first item was used as root name
  const startIdx = items.length > 0 && items[0].depth === 0 ? 1 : 0

  for (let i = startIdx; i < items.length; i++) {
    const item = items[i]

    switch (item.depth) {
      case 0:
      case 1:
        // Phase level
        currentPhase = createNode(item.text, 1, null, patternKey)
        currentPhase.items = []
        root.children.push(currentPhase)
        currentItem = null
        break

      case 2:
        // Item level
        if (!currentPhase) {
          // Create default phase
          currentPhase = createNode(pattern.phaseSubtitles[0] || 'Phase 1', 1, null, patternKey)
          currentPhase.items = []
          root.children.push(currentPhase)
        }
        currentItem = createNode(item.text, 2, null, patternKey)
        currentItem.subtasks = []
        currentPhase.items.push(currentItem)
        break

      case 3:
        // Subtask level
        if (!currentPhase) {
          currentPhase = createNode(pattern.phaseSubtitles[0] || 'Phase 1', 1, null, patternKey)
          currentPhase.items = []
          root.children.push(currentPhase)
        }
        if (!currentItem) {
          currentItem = createNode('Tasks', 2, null, patternKey)
          currentItem.subtasks = []
          currentPhase.items.push(currentItem)
        }
        const subtask = createNode(item.text, 3, null, patternKey)
        currentItem.subtasks.push(subtask)
        break
    }
  }

  return root
}

/**
 * Apply pattern template to generate starter structure
 */
function applyPatternTemplate(patternKey, projectName = null) {
  const pattern = getPattern(patternKey)
  if (!pattern) {
    throw new Error(`Unknown pattern: ${patternKey}`)
  }

  const root = {
    id: generateId(),
    nodeGuid: generateId(),
    treeId: generateTreeId(),
    schemaVersion: 2,
    name: projectName || `New ${pattern.levels[0]}`,
    type: 'root',
    pattern: patternKey,
    icon: pattern.icon,
    description: `${pattern.name} created with TreeListy`,
    expanded: true,
    children: [],
  }

  // Create phases from phaseSubtitles
  const phases = pattern.phaseSubtitles.slice(0, 3) // Max 3 starter phases

  for (const phaseName of phases) {
    const phase = {
      id: generateId(),
      nodeGuid: generateId(),
      name: phaseName,
      type: 'phase',
      description: '',
      expanded: true,
      items: [],
    }

    // Add placeholder item
    phase.items.push({
      id: generateId(),
      nodeGuid: generateId(),
      name: `${phaseName} Tasks`,
      type: 'item',
      patternType: pattern.types[0] || null,
      description: '',
      expanded: true,
      subtasks: [],
    })

    root.children.push(phase)
  }

  return root
}

/**
 * Main decompose function
 * Takes text input and structures it according to the pattern
 */
function decompose(input, patternKey = 'generic', options = {}) {
  const { depth = 3, projectName = null } = options

  // If no input, generate template
  if (!input || input.trim() === '') {
    return applyPatternTemplate(patternKey, projectName)
  }

  // Parse and structure the input
  const items = parseInput(input)

  if (items.length === 0) {
    return applyPatternTemplate(patternKey, projectName)
  }

  // Build tree from parsed items
  const tree = buildTree(items, patternKey)

  // Override name if provided
  if (projectName) {
    tree.name = projectName
  }

  return tree
}

/**
 * Decompose with suggested structure
 * Provides pattern-appropriate phase breakdown
 */
function decomposeWithSuggestions(topic, patternKey = 'generic') {
  const pattern = getPattern(patternKey)
  if (!pattern) {
    throw new Error(`Unknown pattern: ${patternKey}`)
  }

  const root = {
    id: generateId(),
    nodeGuid: generateId(),
    treeId: generateTreeId(),
    schemaVersion: 2,
    name: topic,
    type: 'root',
    pattern: patternKey,
    icon: pattern.icon,
    description: `Decomposition of: ${topic}`,
    expanded: true,
    children: [],
    _suggestions: {
      pattern: patternKey,
      patternName: pattern.name,
      suggestedPhases: pattern.phaseSubtitles,
      availableTypes: pattern.types,
      fields: Object.keys(pattern.fields || {}),
      instructions: `Use "${pattern.levels[1]}" nodes for major divisions, "${pattern.levels[2]}" for components, and "${pattern.levels[3]}" for atomic tasks.`,
    },
  }

  return root
}

module.exports = {
  decompose,
  decomposeWithSuggestions,
  applyPatternTemplate,
  parseInput,
  createNode,
  generateId,
  generateTreeId,
}
