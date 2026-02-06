/**
 * TreeListy Validation Module
 * Quality checks and pattern compliance
 *
 * Copyright (c) 2024-2026 Prairie2Cloud LLC
 * Licensed under Apache-2.0
 */

const { getPattern } = require('./patterns')

/**
 * Count nodes at each level
 */
function countNodes(tree) {
  const counts = { root: 0, phase: 0, item: 0, subtask: 0, total: 0 }

  function traverse(node, level = 0) {
    const levelNames = ['root', 'phase', 'item', 'subtask']
    const levelName = levelNames[Math.min(level, 3)]
    counts[levelName]++
    counts.total++

    if (node.children) {
      for (const child of node.children) {
        traverse(child, level + 1)
      }
    }
    if (node.items) {
      for (const item of node.items) {
        traverse(item, level + 1)
      }
    }
    if (node.subtasks) {
      for (const subtask of node.subtasks) {
        traverse(subtask, level + 1)
      }
    }
  }

  traverse(tree, 0)
  return counts
}

/**
 * Calculate tree depth and balance
 */
function analyzeDepth(tree) {
  const depths = []

  function traverse(node, depth = 0) {
    let isLeaf = true

    if (node.children && node.children.length > 0) {
      isLeaf = false
      for (const child of node.children) {
        traverse(child, depth + 1)
      }
    }
    if (node.items && node.items.length > 0) {
      isLeaf = false
      for (const item of node.items) {
        traverse(item, depth + 1)
      }
    }
    if (node.subtasks && node.subtasks.length > 0) {
      isLeaf = false
      for (const subtask of node.subtasks) {
        traverse(subtask, depth + 1)
      }
    }

    if (isLeaf) {
      depths.push(depth)
    }
  }

  traverse(tree, 0)

  const maxDepth = Math.max(...depths)
  const minDepth = Math.min(...depths)
  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length
  const variance = depths.reduce((sum, d) => sum + Math.pow(d - avgDepth, 2), 0) / depths.length

  return {
    maxDepth,
    minDepth,
    avgDepth: Math.round(avgDepth * 100) / 100,
    depthVariance: Math.round(variance * 100) / 100,
    isBalanced: maxDepth - minDepth <= 1,
  }
}

/**
 * Check for missing required fields
 */
function checkRequiredFields(tree) {
  const issues = []
  const pattern = getPattern(tree.pattern || 'generic')

  function traverse(node, path = '') {
    const nodePath = path ? `${path} > ${node.name}` : node.name

    // Check name
    if (!node.name || node.name.trim() === '') {
      issues.push({
        severity: 'error',
        path: nodePath,
        message: 'Node has empty or missing name',
      })
    }

    // Check pattern-specific required fields
    if (pattern && pattern.fields) {
      for (const [fieldName, fieldDef] of Object.entries(pattern.fields)) {
        if (fieldDef.required && (node[fieldName] === undefined || node[fieldName] === '')) {
          issues.push({
            severity: 'warning',
            path: nodePath,
            message: `Missing required field: ${fieldDef.label || fieldName}`,
          })
        }
      }
    }

    // Recurse
    if (node.children) {
      for (const child of node.children) traverse(child, nodePath)
    }
    if (node.items) {
      for (const item of node.items) traverse(item, nodePath)
    }
    if (node.subtasks) {
      for (const subtask of node.subtasks) traverse(subtask, nodePath)
    }
  }

  traverse(tree)
  return issues
}

/**
 * Check for orphan nodes (nodes without proper parent linkage)
 */
function checkOrphanNodes(tree) {
  const issues = []

  function traverse(node, level = 0, path = '') {
    const nodePath = path ? `${path} > ${node.name}` : node.name

    // Check for misplaced arrays
    if (level === 0 && node.items) {
      issues.push({
        severity: 'warning',
        path: nodePath,
        message: 'Root node should use "children" not "items"',
      })
    }
    if (level === 1 && node.subtasks) {
      issues.push({
        severity: 'warning',
        path: nodePath,
        message: 'Phase node should use "items" not "subtasks"',
      })
    }
    if (level === 2 && node.children) {
      issues.push({
        severity: 'warning',
        path: nodePath,
        message: 'Item node should use "subtasks" not "children"',
      })
    }

    // Recurse
    if (node.children) {
      for (const child of node.children) traverse(child, level + 1, nodePath)
    }
    if (node.items) {
      for (const item of node.items) traverse(item, level + 1, nodePath)
    }
    if (node.subtasks) {
      for (const subtask of node.subtasks) traverse(subtask, level + 1, nodePath)
    }
  }

  traverse(tree)
  return issues
}

/**
 * Check pattern compliance
 */
function checkPatternCompliance(tree) {
  const issues = []
  const patternKey = tree.pattern || 'generic'
  const pattern = getPattern(patternKey)

  if (!pattern) {
    issues.push({
      severity: 'error',
      path: tree.name,
      message: `Unknown pattern: ${patternKey}`,
    })
    return issues
  }

  function traverse(node, level = 0, path = '') {
    const nodePath = path ? `${path} > ${node.name}` : node.name

    // Check type values
    if (node.patternType && pattern.types && pattern.types.length > 0) {
      if (!pattern.types.includes(node.patternType)) {
        issues.push({
          severity: 'info',
          path: nodePath,
          message: `Type "${node.patternType}" not in pattern types: [${pattern.types.join(', ')}]`,
        })
      }
    }

    // Recurse
    if (node.children) {
      for (const child of node.children) traverse(child, level + 1, nodePath)
    }
    if (node.items) {
      for (const item of node.items) traverse(item, level + 1, nodePath)
    }
    if (node.subtasks) {
      for (const subtask of node.subtasks) traverse(subtask, level + 1, nodePath)
    }
  }

  traverse(tree)
  return issues
}

/**
 * Check for empty branches
 */
function checkEmptyBranches(tree) {
  const issues = []

  function traverse(node, level = 0, path = '') {
    const nodePath = path ? `${path} > ${node.name}` : node.name

    // Phase without items
    if (level === 1 && (!node.items || node.items.length === 0)) {
      issues.push({
        severity: 'info',
        path: nodePath,
        message: 'Phase has no items',
      })
    }

    // Item without subtasks (only warning if pattern expects tracking)
    if (level === 2 && (!node.subtasks || node.subtasks.length === 0)) {
      const pattern = getPattern(tree.pattern || 'generic')
      if (pattern && pattern.includeTracking) {
        issues.push({
          severity: 'info',
          path: nodePath,
          message: 'Item has no subtasks',
        })
      }
    }

    // Recurse
    if (node.children) {
      for (const child of node.children) traverse(child, level + 1, nodePath)
    }
    if (node.items) {
      for (const item of node.items) traverse(item, level + 1, nodePath)
    }
    if (node.subtasks) {
      for (const subtask of node.subtasks) traverse(subtask, level + 1, nodePath)
    }
  }

  traverse(tree)
  return issues
}

/**
 * Calculate quality score (0-100)
 */
function calculateScore(tree, allIssues) {
  let score = 100

  // Deduct for issues
  for (const issue of allIssues) {
    switch (issue.severity) {
      case 'error':
        score -= 15
        break
      case 'warning':
        score -= 5
        break
      case 'info':
        score -= 1
        break
    }
  }

  // Bonus for completeness
  const counts = countNodes(tree)
  if (counts.total >= 10) score += 5
  if (counts.subtask >= 5) score += 5

  // Bonus for balance
  const depth = analyzeDepth(tree)
  if (depth.isBalanced) score += 5

  return Math.max(0, Math.min(100, score))
}

/**
 * Main validation function
 */
function validate(tree) {
  // Collect all issues
  const requiredFieldIssues = checkRequiredFields(tree)
  const orphanIssues = checkOrphanNodes(tree)
  const complianceIssues = checkPatternCompliance(tree)
  const emptyBranchIssues = checkEmptyBranches(tree)

  const allIssues = [
    ...requiredFieldIssues,
    ...orphanIssues,
    ...complianceIssues,
    ...emptyBranchIssues,
  ]

  // Analyze structure
  const counts = countNodes(tree)
  const depth = analyzeDepth(tree)
  const score = calculateScore(tree, allIssues)

  // Categorize issues
  const errors = allIssues.filter((i) => i.severity === 'error')
  const warnings = allIssues.filter((i) => i.severity === 'warning')
  const infos = allIssues.filter((i) => i.severity === 'info')

  return {
    valid: errors.length === 0,
    score,
    scoreLabel:
      score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Work',
    pattern: tree.pattern || 'generic',
    structure: {
      ...counts,
      ...depth,
    },
    issues: {
      total: allIssues.length,
      errors: errors.length,
      warnings: warnings.length,
      info: infos.length,
    },
    details: allIssues,
    suggestions: generateSuggestions(tree, allIssues, counts, depth),
  }
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(tree, issues, counts, depth) {
  const suggestions = []
  const pattern = getPattern(tree.pattern || 'generic')

  if (counts.phase === 0) {
    suggestions.push(
      `Add ${pattern?.levels[1] || 'phases'} to organize your ${pattern?.levels[0] || 'project'}`,
    )
  }

  if (counts.item === 0 && counts.phase > 0) {
    suggestions.push(
      `Add ${pattern?.levels[2] || 'items'} under each ${pattern?.levels[1] || 'phase'}`,
    )
  }

  if (!depth.isBalanced) {
    suggestions.push(
      'Consider balancing the tree depth - some branches are much deeper than others',
    )
  }

  if (counts.total < 5) {
    suggestions.push('Consider breaking down your project into more detailed components')
  }

  if (issues.some((i) => i.severity === 'error' && i.message.includes('empty'))) {
    suggestions.push('Fill in names for all nodes')
  }

  return suggestions
}

module.exports = {
  validate,
  countNodes,
  analyzeDepth,
  checkRequiredFields,
  checkOrphanNodes,
  checkPatternCompliance,
  checkEmptyBranches,
  calculateScore,
}
