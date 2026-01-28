// Molt Gateway Protocol Types

export interface MoltConfig {
  url: string;
  token: string;
  clientId?: string;
}

// Protocol versions
export const MIN_PROTOCOL = 1;
export const MAX_PROTOCOL = 1;

// Frame types
export type FrameType = 'req' | 'res' | 'event';

// Base frame structure
export interface BaseFrame {
  type: FrameType;
}

// Request frame
export interface RequestFrame extends BaseFrame {
  type: 'req';
  id: string;
  method: string;
  params?: unknown;
}

// Response frame
export interface ResponseFrame extends BaseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: GatewayError;
}

// Event frame
export interface EventFrame extends BaseFrame {
  type: 'event';
  event: string;
  payload?: unknown;
}

// Error structure
export interface GatewayError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;
}

// Connect request
export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  role?: string;
  device?: {
    id: string;
    name?: string;
  };
  caps?: string[];
  auth?: {
    token?: string;
    password?: string;
  };
  locale?: string;
}

// Connect response
export interface ConnectResponse {
  protocol: number;
  gateway: {
    version: string;
    capabilities?: string[];
  };
  snapshot?: unknown;
}

// Health status
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  channels?: Record<string, ChannelStatus>;
  agents?: Record<string, AgentStatus>;
}

export interface ChannelStatus {
  connected: boolean;
  error?: string;
}

export interface AgentStatus {
  available: boolean;
  error?: string;
}

// Send message params
export interface SendMessageParams {
  channel: string;
  text: string;
  attachments?: Attachment[];
}

export interface Attachment {
  type: 'image' | 'audio' | 'document';
  url?: string;
  data?: string;
  mimeType?: string;
}

// Agent params
export interface AgentParams {
  prompt: string;
  context?: string;
  stream?: boolean;
}

// Agent events
export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; input: unknown }
  | { type: 'tool_result'; content: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'error'; error: GatewayError }
  | { type: 'done' };

// Event types
export type GatewayEvent =
  | { event: 'agent'; payload: AgentEvent; seq?: number }
  | { event: 'presence'; payload: unknown }
  | { event: 'tick'; payload: { timestamp: number } }
  | { event: 'shutdown'; payload: { restartIn?: number } };
