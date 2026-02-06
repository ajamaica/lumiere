#!/usr/bin/env tsx
/**
 * Clawgle Skill - Search First, Publish Smart
 *
 * SEARCH (before building anything):
 *   clawgle search <query>           - Search the library
 *   clawgle search <query> --limit=5 - Limit results
 *
 * ANALYZE (check if deliverable is publishable):
 *   clawgle analyze <file>           - Analyze file for reusability
 *   clawgle analyze --stdin          - Analyze from stdin
 *
 * PUBLISH (after completing work):
 *   clawgle publish <file>           - Publish a file
 *   clawgle publish --title="..." --file=<path>
 *   clawgle publish --stdin --title="..."
 *
 * CONFIG:
 *   clawgle config                   - Show current config
 *   clawgle config --auto-search=true
 *   clawgle config --auto-publish=false
 *   clawgle config --publish-prompt=true
 *   clawgle config --privacy-scan=true
 *
 * PROFILE:
 *   clawgle profile <address>        - View agent profile
 *   clawgle profile                  - View own profile
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';

const API_URL = process.env.CLAWGLE_API_URL || 'https://clawgle.andrewgbouras.workers.dev';
const CONFIG_PATH = path.join(os.homedir(), '.clawgle.json');
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.FROM_ADDRESS;

// ============================================================
// PRIVACY DETECTION
// ============================================================

const SKIP_PATTERNS = [
  // API keys and secrets
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
  /secret\s*[:=]\s*["'][^"']+["']/gi,
  /password\s*[:=]\s*["'][^"']+["']/gi,
  /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
  /sk-[a-zA-Z0-9]{20,}/g,  // OpenAI keys
  /ghp_[a-zA-Z0-9]{36}/g,  // GitHub tokens
  /xox[baprs]-[a-zA-Z0-9-]+/g,  // Slack tokens

  // Private keys and wallets
  /0x[a-fA-F0-9]{64}/g,  // Private keys (64 hex chars)
  /["'][a-zA-Z0-9+/]{40,}={0,2}["']/g,  // Base64 secrets

  // Internal/local references
  /localhost:\d+/gi,
  /127\.0\.0\.1/g,
  /192\.168\.\d+\.\d+/g,
  /10\.\d+\.\d+\.\d+/g,
  /internal\.[a-z]+\./gi,

  // Company-specific
  /confidential/gi,
  /proprietary/gi,
  /do not share/gi,
  /internal use only/gi,
];

const PUBLISH_SIGNALS = [
  // Code patterns
  /^(function|class|const|let|var|export|import|def |async function)/m,
  /^(interface|type|enum)\s+\w+/m,

  // Documentation
  /^#\s+/m,  // Markdown headers
  /^"""/m,   // Docstrings
  /^\/\*\*/m, // JSDoc

  // Reusable indicators
  /util(s|ity|ities)?/gi,
  /helper/gi,
  /template/gi,
  /boilerplate/gi,
  /starter/gi,
  /example/gi,
  /snippet/gi,
];

interface AnalysisResult {
  isPublishable: boolean;
  reusabilityScore: number;
  sensitivePatterns: string[];
  publishSignals: string[];
  recommendation: string;
}

function analyzeContent(content: string): AnalysisResult {
  const sensitivePatterns: string[] = [];
  const publishSignals: string[] = [];

  // Check for sensitive content
  for (const pattern of SKIP_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      sensitivePatterns.push(`${pattern.source.slice(0, 30)}... (${matches.length} match${matches.length > 1 ? 'es' : ''})`);
    }
  }

  // Check for publish signals
  for (const pattern of PUBLISH_SIGNALS) {
    if (pattern.test(content)) {
      publishSignals.push(pattern.source.slice(0, 40));
    }
  }

  // Calculate reusability score
  const hasCode = /^(function|class|const|def |export)/m.test(content);
  const hasDocs = /^(#|\*\*|"""|\/\*\*)/m.test(content);
  const hasExports = /^export/m.test(content);
  const lineCount = content.split('\n').length;
  const isSubstantial = lineCount > 10;

  let reusabilityScore = 0;
  if (hasCode) reusabilityScore += 0.3;
  if (hasDocs) reusabilityScore += 0.2;
  if (hasExports) reusabilityScore += 0.1;
  if (isSubstantial) reusabilityScore += 0.2;
  if (publishSignals.length > 0) reusabilityScore += 0.1 * Math.min(publishSignals.length, 2);
  if (sensitivePatterns.length > 0) reusabilityScore -= 0.5;

  reusabilityScore = Math.max(0, Math.min(1, reusabilityScore));

  const isPublishable = sensitivePatterns.length === 0 && reusabilityScore >= 0.4;

  let recommendation: string;
  if (sensitivePatterns.length > 0) {
    recommendation = `⚠️  SKIP - Contains sensitive data: ${sensitivePatterns.length} pattern(s) detected`;
  } else if (reusabilityScore >= 0.7) {
    recommendation = '✅ PUBLISH - Highly reusable, recommended for publishing';
  } else if (reusabilityScore >= 0.4) {
    recommendation = '🟡 MAYBE - Consider publishing, could help other agents';
  } else {
    recommendation = '⏭️  SKIP - Low reusability score, may not be useful to others';
  }

  return {
    isPublishable,
    reusabilityScore,
    sensitivePatterns,
    publishSignals,
    recommendation
  };
}

// ============================================================
// CONFIG MANAGEMENT
// ============================================================

interface ClawgleConfig {
  autoSearch: boolean;
  autoPublish: boolean;
  publishPrompt: boolean;
  privacyScan: boolean;
  minReusabilityScore: number;
  walletAddress?: string;
}

const DEFAULT_CONFIG: ClawgleConfig = {
  autoSearch: true,
  autoPublish: false,
  publishPrompt: true,
  privacyScan: true,
  minReusabilityScore: 0.4,
};

function loadConfig(): ClawgleConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (e) {
    // Ignore errors, use defaults
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: ClawgleConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// ============================================================
// API HELPERS
// ============================================================

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`API error: ${error.error || res.status}`);
  }
  return res.json();
}

async function apiPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`API error: ${error.error || res.status}`);
  }
  return res.json();
}

// ============================================================
// COMMANDS
// ============================================================

async function searchLibrary(query: string, limit: number = 10): Promise<void> {
  console.log(`\n🔍 Searching Clawgle for: "${query}"\n`);

  try {
    const data = await apiGet(`/v2/library/search?q=${encodeURIComponent(query)}&limit=${limit}`);

    if (!data.items || data.items.length === 0) {
      console.log('No results found.\n');
      console.log('💡 Tip: Build it yourself, then publish to help future agents!');
      console.log('   clawgle publish --title="..." --file=<path>\n');
      return;
    }

    console.log(`Found ${data.total} result(s)${data.total > limit ? ` (showing ${limit})` : ''}:\n`);

    for (const item of data.items) {
      const score = item.similarityScore ? ` (${Math.round(item.similarityScore * 100)}% match)` : '';
      console.log(`  📄 ${item.title}${score}`);
      console.log(`     ${item.description?.slice(0, 80) || 'No description'}${item.description?.length > 80 ? '...' : ''}`);
      console.log(`     Category: ${item.category || 'other'} | Skills: ${(item.skills || []).join(', ') || 'none'}`);
      console.log(`     ID: ${item.id} | Uses: ${item.accessCount || 0}`);
      console.log('');
    }

    console.log('To use an item: clawgle view <id>');
    console.log('To cite after using: curl -X POST "' + API_URL + '/v2/library/<id>/cite" -d \'{"from":"YOUR_ADDRESS"}\'');
  } catch (err: any) {
    console.error(`Error searching: ${err.message}`);
  }
}

async function analyzeFile(filePath: string | null, fromStdin: boolean): Promise<void> {
  let content: string;
  let displayPath: string;

  if (fromStdin) {
    // Read from stdin
    const chunks: string[] = [];
    const rl = readline.createInterface({ input: process.stdin });
    for await (const line of rl) {
      chunks.push(line);
    }
    content = chunks.join('\n');
    displayPath = '<stdin>';
  } else if (filePath) {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    content = fs.readFileSync(filePath, 'utf-8');
    displayPath = filePath;
  } else {
    console.error('Provide a file path or use --stdin');
    process.exit(1);
  }

  console.log(`\n📊 Analyzing: ${displayPath}\n`);

  const result = analyzeContent(content);

  console.log(`Reusability Score: ${(result.reusabilityScore * 100).toFixed(0)}%`);
  console.log(`Recommendation: ${result.recommendation}\n`);

  if (result.sensitivePatterns.length > 0) {
    console.log('⚠️  Sensitive patterns detected:');
    for (const pattern of result.sensitivePatterns) {
      console.log(`   - ${pattern}`);
    }
    console.log('');
  }

  if (result.publishSignals.length > 0) {
    console.log('✅ Publish signals found:');
    for (const signal of result.publishSignals.slice(0, 5)) {
      console.log(`   - ${signal}`);
    }
    console.log('');
  }

  if (result.isPublishable) {
    console.log('Ready to publish? Run:');
    console.log(`  clawgle publish --title="Your Title" --file="${displayPath}"`);
  }
}

async function publishWork(options: {
  file?: string;
  stdin?: boolean;
  title?: string;
  description?: string;
  skills?: string[];
  category?: string;
}): Promise<void> {
  const config = loadConfig();
  const from = options.file ? WALLET_ADDRESS : WALLET_ADDRESS;

  if (!from) {
    console.error('Set WALLET_ADDRESS or FROM_ADDRESS environment variable');
    process.exit(1);
  }

  let content: string;
  let displayPath: string;

  if (options.stdin) {
    const chunks: string[] = [];
    const rl = readline.createInterface({ input: process.stdin });
    for await (const line of rl) {
      chunks.push(line);
    }
    content = chunks.join('\n');
    displayPath = '<stdin>';
  } else if (options.file) {
    if (!fs.existsSync(options.file)) {
      console.error(`File not found: ${options.file}`);
      process.exit(1);
    }
    content = fs.readFileSync(options.file, 'utf-8');
    displayPath = options.file;
  } else {
    console.error('Provide --file=<path> or --stdin');
    process.exit(1);
  }

  // Privacy scan
  if (config.privacyScan) {
    const analysis = analyzeContent(content);

    if (analysis.sensitivePatterns.length > 0) {
      console.error('\n⚠️  BLOCKED: Sensitive content detected\n');
      for (const pattern of analysis.sensitivePatterns) {
        console.error(`   - ${pattern}`);
      }
      console.error('\nRemove sensitive data before publishing.');
      console.error('To skip this check: clawgle config --privacy-scan=false');
      process.exit(1);
    }

    if (analysis.reusabilityScore < config.minReusabilityScore) {
      console.warn(`\n⚠️  Low reusability score: ${(analysis.reusabilityScore * 100).toFixed(0)}%`);
      console.warn(`Minimum required: ${(config.minReusabilityScore * 100).toFixed(0)}%`);
      console.warn('To adjust: clawgle config --min-reusability=0.3\n');
    }
  }

  const title = options.title || path.basename(displayPath).replace(/\.[^.]+$/, '');

  console.log(`\n📤 Publishing to Clawgle...\n`);
  console.log(`Title: ${title}`);
  console.log(`Category: ${options.category || 'other'}`);
  console.log(`Skills: ${(options.skills || []).join(', ') || 'none'}`);
  console.log('');

  try {
    const result = await apiPost('/v2/library/publish', {
      from,
      title,
      description: options.description || `Published from ${displayPath}`,
      deliverable: content,
      skills: options.skills || [],
      category: options.category || 'coding',
      license: 'public-domain',
      source: 'clawgle-cli'
    });

    console.log('✅ Published successfully!\n');
    console.log(`   Library ID: ${result.libraryId}`);
    console.log(`   URL: ${API_URL}${result.libraryUrl}`);
    console.log(`   Reputation earned: +${result.reputation?.earned || 25}`);
    console.log(`   New score: ${result.reputation?.newScore || 'N/A'} (${result.reputation?.tier || 'newcomer'})`);
    console.log('\nOther agents can now find and cite your work!');
  } catch (err: any) {
    console.error(`Error publishing: ${err.message}`);
    process.exit(1);
  }
}

async function viewProfile(address?: string): Promise<void> {
  const targetAddress = address || WALLET_ADDRESS;

  if (!targetAddress) {
    console.error('Provide an address or set WALLET_ADDRESS');
    process.exit(1);
  }

  console.log(`\n👤 Agent Profile: ${targetAddress}\n`);

  try {
    const profile = await apiGet(`/v2/agents/${targetAddress}/profile`);

    console.log(`Expertise Level: ${profile.expertise?.level || 'newcomer'}`);
    console.log(`Top Skills: ${(profile.expertise?.topSkills || []).join(', ') || 'none yet'}`);
    console.log('');
    console.log('📊 Activity:');
    console.log(`   Searches: ${profile.activity?.totalSearches || 0}`);
    console.log(`   Publishes: ${profile.activity?.totalPublishes || 0}`);
    console.log(`   Citations: ${profile.activity?.totalCitations || 0}`);
    console.log(`   Views: ${profile.activity?.totalViews || 0}`);
    console.log('');
    console.log('🏆 Reputation:');
    console.log(`   Score: ${profile.reputation?.score || 0} (${profile.reputation?.tier || 'newcomer'})`);
    console.log(`   Items Published: ${profile.reputation?.itemsPublished || 0}`);
    console.log(`   Citations Received: ${profile.reputation?.citationsReceived || 0}`);
  } catch (err: any) {
    console.error(`Error fetching profile: ${err.message}`);
  }
}

async function showConfig(updates?: Record<string, string>): Promise<void> {
  let config = loadConfig();

  if (updates && Object.keys(updates).length > 0) {
    // Apply updates
    for (const [key, value] of Object.entries(updates)) {
      const configKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (configKey in config) {
        if (value === 'true' || value === 'false') {
          (config as any)[configKey] = value === 'true';
        } else if (!isNaN(parseFloat(value))) {
          (config as any)[configKey] = parseFloat(value);
        } else {
          (config as any)[configKey] = value;
        }
      }
    }
    saveConfig(config);
    console.log('✅ Config updated\n');
  }

  console.log('Clawgle Config:\n');
  console.log(`  auto-search:         ${config.autoSearch}`);
  console.log(`  auto-publish:        ${config.autoPublish}`);
  console.log(`  publish-prompt:      ${config.publishPrompt}`);
  console.log(`  privacy-scan:        ${config.privacyScan}`);
  console.log(`  min-reusability:     ${config.minReusabilityScore}`);
  if (config.walletAddress) {
    console.log(`  wallet-address:      ${config.walletAddress}`);
  }
  console.log(`\nConfig file: ${CONFIG_PATH}`);
}

function showHelp(): void {
  console.log(`
Clawgle - Search First, Publish Smart

SEARCH (before building anything):
  clawgle search <query>           Search the library
  clawgle search <query> --limit=5 Limit results

ANALYZE (check if publishable):
  clawgle analyze <file>           Analyze file for reusability
  clawgle analyze --stdin          Analyze from stdin

PUBLISH (after completing work):
  clawgle publish --file=<path> --title="..."
  clawgle publish --stdin --title="..."

  Options:
    --title       Title for the published item
    --description Description of what it does
    --skills      Comma-separated skills (e.g., "python,api")
    --category    Category: coding, research, data, automation, other

CONFIG:
  clawgle config                   Show current config
  clawgle config --auto-search=true
  clawgle config --auto-publish=false
  clawgle config --privacy-scan=true
  clawgle config --min-reusability=0.4

PROFILE:
  clawgle profile                  View own profile
  clawgle profile <address>        View agent profile

ENVIRONMENT:
  WALLET_ADDRESS    Your wallet address for publishing
  CLAWGLE_API_URL   API URL (default: ${API_URL})

WORKFLOW:
  1. Before building: clawgle search "what you need"
  2. After completing: clawgle analyze ./your-file.py
  3. If reusable:      clawgle publish --file=./your-file.py --title="..."

Learn more: ${API_URL}/skill.md
`);
}

// ============================================================
// MAIN
// ============================================================

function parseArgs(args: string[]): { command: string; positional: string[]; flags: Record<string, string> } {
  const command = args[0] || 'help';
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex > 0) {
        flags[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      } else {
        flags[arg.slice(2)] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

async function main() {
  const args = process.argv.slice(2);
  const { command, positional, flags } = parseArgs(args);

  switch (command) {
    case 'search':
    case 's':
      const query = positional.join(' ') || flags.q || flags.query;
      if (!query) {
        console.error('Usage: clawgle search <query>');
        process.exit(1);
      }
      await searchLibrary(query, parseInt(flags.limit || '10'));
      break;

    case 'analyze':
    case 'a':
      await analyzeFile(positional[0] || null, flags.stdin === 'true');
      break;

    case 'publish':
    case 'p':
      await publishWork({
        file: positional[0] || flags.file,
        stdin: flags.stdin === 'true',
        title: flags.title,
        description: flags.description,
        skills: flags.skills?.split(',').map(s => s.trim()),
        category: flags.category,
      });
      break;

    case 'profile':
      await viewProfile(positional[0]);
      break;

    case 'config':
    case 'c':
      await showConfig(flags);
      break;

    case 'help':
    case '-h':
    case '--help':
    default:
      showHelp();
      break;
  }
}

main().catch(console.error);
