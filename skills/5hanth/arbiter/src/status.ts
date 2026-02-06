#!/usr/bin/env node
/**
 * arbiter status - Check status of a decision plan
 * 
 * Usage: arbiter-status <plan-id> [--tag <tag>]
 * 
 * Returns JSON with:
 * - planId: Plan ID
 * - title: Plan title
 * - status: pending|in_progress|completed
 * - total: Total decisions
 * - answered: Number answered
 * - remaining: Number remaining
 * - decisions: Map of decision ID -> { status, answer }
 */

import type { DecisionStatus,StatusResult } from './types.js';
import { findPlanFile, parseDecisions,parsePlanFile } from './utils.js';

/**
 * Get status of a decision plan
 */
function status(planId?: string, tag?: string): StatusResult {
  if (!planId && !tag) {
    return {
      planId: '',
      title: '',
      status: 'pending',
      total: 0,
      answered: 0,
      remaining: 0,
      decisions: {},
      error: 'Either planId or tag is required'
    };
  }
  
  const file = findPlanFile(planId, tag);
  if (!file) {
    return {
      planId: planId || '',
      title: '',
      status: 'pending',
      total: 0,
      answered: 0,
      remaining: 0,
      decisions: {},
      error: 'Plan not found'
    };
  }
  
  const { frontmatter, content } = parsePlanFile(file);
  const decisions = parseDecisions(content);
  
  const decisionMap: Record<string, DecisionStatus> = {};
  for (const d of decisions) {
    decisionMap[d.id] = {
      status: d.status,
      answer: d.answer
    };
  }
  
  return {
    planId: frontmatter.id,
    title: frontmatter.title,
    status: frontmatter.status,
    total: frontmatter.total,
    answered: frontmatter.answered,
    remaining: frontmatter.remaining,
    decisions: decisionMap
  };
}

// CLI entry point
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
arbiter status - Check status of a decision plan

Usage: arbiter-status <plan-id>
       arbiter-status --tag <tag>

Example:
  arbiter-status abc12345
  arbiter-status --tag nft-marketplace
`);
    process.exit(0);
  }
  
  let planId: string | undefined;
  let tag: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tag' && args[i + 1]) {
      tag = args[i + 1];
      i++;
    } else if (!args[i].startsWith('-')) {
      planId = args[i];
    }
  }
  
  const result = status(planId, tag);
  console.log(JSON.stringify(result, null, 2));
  
  if (result.error) {
    process.exit(1);
  }
}

main();
