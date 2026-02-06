import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateCost } from './cost-calculator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(process.env.HOME, '.clawdbot', 'agents', 'main', 'sessions');

// Helper function exports for loop-detector
export async function readTranscript(filePath) {
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  const messages = [];
  
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch (e) {
      // skip invalid lines
    }
  }
  return messages;
}

export async function getTranscriptStats(filePath) {
  const messages = await readTranscript(filePath);
  if (!messages || messages.length === 0) return null;
  
  let tokensIn = 0, tokensOut = 0, cost = 0;
  let model = null;
  let startedAt = null, endedAt = null;
  
  for (const entry of messages) {
    const msg = entry.message || entry;
    
    // Get timestamps
    if (entry.timestamp && !startedAt) startedAt = entry.timestamp;
    if (entry.timestamp) endedAt = entry.timestamp;
    
    // Get model
    if (msg.model && !model) model = msg.model;
    
    // Get usage
    if (msg.usage) {
      const u = msg.usage;
      tokensIn += u.input || u.input_tokens || 0;
      tokensOut += u.output || u.output_tokens || 0;
      if (u.cost?.total) {
        cost += u.cost.total;
      }
    }
  }
  
  return {
    messageCount: messages.length,
    tokensIn,
    tokensOut,
    totalTokens: tokensIn + tokensOut,
    cost,
    model,
    startedAt,
    endedAt
  };
}

export class TranscriptReader {
  constructor() {
    this.sessionsDir = path.join(process.env.HOME, '.clawdbot', 'agents', 'main', 'sessions');
  }

  /**
   * Read and parse a transcript file
   * @param {string} sessionId - Session ID to read
   * @returns {Object} Parsed transcript with messages, usage, thinking blocks
   */
  async readTranscript(sessionId) {
    const filePath = path.join(this.sessionsDir, `${sessionId}.jsonl`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    const transcript = {
      sessionId,
      messages: [],
      usage: { totalTokens: 0, inputTokens: 0, outputTokens: 0 },
      thinking: [],
      rawLines: lines.length
    };

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        
        // Extract messages
        if (entry.type === 'message' || entry.message) {
          transcript.messages.push({
            timestamp: entry.timestamp || entry.time,
            role: entry.role || 'unknown',
            content: entry.content || entry.message || '',
            type: entry.type || 'message'
          });
        }

        // Extract usage data
        if (entry.usage) {
          transcript.usage.totalTokens += entry.usage.total_tokens || 0;
          transcript.usage.inputTokens += entry.usage.input_tokens || 0;
          transcript.usage.outputTokens += entry.usage.output_tokens || 0;
        }

        // Extract thinking blocks
        if (entry.type === 'thinking' || entry.thinking) {
          transcript.thinking.push({
            timestamp: entry.timestamp || entry.time,
            content: entry.thinking || entry.content || '',
            duration: entry.duration
          });
        }

        // Track session metadata
        if (entry.sessionKey && !transcript.sessionKey) {
          transcript.sessionKey = entry.sessionKey;
        }
        if (entry.label && !transcript.label) {
          transcript.label = entry.label;
        }

      } catch (error) {
        console.warn(`Failed to parse line in ${sessionId}:`, line);
      }
    }

    return transcript;
  }

  /**
   * Get list of all available transcript files
   * @returns {string[]} Array of session IDs
   */
  getAvailableTranscripts() {
    if (!fs.existsSync(this.sessionsDir)) {
      return [];
    }

    return fs.readdirSync(this.sessionsDir)
      .filter(file => file.endsWith('.jsonl'))
      .map(file => file.replace('.jsonl', ''));
  }

  /**
   * Check if a transcript exists for a session
   * @param {string} sessionId - Session ID to check
   * @returns {boolean}
   */
  hasTranscript(sessionId) {
    const filePath = path.join(this.sessionsDir, `${sessionId}.jsonl`);
    return fs.existsSync(filePath);
  }

  /**
   * Get basic transcript metadata without parsing full content
   * @param {string} sessionId - Session ID to check
   * @returns {Object|null} Basic metadata or null if not found
   */
  getTranscriptMetadata(sessionId) {
    const filePath = path.join(this.sessionsDir, `${sessionId}.jsonl`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    // Try to extract session key and label from first few lines
    let sessionKey = null;
    let label = null;
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.sessionKey && !sessionKey) sessionKey = entry.sessionKey;
        if (entry.label && !label) label = entry.label;
        if (sessionKey && label) break;
      } catch (error) {
        // Ignore parse errors for metadata
      }
    }

    return {
      sessionId,
      sessionKey,
      label,
      lineCount: lines.length,
      fileSize: stats.size,
      lastModified: stats.mtime
    };
  }
}