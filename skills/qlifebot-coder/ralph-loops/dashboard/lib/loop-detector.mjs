import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { TranscriptReader } from './transcript-reader.mjs';

const execAsync = promisify(exec);

export class LoopDetector {
  constructor() {
    this.transcriptReader = new TranscriptReader();
  }

  /**
   * Get current sessions from gateway
   * @returns {Object[]} Array of session objects with isRunning status
   */
  async getActiveSessions() {
    try {
      const { stdout } = await execAsync('clawdbot gateway call status --json');
      const status = JSON.parse(stdout);
      
      // sessions is an object with 'recent' array inside
      if (status.sessions?.recent && Array.isArray(status.sessions.recent)) {
        // Add isRunning status based on age
        // Subagents that haven't updated in 60+ seconds are likely finished
        return status.sessions.recent.map(session => ({
          ...session,
          isRunning: this.determineIfRunning(session)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  /**
   * Determine if a session is actually running vs just recent
   * @param {Object} session - Session object with age field
   * @returns {boolean} True if likely still running
   */
  determineIfRunning(session) {
    // Main sessions and cron sessions persist - they're "active" contexts
    if (!session.key?.includes('subagent')) {
      return true;
    }
    
    // Subagent sessions: check age (ms since last update)
    // If > 60 seconds since last update, probably finished
    const STALE_THRESHOLD_MS = 60000; // 60 seconds
    return session.age < STALE_THRESHOLD_MS;
  }

  /**
   * Filter sessions to only subagent sessions
   * @param {Object[]} sessions - All sessions
   * @returns {Object[]} Filtered subagent sessions
   */
  filterSubagentSessions(sessions) {
    return sessions.filter(session => 
      session.key && session.key.includes('subagent')
    );
  }

  /**
   * Detect loop patterns in session labels
   * @param {Object[]} sessions - Sessions to analyze
   * @returns {Object[]} Sessions with loop analysis
   */
  detectLoopPatterns(sessions) {
    const labelCounts = {};
    const sessionsByLabel = {};

    // Group sessions by label
    sessions.forEach(session => {
      const label = session.label || 'unlabeled';
      if (!sessionsByLabel[label]) {
        sessionsByLabel[label] = [];
        labelCounts[label] = 0;
      }
      sessionsByLabel[label].push(session);
      labelCounts[label]++;
    });

    // Mark sessions with potential loops
    const analyzed = sessions.map(session => {
      const label = session.label || 'unlabeled';
      const count = labelCounts[label];
      const siblings = sessionsByLabel[label].filter(s => s.key !== session.key);
      
      return {
        ...session,
        loopAnalysis: {
          isLoop: count > 1,
          loopCount: count,
          siblings: siblings.map(s => ({ key: s.key, startTime: s.startTime })),
          pattern: this.categorizeLoopPattern(label, count)
        }
      };
    });

    return analyzed;
  }

  /**
   * Categorize the type of loop based on label and count
   * @param {string} label - Session label
   * @param {number} count - Number of sessions with this label
   * @returns {string} Loop category
   */
  categorizeLoopPattern(label, count) {
    if (count === 1) return 'single';
    if (count <= 3) return 'minor-repeat';
    if (count <= 10) return 'moderate-loop';
    return 'severe-loop';
  }

  /**
   * Get transcript data for a session if available
   * @param {Object} session - Session object
   * @returns {Object|null} Transcript data or null
   */
  async getSessionTranscript(session) {
    // Extract session ID from session key
    const sessionId = this.extractSessionId(session.key);
    if (!sessionId) return null;

    return await this.transcriptReader.readTranscript(sessionId);
  }

  /**
   * Extract session ID from session key
   * @param {string} sessionKey - Full session key
   * @returns {string|null} Session ID or null
   */
  extractSessionId(sessionKey) {
    // Session keys look like: agent:main:subagent:2814a53c-d535-45c9-b92d-33ff0840284b
    // We want the UUID part at the end
    const parts = sessionKey.split(':');
    const uuid = parts[parts.length - 1];
    
    // Validate it looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(uuid)) {
      return uuid;
    }
    
    return null;
  }

  /**
   * Get comprehensive loop analysis
   * @returns {Object} Complete analysis of all loops
   */
  async getLoopAnalysis() {
    const activeSessions = await this.getActiveSessions();
    const subagentSessions = this.filterSubagentSessions(activeSessions);
    const analyzed = this.detectLoopPatterns(subagentSessions);

    // Enrich with transcript data
    const enriched = await Promise.all(
      analyzed.map(async (session) => {
        const transcript = await this.getSessionTranscript(session);
        const metadata = transcript ? {
          messageCount: transcript.messages.length,
          totalTokens: transcript.usage.totalTokens,
          thinkingBlocks: transcript.thinking.length
        } : null;

        return {
          ...session,
          transcript: metadata,
          hasTranscript: !!transcript
        };
      })
    );

    // Calculate summary statistics
    const runningSessions = enriched.filter(s => s.isRunning);
    const stats = {
      totalSessions: activeSessions.length,
      subagentSessions: subagentSessions.length,
      runningSessions: runningSessions.length,
      historicalSessions: subagentSessions.length - runningSessions.length,
      loopingSessions: runningSessions.filter(s => s.loopAnalysis.isLoop).length,
      severeLoops: runningSessions.filter(s => s.loopAnalysis.pattern === 'severe-loop').length,
      moderateLoops: runningSessions.filter(s => s.loopAnalysis.pattern === 'moderate-loop').length
    };

    return {
      sessions: enriched,
      stats
    };
  }

  /**
   * Kill a session using gateway API
   * @param {string} sessionKey - Session key to kill
   * @returns {Object} Result of kill operation
   */
  async killSession(sessionKey) {
    try {
      const command = `clawdbot gateway call chat.abort --params '{"sessionKey":"${sessionKey}"}'`;
      const { stdout, stderr } = await execAsync(command);
      
      return {
        success: true,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all available sessions (both active and with transcripts)
   * @returns {Object[]} Combined list of sessions
   */
  async getAllSessions() {
    const activeSessions = await this.getActiveSessions();
    const availableTranscripts = this.transcriptReader.getAvailableTranscripts();
    
    const sessionMap = new Map();
    
    // Add active sessions (isRunning comes from getActiveSessions)
    activeSessions.forEach(session => {
      const sessionId = this.extractSessionId(session.key) || session.sessionId;
      sessionMap.set(session.key, {
        ...session,
        sessionId,
        isActive: session.isRunning,
        hasTranscript: sessionId ? this.transcriptReader.hasTranscript(sessionId) : false
      });
    });

    // Add ALL transcript sessions (not just ones with sessionKey in file)
    for (const sessionId of availableTranscripts) {
      // Skip if already in map (matched by sessionId)
      const existingBySessionId = Array.from(sessionMap.values()).find(s => s.sessionId === sessionId);
      if (existingBySessionId) continue;
      
      const metadata = this.transcriptReader.getTranscriptMetadata(sessionId);
      if (metadata) {
        // Create a synthetic key if none in file
        const key = metadata.sessionKey || `historical:${sessionId}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            key,
            sessionId,
            label: metadata.label || this.inferLabelFromTranscript(sessionId),
            isActive: false,
            hasTranscript: true,
            lineCount: metadata.lineCount,
            fileSize: metadata.fileSize,
            startTime: metadata.lastModified,
            endTime: metadata.lastModified
          });
        }
      }
    }

    // Return ALL sessions, not filtered
    const allSessions = Array.from(sessionMap.values());
    return this.detectLoopPatterns(allSessions);
  }

  /**
   * Try to infer a label from transcript content
   * @param {string} sessionId - Session ID
   * @returns {string|null} Inferred label or null
   */
  inferLabelFromTranscript(sessionId) {
    try {
      const filePath = `${process.env.HOME}/.clawdbot/agents/main/sessions/${sessionId}.jsonl`;
      if (!fs.existsSync(filePath)) return null;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').slice(0, 20); // Check first 20 lines
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          // Look for label in various places
          if (entry.label) return entry.label;
          if (entry.data?.label) return entry.data.label;
          // Look for spawn task text
          if (entry.message?.content && typeof entry.message.content === 'string') {
            const match = entry.message.content.match(/task[:\s]+["']?([^"'\n]+)/i);
            if (match) return match[1].slice(0, 50);
          }
        } catch {}
      }
    } catch {}
    return null;
  }
}