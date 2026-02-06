/**
 * Type definitions for the Guard Agent
 */

// =============================================================================
// Configuration Types
// =============================================================================

export type OpenClawGuardConfig = {
  enabled?: boolean;
  blockOnRisk?: boolean;
  maxChunkSize?: number;
  overlapSize?: number;
  timeoutMs?: number;
  dbPath?: string;
};

// =============================================================================
// Analysis Types
// =============================================================================

export type AnalysisTarget = {
  type: "message" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  toolParams?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type ChunkInfo = {
  index: number;
  total: number;
  content: string;
  startOffset: number;
  endOffset: number;
};

export type Finding = {
  chunkIndex: number;
  suspiciousContent: string;
  reason: string;
  confidence: number; // 0-1
  location?: {
    start: number;
    end: number;
  };
};

export type AnalysisVerdict = {
  isInjection: boolean;
  confidence: number; // 0-1
  reason: string;
  findings: Finding[];
  chunksAnalyzed: number;
};

// =============================================================================
// Agent Message Types
// =============================================================================

export type AgentRole = "system" | "user" | "assistant" | "tool";

export type AgentToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type AgentMessage = {
  role: AgentRole;
  content?: string | null;
  tool_calls?: AgentToolCall[];
  tool_call_id?: string;
  name?: string;
};

// =============================================================================
// Tool Types
// =============================================================================

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

// =============================================================================
// Analysis Log Types
// =============================================================================

export type AnalysisLogEntry = {
  id: number;
  timestamp: string;
  targetType: string;
  contentLength: number;
  chunksAnalyzed: number;
  verdict: AnalysisVerdict;
  durationMs: number;
  blocked: boolean;
};

// =============================================================================
// Logger Type
// =============================================================================

export type Logger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  debug?: (msg: string) => void;
};
