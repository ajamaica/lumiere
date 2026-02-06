#!/usr/bin/env node
/**
 * arbiter get - Retrieve answers from a completed decision plan
 * 
 * Usage: arbiter-get <plan-id> [--tag <tag>]
 * 
 * Returns JSON with:
 * - planId: Plan ID
 * - status: completed (or error if not complete)
 * - completedAt: ISO timestamp
 * - answers: Map of decision ID -> answer
 */

import type { GetResult } from './types.js';
import { findPlanFile, parseDecisions,parsePlanFile } from './utils.js';

/**
 * Get answers from a completed decision plan
 */
function get(planId?: string, tag?: string): GetResult | { error: string } {
  if (!planId && !tag) {
    return { error: 'Either planId or tag is required' };
  }
  
  const file = findPlanFile(planId, tag);
  if (!file) {
    return { error: 'Plan not found' };
  }
  
  const { frontmatter, content } = parsePlanFile(file);
  
  if (frontmatter.status !== 'completed') {
    return {
      error: `Plan not complete (status: ${frontmatter.status})`,
      planId: frontmatter.id,
      status: frontmatter.status as 'completed',
      completedAt: '',
      answers: {}
    } as GetResult & { error: string };
  }
  
  const decisions = parseDecisions(content);
  
  const answers: Record<string, string> = {};
  for (const d of decisions) {
    if (d.answer !== null) {
      answers[d.id] = d.answer;
    }
  }
  
  return {
    planId: frontmatter.id,
    status: 'completed',
    completedAt: frontmatter.completed_at || '',
    answers
  };
}

// CLI entry point
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
arbiter get - Retrieve answers from a completed decision plan

Usage: arbiter-get <plan-id>
       arbiter-get --tag <tag>

Example:
  arbiter-get abc12345
  arbiter-get --tag nft-marketplace

Note: Returns error if plan is not yet completed.
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
  
  const result = get(planId, tag);
  console.log(JSON.stringify(result, null, 2));
  
  if ('error' in result) {
    process.exit(1);
  }
}

main();
