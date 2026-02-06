/**
 * Simple SQLite store for analysis logging
 * (No patterns, no vectors - just audit logs)
 */

import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import type { AnalysisLogEntry, AnalysisVerdict, Logger } from "../agent/types.js";

// =============================================================================
// Schema
// =============================================================================

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS analysis_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT (datetime('now')),
  target_type TEXT NOT NULL,
  content_length INTEGER NOT NULL,
  chunks_analyzed INTEGER NOT NULL,
  verdict TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  blocked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT (datetime('now')),
  analysis_id INTEGER,
  feedback_type TEXT NOT NULL,
  reason TEXT,
  FOREIGN KEY (analysis_id) REFERENCES analysis_log(id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_log_timestamp ON analysis_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_log_blocked ON analysis_log(blocked);
CREATE INDEX IF NOT EXISTS idx_user_feedback_analysis ON user_feedback(analysis_id);
`;

// =============================================================================
// Store Class
// =============================================================================

export class AnalysisStore {
  private db: Database.Database;
  private log: Logger;

  constructor(dbPath: string, log: Logger) {
    this.log = log;

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA_SQL);

    this.log.info(`Analysis store initialized at ${dbPath}`);
  }

  /**
   * Log an analysis result
   */
  logAnalysis(entry: {
    targetType: string;
    contentLength: number;
    chunksAnalyzed: number;
    verdict: AnalysisVerdict;
    durationMs: number;
    blocked: boolean;
  }): number {
    const result = this.db
      .prepare(
        `
        INSERT INTO analysis_log (target_type, content_length, chunks_analyzed, verdict, duration_ms, blocked)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        entry.targetType,
        entry.contentLength,
        entry.chunksAnalyzed,
        JSON.stringify(entry.verdict),
        entry.durationMs,
        entry.blocked ? 1 : 0,
      );

    return result.lastInsertRowid as number;
  }

  /**
   * Get recent analysis logs
   */
  getRecentLogs(limit: number = 20): AnalysisLogEntry[] {
    const rows = this.db
      .prepare(
        `
        SELECT * FROM analysis_log
        ORDER BY timestamp DESC
        LIMIT ?
      `,
      )
      .all(limit) as DbAnalysisLog[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      targetType: row.target_type,
      contentLength: row.content_length,
      chunksAnalyzed: row.chunks_analyzed,
      verdict: JSON.parse(row.verdict) as AnalysisVerdict,
      durationMs: row.duration_ms,
      blocked: row.blocked === 1,
    }));
  }

  /**
   * Get count of blocked analyses in time window
   */
  getBlockedCount(windowHours: number = 24): number {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - windowHours);

    const row = this.db
      .prepare(
        `
        SELECT COUNT(*) as count FROM analysis_log
        WHERE blocked = 1 AND timestamp >= ?
      `,
      )
      .get(windowStart.toISOString()) as { count: number };

    return row.count;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAnalyses: number;
    totalBlocked: number;
    blockedLast24h: number;
    avgDurationMs: number;
  } {
    const total = this.db
      .prepare("SELECT COUNT(*) as count FROM analysis_log")
      .get() as { count: number };

    const blocked = this.db
      .prepare("SELECT COUNT(*) as count FROM analysis_log WHERE blocked = 1")
      .get() as { count: number };

    const avgDuration = this.db
      .prepare("SELECT AVG(duration_ms) as avg FROM analysis_log")
      .get() as { avg: number | null };

    return {
      totalAnalyses: total.count,
      totalBlocked: blocked.count,
      blockedLast24h: this.getBlockedCount(24),
      avgDurationMs: Math.round(avgDuration.avg ?? 0),
    };
  }

  /**
   * Get recent detections (only those flagged as injection)
   */
  getRecentDetections(limit: number = 10): AnalysisLogEntry[] {
    const rows = this.db
      .prepare(
        `
        SELECT * FROM analysis_log
        WHERE json_extract(verdict, '$.isInjection') = 1
        ORDER BY timestamp DESC
        LIMIT ?
      `,
      )
      .all(limit) as DbAnalysisLog[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      targetType: row.target_type,
      contentLength: row.content_length,
      chunksAnalyzed: row.chunks_analyzed,
      verdict: JSON.parse(row.verdict) as AnalysisVerdict,
      durationMs: row.duration_ms,
      blocked: row.blocked === 1,
    }));
  }

  /**
   * Log user feedback (false positive or missed detection)
   */
  logFeedback(entry: {
    analysisId?: number;
    feedbackType: "false_positive" | "missed_detection";
    reason?: string;
  }): number {
    const result = this.db
      .prepare(
        `
        INSERT INTO user_feedback (analysis_id, feedback_type, reason)
        VALUES (?, ?, ?)
      `,
      )
      .run(entry.analysisId ?? null, entry.feedbackType, entry.reason ?? null);

    return result.lastInsertRowid as number;
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats(): {
    falsePositives: number;
    missedDetections: number;
  } {
    const fp = this.db
      .prepare("SELECT COUNT(*) as count FROM user_feedback WHERE feedback_type = 'false_positive'")
      .get() as { count: number };

    const md = this.db
      .prepare("SELECT COUNT(*) as count FROM user_feedback WHERE feedback_type = 'missed_detection'")
      .get() as { count: number };

    return {
      falsePositives: fp.count,
      missedDetections: md.count,
    };
  }

  close(): void {
    this.db.close();
  }
}

// =============================================================================
// Database Row Type
// =============================================================================

type DbAnalysisLog = {
  id: number;
  timestamp: string;
  target_type: string;
  content_length: number;
  chunks_analyzed: number;
  verdict: string;
  duration_ms: number;
  blocked: number;
};

// =============================================================================
// Factory
// =============================================================================

export function createAnalysisStore(dbPath: string, log: Logger): AnalysisStore {
  return new AnalysisStore(dbPath, log);
}
