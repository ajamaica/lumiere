/**
 * Utility functions for Arbiter Skill
 */

import { existsSync, mkdirSync,readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename,join } from 'node:path';

import matter from 'gray-matter';

import type { Frontmatter, ParsedDecision, Status } from './types.js';

/**
 * Get the base arbiter directory
 */
export function getArbiterDir(): string {
  return join(homedir(), '.arbiter');
}

/**
 * Get the queue directory
 */
export function getQueueDir(subdir: 'pending' | 'completed' | 'notify'): string {
  return join(getArbiterDir(), 'queue', subdir);
}

/**
 * Ensure queue directories exist
 */
export function ensureQueueDirs(): void {
  const dirs = ['pending', 'completed', 'notify'] as const;
  for (const dir of dirs) {
    const path = getQueueDir(dir);
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }
}

/**
 * Slugify a string for use in filenames
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

/**
 * Find a plan file by ID or tag
 */
export function findPlanFile(planId?: string, tag?: string): string | null {
  const dirs = [getQueueDir('pending'), getQueueDir('completed')];
  
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filepath = join(dir, file);
      
      // Quick check by filename for planId
      if (planId && file.includes(planId)) {
        return filepath;
      }
      
      // Need to read file for tag match
      if (tag) {
        try {
          const content = readFileSync(filepath, 'utf-8');
          const { data } = matter(content);
          if (data.tag === tag || data.id === planId) {
            return filepath;
          }
        } catch {
          continue;
        }
      }
    }
  }
  
  return null;
}

/**
 * Parse a plan file and extract frontmatter
 */
export function parsePlanFile(filepath: string): { frontmatter: Frontmatter; content: string } {
  const raw = readFileSync(filepath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    frontmatter: data as Frontmatter,
    content
  };
}

/**
 * Parse decision blocks from markdown content
 */
export function parseDecisions(content: string): ParsedDecision[] {
  const decisions: ParsedDecision[] = [];
  
  // Split by decision headers (## Decision N: ...)
  const sections = content.split(/^---$/m);
  
  for (const section of sections) {
    // Look for decision metadata
    const idMatch = section.match(/^id:\s*(.+)$/m);
    const statusMatch = section.match(/^status:\s*(.+)$/m);
    const answerMatch = section.match(/^answer:\s*(.+)$/m);
    const answeredAtMatch = section.match(/^answered_at:\s*(.+)$/m);
    
    if (idMatch) {
      decisions.push({
        id: idMatch[1].trim(),
        status: (statusMatch?.[1]?.trim() || 'pending') as Status,
        answer: answerMatch?.[1]?.trim() === 'null' ? null : answerMatch?.[1]?.trim() || null,
        answeredAt: answeredAtMatch?.[1]?.trim() === 'null' ? null : answeredAtMatch?.[1]?.trim() || null
      });
    }
  }
  
  return decisions;
}

/**
 * Get current ISO timestamp
 */
export function nowISO(): string {
  return new Date().toISOString();
}
