import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TEMP_DIR = '/tmp';
const ARCHIVE_DIR = path.join(process.env.HOME, 'clawd', 'logs', 'ralph-archive');

export class RalphReader {
  /**
   * Get all active Ralph loops (from /tmp/ralph-*.json)
   */
  getActiveLoops() {
    const loops = [];
    
    try {
      const files = fs.readdirSync(TEMP_DIR)
        .filter(f => f.startsWith('ralph-') && f.endsWith('.json') && !f.includes('-done'));
      
      for (const file of files) {
        try {
          const filePath = path.join(TEMP_DIR, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const state = JSON.parse(content);
          const stats = fs.statSync(filePath);
          
          // Check if there's a done file
          const doneFile = filePath.replace('.json', '-done.txt');
          const isDone = fs.existsSync(doneFile) && 
                         fs.readFileSync(doneFile, 'utf8').includes('RALPH_DONE');
          
          // Check for errors in history
          const hasErrors = (state.history || []).some(h => h.error);
          const totalTokens = (state.history || []).reduce((sum, h) => sum + (h.tokens || 0), 0);
          const totalDurationMs = (state.history || []).reduce((sum, h) => sum + (h.durationMs || 0), 0);
          
          // Determine true success: done=true, no errors, and actually did work
          const isSuccess = state.done === true && !hasErrors && totalTokens > 0;
          
          loops.push({
            id: file.replace('.json', ''),
            stateFile: filePath,
            status: isDone ? 'completed' : 'running',
            iteration: state.runningIteration || state.iteration || 0,  // Show running iter if in progress
            maxIterations: state.maxIterations,
            started: state.started,
            sessionId: state.sessionId,
            name: state.name || null,
            history: state.history || [],
            done: state.done || isDone,
            timeUp: state.timeUp,
            maxedOut: state.maxedOut,
            lastModified: stats.mtime,
            hasErrors,
            isSuccess,
            // Calculate totals
            totalTokens,
            totalCost: (state.history || []).reduce((sum, h) => sum + (h.cost || 0), 0),
            totalDurationMs
          });
        } catch (e) {
          console.error(`Error reading ${file}:`, e.message);
        }
      }
    } catch (e) {
      console.error('Error scanning temp dir:', e.message);
    }
    
    return loops.sort((a, b) => new Date(b.started) - new Date(a.started));
  }

  /**
   * Get archived Ralph loops (from ~/clawd/logs/ralph-archive/)
   */
  getArchivedLoops() {
    const loops = [];
    
    if (!fs.existsSync(ARCHIVE_DIR)) {
      return loops;
    }
    
    try {
      const files = fs.readdirSync(ARCHIVE_DIR)
        .filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filePath = path.join(ARCHIVE_DIR, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const state = JSON.parse(content);
          const stats = fs.statSync(filePath);
          
          // Determine status from filename
          let status = 'completed';
          if (file.includes('-maxed')) status = 'maxed';
          if (file.includes('-stopped')) status = 'stopped';
          // -done files are also 'completed' (unified status)
          
          // Check for errors in history
          const hasErrors = (state.history || []).some(h => h.error);
          const totalTokens = (state.history || []).reduce((sum, h) => sum + (h.tokens || 0), 0);
          const totalDurationMs = (state.history || []).reduce((sum, h) => sum + (h.durationMs || 0), 0);
          
          // Determine true success: done=true, no errors, and actually did work
          const isSuccess = state.done === true && !hasErrors && totalTokens > 0;
          
          loops.push({
            id: file.replace('.json', ''),
            archiveFile: filePath,
            status,
            iteration: state.iteration || 0,
            started: state.started,
            completedAt: state.completedAt,
            sessionId: state.sessionId,
            name: state.name || null,
            history: state.history || [],
            done: state.done,
            timeUp: state.timeUp,
            maxedOut: state.maxedOut,
            lastModified: stats.mtime,
            hasErrors,
            isSuccess,
            // Calculate totals
            totalTokens,
            totalCost: (state.history || []).reduce((sum, h) => sum + (h.cost || 0), 0),
            totalDurationMs
          });
        } catch (e) {
          console.error(`Error reading archive ${file}:`, e.message);
        }
      }
    } catch (e) {
      console.error('Error scanning archive dir:', e.message);
    }
    
    return loops.sort((a, b) => new Date(b.started) - new Date(a.started));
  }

  /**
   * Get all loops (active + archived)
   */
  getAllLoops() {
    const active = this.getActiveLoops();
    const archived = this.getArchivedLoops();
    
    return {
      active,
      archived,
      stats: {
        activeCount: active.length,
        runningCount: active.filter(l => l.status === 'running').length,
        archivedCount: archived.length,
        totalIterations: [...active, ...archived].reduce((sum, l) => sum + l.iteration, 0),
        totalTokens: [...active, ...archived].reduce((sum, l) => sum + l.totalTokens, 0)
      }
    };
  }

  /**
   * Get a single loop by ID
   */
  getLoop(loopId) {
    // Check active first
    const active = this.getActiveLoops().find(l => l.id === loopId);
    if (active) return active;
    
    // Check archived
    const archived = this.getArchivedLoops().find(l => l.id === loopId);
    return archived || null;
  }

  /**
   * Kill an active loop
   */
  killLoop(loopId) {
    const loop = this.getActiveLoops().find(l => l.id === loopId);
    if (!loop) {
      return { success: false, error: 'Loop not found or not active' };
    }
    
    try {
      const killed = [];
      
      // Get sessionId from state file
      const stateContent = fs.readFileSync(loop.stateFile, 'utf8');
      const state = JSON.parse(stateContent);
      const sessionId = state.sessionId;
      
      // Extract the unique hash from loopId (last 4 chars before .json)
      // e.g., ralph-20260201073653-8647 -> 8647
      const hashMatch = loopId.match(/-([a-f0-9]{4})$/);
      const hash = hashMatch ? hashMatch[1] : null;
      
      // Kill strategies - try multiple patterns
      const patterns = [
        sessionId,                    // ralph-c0528647
        hash,                         // 8647 (appears in done file path)
        loopId,                       // full loop ID
      ].filter(Boolean);
      
      for (const pattern of patterns) {
        try {
          const result = execSync(`pgrep -f "${pattern}" 2>/dev/null || true`, { encoding: 'utf8' });
          const pids = result.trim().split('\n').filter(p => p && !killed.includes(p));
          for (const pid of pids) {
            try {
              execSync(`kill ${pid} 2>/dev/null`);
              killed.push(pid);
            } catch (e) {}
          }
        } catch (e) {}
      }
      
      // Also try pkill for good measure
      if (sessionId) {
        try { execSync(`pkill -f "${sessionId}" 2>/dev/null || true`); } catch (e) {}
      }
      
      // Write done signal
      const doneFile = loop.stateFile.replace('.json', '-done.txt');
      fs.writeFileSync(doneFile, 'RALPH_DONE\nKilled by dashboard');
      
      // Keep state file for history - it will show as 'completed' now
      
      if (killed.length > 0) {
        return { success: true, message: `Killed ${killed.length} process(es)` };
      } else {
        return { success: true, message: 'Stop signal written, state file removed' };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Get iteration history for a loop
   */
  getLoopHistory(loopId) {
    const loop = this.getLoop(loopId);
    if (!loop) return null;
    
    return {
      loopId,
      iterations: loop.history,
      summary: {
        total: loop.history.length,
        avgDurationMs: loop.history.length > 0 
          ? loop.totalDurationMs / loop.history.length 
          : 0,
        avgTokens: loop.history.length > 0
          ? loop.totalTokens / loop.history.length
          : 0
      }
    };
  }
}
