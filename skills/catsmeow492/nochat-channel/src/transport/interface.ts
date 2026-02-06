import type { InboundMessageHandler } from '../types.js'

/**
 * Abstract transport interface for receiving NoChat messages.
 * Implementations: PollingTransport, WebhookTransport (Phase 2), WebSocketTransport (Phase 3)
 */
export interface NoChatTransport {
  /** Start receiving messages */
  start(): Promise<void>
  /** Stop receiving messages */
  stop(): Promise<void>
  /** Register a handler for inbound messages */
  onMessage(handler: InboundMessageHandler): void
}
