#!/usr/bin/env node
/**
 * arbiter push - Create a decision file in the queue
 * 
 * Usage: arbiter-push <json-args>
 * 
 * The JSON should contain:
 * - title: Plan title (required)
 * - tag: Project tag (optional)
 * - context: Context for reviewer (optional)
 * - priority: low|normal|high|urgent (optional, default: normal)
 * - notify: Session to notify on completion (optional)
 * - agent: Agent ID (optional, uses CLAWDBOT_AGENT env)
 * - session: Session key (optional, uses CLAWDBOT_SESSION env)
 * - decisions: Array of decisions (required)
 * 
 * Each decision:
 * - id: Unique ID within the plan
 * - title: Decision title
 * - context: Context for this decision
 * - options: Array of { key, label, note? }
 * - allowCustom: Allow custom text answer (optional)
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { nanoid } from 'nanoid';

import type { Decision,PushArgs, PushResult } from './types.js';
import { ensureQueueDirs, getQueueDir, nowISO,slugify } from './utils.js';

/**
 * Generate the markdown content for a decision plan
 */
function generateMarkdown(args: PushArgs & { id: string; agent: string; session: string }): string {
  const now = nowISO();
  const total = args.decisions.length;
  
  // Build frontmatter
  const frontmatter = `---
id: ${args.id}
version: 1
agent: ${args.agent}
session: ${args.session}
tag: ${args.tag || 'general'}
title: "${args.title}"
priority: ${args.priority || 'normal'}
status: pending
created_at: ${now}
updated_at: ${now}
completed_at: null
total: ${total}
answered: 0
remaining: ${total}
${args.notify ? `notify_session: ${args.notify}` : ''}
---`;

  // Build context section
  const contextSection = `
# ${args.title}

${args.context || 'Please review and answer the following decisions.'}
`;

  // Build decision sections
  const decisionSections = args.decisions.map((d, i) => {
    const optionsMarkdown = d.options
      .map(o => `- \`${o.key}\` — ${o.label}${o.note ? ` (${o.note})` : ''}`)
      .join('\n');
    
    return `
---

## Decision ${i + 1}: ${d.title}

id: ${d.id}
status: pending
answer: null
answered_at: null
${d.allowCustom ? 'allow_custom: true' : ''}

**Context:** ${d.context}

**Options:**
${optionsMarkdown}
`;
  }).join('\n');

  return frontmatter + contextSection + decisionSections;
}

/**
 * Push a decision plan to the queue
 */
function push(args: PushArgs): PushResult {
  // Validate required fields
  if (!args.title) {
    throw new Error('title is required');
  }
  if (!args.decisions || args.decisions.length === 0) {
    throw new Error('decisions array is required and must not be empty');
  }
  
  // Validate each decision
  for (const d of args.decisions) {
    if (!d.id || !d.title || !d.options || d.options.length === 0) {
      throw new Error(`Invalid decision: ${JSON.stringify(d)}`);
    }
  }
  
  const id = nanoid(8);
  const agent = args.agent || process.env.CLAWDBOT_AGENT || 'unknown';
  const session = args.session || process.env.CLAWDBOT_SESSION || 'unknown';
  
  const filename = `${agent}-${slugify(args.title)}-${id}.md`;
  const filepath = join(getQueueDir('pending'), filename);
  
  const content = generateMarkdown({
    ...args,
    id,
    agent,
    session
  });
  
  ensureQueueDirs();
  writeFileSync(filepath, content, 'utf-8');
  
  return {
    planId: id,
    file: filepath,
    total: args.decisions.length,
    status: 'pending'
  };
}

// CLI entry point
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
arbiter push - Create a decision file in the queue

Usage: arbiter-push '<json>'

Example:
  arbiter-push '{"title":"API Decisions","decisions":[{"id":"auth","title":"Auth Method","context":"Choose auth","options":[{"key":"jwt","label":"JWT tokens"},{"key":"session","label":"Sessions"}]}]}'
`);
    process.exit(0);
  }
  
  try {
    const input = JSON.parse(args.join(' ')) as PushArgs;
    const result = push(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
