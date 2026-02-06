/**
 * TreeListy Export Module
 * Converts tree JSON to multiple formats
 *
 * Copyright (c) 2024-2026 Prairie2Cloud LLC
 * Licensed under Apache-2.0
 */

const { getPattern } = require('./patterns')

/**
 * Export tree to JSON (passthrough with optional pretty print)
 */
function toJSON(tree, pretty = true) {
  return pretty ? JSON.stringify(tree, null, 2) : JSON.stringify(tree)
}

/**
 * Export tree to Markdown
 */
function toMarkdown(tree, options = {}) {
  const { includeMetadata = false, includeFields = false } = options
  const lines = []

  // Title
  lines.push(`# ${tree.icon || ''} ${tree.name}`.trim())
  lines.push('')

  if (includeMetadata) {
    lines.push(`**Pattern:** ${tree.pattern || 'generic'}`)
    if (tree.description) {
      lines.push(`**Description:** ${tree.description}`)
    }
    lines.push('')
  }

  // Phases (children)
  if (tree.children) {
    for (const phase of tree.children) {
      lines.push(`## ${phase.name}`)
      if (phase.description) {
        lines.push(phase.description)
      }
      lines.push('')

      // Items
      if (phase.items) {
        for (const item of phase.items) {
          lines.push(`### ${item.name}`)
          if (item.description) {
            lines.push(item.description)
          }

          // Subtasks
          if (item.subtasks && item.subtasks.length > 0) {
            lines.push('')
            for (const subtask of item.subtasks) {
              const checkbox = subtask.tracking?.status === 'completed' ? '[x]' : '[ ]'
              lines.push(`- ${checkbox} ${subtask.name}`)
              if (includeFields && subtask.description) {
                lines.push(`  - ${subtask.description}`)
              }
            }
          }
          lines.push('')
        }
      }
    }
  }

  return lines.join('\n')
}

/**
 * Export tree to Mermaid diagram
 */
function toMermaid(tree, options = {}) {
  const { direction = 'TB', showTypes = false } = options
  const lines = []
  const nodeIds = new Map()
  let nodeCounter = 0

  // Get unique ID for a node
  function getNodeId(node) {
    if (!nodeIds.has(node.id || node.nodeGuid)) {
      nodeIds.set(node.id || node.nodeGuid, `N${nodeCounter++}`)
    }
    return nodeIds.get(node.id || node.nodeGuid)
  }

  // Escape special characters for Mermaid
  function escape(text) {
    return text
      .replace(/["\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Start flowchart
  lines.push(`flowchart ${direction}`)

  // Root node (rounded box)
  const rootId = getNodeId(tree)
  const rootLabel = tree.icon ? `${tree.icon} ${escape(tree.name)}` : escape(tree.name)
  lines.push(`    ${rootId}([${rootLabel}])`)

  // Process phases
  if (tree.children) {
    for (const phase of tree.children) {
      const phaseId = getNodeId(phase)
      const phaseLabel = escape(phase.name)

      // Phase node (box)
      lines.push(`    ${phaseId}[${phaseLabel}]`)
      lines.push(`    ${rootId} --> ${phaseId}`)

      // Process items
      if (phase.items) {
        for (const item of phase.items) {
          const itemId = getNodeId(item)
          let itemLabel = escape(item.name)
          if (showTypes && item.patternType) {
            itemLabel = `${itemLabel}<br/><small>${item.patternType}</small>`
          }

          // Item node (rounded rectangle)
          lines.push(`    ${itemId}(${itemLabel})`)
          lines.push(`    ${phaseId} --> ${itemId}`)

          // Process subtasks
          if (item.subtasks) {
            for (const subtask of item.subtasks) {
              const subtaskId = getNodeId(subtask)
              const subtaskLabel = escape(subtask.name)
              const isComplete = subtask.tracking?.status === 'completed'

              // Subtask node (smaller rounded)
              if (isComplete) {
                lines.push(`    ${subtaskId}((${subtaskLabel}))`)
                lines.push(`    style ${subtaskId} fill:#90EE90`)
              } else {
                lines.push(`    ${subtaskId}((${subtaskLabel}))`)
              }
              lines.push(`    ${itemId} --> ${subtaskId}`)
            }
          }
        }
      }
    }
  }

  return lines.join('\n')
}

/**
 * Export tree to CSV
 */
function toCSV(tree, options = {}) {
  const { includeFields = true } = options
  const pattern = getPattern(tree.pattern || 'generic')
  const rows = []

  // Header row
  const headers = ['Level', 'Name', 'Type', 'Description']
  if (includeFields && pattern && pattern.fields) {
    headers.push(...Object.keys(pattern.fields))
  }
  rows.push(headers.join(','))

  // Escape CSV value
  function csvEscape(val) {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Add a node row
  function addRow(node, level) {
    const row = [
      pattern?.levels[level] || `Level ${level}`,
      csvEscape(node.name),
      csvEscape(node.patternType || ''),
      csvEscape(node.description || ''),
    ]

    if (includeFields && pattern && pattern.fields) {
      for (const field of Object.keys(pattern.fields)) {
        row.push(csvEscape(node[field]))
      }
    }

    rows.push(row.join(','))
  }

  // Process tree
  addRow(tree, 0)

  if (tree.children) {
    for (const phase of tree.children) {
      addRow(phase, 1)
      if (phase.items) {
        for (const item of phase.items) {
          addRow(item, 2)
          if (item.subtasks) {
            for (const subtask of item.subtasks) {
              addRow(subtask, 3)
            }
          }
        }
      }
    }
  }

  return rows.join('\n')
}

/**
 * Export tree to checklist (plain text)
 */
function toChecklist(tree) {
  const lines = []

  lines.push(tree.name)
  lines.push('='.repeat(tree.name.length))
  lines.push('')

  if (tree.children) {
    for (const phase of tree.children) {
      lines.push(`## ${phase.name}`)

      if (phase.items) {
        for (const item of phase.items) {
          lines.push(`  ${item.name}`)

          if (item.subtasks) {
            for (const subtask of item.subtasks) {
              const done = subtask.tracking?.status === 'completed' ? 'x' : ' '
              lines.push(`    [${done}] ${subtask.name}`)
            }
          }
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Export tree to HTML snippet (for embedding)
 */
function toHTML(tree, options = {}) {
  const { theme = 'light' } = options

  const bgColor = theme === 'dark' ? '#1a1a2e' : '#ffffff'
  const textColor = theme === 'dark' ? '#eee' : '#333'
  const borderColor = theme === 'dark' ? '#444' : '#ddd'

  let html = `<div style="font-family: system-ui, sans-serif; background: ${bgColor}; color: ${textColor}; padding: 20px; border-radius: 8px;">`
  html += `<h1 style="margin-top: 0;">${tree.icon || ''} ${escapeHtml(tree.name)}</h1>`

  if (tree.children) {
    html += '<div style="margin-left: 20px;">'
    for (const phase of tree.children) {
      html += `<h2 style="border-bottom: 1px solid ${borderColor}; padding-bottom: 8px;">${escapeHtml(phase.name)}</h2>`

      if (phase.items) {
        html += '<ul style="list-style: none; padding-left: 10px;">'
        for (const item of phase.items) {
          html += `<li style="margin: 10px 0;"><strong>${escapeHtml(item.name)}</strong>`

          if (item.subtasks && item.subtasks.length > 0) {
            html += '<ul style="list-style: none; padding-left: 20px;">'
            for (const subtask of item.subtasks) {
              const done = subtask.tracking?.status === 'completed'
              const icon = done ? '✅' : '⬜'
              html += `<li>${icon} ${escapeHtml(subtask.name)}</li>`
            }
            html += '</ul>'
          }
          html += '</li>'
        }
        html += '</ul>'
      }
    }
    html += '</div>'
  }

  html += '</div>'
  return html
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Export to specified format
 */
function exportTree(tree, format, options = {}) {
  switch (format.toLowerCase()) {
    case 'json':
      return toJSON(tree, options.pretty !== false)
    case 'markdown':
    case 'md':
      return toMarkdown(tree, options)
    case 'mermaid':
      return toMermaid(tree, options)
    case 'csv':
      return toCSV(tree, options)
    case 'checklist':
    case 'txt':
      return toChecklist(tree)
    case 'html':
      return toHTML(tree, options)
    default:
      throw new Error(
        `Unknown export format: ${format}. Supported: json, markdown, mermaid, csv, checklist, html`,
      )
  }
}

module.exports = {
  exportTree,
  toJSON,
  toMarkdown,
  toMermaid,
  toCSV,
  toChecklist,
  toHTML,
}
